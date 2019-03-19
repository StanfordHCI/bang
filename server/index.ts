const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');const mongoose = require('mongoose');
const PORT = process.env.PORT|| 3001;
const APP_ROOT = path.resolve(__dirname, '..');
const logger = require('./services/logger');
require('dotenv').config({path: './.env'});
import {init, sendMessage, disconnect, activeCheck} from './controllers/users'
import {joinBatch, loadBatch, receiveSurvey} from './controllers/batches'
import {errorHandler} from './services/common'
import {User} from './models/users'
import {Batch} from './models/batches'
const moment = require('moment')
const cors = require('cors')
const cron = require('node-cron');

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
  Batch.updateMany({$or: [{status:'active'}, {status:'waiting'}]}, { $set: { status : 'completed'}})
]

Promise.all(initialChecks)
  .then(() => {
    activeCheck(io);
    io.sockets.on('connection', function (socket) {
      socket.on('init', data => socketMiddleware('init', init, data, socket));
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


//waiting batch afk check
cron.schedule('*/30 * * * * *', async function(){
  const batch = await Batch.findOne({status: 'waiting'}).select('users createdAt').populate('users.user').lean().exec();
  if (batch) {
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
