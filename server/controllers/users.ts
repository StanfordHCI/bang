import {User} from '../models/users'
import {Batch} from '../models/batches'
import {Chat} from '../models/chats'
import {errorHandler} from '../services/common'
import {Survey} from "../models/surveys";
const logger = require('../services/logger');
import {notifyWorkers, assignQual, payBonus} from "./utils";


export const activeCheck = async function (io) {
  try {
    const activeUsers = await User.find({connected: true}).select('mturkId').lean().exec()
    const activeCounter = activeUsers ? activeUsers.length : 0;
    io.to('waitroom').emit('clients-active', activeCounter);
    logger.info(module, 'Active clients: ' + activeCounter);
    if (activeCounter > 3) {
      //await notifyWorkers(activeUsers.map(user => user.mturkId), 'You can join our experiment', 'Bang')
    }
  } catch (e) {
    errorHandler(e, 'active check error')
  }
}

export const init = async function (data, socket, io) {
  try {
    let user;
    let token = data.token || '';
    if (data.mturkId && data.assignmentId && data.hitId && data.turkSubmitTo) {
      user = await User.findOneAndUpdate({mturkId: data.mturkId}, {$set: {mainAssignmentId: data.assignmentId}}, {new: true})
        .populate('batch').lean().exec();
      if (!user) {
        logger.info(module, 'wrong credentials');
        socket.emit('init-res', null);
        return;
      }
    } else {
      user = await User.findOne({token: token}).populate('batch').lean().exec();
      if (!user) {
        logger.info(module, 'wrong credentials');
        socket.emit('init-res', null);
        return;
      }
    }

    socket.mturkId = user.mturkId;
    socket.token = user.token;
    socket.assignmentId = user.mainAssignmentId;
    socket.systemStatus = user.systemStatus;
    socket.userId = user._id;
    if (user.batch) {
      socket.join(user.batch.toString()) //chat room
    } else {
      socket.join('waitroom');
    }
    if (data.adminToken && data.adminToken === process.env.ADMIN_TOKEN) {
      user.isAdmin = true;
    }
    socket.emit('init-res', {user: user, teamSize: process.env.TEAM_SIZE});
    await User.findByIdAndUpdate(user._id, { $set: { connected : true, lastConnect: new Date(), socketId: socket.id, } });
    await activeCheck(io);
    console.log('init assign', socket.mturkId, socket.assignmentId)
  } catch (e) {
    errorHandler(e, 'init error')
  }
}

export const disconnect = async function (reason, socket, io) {
  try {
    if (socket.userId) { //disconnect from logged user
      const user = await User.findByIdAndUpdate(socket.userId, { $set: { connected : false, lastDisconnect: new Date(), socketId: ''}})
        .populate('batch').lean().exec();
      if (user && user.batch && user.batch.status === 'active ') {
        //io.to(user.batch._id.toString()).emit('refresh-batch', true)
        console.log('stop batch')
      }
      await activeCheck(io);
    }
  } catch (e) {
    errorHandler(e, 'disconnect error')
  }
}

export const sendMessage = async function (data, socket, io) {
  try {
    const newMessage = {
      user: socket.userId,
      nickname: data.nickname,
      message: data.message,
      time: new Date()
    }
    const chat = await Chat.findByIdAndUpdate(data.chat, { $addToSet: { messages: newMessage} }, {new: true}).populate('batch').lean().exec();
    io.to(data.chat).emit('receive-message', newMessage);
    if (chat.batch.status === 'waiting') {
      await User.findByIdAndUpdate(socket.userId, { $set: { lastCheckTime: new Date()}})
      logger.info(module, 'afk timer refreshed')
    }
  } catch (e) {
    errorHandler(e, 'send message error')
  }
}

export const joinBang = async function (data, socket, io) {
  try {
    console.log('join bang', socket.mturkId)
    await assignQual(socket.mturkId, '3SR1M7GDJW59K8YBYD1L5YS55VPA25')
    const prs = await Promise.all([
      Batch.findOne({status: 'waiting'}).select('_id'),
      User.findByIdAndUpdate(socket.userId, {$set: {systemStatus: 'willbang'}}).lean().exec()
    ])
    if (!!prs[0]) { //notify new user because we have waiting batch
      await notifyWorkers([socket.mturkId], 'Experiment started. Join here: https://bang-dev.deliveryweb.ru', 'Bang')
    }
  } catch (e) {
    errorHandler(e, 'join bang error')
  }
}
