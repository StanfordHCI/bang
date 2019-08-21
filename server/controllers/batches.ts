import {activeCheck} from "./users";

require('dotenv').config({path: './.env'});
import {User} from '../models/users'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {Bonus} from '../models/bonuses'
import {Survey} from '../models/surveys'
import {
  clearRoom,
  expireHIT,
  assignQual,
  payBonus,
  chooseOne,
  runningLive,
  notifyWorkers,
  getBatchTime,
  bestRound
} from "./utils";
import {errorHandler} from '../services/common'
const logger = require('../services/logger');
const botId = '100000000000000000000001'
const randomAnimal = "Squirrel Rhino Horse Pig Panda Monkey Lion Orangutan Gorilla Hippo Rabbit Wolf Goat Giraffe Donkey Cow Bear Bison".split(" ");
const randomAdjective = "new small young little likely nice cultured snappy spry conventional".split(" ");


export const joinBatch = async function (data, socket, io) {
  try {
    let batches = await Batch.find({status: 'waiting'}).sort({'createdAt': 1}).lean().exec();
    if (!batches || !batches.length) {
      logger.error(module, 'There is no waiting batch');
      socket.emit('send-error', 'We are full now, sorry. Join us later please.')
      return;
    }
    let batch = batches[0];
    const totalBatchUsers = batch.teamFormat === 'single' ? batch.teamSize : batch.teamSize ** 2;
    if (socket.systemStatus === 'willbang' && batch.users.length < totalBatchUsers &&
      !batch.users.some(x => x.user.toString() === socket.userId.toString())) { //join to batch
      let nickname;
      let adjective;
      let animal;
      while (!nickname) {
        animal = chooseOne(randomAnimal);
        adjective = chooseOne(randomAdjective);
        nickname = adjective + animal;
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
      await activeCheck(io);
    } else {
      let reason;
      if (socket.systemStatus !== 'willbang') {
        reason = 'wrong system status';
      } else if (batch.users.length >= totalBatchUsers) {
        reason = 'experiment is full';
      } else {
        reason = 'already joined'
      }
      logger.error(module, 'User ' + socket.mturkId + ' cannot join to batch. Reason: ' + reason);
      socket.emit('send-error', 'You cannot join. Reason: ' + reason)
      return;
    }
    let batchReady = false;
    if (batch.teamFormat === 'single') {
      batchReady = batch.users.length >= batch.teamSize && batch.status === 'waiting';
    }
    else {
      batchReady = batch.users.length >= batch.teamSize ** 2 && batch.status === 'waiting'
    }
    if (batchReady) { //start batch
      clearRoom(batch.preChat, io);
      await startBatch(batch, socket, io)
    }

  } catch (e) {
    errorHandler(e, 'join batch error')
  }
}

export const loadBatch = async function (data, socket, io) {
  let chat, userInfo, teamUsers = [];
  try {
    const batch = await Batch.findById(data.batch).lean().exec();
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
              teamUsers = team.users;
            }
          })
        })
        const prs = await Promise.all([
          Chat.findById(chatId).lean().exec(),
          User.find({currentChat: chatId}).select('realNick fakeNick currentChat').lean().exec(),
          Survey.findOne({user: socket.userId, batch: data.batch, round: batch.currentRound, surveyType: round.status}).select('_id').lean().exec()
        ])
        chat = prs[0];
        chat.members = prs[1];
        /*chat.members.forEach(member => {
          const teamUser = teamUsers.find(x => x.user.toString() === member._id.toString());
          if (teamUser) {
            member.isActive = teamUser.isActive;
          }
          return member;
        })*/
        if (prs[2]) batch.surveyDone = true;
        userInfo = chat.members.find(x => x._id.toString() === socket.userId.toString())
        socket.join(chatId.toString())
      } else {
        chat = {};
        chat.members = [];
        chat.messages = [];
      }
    } else if (batch.status === 'completed') {
      const [finalSurveyCheck, surveyCounter] = await Promise.all([
        Survey.findOne({user: socket.userId, batch: data.batch, surveyType: 'final'}).select('_id').lean().exec(),
        Survey.count({user: socket.userId, batch: data.batch, surveyType: {$in: ['presurvey', 'midsurvey']}})
      ])
      batch.surveyCounter = surveyCounter;
      if (finalSurveyCheck) batch.finalSurveyDone = true;
    }

    socket.emit('loaded-batch', {batch: batch, chat: chat, userInfo: userInfo})
  } catch (e) {
    errorHandler(e, 'load batch error, user: ' + socket.userId)
    console.log(chat)
  }
}

const startBatch = async function (batch, socket, io) {
  try {
    await timeout(3000);
    const users = await User.find({batch: batch._id}).lean().exec();
    const expectedUsersLength = batch.teamFormat === 'single' ? parseInt(batch.teamSize) : parseInt(batch.teamSize) ** 2;
    if (users.length !== expectedUsersLength) {
      logger.error(module, 'wrong users length - ' + users.length + '; batch will be finished');
      await Batch.findByIdAndUpdate(batch._id, {$set: {status: 'completed'}}).lean().exec()
      await User.updateMany({batch: batch._id}, { $set: { batch: null, realNick: null, currentChat: null, fakeNick: null}})
      return;
    }

    if (process.env.MTURK_MODE !== 'off') {
      const prsHelper = [];
      for (const user of users) {
        prsHelper.push(assignQual(user.mturkId, runningLive ? process.env.PROD_HAS_BANGED_QUAL : process.env.TEST_HAS_BANGED_QUAL));
      }
      await Promise.all(prsHelper);
    }

    const startBatchInfo = {status: 'active', startTime: new Date()};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: startBatchInfo}).lean().exec()
    await activeCheck(io);
    logger.info(module, 'Main experiment start: ' + batch._id)
    io.to(batch._id.toString()).emit('start-batch', startBatchInfo);
    const teamSize = batch.teamSize, numRounds = batch.numRounds;
    let rounds = [];
    let oldNicks = users.map(user => user.realNick)

    for (let i = 0; i < numRounds; i++) {
      await roundRun(batch, users, rounds, i, oldNicks, teamSize, io);
    }
    const postBatchInfo = {status: 'completed'};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: postBatchInfo}).lean().exec();
    io.to(batch._id.toString()).emit('refresh-batch', true)
    logger.info(module, batch._id + ' : end active stage')
    //last survey
    await timeout(240000);

    if (process.env.MTURK_FRAME === 'ON' && process.env.MTURK_MODE !== 'off') {
      await expireHIT(batch.HITId)
    }
    await User.updateMany({batch: batch._id}, { $set: { batch: null, realNick: null, currentChat: null, fakeNick: null, systemStatus: 'hasbanged'}})
    logger.info(module, 'Main experiment end: ' + batch._id)
    clearRoom(batch._id, io)
  } catch (e) {
    errorHandler(e, 'batch main run error')
    logger.info(module, 'batch finished: ' +  batch._id);
    await Promise.all([
      notifyWorkers([process.env.MTURK_NOTIFY_ID], 'Batch main run error. Batch was finished. Check logs please.', 'Bang'),
      Batch.findByIdAndUpdate(batch._id, {$set: {status: 'completed'}}).lean().exec(),
      User.updateMany({batch: batch._id}, { $set: { batch: null, realNick: null, currentChat: null, fakeNick: null, systemStatus: 'hasbanged'}})
    ])
  }
}

export const receiveSurvey = async function (data, socket, io) {
  try {
    let newSurvey = {
      ...data,
      user: socket.userId,
    }
    if (newSurvey.surveyType === 'final') {
      const check = await Survey.findOne({batch: newSurvey.batch, user: newSurvey.user, surveyType: 'final'})
      if (check) {
        logger.info(module, 'Blocked survey, survey exists');
        return;
      }
    }
    await Survey.create(newSurvey)
    if (process.env.MTURK_MODE !== 'off' && newSurvey.surveyType === 'final') {
      const [batch, user] = await Promise.all([
        Batch.findById(newSurvey.batch).select('_id roundMinutes numRounds surveyMinutes tasks teamFormat').lean().exec(),
        User.findById(newSurvey.user).select('_id systemStatus mturkId').lean().exec()
      ])
      if (!batch) {
        logger.info(module, 'Blocked survey, survey/user does not have batch');
        return;
      }
      if (batch.teamFormat === 'single') {
        await bestRound(batch); // set the field 'score' for every round with a midSurvey
      }
      let bonusPrice = (12 * getBatchTime(batch));
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

export const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const payStartBonus = async (users, batch) => {
  let bangPrs = [];
  users.forEach(user => {
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
          teamUsers.push({user: users[team.users[i]]._id, nickname: nickname, adjective: adj, animal: animal})
          break;
        }
      }
    }
    return {users: teamUsers};
  });
  return teams;
}

const roundRun = async (batch, users, rounds, i, oldNicks, teamSize, io) => {
  const task = batch.tasks[i];
  let roundObject = {startTime: new Date(), number: i + 1, teams: [], status: task.hasPreSurvey ? 'presurvey' : 'active', endTime: null};
  let emptyChats = [];
  let chats;
  let teams;
  const teamFormat = batch.teamFormat;
  if (batch.numRounds !== i + 1 || teamFormat !== 'single') {
    // if it is not the last round of single-teamed batch
    // standard flow
    teams = generateTeams(batch.roundGen, users, i + 1, oldNicks);
    for (let j = 0; j < teamSize; j++) {
      emptyChats.push({batch: batch._id, messages: [{user: botId, nickname: 'helperBot', time: new Date(),
          message: 'Task: ' + (task ? task.message : 'empty')}]})
    }
    chats = await Chat.insertMany(emptyChats);
    } else {
      // if batch is single-teamed and the round is final, we do not generate teams, but get them from the best round
      // also we do not generate chats and fake nicks
      const bestRoundIndex = await bestRound(batch);
      if (bestRoundIndex !== undefined) {
        const batchData = await Batch.findById(batch._id);
        const bestRound = batchData.rounds[bestRoundIndex];
        teams = bestRound.teams; // only one team
        const chatId = bestRound.teams[0].chat;
        const newMessage = {
          user: botId,
          nickname: 'helperBot',
          message: 'Task: ' + (task ? task.message : 'empty'),
          time: new Date()
        };
        const chat = await Chat.findByIdAndUpdate(chatId, { $addToSet: { messages: newMessage} }, {new: true}).populate('batch').lean().exec();
        chats = [chat];
      }
      else {
        throw Error('Calculation of best round error');
      }
  }
  let prsHelper = [];
  teams.forEach((team, index) => {
    team.chat = chats[index]._id;
    team.users.forEach(user => {
      prsHelper.push(User.findByIdAndUpdate(user.user, {$set: {fakeNick: user.nickname, currentChat: team.chat,}}));
      return user;
    })
    return team;
  })
  await Promise.all(prsHelper);
  roundObject.teams = teams;
  rounds.push(roundObject);

  batch = await Batch.findByIdAndUpdate(batch._id, {$set: {rounds: rounds, currentRound: roundObject.number}}).lean().exec();
  logger.info(module, batch._id + ' : Begin round ' + roundObject.number)
  io.to(batch._id.toString()).emit('refresh-batch', true)

  if (task.hasPreSurvey) {
    logger.info(module, batch._id + ' : Begin pre-survey for round ' + roundObject.number)
    await timeout(batch.surveyMinutes * 60000);
    roundObject.status = 'active';
    const startTaskInfo =  {rounds: rounds};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: startTaskInfo}).lean().exec();
    logger.info(module, batch._id + ' : Begin task for round ' + roundObject.number)
    io.to(batch._id.toString()).emit('start-task', startTaskInfo);
  }

  let stepsSumTime = 0;
  for (let j = 0; j < task.steps.length; j++) {
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

  if (task.hasMidSurvey) {
    const filledChats = await Chat.find({_id: {$in: chats.map(x => x._id)}}).lean().exec();
    roundObject.status = 'midsurvey';
    roundObject.teams.forEach((team, index) => {
      team.users.forEach(user => {
        const chat = filledChats.find(x => x._id.toString() === team.chat.toString());
        user.isActive = chat.messages.some(x => x.user.toString() === user.user.toString());
        return user;
      })
      return team;
    })
    const midRoundInfo = {rounds: rounds};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: midRoundInfo}).lean().exec();
    logger.info(module, batch._id + ' : Begin survey for round ' + roundObject.number)
    io.to(batch._id.toString()).emit('mid-survey', midRoundInfo);
    chats.forEach(chat => {
      clearRoom(chat._id, io)
    })
    await timeout(batch.surveyMinutes * 60000);
  }

  roundObject.endTime = new Date();
  roundObject.status = 'completed';
  const endRoundInfo = {rounds: rounds};
  batch = await Batch.findByIdAndUpdate(batch._id, {$set: endRoundInfo}).lean().exec();
  logger.info(module, batch._id + ' : End round ' + roundObject.number)
  io.to(batch._id.toString()).emit('end-round', endRoundInfo);
}
