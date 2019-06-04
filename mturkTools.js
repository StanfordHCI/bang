/* Find documentation on all AWS operations here: https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_OperationsArticle.html */
/* For Node: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html#getHIT-property */
require("dotenv").config();
const chalk = require("chalk");
const args = require("yargs").argv;
const AWS = require("aws-sdk");

const runningLocal = process.env.RUNNING_LOCAL === "TRUE";
const runningLive = process.env.RUNNING_LIVE === "TRUE"; //ONLY CHANGE IN VIM ON SERVER
const teamSize = parseInt(process.env.TEAM_SIZE);
const roundMinutes = process.env.ROUND_MINUTES;

let endpoint = "https://mturk-requester-sandbox.us-east-1.amazonaws.com";
let submitTo = "https://workersandbox.mturk.com";

if (runningLive) {
  endpoint = "https://mturk-requester.us-east-1.amazonaws.com";
  submitTo = "https://www.mturk.com";
}

let taskURL = args.url || process.env.TASK_URL;
if (runningLocal) {
  taskURL = "https://localhost:3000/";
}

AWS.config = {
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_KEY,
  region: "us-east-1",
  sslEnabled: true
};

// Declaration of variables
const numRounds = 4;
const taskDuration = roundMinutes * numRounds * 2;
//const taskDuration = roundMinutes * numRounds * 3 < .5 ? 1 : roundMinutes * numRounds * 3; // how many minutes - this is a Maximum for the task
const timeActive = 10; // How long a task stays alive in minutes -  repost same task to assure top of list
const hourlyWage = 12; // changes reward of experiment depending on length - change to 6?
const basePrice = 0.9; // upfront cost
const maxAssignments = teamSize * teamSize * 8; //MW: Boosted to try to get more participants.

let bonusPrice = (
  hourlyWage * ((roundMinutes * numRounds + 10) / 60) -
  basePrice
).toFixed(2);
let usersAcceptedHIT = 0;
let numAssignments = maxAssignments; // extra HITs for over-recruitment

let currentHitId = "";

let hitsLeft = numAssignments; // changes when users accept and disconnect (important - don't remove)
let taskStarted = false;

//Setting up qualifications
const quals = {
  notUSA: {
    QualificationTypeId: "00000000000000000071", // non-US workers only
    LocaleValues: [{ Country: "US" }],
    Comparator: "NotIn",
    ActionsGuarded: "DiscoverPreviewAndAccept" // only users outside of the US can see the HIT
  },
  onlyUSA: {
    QualificationTypeId: "00000000000000000071", // US workers only
    LocaleValues: [{ Country: "US" }],
    Comparator: "In",
    ActionsGuarded: "DiscoverPreviewAndAccept" // only users within the US can see the HIT
  },
  hitsAccepted: k => {
    return {
      QualificationTypeId: "00000000000000000040", // more than 1000 HITs
      Comparator: "GreaterThan",
      IntegerValues: [k],
      RequiredToPreview: true
    };
  },
  hasBanged: {
    // those how have completed our HIT shoudl not see it
    QualificationTypeId: runningLive
      ? "3H0YKIU04V7ZVLLJH5UALJTJGXZ6DG"
      : "32X4OLFWW285XJWVDIWLQXWVGH0TDB",
    Comparator: "DoesNotExist",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  willBang: {
    // those who plan to complete our HIT
    QualificationTypeId: runningLive
      ? "3H3KEN1OLSVM98I05ACTNWVOM3JBI9"
      : "3Q14PV9RQ817STQZOSBE3H0UXC7M1J",
    Comparator: "Exists",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  willNotBang: {
    // those who plan to complete our HIT
    QualificationTypeId: runningLive
      ? "3H3KEN1OLSVM98I05ACTNWVOM3JBI9"
      : "3Q14PV9RQ817STQZOSBE3H0UXC7M1J",
    Comparator: "DoesNotExist",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  }
};

const minHitsRequired = 100;
const qualsForLive = [
  quals.onlyUSA,
  quals.hitsAccepted(minHitsRequired),
  quals.hasBanged
];
const scheduleQuals = [
  quals.onlyUSA,
  quals.hitsAccepted(minHitsRequired),
  quals.hasBanged,
  quals.willNotBang
];
const qualsForTesting = [quals.onlyUSA];
const safeQuals = runningLive ? qualsForLive : qualsForTesting;

// Makes the MTurk externalHIT object, defaults to 700 px tall.
const externalHIT = (taskURL, height = 700) =>
  '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>' +
  taskURL +
  "</ExternalURL><FrameHeight>" +
  height +
  "</FrameHeight></ExternalQuestion>";

// This initiates the API
// Find more in the docs here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html
const mturk = new AWS.MTurk({ endpoint: endpoint });

// * startTask *
// -------------------------------------------------------------------
// Notifies that task has started, cancel HIT posting.

const startTask = () => {
  taskStarted = true;
};

// * updatePayment *
// -------------------------------------------------------------------
// Changes the bonusPrice depending on the total time Turker has spent on the task.
//
// Takes a number as a parameter.

const updatePayment = totalTime => {
  bonusPrice = (hourlyWage * (totalTime / 60) - basePrice).toFixed(2);
  if (bonusPrice < 0) {
    bonusPrice = 0;
  }
};

// * getBalance *
// -------------------------------------------------------------------
// Console-logs the balance of the associated account.
// This will return $10,000.00 in the MTurk Developer Sandbox.
const getBalance = callback => {
  mturk.getAccountBalance((err, data) => {
    if (err) console.log(err, err.stack);
    // an error occurred
    else {
      console.log(data); // successful response
      if (typeof callback === "function") callback(data.AvailableBalance);
    }
  });
};

// * makeHIT *
// -------------------------------------------------------------------
// Creates and posts a HIT.
//
// Requires multiple Parameters.
// Must manually add Qualification Requirements if desired.

const makeHIT = (
  chooseQual,
  title,
  description,
  assignmentDuration,
  lifetime,
  reward,
  autoApprovalDelay,
  keywords,
  maxAssignments,
  hitContent,
  callback
) => {
  // if a schedule bang, change quals to scheduleQuals

  let quals = [];
  if (!runningLive) {
    quals = qualsForTesting;
  } else if (chooseQual === "safeQuals") {
    quals = safeQuals;
  } else if (chooseQual === "scheduleQuals") {
    quals = scheduleQuals;
  }

  let makeHITParams = {
    Title: title, // string
    Description: description, // string
    AssignmentDurationInSeconds: 60 * assignmentDuration, // number, pass as minutes
    LifetimeInSeconds: 60 * lifetime, // number, pass as minutes
    Reward: String(basePrice), // string - ok if passed as number
    AutoApprovalDelayInSeconds: 60 * autoApprovalDelay, // number, pass as minutes
    Keywords: keywords, // string
    MaxAssignments: maxAssignments, // number
    QualificationRequirements: quals, // list of qualification objects
    Question: hitContent
  };

  mturk.createHIT(makeHITParams, (err, data) => {
    if (err) console.log(err, err.stack);
    else {
      console.log(
        "Posted",
        data.HIT.MaxAssignments,
        "assignments:",
        data.HIT.HITId
      );
      currentHitId = data.HIT.HITId;
      if (typeof callback === "function") callback(data.HIT);
    }
  });
};

// * returnHIT *
// -------------------------------------------------------------------
// Retrieves the details of a specified HIT.
//
// Takes HIT ID as parameter.

const returnHIT = (hitId, callback) => {
  var returnHITParams = { HITId: hitId /* required */ };
  mturk.getHIT(returnHITParams, function(err, data) {
    if (err) console.log("Error: " + err.message);
    // an error occurred
    else callback(data); // successful response
  });
};

// * getHITURL *
// -------------------------------------------------------------------
// Retrieves the URL of a specified HIT.
//
// Takes HIT ID as parameter.

const getHITURL = (hitId, callback = null) => {
  mturk.getHIT({ HITId: hitId }, (err, data) => {
    if (err) console.log("Error: " + err.message);
    else {
      const url = `https://${
        runningLive ? "worker" : "workersandbox"
      }.mturk.com/projects/${data.HIT.HITGroupId}/tasks`;
      if (typeof callback === "function") {
        callback(url);
      }
    }
  });
};

// * workOnActiveHITs *
// -------------------------------------------------------------------
// Retrieves all active HITs.
//
// Returns an array of Active HITs.

const workOnActiveHITs = callback => {
  mturk.listHITs({ MaxResults: 100 }, (err, data) => {
    if (err) {
      console.log("Error: " + err.message);
    } else {
      if (typeof callback === "function") {
        callback(
          data.HITs.filter(h => h.HITStatus === "Assignable").map(h => h.HITId)
        );
      }
    }
  });
};

// * listAssignments *
// -------------------------------------------------------------------
// Retrieves all active HIT assignments, returns the assignments
//
// Takes a HITId as a parameter

const listAssignments = (
  HITId,
  callback,
  paginationToken = null,
  passthrough = []
) => {
  mturk.listAssignmentsForHIT(
    { HITId: HITId, MaxResults: 100, NextToken: paginationToken },
    (err, data) => {
      if (err) console.log("Error: " + err.message);
      else {
        passthrough = passthrough.concat(data.Assignments);
        if (data.NumResults === 100) {
          listAssignments(HITId, callback, data.NextToken, passthrough);
        } else {
          if (typeof callback === "function") callback(passthrough);
        }
      }
    }
  );
};

// * expireHIT *
// -------------------------------------------------------------------
// Expires HIT by updating the time-until-expiration to 0.
// Users who have already accepted the HIT should still be able to finish and submit.
//
// Takes a HIT ID as a parameter

const expireHIT = HITId => {
  mturk.updateExpirationForHIT({ HITId: HITId, ExpireAt: 0 }, err => {
    if (err) {
      console.log("Error in expireHIT: " + err.message);
    } else {
      console.log("Expired HIT:", HITId);
    }
  });
};

// * deleteHIT *
// -------------------------------------------------------------------
// Disposes of a specified HIT. HITs are automatically deleted after 120 days.
// Only the requester who created the HIT can delete it.
//
// Takes a string of the HIT ID as a parameter.

const deleteHIT = theHITId => {
  mturk.deleteHIT({ HITId: theHITId }, err => {
    if (err) console.log("Error: " + err.message);
    else console.log("Deleted HIT:", theHITId);
  });
};

// * createQualification *
// -------------------------------------------------------------------
// Creates a qualification that will be assigned to an individual that accepts the task. That individual will
// not be able to see it task again.
//
// Takes a string for the name of the qualification type as parameter.
// Returns the qualificationTypeId of the newly created qualification.

const createQualification = name => {
  var qualificationParams = {
    Description:
      "This user has already accepted a HIT for this specific task. We only allow one completion of this task per worker." /* required */,
    Name: name /* required */,
    QualificationTypeStatus: "Active" /* required */
  };
  mturk.createQualificationType(qualificationParams, function(err, data) {
    if (err) console.log(err, err.stack);
    // an error occurred
    else console.log(data); // successful response
    // qualificationId = data.QualificationTypeId;  // if running HIT immediately
    return data.QualificationTypeId;
  });
};

// * setAssignmentsPending *
// -------------------------------------------------------------------
// Keeps track of how many assignments have been accepted by Turkers - necessary for HIT reposting.
// Called whenever a user accepts a HIT (server.js)

const setAssignmentsPending = data => {
  usersAcceptedHIT = data;
  hitsLeft = maxAssignments - usersAcceptedHIT;
  if (taskStarted) hitsLeft = 0;
  console.log("users accepted: ", usersAcceptedHIT);
  // console.log("hits left: ", hitsLeft);
  if (taskStarted) {
    expireHIT(currentHitId);
    console.log("expired active HITs");
  }
};

// * assignQualificationToUsers *
// -------------------------------------------------------------------
// Assigns a qualification to users who have already completed the task - does not let workers repeat task
// Takes users in Database as a parameter, fetches mturk Id.

const assignQualificationToUsers = (users, qual) => {
  users
    .filter(u => u.mturkId)
    .forEach(user => {
      var assignQualificationParams = {
        QualificationTypeId: qual.QualificationTypeId,
        WorkerId: user.mturkId,
        IntegerValue: 1,
        SendNotification: false
      };
      mturk.associateQualificationWithWorker(
        assignQualificationParams,
        function(err) {
          if (err) console.log(err, err.stack);
          // an error occurred
          else
            console.log(
              "Assigned",
              qual.QualificationTypeId,
              "to",
              user.mturkId
            ); // successful response
        }
      );
    });
};

// * assignQualificationToUsers *
// -------------------------------------------------------------------
// Assigns a qualification to users who have already completed the task - does not let workers repeat task
// Takes single userId string as param, and qual as

const assignQuals = (user, qual) => {
  var assignQualificationParams = {
    QualificationTypeId: qual.QualificationTypeId,
    WorkerId: user,
    IntegerValue: 1,
    SendNotification: false
  };
  mturk.associateQualificationWithWorker(assignQualificationParams, function(
    err
  ) {
    if (err)
      console.log("Error assigning ", qual.QualificationTypeId, " to ", user);
    // an error occurred
    else console.log("Assigned ", qual.QualificationTypeId, " to ", user);
  });
};

// * unassignQualificationFromUsers *
// -------------------------------------------------------------------
// Removes a qualification to users who have already completed the task - does not let workers repeat task

const unassignQualificationFromUsers = (users, qual) => {
  users
    .filter(u => u.mturkId)
    .forEach(user => {
      var assignQualificationParams = {
        QualificationTypeId: qual.QualificationTypeId,
        WorkerId: user.mturkId
      };
      mturk.disassociateQualificationFromWorker(
        assignQualificationParams,
        function(err) {
          if (err) console.log(err, err.stack);
          // an error occurred
          else
            console.log(
              "Un-Assigned",
              qual.QualificationTypeId,
              "from",
              user.mturkId
            ); // successful response
        }
      );
    });
};

// * unassignQuals *
// -------------------------------------------------------------------
// Removes a qualification to users who have already completed the task - does not let workers repeat task
// takes a userId as a string as paramter, and the qualification

const unassignQuals = (user, qual, reason) => {
  var assignQualificationParams = {
    QualificationTypeId: qual.QualificationTypeId,
    WorkerId: user,
    Reason: reason
  };
  mturk.disassociateQualificationFromWorker(assignQualificationParams, function(
    err
  ) {
    if (err)
      console.log(
        `Error unassigning ${
          qual.QualificationTypeId
        } from ${user}:\n${chalk.red(err)}`
      );
    // an error occurred
    else console.log(`Unassigned ${qual.QualificationTypeId} from ${user}.`);
  });
};

// * disassociateQualification *
// -------------------------------------------------------------------
// Revokes a previously assigned qualification from a specified user.
//
// Takes the qualification ID, worker ID, and reason as parateters - strings.

const disassociateQualification = (qualificationId, workerId, reason) => {
  var disassociateQualificationParams = {
    QualificationTypeId: qualificationId /* required */, // string
    WorkerId: workerId /* required */, // string
    Reason: reason
  };
  mturk.disassociateQualificationFromWorker(
    disassociateQualificationParams,
    function(err, data) {
      if (err) console.log(err, err.stack);
      // an error occurred
      else console.log(data); // successful response
    }
  );
};

// * listUsersWithQualification *
// -------------------------------------------------------------------
// Lists MTurk users who have a specific qualification

const listUsersWithQualification = (qual, max, callback) => {
  if (max > 100) max = 100;
  var userWithQualificationParams = {
    QualificationTypeId: qual.QualificationTypeId,
    MaxResults: max,
    Status: "Granted"
  };
  mturk.listWorkersWithQualificationType(userWithQualificationParams, function(
    err,
    data
  ) {
    if (err) console.log(err, err.stack);
    // an error occurred
    else {
      if (typeof callback === "function") callback(data);
    }
  });
};

// recursive version of function - returns an array of workerIds
const listUsersWithQualificationRecursively = (
  qual,
  callback,
  paginationToken = null,
  passthrough = []
) => {
  mturk.listWorkersWithQualificationType(
    {
      QualificationTypeId: qual.QualificationTypeId,
      MaxResults: 100,
      NextToken: paginationToken,
      Status: "Granted"
    },
    (err, data) => {
      if (err) console.log(err, err.stack);
      else {
        passthrough = passthrough.concat(
          data.Qualifications.map(a => a.WorkerId)
        );
        if (data.NumResults === 100) {
          listUsersWithQualificationRecursively(
            qual,
            callback,
            data.NextToken,
            passthrough
          );
        } else {
          if (typeof callback === "function") callback(passthrough);
        }
      }
    }
  );
};

// * payBonuses *
// -------------------------------------------------------------------
// Bonus all users in DB who have leftover bonuses.
//
// Takes users as a parameter.
// Returns an array of bonused users.

const payBonuses = (users, callback) => {
  let successfullyBonusedUsers = [];
  const bonusableUsers = users
    .map(u => {
      // This tries to make sure the user has the correct variables
      if (!u.mturkId && !u.assignmentId) {
        u.mturkId = u.WorkerId;
        u.assignmentId = u.AssignmentId;
      }
      return u;
    }) //Filters out Mark and false ids and 0 bonuses.
    .filter(u => u.mturkId !== "A19MTSLG2OYDLZ" && u.mturkId.length > 5)
    .filter(u => u.bonus != 0);
  bonusableUsers.forEach((u, index) => {
    mturk.sendBonus(
      {
        AssignmentId: u.assignmentId,
        BonusAmount: String(u.bonus),
        Reason: "Thanks for participating in our HIT!",
        WorkerId: u.mturkId,
        UniqueRequestToken: u.id
      },
      err => {
        if (err) {
          if (
            err.message.includes(
              `The idempotency token "${u.id}" has already been processed.`
            )
          ) {
            console.log("Already bonused", u.bonus, u.id, u.mturkId);
            successfullyBonusedUsers.push(u);
          } else {
            if (
              err.message.includes(
                `Assignment ${u.assignmentId} does not exist.`
              )
            ) {
            } else {
              console.log(
                "NOT bonused\t",
                u.bonus,
                u.id,
                u.mturkId,
                err.message
              );
            }
          }
        } else {
          successfullyBonusedUsers.push(u);
          console.log("Bonused:", u.bonus, u.id, u.mturkId);
        }
        if (typeof callback === "function") {
          if (bonusableUsers.length === index + 1) {
            callback(successfullyBonusedUsers);
          }
        }
        return successfullyBonusedUsers;
      }
    );
  });
};

// * blockWorker *
// -------------------------------------------------------------------
// Blocks a particular worker.
//
// Takes workerID and reason as parameters - strings.

const blockWorker = (reason, workerId) => {
  var blockWorkerParams = {
    Reason: reason /* required */, // string
    WorkerId: workerId /* required */ // string
  };
  mturk.createWorkerBlock(blockWorkerParams, function(err, data) {
    if (err) console.log(err, err.stack);
    // an error occurred
    else console.log(data); // successful response
  });
};

// * checkBlocks *
// -------------------------------------------------------------------
// Lists workers that have been blocked. An option to remove all worker blocks.

const checkBlocks = (removeBlocks = false) => {
  mturk.listWorkerBlocks({}, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log("You have the following blocks:", data);
      if (removeBlocks) {
        data.WorkerBlocks.forEach(worker => {
          mturk.deleteWorkerBlock(
            { WorkerId: worker.WorkerId, Reason: "not needed" },
            (err, data) => {
              if (err) {
                console.log(err, err.stack);
              } else {
                console.log("Removed block on", worker.WorkerId, data);
              }
            }
          );
        });
      }
    }
  });
};

// * returnCurrentHIT *
// -------------------------------------------------------------------
// Returns the current active HIT ID

const returnCurrentHIT = () => {
  return currentHitId;
};

// * launchBang *
// -------------------------------------------------------------------
// Launches Scaled-Humanity Fracture experiment

function launchBang(batchID, callback) {
  // HIT Parameters

  let bangParameters = {
    Title: `Brainstorm Crowdfunding Campaign Titles - variable bonus up to $${bonusPrice} (${batchID})`,
    Description: `Work in groups to write crowdfunding campaign titles. This task can take up to ${Math.round(
      roundMinutes * numRounds + 15
    )} minutes. There is a initial chatroom for up to 20 minutes for the base pay. If you are selected to move on to the next section, you will receive a prorated bonus of up to $${bonusPrice} (which translates to $${hourlyWage}/hour)`,
    AssignmentDurationInSeconds: 60 * taskDuration, // 30 minutes?
    LifetimeInSeconds: 60 * timeActive, // short lifetime, deletes and reposts often
    Reward: String(basePrice),
    AutoApprovalDelayInSeconds: 60 * taskDuration,
    Keywords: "ads, writing, copy editing, advertising",
    MaxAssignments: numAssignments,
    QualificationRequirements: safeQuals,
    Question: externalHIT(taskURL)
  };

  mturk.createHIT(bangParameters, (err, data) => {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(
        "Posted",
        data.HIT.MaxAssignments,
        "assignments:",
        data.HIT.HITId
      );
      currentHitId = data.HIT.HITId;
      if (typeof callback === "function") callback(data.HIT);
    }
  });

  let delay = 1;
  // only continues to post if not enough people accepted HIT
  // Reposts every timeActive(x) number of minutes to keep HIT on top - stops reposting when enough people join
  setTimeout(() => {
    if (hitsLeft > 0 && !taskStarted) {
      bangParameters.MaxAssignments = hitsLeft;
      mturk.createHIT(bangParameters, (err, data) => {
        if (err) {
          console.log(err, err.stack);
        } else {
          console.log(
            "Posted",
            data.HIT.MaxAssignments,
            "assignments:",
            data.HIT.HITId
          );
          currentHitId = data.HIT.HITId;
        }
      });
      delay++;
    } else {
      clearTimeout();
      expireHIT(currentHitId);
    }
  }, 1000 * 60 * timeActive * delay);
}

// * notifyWorkers
// -------------------------------------------------------------------
// Sends a message to all users specified

const notifyWorkers = (WorkerIds, subject, message) => {
  mturk.notifyWorkers(
    { WorkerIds: WorkerIds, MessageText: message, Subject: subject },
    function(err) {
      if (err) console.log("Error notifying workers:", err.message);
      // an error occurred
      else console.log("Notified ", WorkerIds.length, " workers:", subject); // successful response
    }
  );
};

module.exports = {
  startTask: startTask,
  hourlyWage: hourlyWage,
  rewardPrice: basePrice,
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
  assignQuals: assignQuals,
  unassignQualificationFromUsers: unassignQualificationFromUsers,
  unassignQuals: unassignQuals,
  disassociateQualification: disassociateQualification,
  listUsersWithQualification: listUsersWithQualification,
  listUsersWithQualificationRecursively: listUsersWithQualificationRecursively,
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

// * checkQualsRecursive *
// -------------------------------------------------------------------
// Gets the total number of users that have a certain qualification. Uncomment the funciton underneath to call.
//
// Takes a qual object and callback(function) as parameters, returns an array of MTURK IDS
//NOTE: CHANGED TO RETURN ARRAY OF MTURK IDS NOT USER OBJECTS
const checkQualsRecursive = (
  qualObject,
  callback,
  paginationToken = null,
  passthrough = []
) => {
  var userWithQualificationParams = {
    QualificationTypeId: qualObject.QualificationTypeId,
    MaxResults: 100,
    NextToken: paginationToken,
    Status: "Granted"
  };
  mturk.listWorkersWithQualificationType(userWithQualificationParams, function(
    err,
    data
  ) {
    if (err) console.log(err, err.stack);
    else {
      passthrough = passthrough.concat(
        data.Qualifications.map(a => a.WorkerId)
      );
      if (data.NumResults === 100) {
        checkQualsRecursive(qualObject, callback, data.NextToken, passthrough);
      } else {
        callback(passthrough);
      }
    }
  });
};

// Performs unsubscribe for mturk user.
// Evoke with flag `--unsubscribe mturkID`
if (args.unsubscribe) {
  unassignQuals(
    args.unsubscribe,
    quals.willBang,
    "You asked to be removed from our notification list."
  );
}
