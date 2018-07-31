/* Find documentation on all AWS operations here: https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_OperationsArticle.html */
/* For Node: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html#getHIT-property */
require('dotenv').config()

const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE"//ONLY CHANGE IN VIM ON SERVER
const teamSize = process.env.TEAM_SIZE
const roundMinutes = process.env.ROUND_MINUTES

const AWS = require('aws-sdk');

const qualificationsOn = runningLive
const runningDelayed = false

let endpoint = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
let submitTo = 'https://workersandbox.mturk.com'

if (runningLive) {
  endpoint = 'https://mturk-requester.us-east-1.amazonaws.com';
  submitTo = 'https://www.mturk.com'
}

let taskURL = 'https://bang.dmorina.com/';
if (runningLocal) {
  taskURL = 'https://localhost:3000/';
}

AWS.config = {
  "accessKeyId": process.env.AWS_ID ,
  "secretAccessKey": process.env.AWS_KEY,
  "region": "us-east-1",
  "sslEnabled": true
}

// Declaration of variables
const numRounds = 3
const taskDuration = roundMinutes * numRounds * 3 < .5 ? 1 : roundMinutes * numRounds * 3; // how many minutes - this is a Maximum for the task
const timeActive = 4; //should be 10 // How long a task stays alive in minutes -  repost same task to assure top of list
const hourlyWage = 12.50; // changes reward of experiment depending on length - change to 6?
const rewardPrice = .60
let bonusPrice = (hourlyWage * (((roundMinutes * numRounds) + 10) / 60) - rewardPrice).toFixed(2);
let usersAcceptedHIT = 0;
let numAssignments = teamSize * teamSize;

let currentHitId = '';
let hitsLeft = numAssignments; // changes when users accept and disconnect (important - don't remove)

let qualificationId = '';
if(runningLive) {
  qualificationId = '3H0YKIU04V7ZVLLJH5UALJTJGXZ6DG'; // a special qualification for our task
}

// Makes the MTurk externalHIT object, defaults to 700 px tall.
const externalHIT = (taskURL, height = 700) => '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>'+ taskURL + '</ExternalURL><FrameHeight>' + height + '</FrameHeight></ExternalQuestion>'

// This initiates the API
// Find more in the docs here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html
const mturk = new AWS.MTurk({ endpoint: endpoint });

// * updatePayment *
// -------------------------------------------------------------------
// Changes the bonusPrice depending on the total time Turker has spent on the task.
//
// Takes a number as a parameter.

const updatePayment = (totalTime) => {
  bonusPrice = (hourlyWage * (totalTime / 60) - rewardPrice).toFixed(2);
  if(bonusPrice < 0) {
    bonusPrice = 0;
  }
}

// * getBalance *
// -------------------------------------------------------------------
// Console-logs the balance of the associated account.
// This will return $10,000.00 in the MTurk Developer Sandbox.

const getBalance = () => {
  mturk.getAccountBalance((err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else console.log(data);           // successful response
  });
}

// * makeHIT *
// -------------------------------------------------------------------
// Creates and posts a HIT.
//
// Requires multiple Parameters.
// Must manually add Qualification Requirements if desired.

const makeHIT = (title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments,
  comparator, qualificationTypeID, actionsGuarded, integer, taskURL) => {
  let makeHITParams = {
    Title: title,  // string
    Description: description, // string
    AssignmentDurationInSeconds: 60 * assignmentDuration, // number, pass as minutes
    LifetimeInSeconds: 60 * lifetime,  // number, pass as minutes
    Reward: String(rewardPrice), // string - ok if passed as number
    AutoApprovalDelayInSeconds: 60 * autoApprovalDelay, // number, pass as minutes
    Keywords: keywords, // string
    MaxAssignments: maxAssignments, // number
    // QualificationRequirements: [
    //   {
    //     Comparator: comparator, // string
    //     QualificationTypeId: qualificationTypeID, // string
    //     ActionsGuarded: actionsGuarded, // string
    //     IntegerValues: [
    //       integer,
    //       /* more items */
    //     ],
    //     LocaleValues: [
    //       {
    //         Country: 'STRING_VALUE', /* required */
    //         Subdivision: 'STRING_VALUE'
    //       },
    //       /* more items */
    //     ],
    //     RequiredToPreview: true || false
    //   },
    //   /* more items */
    // ],
    Question: externalHIT(taskURL)
  };

  mturk.createHIT(makeHITParams, (err, data) => {
    if (err) console.log(err, err.stack);
    else {
      console.log("Posted", data.HIT.MaxAssignments, "assignments:", data.HIT.HITId);
      currentHitId = data.HIT.HITId;
    }
  });
}

// * returnHIT *
// -------------------------------------------------------------------
// Retrieves the details of a specified HIT.
//
// Takes HIT ID as parameter.

const returnHIT = (hitId) => {
  var returnHITParams = {
    HITId: hitId /* required */
  };
  mturk.getHIT(returnHITParams, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

// * expireActiveHits *
// -------------------------------------------------------------------
// Expires all active HITs by updating the time-until-expiration to 0.
// Users who have already accepted the HIT should still be able to finish and submit.
//
// Takes a HIT ID as a parameter

const expireActiveHits = (HIT) => {
  mturk.updateExpirationForHIT({HITId: HIT,ExpireAt:0}, (err, data) => {
    if (err) { console.log(err, err.stack)
    } else {console.log("Expired HIT:", HIT)}
  });
}

// * deleteHIT *
// -------------------------------------------------------------------
// Disposes of a specified HIT. HITs are automatically deleted after 120 days.
// Only the requester who created the HIT can delete it.
//
// Takes a string of the HIT ID as a parameter.

const deleteHIT = (theHITId) => {
   mturk.deleteHIT({HITId: theHITId}, (err, data) => {
      if (err) console.log(err, err.stack)
      else console.log("Deleted HIT:", theHITId)
   });
}

// * createQualification *
// -------------------------------------------------------------------
// Creates a qualification that will be assigned to an individual that accepts the task. That individual will
// not be able to see it task again.
//
// Takes a string for the name of the qualification type as parameter.
// Returns the qualificationTypeId of the newly created qualification.

const createQualification = (name) => {
  var qualificationParams = {
    Description: 'This user has already accepted a HIT for this specific task. We only allow one completion of this task per worker.', /* required */
    Name: name, /* required */
    QualificationTypeStatus: 'Active', /* required */
  };
  mturk.createQualificationType(qualificationParams, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
    // qualificationId = data.QualificationTypeId;  // if running HIT immediately
    return data.QualificationTypeId;
  });
}

// * setAssignmentsPending *
// -------------------------------------------------------------------
// Keeps track of how many assignments have been accepted by Turkers - necessary for HIT reposting.
// Called whenever a user accepts a HIT (server.js)

const setAssignmentsPending = (data) => {
  usersAcceptedHIT = data
  hitsLeft = teamSize * teamSize - usersAcceptedHIT
  console.log('users accepted: ', usersAcceptedHIT)
  console.log('hits left: ', hitsLeft);
}

// * assignQualificationToUsers *
// -------------------------------------------------------------------
// Assigns a qualification to users who have already completed the task - does not let workers repeat task
// Takes users in Database as a parameter, fetches mturk Id.

const assignQualificationToUsers = (users) => {
  users.filter((user) => {
    return user.mturkId
  }).forEach((user) => {
    // // Assigns the qualification to the worker
    var assignQualificationParams = {QualificationTypeId: qualificationId, WorkerId: user.mturkId, IntegerValue: 1, SendNotification: false};
    mturk.associateQualificationWithWorker(assignQualificationParams, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  })
}

// * disassociateQualification *
// -------------------------------------------------------------------
// Revokes a previously assigned qualification from a specified user.
//
// Takes the qualification ID, worker ID, and reason as parateters - strings.

const disassociateQualification = (qualificationId, workerId, reason) => {
  var disassociateQualificationParams = {
    QualificationTypeId: qualificationId, /* required */ // string
    WorkerId: workerId, /* required */ // string
    Reason: reason
  };
  mturk.disassociateQualificationFromWorker(disassociateQualificationParams, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

// * listUsersWithQualification *
// -------------------------------------------------------------------
// Lists MTurk users who have a specific qualification

const listUsersWithQualification = () => {
  var userWithQualificationParams = {QualificationTypeId: qualificationId, MaxResults: 100};
  mturk.listWorkersWithQualificationType(userWithQualificationParams, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else console.log(data);
  });
}

// * payBonuses *
// -------------------------------------------------------------------
// Bonus all users in DB who have leftover bonuses.
//
// Takes users as a parameter.
// Returns an array of bonused users.

const payBonuses = (users) => {
  let successfullyBonusedUsers = []
  users.filter(u => u.bonus != 0).forEach((u) => {
    mturk.sendBonus({
      AssignmentId: u.assignmentId,
      BonusAmount: String(u.bonus),
      Reason: "Thanks for participating in our HIT!",
      WorkerId: u.mturkId,
      UniqueRequestToken: u.id
    }, function(err, data) {
      if (err) {
       // console.log("Bonus not processed:",err)
      } else {
        successfullyBonusedUsers.push(u)
        console.log("Bonused:",u)
      }
    })
  })
  return successfullyBonusedUsers
}

// * blockWorker *
// -------------------------------------------------------------------
// Blocks a particular worker.
//
// Takes workerID and reason as parameters - strings.

const blockWorker = (reason, workerId) => {
  var blockWorkerParams = {
    Reason: reason, /* required */ // string
    WorkerId: workerId /* required */ // string
  };
  mturk.createWorkerBlock(blockWorkerParams, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

// * checkBlocks *
// -------------------------------------------------------------------
// Lists workers that have been blocked. An option to remove all worker blocks.

const checkBlocks = (removeBlocks = false) => {
  mturk.listWorkerBlocks({}, (err, data) => {
    if (err) { console.log(err) } else {
      console.log("You have the following blocks:",data)
      if (removeBlocks) { data.WorkerBlocks.forEach((worker) => {
          mturk.deleteWorkerBlock({WorkerId:worker.WorkerId,Reason:"not needed"}, (err, data) => {
            if (err) {console.log(err, err.stack)}
            else { console.log("Removed block on", worker.WorkerId, data) }
          })
        })
      }
    }
  })
}

// * returnCurrentHIT *
// -------------------------------------------------------------------
// Returns the current active HIT ID

const returnCurrentHIT = () => {
  return currentHitId;
}

// * launchBang *
// -------------------------------------------------------------------
// Launches Scaled-Humanity Fracture experiment

const launchBang = () => {
  // HIT Parameters
  let QualificationReqs = [
    {
      QualificationTypeId:"00000000000000000071",  // US workers only
      LocaleValues:[{
        Country:"US",
      }],
      Comparator:"In",
      ActionsGuarded:"DiscoverPreviewAndAccept"  // only users within the US can see the HIT
    }];

  if (qualificationsOn) {
    QualificationReqs.push({
      QualificationTypeId: '00000000000000000040',  // more than 1000 HITs
      Comparator: 'GreaterThan',
      IntegerValues: [1000],
      RequiredToPreview: true,
    })
    if(runningLive) {
      QualificationReqs.push({
        QualificationTypeId: qualificationId,  // have not already completed the HIT
        Comparator: 'DoesNotExist',
        ActionsGuarded:"DiscoverPreviewAndAccept"
      })
    }
    if(runningDelayed) {
      QualificationReqs.push({
        QualificationTypeId: "3H3KEN1OLSVM98I05ACTNWVOM3JBI9",
        Comparator: 'Exists',
        ActionsGuarded:"DiscoverPreviewAndAccept"
      })
    }
  }

  let time = Date.now();

  let params = {
    Title: 'Write online ads - bonus up to $'+ hourlyWage + ' / hour (' + time + ')',
    Description: 'Work in groups to write ads for new products. This task will take approximately ' + Math.round((roundMinutes * numRounds) + 10)  + ' minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $' + bonusPrice + '.',
    AssignmentDurationInSeconds: 60*taskDuration, // 30 minutes?
    LifetimeInSeconds: 60*(timeActive),  // short lifetime, deletes and reposts often
    Reward: String(rewardPrice),
    AutoApprovalDelayInSeconds: 60*taskDuration,
    Keywords: 'ads, writing, copy editing, advertising',
    MaxAssignments: numAssignments,
    QualificationRequirements: QualificationReqs,
    Question: externalHIT(taskURL)
  };

  mturk.createHIT(params, (err, data) => {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log("Posted", data.HIT.MaxAssignments, "assignments:", data.HIT.HITId);
      currentHitId = data.HIT.HITId;
    }
  });

  let delay = 1;
  // only continues to post if not enough people accepted HIT
  // Reposts every timeActive(x) number of minutes to keep HIT on top - stops reposting when enough people join
  setTimeout(() => {
    if(hitsLeft > 0) {
      time = Date.now();
      numAssignments = hitsLeft;
      let params2 = {
        Title: 'Write online ads - bonus up to $'+ hourlyWage + ' / hour (' + time + ')',
        Description: 'Work in groups to write ads for new products. This task will take approximately ' + Math.round((roundMinutes * numRounds) + 10)  + ' minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $' + bonusPrice + '.',
        AssignmentDurationInSeconds: 60*taskDuration, // 30 minutes?
        LifetimeInSeconds: 60*(timeActive),  // short lifetime, deletes and reposts often
        Reward: String(rewardPrice),
        AutoApprovalDelayInSeconds: 60*taskDuration,
        Keywords: 'ads, writing, copy editing, advertising',
        MaxAssignments: numAssignments,
        QualificationRequirements: QualificationReqs,
        Question: externalHIT(taskURL)
      };
      mturk.createHIT(params2, (err, data) => {
        if (err) console.log(err, err.stack);
        else {
          console.log("HIT expired, and posted", data.HIT.MaxAssignments, "new assignments:", data.HIT.HITId);
          currentHitId = data.HIT.HITId;
        }
      });
      delay++;
    } else {
      clearTimeout();
    }
   }, 1000 * 60 * timeActive * delay)
}

module.exports = {
  updatePayment: updatePayment,
  getBalance: getBalance,
  makeHIT: makeHIT,
  returnHIT: returnHIT,
  expireActiveHits: expireActiveHits,
  deleteHIT: deleteHIT,
  createQualification: createQualification,
  setAssignmentsPending: setAssignmentsPending,
  assignQualificationToUsers: assignQualificationToUsers,
  disassociateQualification: disassociateQualification,
  listUsersWithQualification: listUsersWithQualification,
  payBonuses: payBonuses,
  bonusPrice: bonusPrice,
  blockWorker: blockWorker,
  checkBlocks: checkBlocks,
  returnCurrentHIT: returnCurrentHIT,
  submitTo: submitTo,
  launchBang: launchBang
};
