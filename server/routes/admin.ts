import * as express from 'express';
const adminController = require('../controllers/admin');


module.exports = function (app) {
  let adminRoutes =  express.Router();

  adminRoutes
   /* .get('/users', adminController.loadUserList)
    .delete('/users', adminController.deleteUser)
    .get('/batches/:id', adminController.loadBatch)*/
    .get('/batches', adminController.loadBatchList)
    .post('/batches', adminController.addBatch)
    //.put('/batches', adminController.updateBatch)
    //.delete('/batches', adminController.deleteBatch)
    //.get('/templates/:id', adminController.loadTemplate)
    .get('/templates', adminController.loadTemplateList)
    .post('/templates', adminController.addTemplate)
    //.put('/templates', adminController.updateTemplate)
    //.delete('/templates', adminController.deleteTemplate)

  return adminRoutes;
};
