require('dotenv').config({path: './.env'});
import {User} from '../models/users'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {Bonus} from '../models/bonuses'
import {Survey} from '../models/surveys'
import {clearRoom, expireHIT, makeName} from './utils'
import {errorHandler} from '../services/common'
const logger = require('../services/logger');
const botId = '100000000000000000000001'
import { assignQual, payBonus} from "./utils";


export const joinBatch = async function (data, socket, io) {
  try {
    let batch = await Batch.findOne({status: 'waiting'}).lean().exec();

    if (!batch) {
      logger.error(module, 'There is no waiting batch');
      socket.emit('send-error', 'There is no waiting batch')
      return;
    }
    if (socket.systemStatus === 'willbang' && batch.users.length < batch.teamSize ** 2) { //join to batch
      const nickname = makeName(null, null).username;
      let user;
      const prs = await Promise.all([
        Batch.findByIdAndUpdate(batch._id, { $addToSet: { users: {user: socket.userId, nickname: nickname, joinDate: new Date()}},  }, {new: true}),
        User.findByIdAndUpdate(socket.userId,
          { $set: { batch: batch._id, realNick: nickname, currentChat: batch.preChat} }, {new: true}).lean().exec()
      ])
      user = prs[1]
      batch = prs[0]
      socket.join(user.currentChat.toString()) //chat room
      socket.join(batch._id.toString()) //common room, not chat
      socket.emit('joined-batch', {user: user});
      io.to(batch._id.toString()).emit('refresh-batch', true)
    }
    if (batch.users.length >= batch.teamSize ** 2 && batch.status === 'waiting') { //start batch
      //clearRoom('waitroom', io);

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
        User.findById(socket.userId).select('realNick currentChat').lean().exec(),
      ])
      chat = prs[0];
      chat.members = [prs[1]]
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

const startBatch = async function (batch, socket, io) {
  try {
    await timeout(5000);
    const users = await User.find({batch: batch._id}).lean().exec();
    let bangPrs = [];
    users.forEach(user => {
      bangPrs.push(assignQual(user.mturkId, process.env.HAS_BANGED_QUAL))
      bangPrs.push(payBonus(user.mturkId, user.testAssignmentId, 1.01))
    })
    await Promise.all(bangPrs)

    if (users.length != batch.teamSize ** 2) {
      console.log('wrong users length') // do something?
    }
    const startBatchInfo = {status: 'active', startTime: new Date()};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: startBatchInfo}).lean().exec()
    logger.info(module, 'Main experiment start', batch._id)
    io.to(batch._id.toString()).emit('start-batch', startBatchInfo);
    const teamSize = batch.teamSize, numRounds = batch.numRounds;
    let rounds = [];
    let oldNicks = users.map(user => user.realNick)

    for (let i = 0; i < numRounds; i++) {
      let roundObject = {startTime: new Date(), number: i + 1, teams: [], status: 'active', endTime: null};
      const task = batch.tasks[i];
      let emptyChats = [];

      let teams = generateTeams(batch, users, i+1, oldNicks)

      for (let j = 0; j < teamSize; j++) { //simple gen for tests
        emptyChats.push({batch: batch._id, messages: [{user: botId, nickname: 'helperBot', time: new Date(),
            message: 'Task: ' + (task ? task.message : 'empty')}]})
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
      if (task && task.steps && task.steps.length) for (let j = 0; j < task.steps.length; j++) {
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
      await timeout(batch.roundMinutes * 30000);
      roundObject.endTime = new Date();
      roundObject.status = 'completed';
      const endRoundInfo = {rounds: rounds};
      batch = await Batch.findByIdAndUpdate(batch._id, {$set: endRoundInfo}).lean().exec();
      logger.info(module, 'End round ' + roundObject.number)
      io.to(batch._id.toString()).emit('end-round', endRoundInfo);
    }
    const postBatchInfo = {status: 'completed'};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: postBatchInfo}).lean().exec();
    io.to(batch._id.toString()).emit('end-batch', postBatchInfo);
    //last survey
    await timeout(120000);

    if (process.env.MTURK_FRAME === 'ON') {
      await expireHIT(batch.HITId)
    }
    await User.updateMany({batch: batch._id}, { $set: { batch: null, realNick: null, currentChat: null, fakeNick: null, systemStatus: 'hasbanged'}})
    logger.info(module, 'Main experiment end', batch._id)
    clearRoom(batch._id, io)
  } catch (e) {
    errorHandler(e, 'batch main run error')
  }
}

export const receiveSurvey = async function (data, socket, io) {
  try {
    let newSurvey = {
      ...data,
      user: socket.userId,
    }
    if (newSurvey.isPost) {
      const check = await Survey.findOne({batch: newSurvey.batch, user: newSurvey.user, isPost: true})
      if (check) {
        logger.info(module, 'Blocked survey');
        return;
      }
    }
    await Survey.create(newSurvey)
    if (newSurvey.isPost) {
      const batch = await Batch.findById(newSurvey.batch).select('roundMinutes numRounds').lean().exec();
      let bonusPrice = (12 * ((batch.roundMinutes * batch.numRounds * 1.5) / 60) - 1.01).toFixed(2);
      const bonus = await payBonus(socket.mturkId, socket.assignmentId, bonusPrice)
      if (bonus) {
        const newBonus = {
          batch: newSurvey.batch,
          user: socket.userId,
          amount: bonusPrice,
          assignment: socket.assignmentId
        }
        await Bonus.create(newBonus)
        logger.info('module', 'Bonus sent to ' + socket.mturkId)
      }
    }

  } catch (e) {
    errorHandler(e, 'receive survey error')
  }
}

const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const generateTeams = (batch, users, roundNumber, oldNicks) => {
  let teams = [];

  const rand = Math.floor(Math.random() * 2);
  const randomIndex1 = rand + 2; //2 or 3
  const randomIndex2 = 5 - randomIndex1;

  //logic for teamsize=2 and 4 rounds, not perfect.
  if (roundNumber === batch.experimentRound1 || roundNumber === batch.experimentRound2) {
    const user1 = generateTeamUser(users[0], oldNicks, users[1].realNick);
    const user2 = generateTeamUser(users[1], oldNicks, users[0].realNick)
    const user3 = generateTeamUser(users[2], oldNicks, users[3].realNick);
    const user4 = generateTeamUser(users[3], oldNicks, users[2].realNick)
    teams[0] = {users: [user1, user2]};
    teams[1] = {users: [user3, user4]};
    return teams;
  }
  if (roundNumber === 1 || roundNumber === 2) {
    const user1 = generateTeamUser(users[0], oldNicks, users[randomIndex1].realNick);
    const user2 = generateTeamUser(users[randomIndex1], oldNicks, users[0].realNick)
    const user3 = generateTeamUser(users[1], oldNicks, users[randomIndex2].realNick);
    const user4 = generateTeamUser(users[randomIndex2], oldNicks, users[1].realNick)
    teams[0] = {users: [user1, user2]};
    teams[1] = {users: [user3, user4]};
    return teams;
  }
  if (roundNumber === 3 || roundNumber === 4) {
    const user1 = generateTeamUser(users[0], oldNicks, users[randomIndex2].realNick);
    const user2 = generateTeamUser(users[randomIndex2], oldNicks, users[0].realNick)
    const user3 = generateTeamUser(users[1], oldNicks, users[randomIndex1].realNick);
    const user4 = generateTeamUser(users[randomIndex1], oldNicks, users[1].realNick)
    teams[0] = {users: [user1, user2]};
    teams[1] = {users: [user3, user4]};
    return teams;
  }
}

const generateTeamUser = (user, oldNicks, partner) => {
  let nickname, adj, animal, index;
  if (partner) {
    for (let i = 0; i < partner.length; i++) {
      if (partner[i] === partner[i].toUpperCase()) {
        index = i;
        break;
      }
    }
    adj = partner.slice(index, partner.length);
    animal = partner.slice(0, index);
  }
  while (true) {
    nickname = makeName(null, null).username;
    if (!oldNicks.some(x => x === nickname) && (!partner || (nickname.indexOf(adj) === -1 && nickname.indexOf(animal) === -1))) {
      oldNicks.push(nickname)
      break;
    }
  }
  return {user: user._id, nickname: nickname}
}
