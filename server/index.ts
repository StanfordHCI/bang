require('dotenv').config({path: './.env'});
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');const mongoose = require('mongoose');
const PORT = process.env.PORT || 3001;
const APP_ROOT = path.resolve(__dirname, '..');
const logger = require('./services/logger');
import {init, sendMessage, disconnect, activeCheck, joinBang} from './controllers/users'
import {joinBatch, loadBatch, receiveSurvey} from './controllers/batches'
import {errorHandler} from './services/common'
import {addHIT, disassociateQualificationFromWorker, listAssignmentsForHIT, notifyWorkers, assignQual, expireHIT, payBonus, mturk} from "./controllers/utils";
import {User} from './models/users'
import {Batch} from './models/batches'
import {Chat} from "./models/chats";
const moment = require('moment')
const cors = require('cors')
const cron = require('node-cron');
let currentHIT = '';

mongoose.Promise = global.Promise;
mongoose.connection.on('error', (err) => {
  errorHandler(err, '%s MongoDB connection error. Please make sure MongoDB is running.')
  process.exit();
});
mongoose.connection.once('open', function () {
  logger.info(module, 'DB: connected');
});
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});

const corsOptions = {
  origin: '*', //process.env.NODE_ENV === 'production' ? process.env.API_HOST : 'http://localhost:3000',
  methods: 'GET,PUT,POST,DELETE,OPTIONS',
  allowedHeaders: "*",
  optionsSuccessStatus: 200,
}

app
  .set('APP_ROOT', APP_ROOT)
  .set('SERVER_ROOT', __dirname)
  .use(bodyParser.json({limit: '5mb'}))
  .use(bodyParser.urlencoded({extended: true, limit: '5mb'}))
  .use(cors(corsOptions))
  .use(require('./routes')(app))

const io = require('socket.io').listen(app.listen(PORT, function() {
  logger.info(module, 'App is running on port: ' + PORT);
  logger.info(module, 'ENV: ' + process.env.NODE_ENV);
}));

const initialChecks = [
  User.updateMany({}, { $set: { connected : false, lastDisconnect: new Date(), socketId: '', batch: null,
      currentChat: null, realNick: null, fakeNick: null}}),
  Batch.updateMany({$or: [{status:'active'}, {status:'waiting'}]}, { $set: { status : 'completed'}}),
]

Promise.all(initialChecks)
  .then(() => {
    activeCheck(io);
    io.sockets.on('connection', function (socket) {
      socket.on('init', data => socketMiddleware('init', init, data, socket));
      //socket.on('join-bang', data => socketMiddleware('join-bang', joinBang, data, socket));
      socket.on('disconnect', data => socketMiddleware('disconnect', disconnect, data, socket));
      socket.on('send-message', data => socketMiddleware('send-message', sendMessage, data, socket));
      socket.on('join-batch', data => socketMiddleware('join-batch', joinBatch, data, socket));
      socket.on('load-batch', data => socketMiddleware('load-batch', loadBatch, data, socket));
      socket.on('send-survey', data => socketMiddleware('send-survey', receiveSurvey, data, socket));
    });
  })
  .catch(err => {
    errorHandler(err, 'Initial checks error')
  })

const socketMiddleware = function (event, action, data, socket) {
  if (event !== 'init' && event !== 'disconnect' && !socket.userId) {
    logger.error(module, 'User is not logged in');
    return;
  }
  action(data, socket, io)
}

const botId = '100000000000000000000001'
//waiting batch afk check
cron.schedule('*/30 * * * * *', async function(){
  const batch = await Batch.findOne({status: 'waiting'}).select('users createdAt preChat').populate('users.user').lean().exec();
  if (batch) {
    const botMessage = {
      nickname: 'helperBot',
      message: 'Type something or we will kick you',
      user: botId,
      time: new Date
    }
    await Chat.findByIdAndUpdate(batch.preChat, { $addToSet: { messages: botMessage} });
    io.to(batch.preChat).emit('receive-message', botMessage);

    let prs = [], kicked = [];
    batch.users.forEach(item => {
      const user = item.user;
      if (moment().diff(moment(item.joinDate), 'second') > 31 && (!user.lastCheckTime || moment().diff(moment(user.lastCheckTime), 'second') > 30)) { //kick user
        prs.push(User.findByIdAndUpdate(user._id, { $set: { batch: null, realNick: null, currentChat: null }}))
        prs.push(Batch.findByIdAndUpdate(batch._id, {$pull: { users: {user: user._id}}}))
        kicked.push(user)
      }
    })
    if (prs.length > 0) {
      await Promise.all(prs);
      kicked.forEach(user => {
        io.to(user.socketId).emit('kick-afk', true);
        logger.info(module, 'user was kicked: ' + user._id)
      })
    }
  }
});

cron.schedule('*/4 * * * *', async function(){
  try {
    const batch = await Batch.findOne({status: 'waiting'}).select('teamSize roundMinutes numRounds').lean().exec();
    if (batch) {
      const HIT = await addHIT(batch, false);
      currentHIT = HIT.HITId;
      logger.info(module, 'Hit created :' + currentHIT)
    }
  } catch (e) {
    errorHandler(e, 'create schedule HIT error')
  }
});

cron.schedule('*/10 * * * * *', async function(){
  try {
    if (currentHIT) {
      const as = (await listAssignmentsForHIT(currentHIT)).Assignments;
      if (as && as.length) for (let i = 0; i < as.length; i++) {
        const assignment = as[i];
        const check = await User.findOne({mturkId: assignment.WorkerId});
        if (!check) {//add user to db and give willbang qual
          console.log(assignment.WorkerId)
          let prs = [
            User.create({
              token: assignment.WorkerId,
              mturkId: assignment.WorkerId,
              testAssignmentId: assignment.AssignmentId
            }),
            assignQual(assignment.WorkerId, '3SR1M7GDJW59K8YBYD1L5YS55VPA25'),
            notifyWorkers([assignment.WorkerId], 'Experiment started. Please find and accept our main mturk task here:' +
              ' https://workersandbox.mturk.com/requesters/A3QTK0H2SRN96W/projects', 'Bang')
          ];
          await Promise.all(prs);
          logger.info('module', 'User added to db, qual added, notify sent: ' + assignment.WorkerId)
        }
      }
    }
  } catch (e) {
    errorHandler(e, 'check workers error')
  }
});




/*const test = async function(){
  try {
    let prs = [
      disassociateQualificationFromWorker('A3QTK0H2SRN96W', '3SR1M7GDJW59K8YBYD1L5YS55VPA25', 'asd'),
      disassociateQualificationFromWorker('A2RJT3346F362V', '3SR1M7GDJW59K8YBYD1L5YS55VPA25', 'asd'),
      disassociateQualificationFromWorker('A1858EK0YRX9ZV', '3SR1M7GDJW59K8YBYD1L5YS55VPA25', 'asd'),
      disassociateQualificationFromWorker('A2LPEQIGMF3JJL', '3SR1M7GDJW59K8YBYD1L5YS55VPA25', 'asd'),
      disassociateQualificationFromWorker('A3QTK0H2SRN96W', '33CI7FQ96AL58DPIE8NY2KTI5SF7OH', 'asd'),
      disassociateQualificationFromWorker('A2RJT3346F362V', '33CI7FQ96AL58DPIE8NY2KTI5SF7OH', 'asd'),
      disassociateQualificationFromWorker('A1858EK0YRX9ZV', '33CI7FQ96AL58DPIE8NY2KTI5SF7OH', 'asd'),
      disassociateQualificationFromWorker('A2LPEQIGMF3JJL', '33CI7FQ96AL58DPIE8NY2KTI5SF7OH', 'asd'),
    ]
    await Promise.all(prs)

  } catch(e) {
    errorHandler(e, 'test error')
  }

}

test()*/

