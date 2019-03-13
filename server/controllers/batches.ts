import {User} from '../models/users'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {clearRoom, makeName} from './utils'
import {errorHandler} from '../services/common'
const logger = require('../services/logger');
const botId = '100000000000000000000001'

export const joinBatch = async function (data, socket, io) {
  try {
    let batch = await Batch.findOne({status: 'waiting'}).lean().exec();
    if (!batch) {
      logger.error(module, 'There is no waiting batch');
      socket.emit('send-error', 'There is no waiting batch')
      return;
    }
    if (batch.users.length < batch.teamSize ** 2) { //join to batch
      const nickname = makeName(null, null).username;
      let user;
      const prs = await Promise.all([
        Batch.findByIdAndUpdate(batch._id, { $addToSet: { users: {user: socket.userId, nickname: nickname}},  }, {new: true}),
        User.findByIdAndUpdate(socket.userId,
          { $set: { batch: batch._id, realNick: nickname, currentChat: batch.preChat} }, {new: true}).lean().exec()
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
        User.find({currentChat: batch.preChat}).select('realNick fakeNick currentChat').lean().exec(),
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
          User.find({currentChat: chatId}).select('realNick fakeNick currentChat').lean().exec()
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



const generateRandomTeams = (allUsers, size, oldNicks) => {
  let users = Array.from(allUsers);
  let teams = [];
  for (let i = 0; i < size; i++) {
    let team = {users: []};
    for (let j = 0; j < size; j++) {
      const index = Math.floor(Math.random() * users.length)
      team.users.push(generateTeamUser(users[index], oldNicks));
      users.splice(index, 1)
    }
    teams.push(team)
  }
  return teams;
}

const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const generateTeamUser = (user, oldNicks) => {
  let nickname;
  while (true) {
    nickname = makeName(null, null).username;
    if (!oldNicks.some(x => x === nickname)) {
      oldNicks.push(nickname)
      break;
    }
  }
  return {user: user._id, nickname: nickname, survey: []}
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
    let oldNicks = []
    const teams1round = generateRandomTeams(users, teamSize, oldNicks);

    for (let i = 0; i < numRounds; i++) {
      let roundObject = {startTime: new Date(), number: i + 1, teams: [], status: 'active', endTime: null};
      const task = batch.tasks[i];
      let teams = [], emptyChats = [];
      switch (i) { //logic for teamsize=2 and 4 rounds and expRound=3; not perfect.
        case 0:
          teams = teams1round;
          break;
        case 1:
          teams = [{users: [teams1round[0].users[0], teams1round[1].users[0]]}, {users:  [teams1round[0].users[1], teams1round[1].users[1]]}]
          break;
        case 2:
          teams = teams1round;
          break;
        case 3:
          teams = [{users: [teams1round[0].users[0], teams1round[1].users[1]]}, {users:  [teams1round[0].users[1], teams1round[1].users[0]]}]
          break;
      }

      for (let j = 0; j < teamSize; j++) { //simple gen for tests
        emptyChats.push({batch: batch._id, messages: [{user: botId, nickname: 'helperBot', time: new Date(), message: 'Task: ' + task.message}]})
      }

      const chats = await Chat.insertMany(emptyChats);
      let prsHelper = [];
      teams.forEach((team, index) => {
        team.chat = chats[index]._id;
        team.users.forEach(user => {
          prsHelper.push(User.findByIdAndUpdate(user.user, {$set: {fakeNick: user.nickname, currentChat: team.chat}}));
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

      let stepsSumTime = 0;
      for (let j = 0; j < task.steps.length; j++) {
        const step = batch.tasks[i].steps[j];
        const stepMessage = {
          user: botId,
          nickname: 'helperBot',
          message: 'Step ' + (j+1) + ': ' + step.message,
          time: new Date()
        }
        let ps = [];
        teams.forEach(team => {
          ps.push(Chat.findByIdAndUpdate(team.chat, { $addToSet: { messages: stepMessage} }))
          io.to(team.chat).emit('receive-message', stepMessage);
        })
        await Promise.all(ps)
        stepsSumTime = stepsSumTime + step.time;
        await timeout(batch.roundMinutes * step.time * 60000)
      }

      await timeout(batch.roundMinutes * (1 - stepsSumTime) * 60000);

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
      await timeout(30000);
      roundObject.endTime = new Date();
      roundObject.status = 'completed';
      const endRoundInfo = {rounds: rounds};
      batch = await Batch.findByIdAndUpdate(batch._id, {$set: endRoundInfo}).lean().exec();
      logger.info(module, 'End round ' + roundObject.number)
      io.to(batch._id.toString()).emit('end-round', endRoundInfo);
    }
    await timeout(5000);
    const endBatchInfo = {status: 'completed'};
    await User.updateMany({batch: batch._id}, { $set: { batch: null, realNick: null, currentChat: null, fakeNick: null}})
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: endBatchInfo}).lean().exec();
    logger.info(module, 'Main experiment end', batch._id)
    io.to(batch._id.toString()).emit('end-batch', endBatchInfo);
    clearRoom(batch._id, io)
  } catch (e) {
    errorHandler(e, 'batch main run error')
  }
}
