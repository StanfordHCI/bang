import {User} from "../models/users";

const moment = require('moment')
require('dotenv').config({path: './.env'});
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {Survey} from '../models/surveys'
import {errorHandler} from '../services/common'
import {
  addHIT,
  listWorkersWithQualificationType,
  listHITs,
  getAccountBalance,
  notifyWorkers,
  letters,
  createTeams,
  expireHIT,
  assignQual,
  getBatchTime,
  runningLive, payBonus, clearRoom, mturk, listAssignmentsForHIT, createOneTeam
} from "./utils";
import {timeout} from './batches'

const logger = require('../services/logger');
const botId = '100000000000000000000001'
import {io} from '../index'
import {Bonus} from "../models/bonuses";
import {activeCheck} from "./users";


export const addBatch = async function (req, res) {
  try {
    const teamFormat = req.body.teamFormat;
    const batches = await Batch.find({$or: [{status: 'waiting'}, {status: 'active'}]}).select('tasks teamSize roundMinutes surveyMinutes numRounds').lean().exec();
    let batchSumCost = 0;
    batches.forEach(batch => {
      const moneyForBatch = (batch.teamSize ** 2) * 12 * getBatchTime(batch);
      batchSumCost = batchSumCost + moneyForBatch;
    })
    let newBatch = req.body;
    if (process.env.MTURK_MODE !== 'off') {
      let balance = await getAccountBalance();
      balance = parseFloat(balance.AvailableBalance);
      const moneyForBatch = (newBatch.teamSize ** 2) * 12 * getBatchTime(newBatch);
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
    newBatch.users = [], newBatch.expRounds = [], newBatch.roundGen = [];
    let tasks = [], nonExpCounter = 0;
    let roundGen;
    if (teamFormat === 'single') {
      roundGen = createOneTeam(newBatch.teamSize, newBatch.numRounds - 1, letters.slice(0, newBatch.teamSize ** 2));
    }
    else {
      roundGen = createTeams(newBatch.teamSize, newBatch.numRounds - newBatch.numExpRounds + 1, letters.slice(0, newBatch.teamSize ** 2));
    }
    for (let i = 0; i < newBatch.numExpRounds; i++) {
      const min = newBatch.expRounds[i - 1] ? newBatch.expRounds[i - 1] + 1 : 0;
      const max = newBatch.numRounds - (newBatch.numExpRounds - i - 1) * 2;
      const roundNumber = Math.floor(Math.random() * (max - min)) + 1 + min;
      newBatch.expRounds.push(roundNumber)
    }
    if (teamFormat !== 'single') {
      for (let i = 0; i < newBatch.numRounds; i++) {
        const expIndex = newBatch.expRounds.findIndex(x => x === i + 1);
        if (expIndex > -1) {//exp round
          tasks[i] = newBatch.tasks[expIndex];
          if (expIndex === 0) { //first exp round
            newBatch.roundGen[i] = JSON.parse(JSON.stringify(roundGen[roundGen.length - 1]));
            roundGen.length = roundGen.length - 1;
          } else { //same team
            newBatch.roundGen[i] = newBatch.roundGen[newBatch.expRounds[0] - 1]
          }
        } else { //non-exp round
          tasks[i] = newBatch.tasks[newBatch.numExpRounds + nonExpCounter];
          newBatch.roundGen[i] = JSON.parse(JSON.stringify(roundGen[roundGen.length - 1]));
          roundGen.length = roundGen.length - 1;
          nonExpCounter++;
        }
      }
      newBatch.tasks = tasks;
    }
    else {
      newBatch.roundGen = roundGen;
    }


    const batch = await Batch.create(newBatch);
    const preChat = await Chat.create({
      batch: batch._id, messages: [
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
      ]
    });
    const batchWithChat = await Batch.findByIdAndUpdate(batch._id, {$set: {preChat: preChat._id}})
    res.json({batch: batchWithChat})
    logger.info(module, 'New batch added. Mturk mode: ' + process.env.MTURK_MODE + '; Mturk frame: ' + process.env.MTURK_FRAME);

    let prs = [], counter = 0;
    prs.push(activeCheck(io))
    if (process.env.MTURK_MODE !== 'off') {
      let users;
      if (!newBatch.loadTeamOrder) {
        users = await User.find({systemStatus: 'willbang', isTest: false}).sort({createdAt: -1}).limit(200)
          .select('mturkId testAssignmentId').lean().exec();
      } else {
        const batchId = newBatch.loadTeamOrder;
        const loadingBatch = await Batch.findOne({_id: batchId});
        const roundGen = loadingBatch.roundGen;
        const rounds = loadingBatch.rounds;
        const teams = rounds[0].teams;
        const genTeams = roundGen[0].teams;
        const batchUsers = [];
        const numberedUsers = {};
        const genUsers = [];
        for (const team of teams) {
          for (const user of team.users) {
            batchUsers.push(user);
          }
        }
        for (const team of genTeams) {
          for (const user of team.users) {
            genUsers.push(user);
          }
        }
        batchUsers.forEach((user, i) => {numberedUsers[genUsers[i]] = user}) // makes a dict with format {genNumber: user, ...}
        users = [];
        for (const i in batchUsers) {
          const user = await User.findOne({_id: batchUsers[i].user})
          Object.assign(user, {genNumber : i, batchId: batchId});
          users.push(user);
        }
      }

      await startNotification(users);
    }
    await Promise.all(prs)
  } catch (e) {
    errorHandler(e, 'add batch error')
  }
}

export const loadBatchList = async function (req, res) {
  const remembered = req.query.remembered ? req.query.remembered : undefined; // option to load only remembered batches
  try {
    let select = '';
    if (!req.query.full) {
      select = 'createdAt startTime status currentRound teamSize templateName note maskType';
    }
    const predicate = remembered ? {rememberTeamOrder: true, rounds: { $ne: [ ]}} : {}; // if remembered loads only batches with remembered == true
    const batchList = await Batch.find(predicate).sort({createdAt: -1}).select(select).lean().exec();
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
    let batch = await Batch.findByIdAndUpdate(req.params.id, {$set: {status: 'completed'}}).populate('users.user').lean().exec()
    let usersChangeQuery = {batch: null, realNick: null, fakeNick: null, currentChat: null}
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
          bangPrs.push(payBonus(user.mturkId, user.testAssignmentId, bonus.toFixed(2)))
          bangPrs.push(Bonus.create({
            batch: batch._id,
            user: user._id,
            amount: bonus.toFixed(2),
            assignment: user.testAssignmentId
          }))
        }
      })
      await Promise.all(bangPrs)
    }

    await User.updateMany({batch: batch._id}, {$set: usersChangeQuery})
    io.to(batch._id.toString()).emit('stop-batch', {status: batch.status})
    clearRoom(batch._id, io)
    logger.info(module, 'Batch stopped: ' + batch._id);
    batch.status = 'completed';
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
          user.midSurvey = surveys.find(x => x.surveyType === 'midsurvey' && x.user.toString() === user.user.toString() && roundNumber + 1 === x.round)
          user.preSurvey = surveys.find(x => x.surveyType === 'presurvey' && x.user.toString() === user.user.toString() && roundNumber + 1 === x.round)
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
    let prs = [];
    if (req.body.start) {
      const users = await User.find({systemStatus: 'willbang', isTest: false})
        .sort({createdAt: -1}).skip(parseInt(req.body.pass)).limit(parseInt(req.body.limit))
        .select('mturkId testAssignmentId').lean().exec();
      await startNotification(users);
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

const startNotification = async (users) => {
  let counter = 0;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    let url = process.env.HIT_URL + '?assignmentId=' + user.testAssignmentId + '&workerId=' + user.mturkId;
    if (user.genNumber) {
      url += '&genNumber=' + user.genNumber;
    }
    console.log('batchId: ', user.batchId);
    if (user.batchId) {
      url += '&batchId=' + user.batchId;
    }
    const unsubscribe_url = process.env.HIT_URL + 'unsubscribe/' + user.mturkId;
    const message = 'Hi! Our HIT is now active. We are starting a new experiment on Bang. ' +
      'Your FULL participation will earn you a bonus of ~$12/hour. ' + '\n\n' +
      'Please join the HIT here: ' + url + '\n\n' +
      'The link will bring you to click the JOIN BATCH button which will allow you to enter the WAITING ROOM. ' +
      'NOTE: You will be bonused $1 if enough users join the waiting room and the task starts.' + '\n\n' +
      'Our records indicate that you were interested in joining this HIT previously. ' +
      'If you are no longer interested in participating, please UNSUBSCRIBE here: ' + unsubscribe_url;

    notifyWorkers([user.mturkId], message, 'Bang')
      .then(() => {
        counter++;
      })
      .catch(e => {

      })
    if (i % 5 === 0 && i > 0) {
      await timeout(400);
    }

  }
  logger.info(module, 'Start notification sent to ' + users.length + ' users');
}

export const migrateUsers = async (req, res) => {
  try {
    let stop = false, NextToken = '', willbangUsers = [], hasbangedUsers = [], assignments = [], deleteCounter = 0;

    while (!stop) {
      let params = {
        MaxResults: 100,
        QualificationTypeId: '3H0YKIU04V7ZVLLJH5UALJTJGXZ6DG'
      };
      if (NextToken) {
        params.NextToken = NextToken;
      }
      const data = await listWorkersWithQualificationType(params);
      hasbangedUsers = hasbangedUsers.concat(data.Qualifications)
      NextToken = data.NextToken;
      if (!NextToken) stop = true;
      console.log('hasbanged users loaded: ' + data.Qualifications.length)
    }

    console.log(hasbangedUsers.length + ' hasbanged users are here')

    stop = false;
    NextToken = '';
    while (!stop) {
      let params = {
        MaxResults: 100,
        QualificationTypeId: '3H3KEN1OLSVM98I05ACTNWVOM3JBI9'
      };
      if (NextToken) {
        params.NextToken = NextToken;
      }
      const data = await listWorkersWithQualificationType(params);
      willbangUsers = willbangUsers.concat(data.Qualifications)
      NextToken = data.NextToken;
      if (!NextToken) stop = true;
      console.log('willbang users loaded: ' + data.Qualifications.length)
    }

    console.log(willbangUsers.length + ' willbang users are here')

    stop = false;
    NextToken = '';
    while (!stop) {
      let params = {
        MaxResults: 100
      };
      if (NextToken) {
        params.NextToken = NextToken;
      }
      const data = await listHITs(params);
      for (let i = 0; i < data.HITs.length; i++) {
        let stopAs = false, asNextToken = '';
        while (!stopAs) {
          const HIT = data.HITs[i];
          let asParams = {
            HITId: HIT.HITId,
            AssignmentStatuses: ['Submitted', 'Approved'],
            MaxResults: 100,
          };
          if (asNextToken) {
            asParams.NextToken = asNextToken;
          }
          const as = await listAssignmentsForHIT(asParams);
          assignments = assignments.concat(as.Assignments);
          console.log(as.Assignments.length + ' added')
          asNextToken = as.NextToken;
          if (as.Assignments.length < 100) stopAs = true;
        }
      }
      NextToken = data.NextToken;
      if (!NextToken) stop = true;
      const lastMemoryUsage = Math.ceil(process.memoryUsage().heapUsed / 1024 / 1024);
      console.log('memory: ' + lastMemoryUsage)
    }

    console.log(assignments.length + ' assignments are here')

    let insertUsers = [];

    willbangUsers.forEach(async user => {
      const as = assignments.find(x => {
        return x.WorkerId == user.WorkerId;
      });
      const hasBanged = hasbangedUsers.some(x => x.WorkerId === user.WorkerId)
      if (as && !hasBanged) {
        insertUsers.push(User.create({
          testAssignmentId: as.AssignmentId,
          mturkId: as.WorkerId,
          token: as.WorkerId,
        }))
      }
    })
    console.log('insert: ' + insertUsers.length)

    await Promise.all(insertUsers);

    res.json({})
  } catch (e) {
    errorHandler(e, 'migrate users error')
  }

}