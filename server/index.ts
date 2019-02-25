const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');const mongoose = require('mongoose');
const PORT = process.env.PORT|| 3001;
const APP_ROOT = path.resolve(__dirname, '..');
const logger = require('./services/logger');
require('dotenv').config({path: './.env'});
import {init, sendMessage, disconnect} from './controllers/users'
import {joinBatch} from './controllers/batches'
import {errorHandler} from './services/common'

mongoose.Promise = global.Promise;
mongoose.connection.on('error', (err) => {
  errorHandler(err, '%s MongoDB connection error. Please make sure MongoDB is running.')
  process.exit();
});
mongoose.connection.once('open', function () {
  logger.info(module, 'DB: connected');
});
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});

app
  .set('APP_ROOT', APP_ROOT)
  .set('SERVER_ROOT', __dirname)
  .use(bodyParser.json({limit: '5mb'}))
  .use(bodyParser.urlencoded({extended: true, limit: '5mb'}))

const io = require('socket.io').listen(app.listen(PORT, function() {
  logger.info(module, 'App is running on port: ' + PORT);
  logger.info(module, 'ENV: ' + process.env.NODE_ENV);
}));



io.sockets.on('connection', function (socket) {
  console.log(socket.id)
  socket.on('init', data =>{init(data, socket, io)});
  socket.on('disconnect', (reason) =>{disconnect(reason, socket, io)});
  socket.on('send-message', data =>{sendMessage(data, socket, io)});
  socket.on('join-batch', data =>{joinBatch(data, socket, io)});
});
