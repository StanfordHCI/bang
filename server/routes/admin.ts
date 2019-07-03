import * as express from 'express';
const adminController = require('../controllers/admin');


module.exports = function (app) {
  let adminRoutes =  express.Router();

  adminRoutes
    .get('/users', adminController.loadUserList)
    .delete('/users', adminController.deleteUser)
    .post('/users/', adminController.addUser)
    //.get('/batches/:id', adminController.loadBatch)
    .get('/batches/', adminController.loadBatchList)
    .get('/batch-result/:id/', adminController.loadBatchResult)
    .put('/batches/:id/stop/', adminController.stopBatch)
    .post('/batches/', adminController.addBatch)
    //.put('/batches', adminController.updateBatch)
    //.delete('/batches', adminController.deleteBatch)
    .get('/templates/:id', adminController.loadTemplate)
    .get('/templates/', adminController.loadTemplateList)
    .post('/templates/clone/', adminController.cloneTemplate)
    .post('/templates/', adminController.addTemplate)
    .put('/templates', adminController.updateTemplate)
    .delete('/templates', adminController.deleteTemplate)
    .post('/notify/', adminController.notifyUsers)

  return adminRoutes;
};
