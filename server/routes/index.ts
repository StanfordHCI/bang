import * as express from 'express';
const adminRoutes = require('./admin')

const cors = require('cors')

const isAdmin = (req, res, next) => {
  if (!!req.headers.admintoken && req.headers.admintoken === process.env.ADMIN_TOKEN) {
    next();
  } else {
    res.status(403).end();
    return;
  }
}

module.exports = function (app) {
  let rootRoutes = express.Router();

  rootRoutes
    .options('*', cors())
    .use('/api/admin', isAdmin, adminRoutes(app))

  return rootRoutes;
};
