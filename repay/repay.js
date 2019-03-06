const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const args = require('yargs').argv;
const AWS = require('aws-sdk');
require('dotenv').config();

const region = 'us-east-1';
const awsAccessKeyId = process.env.AWS_ID;
const awsSecretAccessKey = process.env.AWS_KEY;
const runningLocal = process.env.RUNNING_LOCAL;
const endpoint = runningLocal ? 'https://mturk-requester.us-east-1.amazonaws.com'
  : 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
const subdomain = runningLocal ? 'worker' : 'workersandbox';
const submitTo = 'https://' + subdomain + '.mturk.com';

AWS.config = {
  "accessKeyId": awsAccessKeyId,
  "secretAccessKey": awsSecretAccessKey,
  "region": region,
  "sslEnabled": true
};

const mturk = new AWS.MTurk({ endpoint: endpoint });

const hitTitle = 'Hit to repay workers';

const params = {
  AssignmentDurationInSeconds: 600,
  Description: 'Temporary hit for people who previously worked with us and did not receive compensation.',
  LifetimeInSeconds: 10000*60,
  Reward: '0.01',
  Title: hitTitle,
  AutoApprovalDelayInSeconds: 4320 * 60,
  Keywords: '',
  MaxAssignments: 100,
  QualificationRequirements: [],
  Question: '<QuestionForm xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2017-11-06/QuestionForm.xsd"><Question><QuestionIdentifier>worker_id</QuestionIdentifier><IsRequired>true</IsRequired><QuestionContent><Text>Enter your worker ID:</Text></QuestionContent><AnswerSpecification><FreeTextAnswer></FreeTextAnswer></AnswerSpecification></Question></QuestionForm>'
};

const emailLogin = process.env.EMAIL_LOGIN;
const emailPassword = process.env.EMAIL_PASSWORD;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUrl = process.env.REDIRECT_URL;
const expiryDate = process.env.EXPIRY_DATE;
const refreshToken = process.env.REFRESH_TOKEN;
const accessToken = process.env.ACCESS_TOKEN;

const path = '../b04/.data/'

const Datastore = require('nedb');
const db = {};
db.repay = new Datastore({
  filename: path + 'repay',
  autoload: true,
  timestampData: true,
});
db.users = new Datastore({
  filename: path + 'users',
  autoload: true,
  timestampData: true,
});
db.batch = new Datastore({
  filename: path + 'batch',
  autoload: true,
  timestampData: true,
});

const { execFile } = require('child_process');

const readRepayEmails = () => new Promise((resolve, reject) => {
  console.log('Signing into inbox: ' + emailLogin);
  console.log('This may take a few seconds...');
  execFile('python', ['parse2.py'], (err, out) => {
      if (err) {
            console.log('Err executing file:', err);
            return reject(err);
          }
      resolve(out.split('\n'));
    });
});

let name = '';
let email = '';
let userId = '';
let hitId = '';
let complaints = [];

const parseLines = (index, lines) => new Promise((resolve) => {
  if (index < lines.length) {
      splitLine = lines[index].split(' ');
      if (splitLine[0] == 'Name:')
        name = splitLine[1];
      if (splitLine[0] == 'Email:')
        email = splitLine[1];
      if (splitLine[0] == 'WorkerId:')
        userId = splitLine[1];
      if (splitLine[0] == 'hitId:') {
            hitId = splitLine[1];
            let currComplaint = {};
            currComplaint.name = name;
            currComplaint.email = email;
            currComplaint.workerId = userId;
            currComplaint.hitId = hitId;
            complaints.push(currComplaint);
          }
      resolve(parseLines(index + 1, lines));
    }
  else resolve();
});

const insertRepayDB = (index) => new Promise((resolve, reject) => {
  if (index < complaints.length) {
    let name = complaints[index].name;
    let email = complaints[index].email;
    let userId = complaints[index].workerId;
    let hitId = complaints[index].hitId;
    db.repay.find({ name: name, email: email, workerId: userId }, (err, users) => {
      if (err) {
        console.log('Err finding user in repay DB:', err);
        return reject(err);
      }
      if (users.length > 0) {
        console.log(userId + ' has already been previously added to repay DB.');
        resolve(insertRepayDB(index + 1));
      }
      else {
      let toInsert = {
        name: name,
        email: email,
        workerId: userId,
        uniqueId: '',
        bangHIT: hitId,
        repayUrl: '',
        sentHIT: true,
        sentBonus: true,
        bonus: 0
      }
        db.repay.insert(toInsert, (err) => {
          if (err) {
            console.log('Err adding to repay DB');
            return reject(err);
          }
          console.log('Added ' + userId + ' to repay DB.');
          resolve(insertRepayDB(index + 1));
        });
      }
    });
  }
  else resolve();
});

let bonus = '';
let uniqueId = '';
let repayUrl = '';

const findUsersThatNeedHITs = () => new Promise((resolve, reject) => {
  db.repay.find({ sentHIT: false, repayUrl: '' }, (err, users) => {
    if (err) {
        console.log('Repay find error:', err);
        return reject(err);
      }
    resolve(users);
  });
});

const generateRepayHITs = (index, users) => new Promise((resolve, reject) => {
  if (index < users.length) {
    db.users.findOne({ mturkId: users[index].workerId }, (err, user) => {
      if (err) {
        console.log('Repay find error:', err);
        return reject(err);
      }
      bonus = users[index].bonus;
      uniqueId = users[index].uniqueId;
      db.batch.find({ batch: users[index].batch }, (err, thisBatch) => {
        if (err) {
          console.log('Batch find error:', err);
          return reject(err);
        }
        if (thisBatch == null) {
          console.log('Unable to find batch ' + users[index].batch + ' in our database.');
          resolve(generateRepayHITs(index + 1, users));
        }
        if (thisBatch.batchComplete == true) {
          console.log('Batch for worker ' + users[index].workerId + ' was complete. No repay HIT will be sent.');
          resolve(generateRepayHITs(index + 1, users));
        }
        else {
          mturk.createHIT(params, (err, data) => {
            if (err) {
              console.log('Err creating new repay HIT:', err);
              return reject(err);
            }
            repayUrl = 'https://'+ subdomain + '.mturk.com/projects/' + data.HIT.HITGroupId + '/tasks';
            console.log('\nA repay HIT was created at: ' + repayUrl);
            db.repay.update(
              { workerId: users[index].workerId },
              { $set: { bonus: bonus, uniqueId: uniqueId, repayUrl: repayUrl } },
              {}, err => {
                if (err) {
                  console.log('Err updating repay db:', err);
                  return reject(err);
                }
                resolve(generateRepayHITs(index + 1, users));
              });
          });
        }
      });
    });
  }
  else resolve();
});

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUrl,
);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
      type: 'OAuth2',
      user: emailLogin,
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken,
      accessToken: accessToken,
      expires: Number.parseInt(expiryDate),
    },
});

const findUsersThatNeedEmails = () => new Promise((resolve, reject) => {
  db.repay.find({ sentHIT: false }, (err, users) => {
    if (err) {
      console.log('Repay find error:', err);
      return reject(err);
    }
    if (users.length == 0)
      console.log('No users in our database currently need repay emails.');
    resolve(users);
  });
});

const sendRepayEmails = (index, users) => new Promise((resolve, reject) => {
  if (index < users.length) {
    if (users[index].repayUrl !== '') {
      let mailOptions = {
        from: emailLogin,
        to: users[index].email,
        subject: 'Regarding Amazon Mechanical Turk Compensation',
        text: 'Hi ' + users[index].name + ',\nThanks for reaching out.' +
              ' Here\'s a repay hit:\n' + users[index].repayUrl + '\nIf that does' +
              ' not work, please try searching for Stanford, and select' +
              ' a hit titled "Hit to repay workers".\nPlease use your' +
              ' worker ID when prompted. We will check this against our' +
              ' database.\nWe anticipate paying out bonuses sometime in' +
              ' the next 48 hours.',
      };
      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.log('Error sending email:', err);
          return reject(err);
        }
        db.repay.update(
          { workerId: users[index].workerId },
          { $set: { sentHIT: true } },
          {}, err => {
            if (err) {
              console.log('Err updating repay DB:', err);
              return reject(err);
            }
            else resolve(sendRepayEmails(index + 1, users));
          }
        );
      });
    }
    else resolve(sendRepayEmails(index + 1, users));
  }
  else resolve();
});

let workerId = '';
let assignmentId = '';

const listAllHITs = () => new Promise((resolve, reject) => {
  mturk.listHITs({}, (err, allHITs) => {
    if (err) {
      console.log('Err listing repay HITs:', err);
      return reject(err);
    }
    resolve(allHITs.HITs.map(h => h.HITId));
  });
});

const getHITAssignments = (index, hitIds, paginationToken, passthrough) => new Promise((resolve, reject) => {
  if (index < hitIds.length) {
    mturk.listAssignmentsForHIT( { HITId: hitIds[index], MaxResults: 100, NextToken: paginationToken }, (err, data) => {
      if (err) {
        console.log('Err listing repay assignments for HIT:', err);
        return reject(err);
      }
      passthrough = passthrough.concat(data.Assignments);
      if (data.NumResults == 100)
        resolve(getHITAssignments(index, hitIds, data.NextToken, passthrough));
      else {
        resolve(getHITAssignments(index + 1, hitIds, null, passthrough));
      }
    });
  }
  else {
    console.log('passthrough.length = ' + passthrough.length);
    resolve(passthrough);
  }
});

const bonusRepays = (index, workerIds, assignmentIds) => new Promise((resolve, reject) => {
  if (index < assignmentIds.length) {
    mturk.approveAssignment({
      AssignmentId: assignmentIds[index],
      RequesterFeedback: 'Thanks!'
    }, (err) => {
      if (err) {
        if (err.message.includes('This operation can be called with a status of')) {
          console.log('Assignment ' + assignmentIds[index]  + ' not yet submitted.');
          resolve(bonusRepays(index + 1, workerIds, assignmentIds));
        }
        else if (err.message.includes('Rate exceeded')) {
          console.log('ThrottlingException => TODO, understand?');
          resolve(bonusRepays(index + 1, workerIds, assignmentIds));
        }
        else {
          console.log('Err approving repay assignment:', err);
          return reject(err);
        }
      }
      else console.log('Approved assignment ' + assignmentIds[index]);
    });
    db.repay.findOne({ workerId: workerIds[index] }, (err, user) => {
      if (err) {
        console.log('Err finding user in repay DB:', err);
        return reject(err);
      }
      else if (user == null) {
        console.log('Unable to find user ' + workerIds[index] + ' in our DB.');
        resolve(bonusRepays(index + 1, workerIds, assignmentIds));
      }
      else if (user.bonus > 0) {
        console.log(user);
        console.log(workerIds[index] + ' has completed their repay HIT.');
        console.log('Sending bonus...');
        let bonus = String(user.bonus);
        let uniqueId = user.uniqueId;
        mturk.sendBonus({
          AssignmentId: assignmentIds[index],
          BonusAmount: bonus,
          Reason: 'Thanks for participating!',
          WorkerId: workerIds[index],
          UniqueRequestToken: uniqueId
        }, (err, data) => {
          if (err) {
            if (err.message.includes('The idempotency token')) {
              console.log('Already bonused ' + workerIds[index]);
              db.repay.update(
                { workerId: workerIds[index] },
                { $set: { sentHIT: true } },
                {}, err => {
                  if (err) {
                    console.log('Err updating repay db:', err);
                    return reject(err);
                  }
                  else resolve(bonusRepays(index + 1, workerIds, assignmentIds));
                }
              );
            }
            console.log('Err sending bonus:', err);
            return reject(err);
          }
          console.log('Successfully bonused ' + workerIds[index]);
          db.repay.update(
            { workerId: workerIds[index] },
            { sentBonus: true },
            {}, err => {
              if (err) {
                console.log('Err updating repay db:', err);
                return reject(err);
              }
              else resolve(bonusRepays(index + 1, workerIds, assignmentIds));
            }
          );
        });
      }
      else {
        console.log('Bonus for user ' + workerIds[index] + ' is 0. Not bonusing.');
        resolve(bonusRepays(index + 1, workerIds, assignmentIds));
      }
    });
  }
  else resolve();
});

readRepayEmails().then(function(emails) {
  return parseLines(0, emails);
}).then(function() {
  return insertRepayDB(0);
}).then(function() {
  return findUsersThatNeedHITs();
}).then(function(users) {
  return generateRepayHITs(0, users);
}).then(function() {
  return findUsersThatNeedEmails();
}).then(function(users) {
  return sendRepayEmails(0, users);
}).then(function() {
  return listAllHITs();
}).then(function(hitIds) {
  return getHITAssignments(0, hitIds, null, []);
}).then(function(assignments) {
  return bonusRepays(0, assignments.map(a => a.WorkerId), assignments.map(a => a.AssignmentId));
});
