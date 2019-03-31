import {Template} from '../models/templates'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {errorHandler} from '../services/common'
import {addHIT} from "./utils";
const logger = require('../services/logger');
const botId = '100000000000000000000001'


export const addBatch = async function (req, res) {
  try {
    const check = await Batch.findOne({status: 'waiting'}).select('_id') ;
    if (check) {
      logger.error(module, 'There is 1 waiting batch, you cant and more');
      res.status(403).end();
      return;
    }
    let newBatch = req.body;
    delete newBatch._id;
    newBatch.status = 'waiting';
    newBatch.users = [];
    newBatch.experimentRound1 = Math.floor(Math.random() * 2) + 1; //1 or 2
    if (newBatch.experimentRound1 === 1) {
      newBatch.experimentRound2 = Math.floor(Math.random() * 2) + 3; //3 or 4
    } else {
      newBatch.experimentRound2 = 4;
    }
    newBatch.midQuestions = [
      'The members of this team could work for a long time together.',
      'Most of the members of this team would welcome the opportunity to work as a group again in the future.',
      'This team has the capacity for long-term success.',
      'This team has what it takes to be effective in the future.',
      'This team would work well together in the future.',
      'This team has positioned itself well for continued success.',
      'This team has the ability to perform well in the future.',
      'This team has the ability to function as an ongoing unit.',
      'This team should continue to function as a unit.',
      'This team has the resources to perform well in the future.',
      'This team is well positioned for growth over time.',
      'This team can develop to meet future challenges.',
      'This team has the capacity to sustain itself.',
      'This team has what it takes to endure in future performance episodes.'
    ]
    const HIT = await addHIT(newBatch, true);
    newBatch.HITId = HIT.HITId;
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
    ]});
    const batchWithChat = await Batch.findByIdAndUpdate(batch._id, {$set: {preChat: preChat._id}})
    res.json({batch: batchWithChat})
  } catch (e) {
    errorHandler(e, 'add batch error')
  }
}

export const loadBatchList = async function (req, res) {
  try {
    const batchList = await Batch.find({}).select('createdAt startTime status currentRound teamSize').lean().exec();
    res.json({batchList: batchList})
  } catch (e) {
    errorHandler(e, 'add batch error')
  }
}

export const loadTemplateList = async function (req, res) {
  try {
    let select = '';
    if (req.query.full) {
      select = 'name roundMinutes numRounds experimentRound tasks teamSize'
    } else {
      select = 'name createdAt'
    }
    const templateList = await Template.find({}).select(select).lean().exec();
    res.json({templateList: templateList})
  } catch (e) {
    errorHandler(e, 'load templates error')
  }
}

export const addTemplate = async function (req, res) {
  try {
    let newTemplate = req.body;
    const template = await Template.create(req.body);
    res.json({template: template})
  } catch (e) {
    errorHandler(e, 'add template error')
  }
}
