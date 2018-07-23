/* Find documentation on all AWS operations here: https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_OperationsArticle.html */
/* For Node: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html#getHIT-property */
require('dotenv').config()

const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE"//ONLY CHANGE IN VIM ON SERVER
const teamSize = process.env.TEAM_SIZE
const roundMinutes = process.env.ROUND_MINUTES

const AWS = require('aws-sdk');

const qualificationsOn = runningLive

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

const numRounds = 3
const taskDuration = roundMinutes * numRounds * 3 < .5 ? 1 : roundMinutes * numRounds * 3; // how many minutes - this is a Maximum for the task
const timeActive = 4; //should be 10 // How long a task stays alive in minutes -  repost same task to assure top of list
const hourlyWage = 10.50; // changes reward of experiment depending on length - change to 6?
const rewardPrice = .50
let bonusPrice = (hourlyWage * (((roundMinutes * numRounds) + 10) / 60) - rewardPrice).toFixed(2);
let usersAcceptedHIT = 0;
let numAssignments = teamSize * teamSize;

// This initiates the API
// Find more in the docs here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html
const mturk = new AWS.MTurk({ endpoint: endpoint });

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

// * expireActiveHits *
// -------------------------------------------------------------------
// Expires all active HITs by updating the time-until-expiration to 0. 
// Users who have already accepted the HIT should still be able to finish and submit. 

const expireActiveHits = () => {
  mturk.listHITs({}, (err, data) => {
    if (err) console.log(err, err.stack);
    else {
      data.HITs.map((hit) => {
        mturk.updateExpirationForHIT({HITId: hit.HITId,ExpireAt:0}, (err, data) => {
          if (err) { console.log(err, err.stack)
          } else {console.log("Expired HIT:", hit.HITId)}
        });
      })
    }
  })
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

let qualificationId = '';

if(runningLive) {
  qualificationId = '3H0YKIU04V7ZVLLJH5UALJTJGXZ6DG'; // a special qualification for our task
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

let currentHitId = '';
let hitsLeft = numAssignments;

const increaseAssignmentsPending = () => {
  usersAcceptedHIT = usersAcceptedHIT + 1;
  hitsLeft = hitsLeft - 1;
  console.log('users accepted: ', usersAcceptedHIT)
  console.log('hits left: ', hitsLeft);
}

const reduceAssignmentsPending = () => {
  usersAcceptedHIT = usersAcceptedHIT - 1;
  hitsLeft = hitsLeft + 1;
  console.log('users accepted: ', usersAcceptedHIT)
  console.log('hits left: ', hitsLeft);
}

// creates single HIT
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
      QualificationTypeId: '00000000000000000040 ',  // more than 1000 HITs
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
    Question: '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>'+ taskURL + '</ExternalURL><FrameHeight>400</FrameHeight></ExternalQuestion>',
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
        Question: '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>'+ taskURL + '</ExternalURL><FrameHeight>400</FrameHeight></ExternalQuestion>',
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

// assigns a qualification to users who have already completed the task - does not let workers repeat task
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

const listUsersWithQualification = () => {
  var userWithQualificationParams = {QualificationTypeId: qualificationId, MaxResults: 100};
  mturk.listWorkersWithQualificationType(userWithQualificationParams, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else console.log(data);
  });
}

// bonus all users in DB who have leftover bonuses.
const payBonuses = (users) => {
  let successfullyBonusedUsers = []
    users.filter((user) => {
      return user.assignmentId & (user.bonus != 0) & user.mturkId & user.id
    }).forEach((user) => {
      var params = { AssignmentId: user.assignmentId, BonusAmount: String(user.bonus), Reason: "Thanks for participating in our HIT!", WorkerId: user.mturkId, UniqueRequestToken: user.id };
      mturk.sendBonus(params, function(err, data) {
        if (err) {
          console.log( user.id + " bonus not processed: " + err)
        } else {
          successfullyBonusedUsers.push(user)
          console.log(user.id + " bonused: " + data)
        }
      })
    })
  return successfullyBonusedUsers
}

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

module.exports = {
  getBalance: getBalance,
  expireActiveHits: expireActiveHits,
  deleteHIT: deleteHIT,
  createQualification: createQualification,
  launchBang: launchBang,
  assignQualificationToUsers: assignQualificationToUsers,
  listUsersWithQualification: listUsersWithQualification,
  payBonuses: payBonuses,
  bonusPrice: bonusPrice,
  submitTo: submitTo,
  checkBlocks: checkBlocks,
  increaseAssignmentsPending: increaseAssignmentsPending,
  reduceAssignmentsPending: reduceAssignmentsPending
};
