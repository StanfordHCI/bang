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
  bestRound,
  worstRound,
} from "./utils";
import {errorHandler} from '../services/common'
import {io} from "../index";
const logger = require('../services/logger');
const botId = '100000000000000000000001'
const randomAnimal = "Squirrel Rhino Horse Pig Panda Monkey Lion Orangutan Gorilla Hippo Rabbit Wolf Goat Giraffe Donkey Cow Bear Bison".split(" ");
const randomAdjective = "new small young little likely nice cultured snappy spry conventional".split(" ");
const BEST = 'best';
const WORST = 'worst';
const STANDARD = 'standard';


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
  let chat, userInfo;
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
        chat.members.forEach(member => {
          const batchUser = batch.users.find(x => x.user.toString() === member._id.toString());
          if (batchUser) {
            member.isActive = batchUser.isActive;
          }
          return member;
        })
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

    let kickedUsers = [];
    for (let i = 0; i < numRounds; i++) {
      await roundRun(batch, users, rounds, i, oldNicks, teamSize, io, kickedUsers);
    }
    const postBatchInfo = {status: 'completed'};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: postBatchInfo}).lean().exec();
    io.to(batch._id.toString()).emit('refresh-batch', true)
    logger.info(module, batch._id + ' : end active stage')
    //last survey
    await timeout(240000);

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

const roundRun = async (batch, users, rounds, i, oldNicks, teamSize, io, kickedUsers) => {
  const teamFormat = batch.teamFormat;
  // for singleTeamed batches
  const reconveneBestCondition = batch.randomizeExpRound ? teamFormat === 'single' && batch.expRounds[0] === i + 1 :
      batch.numRounds === i + 1 && teamFormat === 'single';
  const reconveneWorstCondition = teamFormat === 'single' &&  batch.worstRounds.length ?
      batch.worstRounds[0] === i + 1 : false;
  if (reconveneBestCondition && reconveneWorstCondition) {
    console.log('reconvene logic error: running worst round');
  }
  let roundType;
  if (!reconveneWorstCondition && !reconveneBestCondition) {
    roundType = STANDARD;
  } else {
    if (reconveneWorstCondition) {
      roundType = WORST;
    } else {
      if (reconveneBestCondition) {
        roundType = BEST;
      }
    }
  }
  let task;
  if (teamFormat !== 'single' || roundType === STANDARD) { // standard flow
    task = batch.tasks[i];
  } else { // best round: we take last task
    if (roundType === BEST) {
      task = batch.tasks[batch.tasks.length - 1];
    }
    if (roundType === WORST) { // worst round: we take one-before-last task
      task = batch.tasks[batch.tasks.length - 2];
    }
  }
  let roundObject = {startTime: new Date(), number: i + 1, teams: [], status: task.hasPreSurvey ? 'presurvey' : 'active', endTime: null};
  let emptyChats = [];
  let chats;
  let teams;
  let prsHelper = [];
  switch (roundType) {
    case STANDARD:
      // if it is not the best or worst reconvening round of single-teamed batch
      // standard flow
      teams = generateTeams(batch.roundGen, users, i + 1, oldNicks);
      for (let j = 0; j < teamSize; j++) {
        emptyChats.push(makeNewChat([], batch, i, task))
      }
      chats = await Chat.insertMany(emptyChats);
      break;
    case BEST:
      // if batch is single-teamed and this is unmasked best exp round, we do not generate teams, but get them from the best round
      // also we do not generate chats and fake nicks
      const bestRoundResult = await bestRound(batch);
      const bestRoundIndex = bestRoundResult.bestRoundIndex;
      if (bestRoundIndex !== undefined) {
        // for setting scores field in DB
        const scores = bestRoundResult.scores;
        rounds.forEach((round, ind) => {rounds[ind].score = scores[ind] !== undefined ? scores[ind]: 0});
        // setting expRounds = [bestRoundIndex, lastRoundIndex]
        prsHelper.push(Batch.updateOne({_id: batch._id}, {$set: {expRounds: bestRoundResult.expRounds}}));
        const batchData = await Batch.findById(batch._id);
        const bestRound = batchData.rounds[bestRoundIndex];
        teams = bestRound.teams; // only one team
        const chatId = bestRound.teams[0].chat;
        const oldChat = await Chat.findById(chatId).lean().exec();
        const messages = oldChat.messages;
        const newChat = makeNewChat(messages, batch, i, task);
        const chat = await Chat.create(newChat);
        chats = [chat];
      }
      else {
        throw Error('Calculation of best round error');
      }
      break;

    case WORST:
      const worstRoundResult = await worstRound(batch);
      const worstRoundIndex = worstRoundResult.worstRoundIndex;
      if (worstRoundIndex !== undefined) {
        prsHelper.push(Batch.updateOne({_id: batch._id}, {$set: {worstRounds: worstRoundResult.worstRounds}}));
        const batchData = await Batch.findById(batch._id);
        const worstRound = batchData.rounds[worstRoundIndex];
        teams = worstRound.teams;
        const chatId = worstRound.teams[0].chat;
        const oldChat = await Chat.findById(chatId).lean().exec();
        const messages = oldChat.messages;
        const newChat = makeNewChat(messages, batch, i ,task);
        const chat = await Chat.create(newChat);
        chats = [chat];
      }
      break;
  }

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
  if (task.readingPeriods && task.readingPeriods.length) {
    for (let i = 0; i < task.readingPeriods.length; ++i) {
      const period = task.readingPeriods[i];
      const ind = i;
      logger.info(module, batch._id + ` : Begin reading period ${ind + 1} for round ${roundObject.number}`);
      roundObject.status = `readingPeriod${ind}`;
      const info = {rounds: rounds}
      batch = await Batch.findByIdAndUpdate(batch._id, {$set: info}).lean().exec();
      io.to(batch._id.toString()).emit('reading-period', info);
      await timeout(period.time * 60000)
    }
    roundObject.status = 'active';
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: {rounds: rounds}});
    io.to(batch._id.toString()).emit('refresh-batch', true);
  }

  if (task.hasPreSurvey) {
    logger.info(module, batch._id + ' : Begin pre-survey for round ' + roundObject.number);
    roundObject.status = 'presurvey';
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: {rounds: rounds}});
    io.to(batch._id.toString()).emit('pre-survey', {rounds: rounds});
    await timeout(batch.surveyMinutes * 60000);
    roundObject.status = 'active';
    const startTaskInfo =  {rounds: rounds};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: startTaskInfo}).lean().exec();
    io.to(batch._id.toString()).emit('start-task', startTaskInfo);
  }

  logger.info(module, batch._id + ' : Begin task for round ' + roundObject.number)
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
    roundObject.status = 'midsurvey';
    const midRoundInfo = {rounds: rounds};
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: midRoundInfo}).lean().exec();
    logger.info(module, batch._id + ' : Begin survey for round ' + roundObject.number)
    io.to(batch._id.toString()).emit('mid-survey', midRoundInfo);
    chats.forEach(chat => {
      clearRoom(chat._id, io)
    })
    await timeout(batch.surveyMinutes * 60000);
  }

  if (batch.hasPostSurvey && i === batch.numRounds - 1) {
    roundObject.status = 'postsurvey';
    const postRoundInfo = {rounds: rounds}
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: postRoundInfo}).lean().exec();
    logger.info(module, batch._id + ' : Begin post-survey for round ' + roundObject.number);
    io.to(batch._id.toString()).emit('post-survey', postRoundInfo);
    await timeout(batch.surveyMinutes * 60000);
  }
  const [filledChats, roundSurveys] = await Promise.all([
    Chat.find({_id: {$in: chats.map(x => x._id)}}).lean().exec(),
    Survey.find({batch: batch._id, round: i + 1, surveyType: {$in: ['presurvey', 'midsurvey']}}).select('user').lean().exec()
  ])
  for (const team of roundObject.teams) {
    for (const user of team.users) {
      const chat = filledChats.find(x => x._id.toString() === team.chat.toString());
      const userSurveys = roundSurveys.filter(x => x.user.toString() === user.user.toString());
      user.isActive = chat.messages.some(x => x.user.toString() === user.user.toString());
      const userInDB = await User.findById(user.user);
      if (userInDB.batch === null) {
        continue;
      }
      if (batch && !user.isActive && !kickedUsers.some(id => id === user.user.toString()) && userInDB.batch.toString() === batch._id.toString()) {
        await kickUser(user.user, batch._id, i + 1);
        kickedUsers.push(user.user.toString())
      }
    }
  }

  roundObject.endTime = new Date();
  roundObject.status = 'completed';
  const endRoundInfo = {rounds: rounds};
  batch = await Batch.findByIdAndUpdate(batch._id, {$set: endRoundInfo}).lean().exec();
  logger.info(module, batch._id + ' : End round ' + roundObject.number)
  io.to(batch._id.toString()).emit('end-round', endRoundInfo);
}

const kickUser = async (userId, batchId, kickedAfterRound) => {
  await Batch.findOneAndUpdate({_id: batchId, 'users.user': userId}, {$set: {'users.$.isActive': false, 'users.$.kickedAfterRound': kickedAfterRound}})
  const user = await User.findByIdAndUpdate(userId, { $set:
      { batch: null, realNick: null, currentChat: null, fakeNick: null, systemStatus: 'hasbanged'}}, {new: true}).lean().exec()
  io.to(user.socketId).emit('kick-afk', true);
  logger.info(module, batchId + ' : user kicked for being AFK. Mturk ID: ' + user.mturkId);
}

const makeNewChat = (messages, batch, i, task) => {
  return {batch: batch._id, messages: messages.concat({user: botId, nickname: 'helperBot', time: new Date(),
    message: 'Task: ' + (task ? task.message : 'empty')}), pinnedContent: batch.tasks[i].pinnedContent || []};
}
