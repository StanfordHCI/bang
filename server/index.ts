// @ts-nocheck
require('dotenv').config({path: './.env'});
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3001;
const APP_ROOT = path.resolve(__dirname, '..');
const logger = require('./services/logger');
import {init, sendMessage, disconnect, activeCheck, refreshActiveUsers, vote} from './controllers/users'
import { joinBatch, loadBatch, payStartBonus, receiveSurvey, timeout } from "./controllers/batches";
import {errorHandler} from './services/common'
import {
  addHIT,
  listAssignmentsForHIT,
  notifyWorkers,
  assignQual,
  runningLive,
  clearRoom,
} from "./controllers/utils";
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
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useFindAndModify: false});

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

export const io = require('socket.io').listen(app.listen(PORT, function() {
  logger.info(module, 'App is running on port: ' + PORT);
  logger.info(module, 'NODE MODE: ' + process.env.NODE_ENV);
  logger.info(module, 'MTURK MODE: ' + process.env.MTURK_MODE);
}));

let initialChecks = [
  User.updateMany({}, { $set: { connected : false, lastDisconnect: new Date(), socketId: '', batch: null,
      currentChat: null, realNick: null, fakeNick: null}}),
  Batch.updateMany({$or: [{status:'active'}, {status:'waiting'}]}, { $set: { status : 'completed'}}),
]

// if (process.env.MTURK_MODE === 'off') {
//   logger.info(module, 'created fake users');
//   for (let i = 0; i < 16; i++ ) {
//     User.create({
//         token: (2001 + i).toString(),
//         mturkId: (2001 + i).toString(),
//         testAssignmentId: 'test',
//         systemStatus: 'willbang',
//         isTest: true
//       }).then(() => {}).catch(err => errorHandler(err, 'Test users error'))
//   }
// }


Promise.all(initialChecks)
  .then(() => {
    activeCheck(io);
    io.sockets.on('connection', function (socket) {
      socket.on('init', data => socketMiddleware('init', init, data, socket));
      socket.on('refresh-active-users', data => socketMiddleware('refresh-active-users', refreshActiveUsers, data, socket));
      socket.on('disconnect', data => socketMiddleware('disconnect', disconnect, data, socket));
      socket.on('send-message', data => socketMiddleware('send-message', sendMessage, data, socket));
      socket.on('join-batch', data => socketMiddleware('join-batch', joinBatch, data, socket));
      socket.on('load-batch', data => socketMiddleware('load-batch', loadBatch, data, socket));
      socket.on('send-survey', data => socketMiddleware('send-survey', receiveSurvey, data, socket));
      socket.on('vote', data => socketMiddleware('vote', vote, data, socket))
    });
  })
  .catch(err => {
    errorHandler(err, 'Initial checks error')
  })

const socketMiddleware = function (event, action, data, socket) {
  if (!socket.userId && event !== 'init' && event !== 'disconnect') {
    logger.error(module, 'User is not logged in');
    return;
  }
  action(data, socket, io)
}

const botId = '100000000000000000000001'

//waiting batch afk check
cron.schedule('*/3 * * * *', async function(){
  const batch = await Batch.findOne({status: 'waiting'}).select('users createdAt preChat').populate('users.user').lean().exec();
  if (batch) {
    const botMessage = {
      nickname: 'helperBot',
      message: "This is your friendly reminder to type something so we know you're active and ready!",
      user: botId,
      time: new Date
    }
    await Chat.findByIdAndUpdate(batch.preChat, { $addToSet: { messages: botMessage} });
    io.to(batch.preChat).emit('receive-message', botMessage);

    let prs = [], kicked = [];
    batch.users.forEach(item => {
      const user = item.user;
      if (moment().diff(moment(item.joinDate), 'second') > 181 && (!user.lastCheckTime || moment().diff(moment(user.lastCheckTime), 'second') > 180)) { //kick user
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

if (process.env.MTURK_MODE !== 'off') {
  cron.schedule('*/4 * * * *', async function(){
    try {
      const batches = await Batch.find({status: 'waiting'}).select('tasks createdAt teamSize roundMinutes numRounds HITTitle surveyMinutes users withAutoStop')
        .sort({'createdAt': 1}).populate('users.user').lean().exec();
      if (batches && batches.length) {
        const HIT = await addHIT(batches[0], false);
        currentHIT = HIT.HITId;
        logger.info(module, 'Recruit HIT created: ' + currentHIT)
        let prs = []
        for (const batch of batches) {
          const liveTime = (moment()).diff(moment(batch.createdAt), 'minutes')
          if (liveTime > 35 && batch.withAutoStop) {
            const users = await User.find({batch: batch._id}).lean().exec();
            prs.push(payStartBonus(users, batch));
            prs.push(Batch.findByIdAndUpdate(batch._id, {$set: {status: 'completed'}}));
            prs.push(User.updateMany({batch:  batch._id}, { $set: { batch: null, realNick: null, fakeNick: null, currentChat: null }}))
            io.to(batch._id.toString()).emit('stop-batch', {status: 'waiting'})
            clearRoom(batch._id, io)
            logger.info(module, 'Batch stopped: ' + batch._id);
          }
        }
        await Promise.all(prs)
      } else {
        currentHIT = '';
      }
    } catch (e) {
      errorHandler(e, 'create schedule HIT error')
    }
  });

  cron.schedule('*/10 * * * * *', async function(){
    try {
      if (currentHIT) {
        const params = {
          HITId: currentHIT,
          AssignmentStatuses: ['Submitted', 'Approved', 'Rejected',],
          MaxResults: 100,
        };
        const as = (await listAssignmentsForHIT(params)).Assignments;
        if (as && as.length) for (let i = 0; i < as.length; i++) {
          const assignment = as[i];
          const check = await User.findOne({mturkId: assignment.WorkerId});
          if (!check) {//add user to db and give willbang qual
            const url = process.env.HIT_URL + '?assignmentId=' + assignment.AssignmentId + '&workerId=' + assignment.WorkerId;
            const message = 'Hi, thanks for accepting our HIT! ' +
            'Your FULL participation will earn you a bonus of $12/hour.' + '\n\n' +
            'You can join the task here: ' + url + '\n\n' +
            'The link will bring you to click the JOIN BATCH button which will allow you to enter the WAITING ROOM. ' + 'NOTE: You will be bonused $1 if enough users join the waiting room and the task starts.'; 
            let prs = [
              User.create({
                token: assignment.WorkerId,
                mturkId: assignment.WorkerId,
                testAssignmentId: assignment.AssignmentId
              }),
              assignQual(assignment.WorkerId, runningLive ? process.env.PROD_WILL_BANG_QUAL : process.env.TEST_WILL_BANG_QUAL),
              notifyWorkers([assignment.WorkerId], message, 'Bang')
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
}

