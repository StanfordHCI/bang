import {Template} from '../models/templates'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {errorHandler} from '../services/common'
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
    newBatch.status = 'waiting';
    newBatch.users = [];
    /*const newBatch = {
      teamSize: process.env.TEAM_SIZE,
      users: [],
      numRounds: 4,
      format: [1, 2, 1, 3],
      experimentRound: 1,
      status: 'waiting',
      tasks: [],
      roundMinutes: process.env.ROUND_MINUTES
    }*/
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
          message: 'For this first task, I need you to answer a sequence of questions. Thanks for cooperating!',
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
    const templateList = await Template.find({}).select('name createdAt').lean().exec();
    res.json({templateList: templateList})
  } catch (e) {
    errorHandler(e, 'load templates error')
  }
}

export const addTemplate = async function (req, res) {
  try {
    let newTemplate = req.body;
    newTemplate.experimentRound = 3;
    const template = await Template.create(req.body);
    res.json({template: template})
  } catch (e) {
    errorHandler(e, 'add template error')
  }
}
