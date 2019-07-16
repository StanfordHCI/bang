require('dotenv').config({path: './.env'});
import {SurveyTemplate} from '../models/surveytemplates'
import {errorHandler} from '../services/common'

export const loadSurveyList = async function (req, res) {
  try {
    let select = '';
    if (req.query.full) {
      select = ''
    } else {
      select = 'name'
    }
    const surveyList = await SurveyTemplate.find({}).select(select).lean().exec();
    res.json({surveyList: surveyList})
  } catch (e) {
    errorHandler(e, 'load surveys error')
  }
}

export const loadSurvey = async function (req, res) {
  try {
    const survey = await SurveyTemplate.findById(req.params.id).lean().exec();
    res.json({survey: survey})
  } catch (e) {
    errorHandler(e, 'load survey error')
  }
}

export const addSurvey = async function (req, res) {
  try {
    const survey = await SurveyTemplate.create(req.body);
    res.json({survey: survey})
  } catch (e) {
    errorHandler(e, 'add survey error')
  }
}

export const deleteSurvey = async function (req, res) {
  try {
    await SurveyTemplate.findByIdAndRemove(req.body._id).exec();
    res.json({survey: {_id: req.body._id}})
  } catch (e) {
    errorHandler(e, 'add survey error')
  }
}

export const cloneSurvey = async function (req, res) {
  try {
    let original = await SurveyTemplate.findById(req.body._id).lean().exec();
    delete original._id;
    original.name = original.name + ' (copy)';
    const survey = await SurveyTemplate.create(original);
    res.json({survey: {_id: survey._id, name: survey.name, teamSize: survey.teamSize}})
  } catch (e) {
    errorHandler(e, 'clone survey error')
  }
}

export const updateSurvey = async function (req, res) {
  try {
    const survey = await SurveyTemplate.findByIdAndUpdate(req.body._id, {$set: req.body}, {new: true}).lean().exec();
    res.json({survey: survey})
  } catch (e) {
    errorHandler(e, 'add survey error')
  }
}