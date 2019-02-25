const logger = require('./logger')

export const errorHandler = function (e, messageError) {
  logger.error(module, messageError, e);
};