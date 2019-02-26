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
const submitTo = runningLocal ? 'https://worker.mturk.com'
  : 'https://workersandbox.mturk.com';

AWS.config = {
  "accessKeyId": awsAccessKeyId,
  "secretAccessKey": awsSecretAccessKey,
  "region": region,
  "sslEnabled": true
};

const mturk = new AWS.MTurk({ endpoint: endpoint });

const params = {
  AssignmentDurationInSeconds: 600,
  Description: 'Temporary hit for people who previously worked with us and did not receive compensation.',
  LifetimeInSeconds: 10000*60,
  Reward: '0.01',
  Title: 'Hit to repay workers',
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

const path = '../.data/'

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

const updateRepayDB = (id, field, value) => new Promise((resolve, reject) => {
  db.repay.update(
    { workerId: id },
    { $set: { [field]: value } },
    {},
    err => {
      if (err) {
        console.log('Err updating repay db:', err);
        return reject(err);
      }
      resolve();
    }
  );
});

let bonus = '';
let uniqueId = '';
let repayUrl = '';

const generateRepayHITs = () => new Promise((resolve, reject) => {
  db.repay.find({ sentHIT: false, repayUrl: '' }, (err, usersInRepay) => {
    if (err) {
      console.log('Repay find error:', err);
      return reject(err);
    }
    usersInRepay.forEach(user => {
      db.users.findOne({ mturkId: user.workerId }, (err, ourUser) => {
        if (err) {
          console.log('User find error:', err);
          return reject(err);
        }
        if (ourUser == null) {
          console.log('Unable to find user ' + user.workerId + ' in our database.');
          return reject();
        }
        bonus = ourUser.bonus;
        uniqueId = ourUser.uniqueId;
        db.batch.find({ batch: ourUser.batch }, (err, thisBatch) => {
          if (err) {
            console.log('Batch find error:', err);
            return reject(err);
          }
          if (thisBatch == null) {
            console.log('Unable to find batch ' + ourUser.batch + ' in our database');
            return reject();
          }
          if (thisBatch.batchComplete == false) {
            console.log('Batch for worker ' + user.workerId + ' was complete. No repay HIT will be sent.');
            return reject();
          }
          else {
            mturk.createHIT(params, (err, data) => {
              if (err) {
                console.log('Err creating new repay HIT:', err);
                return reject(err);
              }
              repayUrl = 'https://' + subdomain + '.mturk.com/projects/' + data.HIT.HITGroupId + '/tasks';
              console.log('\nA repay HIT was created at: ' + repayUrl);
              if (updateRepayDB(user.workerId, 'bonus', bonus)
                  && updateRepayDB(user.workerId, 'uniqueId', uniqueId)
                  && updateRepayDB(user.workerId, 'repayUrl', repayUrl))
                resolve();
              else return reject();
            });
          }
        });
      });
    });
  });
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

const sendEmail = (mailOptions) => new Promise((resolve, reject) => {
  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.log('Error sending email:', err);
      return reject(err);
    }
    resolve();
  });
});

const sendRepayEmails = () => new Promise((resolve, reject) => {
  db.repay.find({ sentHIT: false }, (err, usersInRepay) => {
    if (err) {
      console.log('Repay find error:', err);
      return reject(err);
    }
    usersInRepay.forEach(user => {
      if (user.repayUrl !== '') {
        let mailOptions = {
          from: emailLogin,
          to: user.email,
          subject: 'Regarding Amazon Mechanical Turk Compensation',
          text: 'Hi ' + user.name + ',\nThanks for reaching out.' + 
          ' Here\'s a repay hit:\n' + user.repayUrl + '\nIf that does' +
          ' not work, please try searching for Stanford, and select' +
          ' a hit titled "Hit to repay workers".\nPlease use your' +
          ' worker ID when prompted. We will check this against our' +
          ' database.\nWe anticipate paying out bonuses sometime in' +
          ' the next 48 hours.',
        };
        if (sendEmail(mailOptions) && updateRepayDB(user.workerId, 'sentHIT', true)) resolve();
        else return reject();
      }
    });
  });
});

let workerId = '';
let assignmentId = '';

const bonusRepays = () => new Promise((resolve, reject) => {
 mturk.listHITs({}, (err, allHITs) => {
      if (err) {
        console.log('Err listing HITs:', err); 
        return reject(); 
      }
      allHITs.HITs.map(h => h.HITId).forEach(hit => {
        mturk.listAssignmentsForHIT({ HITId: hit }, (err, assignments) => {
          if (err) {
            console.log('Err listing assignments for HIT:', err);
            return reject(err);
          }
          assignments.forEach(assignment => {
            workerId = assignments.WorkerId;
            assignmentId = assignments.AssignmentId;
            mturk.approveAssignment({
              AssignmentId: assignmentId,
              RequesterFeedback: 'Thanks!',
            }, (err) => {
              if (err) {
                console.log('Err approving assignment:', err);
                return reject(err);
              }
            });
            db.repay.findOne({ workerId: workerId }, (err, thisUser) => {
              if (err) {
                console.log('Err finding user in repay DB:', err);
                return reject(err);
              }
              if (thisUser == null) {
                console.log('Unable to find user ' + workerId + ' in our db.');
                return reject(); 
              }
              let bonus = String(thisUser.bonus);
              let uniqueId = thisUser.uniqueId;
              console.log('Worker ' + workerId + ' has completed their repay HIT.');
              console.log('Sending bonus...');
              mturk.sendBonus({
                AssignmentId: assignmentId,
                BonusAmount: bonus,
                Reason: 'Thanks for participating!',
                WorkerId: workerId,
                UniqueRequestToken: uniqueId,
              }, (err, data) => {
                if (err) {
                  if (err.message.includes('The idempotency token')) {
                    console.log('Already bonused ' + workerId + '');
                    if (updateRepayDB(workerId, 'sentBonus', true)) resolve();
                    else return reject(err);
                  }
                  console.log('Err bonusing ' + workerId, err);
                  return reject(err);
                }
                console.log('Successfully bonused ' + bonus + ' to ' + workerId);
                if (updateRepayDB(workerId, 'sentBonus', true)) resolve();
                else return reject();
              });
            });
          });
        });
      });
    });
});

async function repay() {
  let generated = await generateRepayHITs();
  if (generated) {
    let sent = await sendRepayEmails();
    if (sent) {
      bonusRepays();
    }
  }
}

repay();
