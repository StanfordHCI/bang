// @ts-nocheck 
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
    const [users, batch] = await Promise.all([
      User.find({connected: true}).populate({path: 'batch', select: 'status'}).select('mturkId').lean().exec(),
      Batch.findOne({status: 'waiting'}).select('teamSize teamFormat').lean().exec()
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
      // for both, make it look like the batch will start at size**2 users
      // = limit is different than when batch is actually ready
      limit = batch.teamSize ** 2;
    }
    io.to('waitroom').emit('clients-active', {activeCounter: counter.waitchat, batchReady: !!batch, limit: limit});
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
    if (data.mturkId && data.assignmentId) {
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
      realNickname: data.realNickname,
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

export const vote = async function (data, socket, io) {
  console.log(data);
  const batch = data.batch;
  const userId = socket.userId;
  const round = batch.currentRound;
  const batchId = batch._id;
  const pollInd = data.pollInd || 0;
  const oldPoll = await Survey.findOne({user: userId, round: round, batch: batchId, surveyType: 'poll', pollInd: pollInd});
  if (data.value !== null) { // if data.value === null, we are just getting the information, not changing anything
    if (!oldPoll) {
      const newPoll = {
        user: userId,
        batch: batchId,
        questions: [{result: data.value}],
        round: round,
        surveyType: 'poll',
        pollInd: pollInd,
      }
      try {
        await Survey.create(newPoll);
      } catch (e) {
        errorHandler(e, 'poll creating error')
      }
    } else { // poll was already created, we edit the result value
      await Survey.findByIdAndUpdate(oldPoll._id, {'questions.0.result': data.value})
    }
  }

  const teammatesIds = batch.rounds[round - 1].teams.find(x => {
    return x.users.some(y => {
      return y.user.toString() === userId.toString()
    })
  }).users.map(z => z.user);
  const teammatesSockets = Object.values(io.sockets.sockets).filter((x, ind) => {
    const userId = x.userId ? x.userId.toString() : null;
    return teammatesIds.indexOf(userId) > -1;
  });
  const polls = await Survey.find({pollInd: pollInd, round: round, batch: batchId, surveyType: 'poll', user: {$in: teammatesIds}})
  let resultData = {user: userId, pollInd: pollInd}; // data which is returned to front
  polls.forEach(x => { // count votes for every option
    const index = x.questions[0].result;
    resultData[index] ? resultData[index] += 1 : resultData[index] = 1
  })
  teammatesSockets.forEach(x => { // send signal to every user
    return x.emit('voted', resultData);
  });
  // socket.emit('voted', resultData);
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
