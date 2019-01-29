
/*
 * bonusRepays.js is the final step in the process.
 *
 * It looks through all of the submissions and if any of
 * them are from workers in our repay database, we send them
 * bonuses!
 */


require('dotenv').config()

const args = require('yargs').argv;

const AWS = require('aws-sdk');
const region = 'us-east-1';
const aws_access_key_id = process.env.AWS_ID
const aws_secret_access_key = process.env.AWS_KEY
const endpoint = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
const submitTo = 'https://workersandbox.mturk.com';

AWS.config = {
  "accessKeyId": process.env.AWS_ID,
  "secretAccessKey": process.env.AWS_KEY,
  "region": region,
  "sslEnabled": true
}

const mturk = new AWS.MTurk({endpoint: endpoint});

// Datastore config
const fs = require('fs');

const Datastore = require('nedb'),
  db = {};
  db.users = new Datastore({ filename: '../bang/.data/users', autoload: true, timestampData: true});
  db.batch = new Datastore({ filename: '../bang/.data/batch', autoload: true, timestampData: true});

const dir = '../bang/.data/';

let hitID = ""
let workerID = ""
let assignmentID = ""
let bonus = ""
let uniqueID = ""
let dataObj = {}

// loop through all of our HITs
mturk.listHITs({}, (err, data) => {
  if (err) console.log(err, err.stack);
  else {
    const listHITId = data.HITs.map(h => h.HITId);
    for (var i = 0; i < listHITId.length; i++) {
      // updates global variable so that function below
      // can access this HIT
      hitID = listHITId[i];

      // get submissions for each HIT
      getAssignments();
    }
  }
});

function findWorkerInDatabase() {
  fs.readFile('../bang/.data/repay', (err, data) => {
    if (err) console.log(err);
    dataObj = JSON.parse(data);
    for (var i = 0; i < dataObj.length; i++) {
      let thisRepayUser = dataObj[i];
	bonus = String(thisRepayUser['Bonus']);
	uniqueID = thisRepayUser['UniqueID'];
      if (thisRepayUser['WorkerID'] == workerID) {
        console.log("Worker " + workerID + " has completed their repay HIT.");
        console.log("Sending bonus...");
        sendBonus(i);
      }
    }
  });
}

function sendBonus(i) {
  mturk.sendBonus({
    AssignmentId: assignmentID,
    BonusAmount: bonus,
    Reason: "Thanks for participating!",
    WorkerId: workerID,
    UniqueRequestToken: uniqueID
  }, (err, data) => {
    if (err) {
      if (err.message.includes("The idempotency token \"" + uniqueID + "\" has already been processed.")) {
        console.log("Already bonused", dataObj[i]['Bonus'], uniqueID, workerID);
        dataObj[i]['SentBonus'] = true;
        writeToFile();
      }
      else
        console.log("NOT bonused\t", dataObj[i]['Bonus'], uniqueID, workerID, err.message);
    }
    // If there were no issues and bonus was sent successfully
    else {
      console.log("Bonused:", dataObj[i]['Bonus'], uniqueID, workerID);
      dataObj[i]['SentBonus'] = true;
      writeToFile();
    }
  });
}

function writeToFile() {
  fs.writeFile('../bang/.data/repay', JSON.stringify(dataObj, null, 2), 'utf-8', (err) => {
    if (err) console.log(err);
    console.log('../bang/.data/repay has been updated');
  });
}

function getAssignments() {
  mturk.listAssignmentsForHIT({HITId: hitID}, function(err, assignmentsForHIT) {
    if (err) console.log(err);
    else {
      for (var i = 0; i < assignmentsForHIT.NumResults; i++) {
        workerID = assignmentsForHIT.Assignments[i].WorkerId;
        assignmentID = assignmentsForHIT.Assignments[i].AssignmentId;

        // approve assignment (everyone will be rewarded $0.01)
        mturk.approveAssignment({
          AssignmentId: assignmentID,
          RequesterFeedback: 'Thanks!',
        }, function(err) {
          if (err) console.log(err, err.stack);
        });

        findWorkerInDatabase();
      }
    }
  });
}

getAssignments();
