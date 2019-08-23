import {User} from '../models/users'
import {Batch} from '../models/batches'
import {Chat} from '../models/chats'
import {errorHandler} from '../services/common'
import {Survey} from "../models/surveys";
const logger = require('../services/logger');
import {notifyWorkers, assignQual, payBonus, runningLive} from "./utils";
import {timeout} from './batches'

export const activeCheck = async function (io) {
  try {
    const [users, batch, privateBatchIds, publicBatch] = await Promise.all([
      User.find({connected: true}).populate({path: 'batch', select: 'status'}).select('mturkId').lean().exec(),
      Batch.findOne({status: 'waiting'}).select('teamSize teamFormat').lean().exec(),
      Batch.find({status: 'waiting', loadTeamOrder: {$exists: true, $ne: null}}).select('_id').lean().exec(),
      Batch.findOne({status: 'waiting', loadTeamOrder: null}).lean().exec(),
    ])
    let counter = {all: 0, waitchat: 0, waitroom: 0, active: 0}
    if (users && users.length) {
      counter.all = users.length;
      users.forEach(user => {
        if (!user.batch) {
          counter.waitroom++;
        } else if (user.batch.status === 'waiting') {
          counter.waitchat++;
        } else if (user.batch.status === 'active') {
          counter.active++;
        }
      })
    }
    let limit = 999;
    if (batch) {
      if (batch.teamFormat === 'single') {
        limit = batch.teamSize // single-teamed batch
      }
      else {
        limit = batch.teamSize ** 2 // multi-teamed batch
      }
    }
    io.to('waitroom').emit('clients-active', {activeCounter: counter.waitchat, batchReady: !!batch, limit: limit, privateBatchIds: privateBatchIds, publicBatchReady: !!publicBatch});
    logger.info(module, 'connected: ' + counter.all + '; waitroom: ' + counter.waitroom + '; waitchat: ' + counter.waitchat + '; in active batches: ' + counter.active);
  } catch (e) {
    errorHandler(e, 'active check error')
  }
}

export const refreshActiveUsers = async (data, socket, io) => {
  await activeCheck(io)
}

export const init = async function (data, socket, io) {
  try {
    let user;
    let token = data.token || '';
    //it looks irrational to check url vars before token, but user can return with another assignmentId and with the same token
    if ((process.env.MTURK_FRAME === 'ON' && data.mturkId && data.assignmentId && data.hitId && data.turkSubmitTo) ||
      (process.env.MTURK_FRAME === 'OFF' && data.mturkId && data.assignmentId)) {
      user = await User.findOneAndUpdate({mturkId: data.mturkId}, {$set: {mainAssignmentId: data.assignmentId}}, {new: true}).lean().exec();
    } else {
      user = await User.findOne({token: token}).lean().exec();
    }

    if (!user) {
      logger.info(module, 'wrong credentials');
      socket.emit('init-res', null);
      return;
    }
    if (!runningLive && user.systemStatus === 'hasbanged') user.systemStatus = 'willbang';

    socket.mturkId = user.mturkId;
    socket.token = user.token;
    socket.assignmentId = user.testAssignmentId;
    socket.systemStatus = user.systemStatus;
    socket.userId = user._id;
    if (user.batch) {
      socket.join(user.batch.toString()) //chat room
    } else {
      socket.join('waitroom');
    }
    let adminToken = null;
    if (data.adminToken && data.adminToken === process.env.ADMIN_TOKEN) {
      user.isAdmin = true;
      adminToken = data.adminToken;
    }
    // if admin token exists and is good, send it back, else send null
    socket.emit('init-res', {user: user, adminToken: adminToken});
    await User.findByIdAndUpdate(user._id, { $set: { connected : true, lastConnect: new Date(), socketId: socket.id, } });
    await activeCheck(io);
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
    }
  } catch (e) {
    errorHandler(e, 'send message error')
  }
}

/*
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
*/
