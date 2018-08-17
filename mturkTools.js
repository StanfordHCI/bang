/* Find documentation on all AWS operations here: https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_OperationsArticle.html */
/* For Node: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html#getHIT-property */
require('dotenv').config()

const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE"//ONLY CHANGE IN VIM ON SERVER
const teamSize = parseInt(process.env.TEAM_SIZE)
const roundMinutes = process.env.ROUND_MINUTES

const AWS = require('aws-sdk');

const runningDelayed = false

let endpoint = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
let submitTo = 'https://workersandbox.mturk.com'

if (runningLive) {
  endpoint = 'https://mturk-requester.us-east-1.amazonaws.com';
  submitTo = 'https://www.mturk.com'
}

let taskURL = 'https://mark.dmorina.com/';
if (runningLocal) {
  taskURL = 'https://localhost:3000/';
}

AWS.config = {
  accessKeyId: process.env.AWS_ID ,
  secretAccessKey: process.env.AWS_KEY,
  region: "us-east-1",
  sslEnabled: true
}

// Declaration of variables
const numRounds = 3
const taskDuration = roundMinutes * numRounds * 2
//const taskDuration = roundMinutes * numRounds * 3 < .5 ? 1 : roundMinutes * numRounds * 3; // how many minutes - this is a Maximum for the task
const timeActive = 4; //should be 10 // How long a task stays alive in minutes -  repost same task to assure top of list
const hourlyWage = 10.50; // changes reward of experiment depending on length - change to 6?
const rewardPrice = 0.01 // upfront cost
const numHITs = 3;
const maxAssignments = (2 * teamSize * teamSize);
let bonusPrice = (hourlyWage * (((roundMinutes * numRounds) + 10) / 60) - rewardPrice).toFixed(2);
let usersAcceptedHIT = 0;
let numAssignments = maxAssignments; // extra HITs for over-recruitment

let currentHitId = '';
let currentHITTypeId = '';
let currentHITGroupId = '';

let hitsLeft = numAssignments; // changes when users accept and disconnect (important - don't remove)
let taskStarted = false;

//Setting up qualifications
const quals = {
  notUSA: {
    QualificationTypeId:"00000000000000000071",  // non-US workers only
    LocaleValues:[{ Country:"US" }],
    Comparator:"NotIn",
    ActionsGuarded:"DiscoverPreviewAndAccept"  // only users outside of the US can see the HIT
  },
  onlyUSA: {
    QualificationTypeId:"00000000000000000071",  // US workers only
    LocaleValues:[{ Country:"US" }],
    Comparator:"In",
    ActionsGuarded:"DiscoverPreviewAndAccept"  // only users within the US can see the HIT
  },
  hitsAccepted: (k) => { return {
    QualificationTypeId: '00000000000000000040',  // more than 1000 HITs
    Comparator: 'GreaterThan',
    IntegerValues: [k],
    RequiredToPreview: true
  }},
  hasBanged: {
    QualificationTypeId: "3H0YKIU04V7ZVLLJH5UALJTJGXZ6DG",  // have not already completed the HIT
    Comparator: 'DoesNotExist',
    ActionsGuarded:"DiscoverPreviewAndAccept"
  },
  willBang: {
    QualificationTypeId: "3H3KEN1OLSVM98I05ACTNWVOM3JBI9",
    Comparator: 'Exists',
    ActionsGuarded:"DiscoverPreviewAndAccept"
  }
}

const qualsForLive = [quals.onlyUSA, quals.hitsAccepted(500), quals.hasBanged, quals.willBang]
const qualsForTesting = [quals.notUSA, quals.hitsAccepted(100)]
const safeQuals = runningLive ? qualsForLive : []

// Makes the MTurk externalHIT object, defaults to 700 px tall.
const externalHIT = (taskURL, height = 700) => '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>'+ taskURL + '</ExternalURL><FrameHeight>' + height + '</FrameHeight></ExternalQuestion>'

// This initiates the API
// Find more in the docs here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html
const mturk = new AWS.MTurk({ endpoint: endpoint });

// * startTask *
// -------------------------------------------------------------------
// Notifies that task has started, cancel HIT posting.

const startTask = () => {
  taskStarted = true;
}

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

const makeHIT = (title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, hitContent, callback) => {
  let makeHITParams = {
    Title: title,  // string
    Description: description, // string
    AssignmentDurationInSeconds: 60 * assignmentDuration, // number, pass as minutes
    LifetimeInSeconds: 60 * lifetime,  // number, pass as minutes
    Reward: String(rewardPrice), // string - ok if passed as number
    AutoApprovalDelayInSeconds: 60 * autoApprovalDelay, // number, pass as minutes
    Keywords: keywords, // string
    MaxAssignments: maxAssignments, // number
    QualificationRequirements: safeQuals, // list of qualification objects
    Question: hitContent
  };

  mturk.createHIT(makeHITParams, (err, data) => {
    if (err) console.log(err, err.stack);
    else {
      console.log("Posted", data.HIT.MaxAssignments, "assignments:", data.HIT.HITId);
      currentHitId = data.HIT.HITId;
      currentHITTypeId = data.HIT.HITTypeId
      currentHITGroupId = data.HIT.HITGroupId
      if (typeof callback === 'function') callback(data.HIT)
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

// * getHITURL *
// -------------------------------------------------------------------
// Retrieves the URL of a specified HIT.
//
// Takes HIT ID as parameter.

const getHITURL = (hitId, callback) => {
  let url = ""
  mturk.getHIT({HITId: hitId}, (err, data) => {
    if (err) console.log(err, err.stack);
    else {
      url = "https://worker.mturk.com/projects/" + data.HIT.HITGroupId + "/tasks"
    }
    console.log(url);
    if (typeof callback === 'function') callback(url)
  })
}

// * workOnActiveHITs *
// -------------------------------------------------------------------
// Retrieves all active HITs.
//
// Returns an array of Active HITs.

const workOnActiveHITs = (callback) => {
  mturk.listHITs({MaxResults: 100}, (err, data) => {
    if (err) {console.log(err, err.stack)} else {
      if (typeof callback === 'function'){
        callback(data.HITs.filter(h => h.HITStatus == "Assignable").map(h => h.HITId))
      }
    }
  })
}

const listAssignments = (HITId,callback) => {
  mturk.listAssignmentsForHIT({HITId:HITId},(err,data) => {
    if (err) {console.log(err, err.stack)} else {
      if (typeof callback === 'function') callback(data)
    }
  })
}

// * expireHIT *
// -------------------------------------------------------------------
// Expires all active HITs by updating the time-until-expiration to 0.
// Users who have already accepted the HIT should still be able to finish and submit.
//
// Takes a HIT ID as a parameter

const expireHIT = (HITId) => {
  mturk.updateExpirationForHIT({HITId: HITId,ExpireAt:0}, (err, data) => {
    if (err) { console.log(err, err.stack)
    } else {console.log("Expired HIT:", HITId)}
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
  hitsLeft = maxAssignments - usersAcceptedHIT
  console.log('users accepted: ', usersAcceptedHIT)
  console.log('hits left: ', hitsLeft);
  if(taskStarted) {
    expireHIT(currentHitId);
    console.log("expired active HITs")
  }
}

// * assignQualificationToUsers *
// -------------------------------------------------------------------
// Assigns a qualification to users who have already completed the task - does not let workers repeat task
// Takes users in Database as a parameter, fetches mturk Id.

const assignQualificationToUsers = (users,qual) => {
  users.filter(u => u.mturkId).forEach((user) => {
    var assignQualificationParams = {QualificationTypeId: qual.QualificationTypeId, WorkerId: user.mturkId, IntegerValue: 1, SendNotification: false};
    mturk.associateQualificationWithWorker(assignQualificationParams, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log("Assigned",qual.QualificationTypeId,"to",user.mturkId);           // successful response
    });
  })
}


// * unassignQualificationFromUsers *
// -------------------------------------------------------------------
// Assigns a qualification to users who have already completed the task - does not let workers repeat task
// Takes users in Database as a parameter, fetches mturk Id.

const unassignQualificationFromUsers = (users,qual) => {
  users.filter(u => u.mturkId).forEach((user) => {
    var assignQualificationParams = {QualificationTypeId: qual.QualificationTypeId, WorkerId: user.mturkId};
    mturk.disassociateQualificationFromWorker(assignQualificationParams, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log("Un-Assigned",qual.QualificationTypeId,"from",user.mturkId);           // successful response
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

const listUsersWithQualification = (qual, callback) => {
  var userWithQualificationParams = {QualificationTypeId: qual.QualificationTypeId, MaxResults: 100};
  mturk.listWorkersWithQualificationType(userWithQualificationParams, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      console.log(data);
      if (typeof callback === 'function') callback(data)
    }
  });
}

// * payBonuses *
// -------------------------------------------------------------------
// Bonus all users in DB who have leftover bonuses.
//
// Takes users as a parameter.
// Returns an array of bonused users.

const payBonuses = (users,callback) => {
  let successfullyBonusedUsers = []
  users.filter(u => u.mturkId != 'A19MTSLG2OYDLZ' && u.mturkId.length > 5).filter(u => u.bonus != 0).forEach((u) => {
    mturk.sendBonus({
      AssignmentId: u.assignmentId,
      BonusAmount: String(u.bonus),
      Reason: "Thanks for participating in our HIT!",
      WorkerId: u.mturkId,
      UniqueRequestToken: u.id
    }, (err, data) => {
      if (err) {
        if(err.message.includes("The idempotency token \"" + u.id + "\" has already been processed.")) {
          console.log("Already bonused",u.bonus ,u.id, u.mturkId)
          successfullyBonusedUsers.push(u)
        } else {
          console.log("NOT bonused\t",u.bonus ,u.id, u.mturkId,err)
        }
      } else {
        successfullyBonusedUsers.push(u)
        console.log("Bonused:",u.bonus ,u.id, u.mturkId)
      }
      if (typeof callback === 'function') {
        callback(successfullyBonusedUsers)
      }
      return successfullyBonusedUsers
    })
  })
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

const launchBang = (callback) => {
  // HIT Parameters
  let time = Date.now();

  let HITTitle = 'Write online ads - bonus up to $'+ hourlyWage + ' / hour (' + time + ')';
  let description = 'Work in groups to write ads for new products. This task will take approximately ' + Math.round((roundMinutes * numRounds) + 10)  + ' minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $' + bonusPrice + '.'
  let assignmentDuration = 60 * taskDuration
  let lifetime = 60*(timeActive)
  let reward = String(rewardPrice)
  let autoApprovalDelay = 60*taskDuration
  let keywords = 'ads, writing, copy editing, advertising'
  let maxAssignments = numAssignments
  let hitContent = externalHIT(taskURL)

  makeHIT(HITTitle, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, hitContent, function(HIT) {

    if (typeof callback === 'function') callback(HIT)
  });

  let delay = 1;
  // only continues to post if not enough people accepted HIT
  // Reposts every timeActive(x) number of minutes to keep HIT on top - stops reposting when enough people join
  setTimeout(() => {
    if(hitsLeft > 0 && !taskStarted) {
      time = Date.now();
      numAssignments = hitsLeft;
      let HITTitle = 'Write online ads - bonus up to $'+ hourlyWage + ' / hour (' + time + ')';
      let params2 = {
        Title: HITTitle,
        Description: 'Work in groups to write ads for new products. This task will take approximately ' + Math.round((roundMinutes * numRounds) + 10)  + ' minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $' + bonusPrice + '.',
        AssignmentDurationInSeconds: 60*taskDuration, // 30 minutes?
        LifetimeInSeconds: 60*(timeActive),  // short lifetime, deletes and reposts often
        Reward: String(rewardPrice),
        AutoApprovalDelayInSeconds: 60*taskDuration,
        Keywords: 'ads, writing, copy editing, advertising',
        MaxAssignments: numAssignments,
        QualificationRequirements: safeQuals,
        Question: externalHIT(taskURL)
      };

      mturk.createHIT(params, (err, data) => {
          if (err) {
            console.log(err, err.stack);
          } else {
            console.log("Posted", data.HIT.MaxAssignments, "assignments:", data.HIT.HITId);
            currentHitId = data.HIT.HITId;
            currentHITTypeId = data.HIT.HITTypeId
            currentHITGroupId = data.HIT.HITGroupId
          }
      });
      delay++;
    } else {
      clearTimeout();
      expireHIT(currentHitId);
    }
   }, 1000 * 60 * timeActive * delay)

}

// * notifyWorkers
// -------------------------------------------------------------------
// Sends a message to all users specified

const notifyWorkers = (WorkerIds, subject, message) => {
 mturk.notifyWorkers({WorkerIds:WorkerIds, MessageText:message, Subject:subject}, function(err, data) {
   if (err) console.log("Error notifying workers:",err, err.stack); // an error occurred
   else     console.log("Notified",WorkerIds.length,"workers:", subject);           // successful response
 });
//  mturk.assignQualificationToUsers(WorkerIds, quals.willBang)
}

//turkerJSON.forEach(notifyWorkersManually);

module.exports = {
  startTask: startTask,
  updatePayment: updatePayment,
  getBalance: getBalance,
  makeHIT: makeHIT,
  returnHIT: returnHIT,
  workOnActiveHITs: workOnActiveHITs,
  expireHIT: expireHIT,
  deleteHIT: deleteHIT,
  createQualification: createQualification,
  setAssignmentsPending: setAssignmentsPending,
  assignQualificationToUsers: assignQualificationToUsers,
  unassignQualificationFromUsers: unassignQualificationFromUsers,
  disassociateQualification: disassociateQualification,
  listUsersWithQualification: listUsersWithQualification,
  payBonuses: payBonuses,
  bonusPrice: bonusPrice,
  blockWorker: blockWorker,
  checkBlocks: checkBlocks,
  returnCurrentHIT: returnCurrentHIT,
  submitTo: submitTo,
  launchBang: launchBang,
  getHITURL: getHITURL,
  listAssignments: listAssignments,
  notifyWorkers: notifyWorkers,
  quals: quals
};

// TODO: CLean this up by integrating with other bonus code
const payBonusesManually = (user) => {
  mturk.sendBonus({
    AssignmentId: user.assignmentId,
    BonusAmount: String(user.bonus),
    Reason: "Thanks for working on our task.",
    WorkerId: user.mturkId,
    UniqueRequestToken: user.assignmentId
  }, function(err, data) {
    if (err) {
     console.log("Bonus not processed:",err)
    } else {
      console.log("Bonused:",user.mturkId, user.bonus)
      user.paid = user.bonus
    }
  })
}

users = [] //list of user objects

// users.forEach(payBonusesManually)

// Figure out how to build link when HIT is created
// `print "https://workersandbox.mturk.com/mturk/preview?groupId={}".format(hit_type_id)`
// or
// `print "https://mturk.com/mturk/preview?groupId={}".format(hit_type_id)`

// var hitId =  "3UXQ63NLAA1WDL4YZ0RN312GDXALBD"
// var hitURL = getHITURL(hitId)
