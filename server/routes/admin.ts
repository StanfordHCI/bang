import * as express from 'express';
const adminController = require('../controllers/admin');
const templateController = require('../controllers/templates');
const surveyController = require('../controllers/surveys');



module.exports = function (app) {
  let adminRoutes =  express.Router();

  adminRoutes
    .get('/users', adminController.loadUserList)
    .delete('/users', adminController.deleteUser)
    .post('/users/', adminController.addUser)
    .post('/pay-bonus/', adminController.bonusAPI)
    .get('/batches/', adminController.loadBatchList)
    .get('/batch-result/:id/', adminController.loadBatchResult)
    .put('/batches/:id/stop/', adminController.stopBatch)
    .post('/batches/', adminController.addBatch)


    .get('/templates/:id', templateController.loadTemplate)
    .get('/templates/', templateController.loadTemplateList)
    .post('/templates/clone/', templateController.cloneTemplate)
    .post('/templates/', templateController.addTemplate)
    .put('/templates', templateController.updateTemplate)
    .delete('/templates', templateController.deleteTemplate)

    .get('/surveys/:id', surveyController.loadSurvey)
    .get('/surveys/', surveyController.loadSurveyList)
    .post('/surveys/clone/', surveyController.cloneSurvey)
    .post('/surveys/', surveyController.addSurvey)
    .put('/surveys', surveyController.updateSurvey)
    .delete('/surveys', surveyController.deleteSurvey)

    .post('/notify/', adminController.notifyUsers)
    //.post('/migrate-old-users/',  adminController.migrateUsers)

  return adminRoutes;
};
