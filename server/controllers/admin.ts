import {User} from "../models/users";
const moment = require('moment')
require('dotenv').config({path: './.env'});
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {Survey} from '../models/surveys'
import {errorHandler} from '../services/common'
import {
  addHIT,
  getAccountBalance,
  notifyWorkers,
  letters,
  createTeams,
  expireHIT,
  assignQual,
  runningLive, payBonus, clearRoom, mturk
} from "./utils";
import {timeout} from './batches'
const logger = require('../services/logger');
const botId = '100000000000000000000001'
import { io} from '../index'
import {Bonus} from "../models/bonuses";
import {activeCheck} from "./users";


export const addBatch = async function (req, res) {
  try {
    const batches = await Batch.find({$or: [{status: 'waiting'}, {status: 'active'}]}).select('teamSize roundMinutes surveyMinutes numRounds').lean().exec();
    let batchSumCost = 0;
    batches.forEach(batch => {
      const moneyForBatch = (batch.teamSize ** 2) * 12 * (((batch.roundMinutes + batch.surveyMinutes)  * batch.numRounds) / 60);
      batchSumCost = batchSumCost + moneyForBatch;
    })

    let newBatch = req.body;

    if (process.env.MTURK_MODE !== 'off') {
      let balance = await getAccountBalance();
      balance = parseFloat(balance.AvailableBalance);
      const moneyForBatch = (newBatch.teamSize ** 2) * 12 * (((newBatch.roundMinutes + newBatch.surveyMinutes)  * newBatch.numRounds) / 60);
      if (balance < moneyForBatch + batchSumCost) {
        const message = 'Account balance: $' + balance + '. Experiment cost: $' + moneyForBatch.toFixed(2) +
          ' . Waiting/active batches cost: ' + batchSumCost.toFixed(2)
        await notifyWorkers([process.env.MTURK_NOTIFY_ID], message, 'Bang');
        logger.error(module, 'balance problems: ' + message);
        res.status(403).end();
        return;
      }
    }

    delete newBatch._id;
    delete newBatch.createdAt;
    delete newBatch.updatedAt;
    newBatch.templateName = newBatch.name;
    newBatch.status = 'waiting';
    newBatch.users = [];
    let roundGen = createTeams(newBatch.teamSize, newBatch.numRounds - 1, letters.slice(0, newBatch.teamSize ** 2));
    if (!newBatch.experimentRound1) {
      newBatch.experimentRound1 = Math.floor(Math.random() * (newBatch.numRounds - 2)) + 1;
      newBatch.experimentRound2 = Math.floor(Math.random() * (newBatch.numRounds - newBatch.experimentRound1 - 1)) + newBatch.experimentRound1 + 2;
    }
    let part1 = JSON.parse(JSON.stringify(roundGen)), part2 = JSON.parse(JSON.stringify(roundGen));
    part1.splice(newBatch.experimentRound2 - 1);
    part2.splice(0, newBatch.experimentRound2 - 1);
    part1.push(roundGen[newBatch.experimentRound1 - 1]);
    newBatch.roundGen = part1.concat(part2);

    if (process.env.MTURK_FRAME === 'ON' && process.env.MTURK_MODE !== 'off') {
      const HIT = await addHIT(newBatch, true);
      newBatch.HITId = HIT.HITId;
    }
    const batch = await Batch.create(newBatch);
    const preChat = await Chat.create({batch: batch._id, messages: [
        {
          nickname: 'helperBot',
          message: 'Hi, I am helperBot, welcome to our HIT!',
          user: botId,
          time: new Date
        },
        {
          nickname: 'helperBot',
          message: 'You must be able to stay for the duration of this task, around 1 hour. If you cannot stay for the entire time, ' +
          'please leave now. You will not be compensated if you leave preemptively.',
          user: botId,
          time: new Date
        },
        {
          nickname: 'helperBot',
          message: "We ask for your patience as we wait for enough active users to begin the task! " +
            "Each 3 minutes, you will be reminded to type something into the chat so that we know you're active and ready to begin.",
          user: botId,
          time: new Date
        },
    ]});
    const batchWithChat = await Batch.findByIdAndUpdate(batch._id, {$set: {preChat: preChat._id}})
    res.json({batch: batchWithChat})
    logger.info(module, 'New batch added. Mturk mode: ' + process.env.MTURK_MODE + '; Mturk frame: ' + process.env.MTURK_FRAME);

    let prs = [], counter = 0;
    prs.push(activeCheck(io))
    if (process.env.MTURK_MODE !== 'off') {
      const users = await User.find({systemStatus: 'willbang', isTest: false}).sort({createdAt: 1}).limit(200)
        .select('mturkId testAssignmentId').lean().exec();

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const url = process.env.HIT_URL + '?assignmentId=' + user.testAssignmentId + '&workerId=' + user.mturkId;
        const unsubscribe_url = process.env.HIT_URL + 'unsubscribe/' + user.mturkId; 
        const message = 'Hi! Our HIT is now active. We are starting a new experiment on Bang. ' + 
          'Your FULL participation will earn you a bonus of ~$12/hour. ' + '\n\n' +
          'Please join the HIT here: ' + url + '\n\n' +
          'The link will bring you to click the JOIN BATCH button which will allow you to enter the WAITING ROOM. ' + 
          'NOTE: You will be bonused $1 if enough users join the waiting room and the task starts' + '\n\n' + 
          'Our records indicate that you were interested in joining this HIT previously. ' +
          'If you are no longer interested in participating, please UNSUBSCRIBE here: ' + unsubscribe_url;
        notifyWorkers([user.mturkId], message, 'Bang')
          .then(() => {
            counter++;
          })
        if (i % 10 === 0) {
          await timeout(500);
          logger.info(module, 'Notification sent to ' + counter + ' users');
        }
      }
      logger.info(module, 'Notification sent to ' + users.length + ' users');

    }
    await Promise.all(prs)
  } catch (e) {
    errorHandler(e, 'add batch error')
  }
}

export const loadBatchList = async function (req, res) {
  try {
    const batchList = await Batch.find({ $or:[  {status: {$in: ['active', 'waiting']}}, {status: 'completed', startTime: {$exists: true}} ]})
      .sort({createdAt: -1}).select('createdAt startTime status currentRound teamSize templateName note maskType').lean().exec();
    res.json({batchList: batchList})
  } catch (e) {
    errorHandler(e, 'load batches error')
  }
}

export const loadUserList = async function (req, res) {
  try {
    const users = await User.find({}).select('mturkId systemStatus connected testAssignmentId isTest').lean().exec();
    users.forEach(user => {
      user.loginLink = process.env.HIT_URL + '?workerId=' + user.mturkId + '&assignmentId=' + user.testAssignmentId;
      return user;
    })
    res.json({users: users})
  } catch (e) {
    errorHandler(e, 'load users error')
  }
}

export const deleteUser = async function (req, res) {
  try {
    await User.findByIdAndRemove(req.body._id).lean().exec();
    res.json({user: {_id: req.body._id}})
  } catch (e) {
    errorHandler(e, 'delete user error')
  }
}

export const addUser = async function (req, res) {
  try {
    const token = Math.floor(Math.random() * 10000) + Date.now()
    let user = {
      token: token,
      mturkId: token,
      testAssignmentId: 'test',
      systemStatus: 'willbang',
      connected: false,
      isTest: true
    }
    await User.create(user);
    delete user.token;
    user.loginLink = process.env.HIT_URL + '?workerId=' + user.mturkId + '&assignmentId=' + user.testAssignmentId;
    res.json({user: user})
  } catch (e) {
    errorHandler(e, 'add user error')
  }
}

export const stopBatch = async function (req, res) {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, {$set: {status: 'completed'}}, {new: true}).populate('users.user').lean().exec()
    let usersChangeQuery = { batch: null, realNick: null, fakeNick: null, currentChat: null }
    if (batch.status === 'active' && process.env.MTURK_MODE !== 'off') { //compensations
      usersChangeQuery.systemStatus = 'hasbanged';
      if (process.env.MTURK_FRAME === 'ON') {
        await expireHIT(batch.HITId) //close main task
      }
      const batchLiveTime = moment().diff(moment(batch.startTime), 'seconds') / 3600;
      let bonus = 12 * batchLiveTime - 1;
      if (bonus > 15) bonus = 15;
      let bangPrs = [];
      batch.users.forEach(userObject => {
        const user = userObject.user;
        bangPrs.push(assignQual(user.mturkId, runningLive ? process.env.PROD_HAS_BANGED_QUAL : process.env.TEST_HAS_BANGED_QUAL))
        if (bonus > 0) {
          bangPrs.push(payBonus(user.mturkId, user.testAssignmentId, bonus))
          bangPrs.push(Bonus.create({
            batch: batch._id,
            user: user._id,
            amount: bonus,
            assignment: user.testAssignmentId
          }))
        }
      })
      await Promise.all(bangPrs)
    }

    await User.updateMany({batch:  batch._id}, { $set: usersChangeQuery})
    batch.users.forEach(user => {
      io.to(user.user.socketId).emit('stop-batch', true);
    })
    clearRoom(batch._id, io)
    logger.info(module, 'Batch stopped: ' + batch._id);
    res.json({batch: batch})
  } catch (e) {
    errorHandler(e, 'stop batch error')
  }
}

export const loadBatchResult = async function (req, res) {
  try {
    let [batch, surveys] = await Promise.all([
      Batch.findById(req.params.id).populate('users.user rounds.teams.chat').lean().exec(),
      Survey.find({batch: req.params.id}).lean().exec()
    ])
    batch.rounds.forEach((round, roundNumber) => {
      round.teams.forEach(team => {
        team.users.forEach(user => {
          user.survey = surveys.find(x => x.user.toString() === user.user.toString() && roundNumber + 1 === x.round)
          return user;
        })
        return team;
      })
      return round;
    })

    surveys = surveys.filter(x => !!x.isPost)

    batch.users.forEach(user => {
      user.survey = surveys.find(x => x.user.toString() === user.user._id.toString() && x.isPost)
      return user;
    })

    res.json({batch: batch})
  } catch (e) {
    errorHandler(e, 'load batch result error')
  }
}

export const notifyUsers = async function (req, res) {
  try {
    let prs = [], counter = 0;
    if (req.body.start) {
      const users = await User.find({systemStatus: 'willbang', isTest: false}).sort({createdAt: 1}).limit(parseInt(req.body.pass) + parseInt(req.body.limit))
        .select('mturkId testAssignmentId').lean().exec();
       
      for (let i = 0; i < users.length; i++) {
        if (i + 1 > parseInt(req.body.pass)) {
          const user = users[i];
          const url = process.env.HIT_URL + '?assignmentId=' + user.testAssignmentId + '&workerId=' + user.mturkId;
          const unsubscribe_url = process.env.HIT_URL + 'unsubscribe/' + user.mturkId; 
          const message = 'Hi! Our HIT is now active. We are starting a new experiment on Bang. ' + 
          'Your FULL participation will earn you a bonus of ~$12/hour. ' + '\n\n' +
          'Please join the HIT here: ' + url + '\n\n' +
          'The link will bring you to click the JOIN BATCH button which will allow you to enter the WAITING ROOM. ' + 
          'NOTE: You will be bonused $1 if enough users join the waiting room and the task starts' + '\n\n' + 
          'Our records indicate that you were interested in joining this HIT previously. ' +
          'If you are no longer interested in participating, please UNSUBSCRIBE here: ' + unsubscribe_url;
          notifyWorkers([user.mturkId], message, 'Bang')
            .then(() => {
              counter++;
            })
          if (i % 10 === 0) {
            await timeout(500);
            logger.info(module, 'Notification sent to ' + counter + ' users');
          }
        }
      }
      logger.info(module, 'Notification sent to ' + users.length + ' users');

    } else {
      const users = await User.find({systemStatus: 'willbang', isTest: false}).select('mturkId').lean().exec();
      let workers = [];
      users.forEach(user => {
        workers.push(user.mturkId);
        if (workers.length >= 99) {
          prs.push(notifyWorkers(workers.slice(), req.body.message, 'Bang'))
          workers = [];
        }
      })
      prs.push(notifyWorkers(workers.slice(), req.body.message, 'Bang'))
      await Promise.all(prs)
      logger.info(module, 'Notification sent to ' + users.length + ' users');
    }

    res.json({})
  } catch (e) {
    errorHandler(e, 'notify users error')
  }
}