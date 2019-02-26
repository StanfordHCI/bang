import {User} from '../models/users'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {clearRoom, makeName} from './utils'
import {errorHandler} from '../services/common'
const logger = require('../services/logger');

export const joinBatch = async function (data, socket, io) {
  try {
    let batch = await Batch.findOne({status: 'waiting'}).lean().exec();
    if (!batch) {
      logger.error(module, 'There is no waiting batch');
      return;
    }
    if (batch.users.length < batch.teamSize ** 2) { //join to batch
      const nickname = makeName(null, null).username;
      let user;
      const prs = await Promise.all([
        Batch.findByIdAndUpdate(batch._id, { $addToSet: { users: {user: socket.userId}},  }, {new: true}),
        User.findByIdAndUpdate(socket.userId,
          { $set: { batch: batch._id, currentNickname: nickname, currentChat: batch.preChat} }, {new: true}).lean().exec()
      ])
      user = prs[1]
      socket.join(user.currentChat.toString()) //chat room
      io.to(batch._id.toString()).emit('refresh-batch', true)
      socket.join(batch._id.toString()) //common room, not chat
      socket.emit('joined-batch', {user: user});
    }
    if (batch.users.length === batch.teamSize ** 2 - 1 && batch.status === 'waiting') { //start batch
      clearRoom('waitroom', io);
      clearRoom(batch.preChat, io);
      await startBatch(batch, socket, io)
    }

  } catch (e) {
    errorHandler(e, 'join batch error')
  }
}

export const loadBatch = async function (data, socket, io) {
  try {
    const batch = await Batch.findById(data.batch).lean().exec();
    let chat, userInfo;
    if (batch.status === 'waiting') {
      const prs = await Promise.all([
        Chat.findById(batch.preChat).lean().exec(),
        User.find({currentChat: batch.preChat}).select('currentNickname currentChat').lean().exec(),
      ])
      chat = prs[0];
      chat.members = prs[1]
      userInfo = chat.members.find(x => x._id.toString() === socket.userId.toString())
      socket.join(batch.preChat.toString())
    } else if (batch.status === 'active') {
      const round = batch.rounds[batch.currentRound - 1];
      if (round) {
        let chatId;
        round.teams.forEach(team => {
          team.users.forEach(user => {
            if (user.user.toString() === socket.userId.toString()) {
              chatId = team.chat;
            }
          })
        })
        const prs = await Promise.all([
          Chat.findById(chatId).lean().exec(),
          User.find({currentChat: chatId}).select('currentNickname currentChat').lean().exec()
        ])
        chat = prs[0];
        chat.members = prs[1]
        userInfo = chat.members.find(x => x._id.toString() === socket.userId.toString())
        socket.join(chatId.toString())
      } else {
        chat = {};
        chat.members = [];
        chat.messages = [];
      }
    }

    socket.emit('loaded-batch', {batch: batch, chat: chat, userInfo: userInfo})
  } catch (e) {
    errorHandler(e, 'load batch error')
  }
}

export const addBatch = async function (data, socket, io) {
  try {
    if (data.adminToken !== 'cXBE31cGivjSt338') { //just test token, this logic should be deleted
      logger.error(module, 'Forbidden');
      return;
    }
    const check = await Batch.findOne({status: 'waiting'}) ;
    if (check) {
      logger.error(module, 'There is 1 waiting batch');
      return;
    }
    const newBatch = {
      teamSize: process.env.TEAM_SIZE,
      users: [],
      numRounds: 4,
      format: [1, 2, 1, 3],
      experimentRound: 1,
      status: 'waiting',
      tasks: [],
      roundMinutes: process.env.ROUND_MINUTES
    }
    const batch = await Batch.create(newBatch);
    const preChat = await Chat.create({batch: batch._id, messages: []});
    await Batch.findByIdAndUpdate(batch._id, {$set: {preChat: preChat._id}})
    const batchList = await Batch.find({}).select('createdAt startTime status currentRound').lean().exec()
    socket.emit('loaded-batch-list', batchList)
  } catch (e) {
    errorHandler(e, 'add batch error')
  }
}

export const loadBatchList = async function (data, socket, io) {
  try {
    if (data.adminToken !== 'cXBE31cGivjSt338') { //just test token, this logic should be deleted
      logger.error(module, 'Forbidden');
      return;
    }
    const batchList = await Batch.find({}).select('createdAt startTime status currentRound').lean().exec();
    socket.emit('loaded-batch-list', batchList)
  } catch (e) {
    errorHandler(e, 'add batch error')
  }
}





const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const generateTeamUser = (user) => {
  const nickname = makeName(null, null).username;
  return {user: user._id, nickname: nickname, socketId: user.socketId}
}

const startBatch = async function (batch, socket, io) {
  try {
    await timeout(5000)
    const users = await User.find({batch: batch._id, connected: true}).lean().exec();
    if (users.length != batch.teamSize ** 2) {
      console.log('wrong users length') // do something?
    }
    const startBatchInfo = {status: 'active', startTime: new Date()};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: startBatchInfo}).lean().exec()
    logger.info(module, 'Main experiment start', batch._id)
    io.to(batch._id.toString()).emit('start-batch', startBatchInfo);
    const teamSize = batch.teamSize, numRounds = batch.numRounds;
    let rounds = [];

    for (let i = 0; i < numRounds; i++) {
      let roundObject = {startTime: new Date(), number: i + 1, teams: [], status: 'active', endTime: null};
      let teams = [], emptyChats = [];
      for (let j = 0; j < teamSize; j++) { //simple gen for tests
        const teamUsers = Array.from(users).splice(j * teamSize, (j+1) * teamSize).map(x => generateTeamUser(x));
        teams.push({users: teamUsers});
        emptyChats.push({batch: batch._id, messages: []})
      }
      const chats = await Chat.insertMany(emptyChats);
      let prsHelper = [];
      teams.forEach((team, index) => {
        team.chat = chats[index]._id;
        team.users.forEach(user => {
          prsHelper.push(User.findByIdAndUpdate(user.user, {$set: {currentNickname: user.nickname, currentChat: team.chat}}));
          /*const userSocket = io.sockets.connected[user.socketId];
          if (userSocket) {
            userSocket.join(team.chat.toString());
          } else {
            logger.error(module, 'Cannot find user socket')
          }*/
          delete user.socketId;
          return user;
        })
        return team;
      })
      roundObject.teams = teams;
      rounds.push(roundObject);
      await Promise.all(prsHelper);
      const startRoundInfo = {rounds: rounds, currentRound: roundObject.number};
      batch = await Batch.findByIdAndUpdate(batch._id, {$set: startRoundInfo}).lean().exec();
      logger.info(module, 'Begin round ' + roundObject.number)
      io.to(batch._id.toString()).emit('refresh-batch', true)
      //io.to(batch._id.toString()).emit('start-round', startRoundInfo); //to much info, should cut
      //tasks logic
      //...
      await timeout(batch.roundMinutes * 60 * 1000);

      roundObject.status = 'survey';
      const midRoundInfo =  {rounds: rounds};
      batch = await Batch.findByIdAndUpdate(batch._id, {$set: midRoundInfo}).lean().exec();
      logger.info(module, 'Begin survey for round ' + roundObject.number)
      io.to(batch._id.toString()).emit('mid-round', midRoundInfo);
      chats.forEach(chat => {
        clearRoom(chat._id, io)
      })
      //survey logic

      //.....
      await timeout(batch.roundMinutes * 60 * 333);
      roundObject.endTime = new Date();
      roundObject.status = 'completed';
      const endRoundInfo = {rounds: rounds};
      batch = await Batch.findByIdAndUpdate(batch._id, {$set: endRoundInfo}).lean().exec();
      logger.info(module, 'End round ' + roundObject.number)
      io.to(batch._id.toString()).emit('end-round', endRoundInfo);
    }
    await timeout(5000);
    const endBatchInfo = {status: 'completed'};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: endBatchInfo}).lean().exec();
    logger.info(module, 'Main experiment end', batch._id)
    io.to(batch._id.toString()).emit('end-batch', endBatchInfo);
  } catch (e) {
    errorHandler(e, 'batch main run error')
  }
}
