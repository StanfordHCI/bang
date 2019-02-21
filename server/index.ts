const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload')
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3001;
const APP_ROOT = path.resolve(__dirname, '..');
const logger = require('./services/logger');
require('dotenv').config({path: './.env'});
import chalk from "chalk";
import {auth, sendMessage, disconnect} from './controllers/users'
import {joinBatch} from './controllers/batches'

mongoose.Promise = global.Promise;
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});
mongoose.connection.once('open', function () {
  logger.info(module, 'DB: connected');
});
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});

app
  .set('APP_ROOT', APP_ROOT)
  .set('SERVER_ROOT', __dirname)
  .set('middlewares', require('./middlewares'))
  .use(bodyParser.json({limit: '5mb'}))
  .use(bodyParser.urlencoded({extended: true, limit: '5mb'}))
  .use(fileUpload())

const io = require('socket.io').listen(app.listen(PORT, function() {
  console.log('App is running on port', PORT);
}));



io.sockets.on('connection', function (socket) {
  socket.on('auth', data =>{auth(data, socket, io)});
  socket.on('disconnect', () =>{disconnect(socket, io)});
  socket.on('send-message', data =>{sendMessage(data, socket, io)});
  socket.on('join-batch', data =>{joinBatch(data, socket, io)});
});
