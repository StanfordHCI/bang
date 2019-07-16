import * as express from 'express';
const unsubscribeController = require('../controllers/unsubscribe');


module.exports = function (app) {
  let publicRoutes =  express.Router();

  publicRoutes
    .delete('/unsubscribe/:id/', unsubscribeController.unsubscribe)

  return publicRoutes;
};
