let chalk = require('chalk');
let isObject = require('lodash').isObject;
let format = require('util').format;
let levels = {
  debug: { method: 'log', color: 'yellow' },
  info: { method: 'log', color: 'cyan' },
  log: { method: 'log', color: 'green' },
  error: { method: 'error', color: 'red' },
  warning: { method: "log", color: 'yellow'}
};
let FORMAT_PLACEHOLDERS = /(%s|%d|%j)/g;

module.exports = Object.keys(levels).reduce(function (acc, level) {
  acc[level] = _log.bind(null, level);
  return acc;
}, {});

function _log(level, module, message, data) {
  if (this.logsDisabled) {
    return;
  }

  let mainColor = levels[level].color;
  let moduleToLog;
  let messageToLog;
  let messagePlaceholders;

  if (isObject(module) && module.filename) {
    moduleToLog = chalk.gray(module && module.filename && module.filename.split('/').slice(-2).join('/'));
  } else {
    moduleToLog = chalk.magenta('module not set');
    data = message;
    message = module;
  }

  if (message instanceof Error) {
    messageToLog = chalk.bgRed.white(message.stack);
  } else {
    messagePlaceholders = message.match(FORMAT_PLACEHOLDERS);

    if (messagePlaceholders) {
      let args = Array.prototype.slice.apply(arguments);
      let messageIndex = args.indexOf(message);
      let dataIndex = messageIndex + messagePlaceholders.length + 1;
      let formatValues = args.slice(messageIndex, dataIndex);

      message = format.apply(null, formatValues);
      data = args[dataIndex];
    }

    messageToLog = chalk[mainColor](message);
  }

  let messageArray = [
    chalk[mainColor](getLogDate()),
    chalk[mainColor](level),
    moduleToLog,
    messageToLog
  ];

  if (data) {
    if (isObject(data) && data instanceof Error) {
      messageArray.push(chalk.bgRed.white(data.stack));
    } else {
      messageArray.push(chalk.white(JSON.stringify(data)));
    }
  }

  console[levels[level].method](messageArray.join('\t')); // eslint-disable-line no-console
}

function getLogDate() {
  let d = new Date();

  return d.getUTCFullYear()
    + '-' + pad(d.getUTCMonth() + 1)
    + '-' + pad(d.getUTCDate())
    + ' ' + pad(d.getUTCHours())
    + ':' + pad(d.getUTCMinutes())
    + ':' + pad(d.getUTCSeconds())
    + ' ' + formatTZ(d.getTimezoneOffset());
}

function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}

function formatTZ(timezoneOffset) {
  let prefix = timezoneOffset < 0 ? '+' : '-';
  timezoneOffset = Math.abs(timezoneOffset);


  return prefix + pad(Math.floor(timezoneOffset / 60)) + ':' + pad(timezoneOffset % 60);
}

const isDev = process.env.NODE_ENV !== 'production';

// set default log level.
const logLevel = isDev ? 'debug' : 'info';