import {activeCheck} from "./users";

require('dotenv').config({path: './.env'});
import {User} from '../models/users'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {Bonus} from '../models/bonuses'
import {Survey} from '../models/surveys'
import {clearRoom, expireHIT, assignQual, payBonus, chooseOne, runningLive, notifyWorkers} from './utils'
import {errorHandler} from '../services/common'
const logger = require('../services/logger');
const botId = '100000000000000000000001'
const randomAnimal = "Bison Eagle Pony Moose Deer Duck Rabbit Spider Wolf Lion Snake Shark Bird Bear Fish Horse Badger Marten Otter Lynx".split(" ");
const randomAdjective = "new small young little likely nice cultured snappy spry conventional".split(" ");


export const joinBatch = async function (data, socket, io) {
  try {
    let batch = await Batch.findOne({status: 'waiting'}).lean().exec();

    if (!batch) {
      logger.error(module, 'There is no waiting batch');
      socket.emit('send-error', 'There is no waiting batch')
      return;
    }
    if (socket.systemStatus === 'willbang' && batch.users.length < batch.teamSize ** 2) { //join to batch
      let nickname;
      while (!nickname) {
        nickname = chooseOne(randomAdjective) + chooseOne(randomAnimal);
        batch.users.forEach(user => {
          if (user.nickname === nickname) {
            nickname = false;
          }
        })
      }

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
          User.find({currentChat: chatId}).select('realNick fakeNick currentChat').lean().exec(),
          Survey.findOne({user: socket.userId, batch: data.batch, round: batch.currentRound}).select('_id').lean().exec()
        ])
        chat = prs[0];
        chat.members = prs[1]
        if (prs[2]) batch.surveyDone = true;
        userInfo = chat.members.find(x => x._id.toString() === socket.userId.toString())
        socket.join(chatId.toString())
      } else {
        chat = {};
        chat.members = [];
        chat.messages = [];
      }
    } else if (batch.status === 'completed') {
      const finalSurveyCheck = Survey.findOne({user: socket.userId, batch: data.batch, isPost: true}).select('_id').lean().exec();
      if (finalSurveyCheck) batch.finalSurveyDone = true;
    }

    socket.emit('loaded-batch', {batch: batch, chat: chat, userInfo: userInfo})
  } catch (e) {
    errorHandler(e, 'load batch error')
  }
}

const startBatch = async function (batch, socket, io) {
  try {
    await activeCheck(io);
    await timeout(3000);

    const users = await User.find({batch: batch._id}).lean().exec();
    if (users.length !== parseInt(batch.teamSize) ** 2) {
      logger.info(module, 'wrong users length - ' + users.length)
    }


    if (process.env.MTURK_MODE !== 'off') {
      let bangPrs = [];
      users.forEach(user => {
        bangPrs.push(assignQual(user.mturkId, runningLive ? process.env.PROD_HAS_BANGED_QUAL : process.env.TEST_HAS_BANGED_QUAL))
        bangPrs.push(payBonus(user.mturkId, user.testAssignmentId, 1.00))
        bangPrs.push(Bonus.create({
          batch: batch._id,
          user: user._id,
          amount: 1.00,
          assignment: user.testAssignmentId
        }))
      })
      await Promise.all(bangPrs)
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

      let teams = generateTeams(batch.roundGen, users, i+1, oldNicks)

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
        const step = task.steps[j];
        let time = j === 0 ? step.time : step.time - task.steps[j - 1].time;
        await timeout(batch.roundMinutes * time * 60000);
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
      }

      await timeout(batch.roundMinutes * (1 - task.steps[task.steps.length - 1].time) * 60000);

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
      await timeout(batch.surveyMinutes * 60000);
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

    if (process.env.MTURK_FRAME === 'ON' && process.env.MTURK_MODE !== 'off') {
      await expireHIT(batch.HITId)
    }
    if (runningLive) {
      await User.updateMany({batch: batch._id}, { $set: { realNick: null, currentChat: null, fakeNick: null, systemStatus: 'hasbanged'}})
    }
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
        logger.info(module, 'Blocked survey, survey exists');
        return;
      }
    }
    await Survey.create(newSurvey)
    if (process.env.MTURK_MODE !== 'off' && newSurvey.isPost) {
      const [batch, user] = await Promise.all([
        Batch.findById(newSurvey.batch).select('roundMinutes numRounds surveyMinutes').lean().exec(),
        User.findById(newSurvey.user).select('systemStatus mturkId').lean().exec()
      ])
      if (user.systemStatus === 'hasbanged') {
        logger.info(module, 'Blocked survey, hasbanged status');
        return;
      }
      let bonusPrice = (12 * (((batch.roundMinutes + batch.surveyMinutes) * batch.numRounds) / 60) - 1.00);
      if (bonusPrice > 15) {
        logger.info(module, 'Bonus was changed for batch ' + newSurvey.batch)
        await notifyWorkers([process.env.MTURK_NOTIFY_ID], 'Bonus was changed from ' + bonusPrice + '$ to 15$ for user ' + user.mturkId, 'Bang');
        bonusPrice = 15;
      }
      const bonus = await payBonus(socket.mturkId, socket.assignmentId, bonusPrice.toFixed(2))
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

const generateTeams = (roundGen, users, roundNumber, oldNicks) => {
  let teams = roundGen[roundNumber - 1].teams.map((team, index) => {
    let teamAnimals = [], teamUsers = [];
    team.users.forEach(user => {
      let partner = users[user].realNick.slice();
      for (let i = 0; i < partner.length; i++) {
        if (partner[i] === partner[i].toUpperCase()) {
          index = i;
          break;
        }
      }
      teamAnimals.push(partner.slice(0, index));
    });
    let animals = randomAnimal.slice().filter(x => !teamAnimals.some(y => y === x));
    let adjectives = randomAdjective.slice();
    for (let i = 0; i < team.users.length; i++) {
      let nickname, animal, adj;
      animals = animals.filter(x => !teamAnimals.some(y => y === x));
      while (true) {
        animal = chooseOne(animals);
        adj = chooseOne(adjectives);
        nickname = adj + animal;
        if (!oldNicks.some(x => x === nickname)) {
          oldNicks.push(nickname);
          teamAnimals.push(animal);
          teamUsers.push({user: users[team.users[i]]._id, nickname: nickname})
          break;
        }
      }
    }
    return {users: teamUsers};
  });
  return teams;
}
