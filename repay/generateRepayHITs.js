
/*
 * generateRepayHITs.js checks the database to see what new information
 * the previous program (parseRepayEmails.py) added. We then create new
 * HITs and add the url to the database so the next program (sendRepayEmails.py)
 * can send the links.
 */

require('dotenv').config();

const args = require('yargs').argv;

const AWS = require('aws-sdk');
const region = 'us-east-1';
const aws_access_key_id = process.env.AWS_ID
const aws_secret_access_key = process.env.AWS_KEY
const endpoint = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
const submitTo = 'https://workersandbox.mturk.com';
const subdomain = (process.env.ENDPOINT === "mturk-requester") ? "worker" : "workersandbox";

AWS.config = {
  "accessKeyId": aws_access_key_id,
  "secretAccessKey": aws_secret_access_key,
  "region": region,
  "sslEnabled": true
};

const mturk = new AWS.MTurk({endpoint: endpoint});

// Datastore config
const fs = require('fs');
const dir = '../bang/.data/';
const Datastore = require('nedb'),
  db = {};
  db.users = new Datastore({ filename: '../bang/.data/users', autoload: true, timestampData: true});
  db.batch = new Datastore({ filename: '../bang/.data/batch', autoload: true, timestampData: true});

// Params for the new HIT we'll create
const params = {
  AssignmentDurationInSeconds: 60*10,
  Description: 'Temporary task for people who previously worked with us and did not receive compensation.',
  LifetimeInSeconds: 10000*60,
  Reward: '0.01',
  Title: 'Hit to repay workers',
  AutoApprovalDelayInSeconds: 4320*60,
  Keywords: '',
  MaxAssignments: 100,
  QualificationRequirements: [],
  Question: '<QuestionForm xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2017-11-06/QuestionForm.xsd"><Question><QuestionIdentifier>worker_id</QuestionIdentifier><IsRequired>true</IsRequired><QuestionContent><Text>Enter your worker ID:</Text></QuestionContent><AnswerSpecification><FreeTextAnswer></FreeTextAnswer></AnswerSpecification></Question></QuestionForm>'
};

// link to the new HIT we'll create
let repayURL = "";
let bonus = -1;
let uniqueID = "";
// JSON object that will hold all info from the file
let dataObj = {};
let thisRepayUser = {};
let updateUser = false;

function getUsersBatch(repayUserWorkerID, i) {
    foundUserInDB = false
    db['users'].find({}, (err, userData) => {
      userData.forEach(user => {
        if (user.mturkId == repayUserWorkerID) {
          bonus = user.bonus;
          uniqueID = user.id;
          foundUserInDB = true;
          didBatchCrash(repayUserWorkerID, user.batch, i);
        }
      })
    });
    if (foundUserInDB == false)
      console.log("Could not find worker " + repayUserWorkerID + " in our database");
}

function didBatchCrash(repayUserWorkerID, batchID, i) {
  foundBatchInDB = false;
  if (batchID != null) {
    db['batch'].find({}, (err, batchData) => {
      batchData.forEach(batch => {
        if (batch.batchID == batchID) {
          foundBatchInDB = true;
          if (batch.batchComplete == false) {
            createRepayHIT(i);
          }
          else {
            console.log("Batch for worker " + repayUserWorkerID + " was complete. No repay HIT was created.");
          }
        }
      })
    });
  }
  if (foundBatchInDB == false)
    console.log("Could not find batch with batchID " + batchID + " in our database.");
}

function createRepayHIT(i) {
  mturk.createHIT(params, (err, data) => {
    if (err) console.log(err, err.stack);
    else {
      repayURL = 'https://' + subdomain + '.mturk.com/projects/' + data.HIT.HITGroupId + '/tasks';
      console.log('\nA repay HIT was created at: ' + repayURL);
      writeToFile(i);
    }
  });
}

function writeToFile(i) {
  dataObj[i]['Bonus'] = bonus;
  dataObj[i]['RepayURL'] = repayURL;
  dataObj[i]['UniqueID'] = uniqueID;
  fs.writeFile('../bang/.data/repay', JSON.stringify(dataObj, null, 2), 'utf-8', (err) => {
    if (err) console.log(err);
    else console.log('../bang/.data/repay has been updated');
  });
}

function generateRepayHITs() {
  fs.readFile('../bang/.data/repay', (err, data) => {
    if (err) console.log(err);
    dataObj = JSON.parse(data);
    // loops through all current users in the database
    for (var i = 0; i < dataObj.length; i++) {
      thisRepayUser = dataObj[i];
      if (thisRepayUser['SentHIT'] == false)
        getUsersBatch(thisRepayUser.WorkerID, i);
    }
  });
}

generateRepayHITs();
