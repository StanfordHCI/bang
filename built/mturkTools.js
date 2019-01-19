"use strict";
/* Find documentation on all AWS operations here: https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_OperationsArticle.html */
/* For Node: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html#getHIT-property */
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = require("dotenv");
dotenv.config();
var yargs = require("yargs");
var args = yargs.argv;
var runningLocal = process.env.RUNNING_LOCAL === "TRUE";
var runningLive = process.env.RUNNING_LIVE === "TRUE"; //ONLY CHANGE IN VIM ON SERVER
var teamSize = parseInt(process.env.TEAM_SIZE);
var roundMinutes = parseInt(process.env.ROUND_MINUTES);
var endpoint = "https://mturk-requester-sandbox.us-east-1.amazonaws.com";
var submitTo = "https://workersandbox.mturk.com";
if (runningLive) {
    endpoint = "https://mturk-requester.us-east-1.amazonaws.com";
    submitTo = "https://www.mturk.com";
}
var taskURL = args.url || process.env.TASK_URL;
if (runningLocal) {
    taskURL = "https://localhost:3000/";
}
var AWS = require("aws-sdk");
AWS.config.accessKeyId = process.env.AWS_ID;
AWS.config.secretAccessKey = process.env.AWS_KEY;
AWS.config.region = "us-east-1";
AWS.config.sslEnabled = true;
// Declaration of variables
var numRounds = 4;
var taskDuration = roundMinutes * numRounds * 2;
//const taskDuration = roundMinutes * numRounds * 3 < .5 ? 1 : roundMinutes * numRounds * 3; // how many minutes - this is a Maximum for the task
var timeActive = 4; //should be 10 // How long a task stays alive in minutes -  repost same task to assure top of list
var hourlyWage = 10.5; // changes reward of experiment depending on length - change to 6?
var rewardPrice = 0.01; // upfront cost
var maxAssignments = 2 * teamSize * teamSize * 2;
var bonusPrice = (hourlyWage * ((roundMinutes * numRounds + 10) / 60) -
    rewardPrice).toFixed(2);
var usersAcceptedHIT = 0;
var numAssignments = maxAssignments; // extra HITs for over-recruitment
var currentHitId = "";
var hitsLeft = numAssignments; // changes when users accept and disconnect (important - don't remove)
var taskStarted = false;
//MEW: Various qualifications set for convenience because we use them a lot.
var quals = {
    notUSA: {
        QualificationTypeId: "00000000000000000071",
        LocaleValues: [{ Country: "US" }],
        Comparator: "NotIn",
        ActionsGuarded: "DiscoverPreviewAndAccept"
    },
    onlyUSA: {
        QualificationTypeId: "00000000000000000071",
        LocaleValues: [{ Country: "US" }],
        Comparator: "In",
        ActionsGuarded: "DiscoverPreviewAndAccept"
    },
    hitsAccepted: function (k) {
        return {
            QualificationTypeId: "00000000000000000040",
            Comparator: "GreaterThan",
            IntegerValues: [k],
            RequiredToPreview: true
        };
    },
    hasBanged: {
        //MEW: useful to filter out people who have already doen our HIT.
        QualificationTypeId: runningLive
            ? "3H0YKIU04V7ZVLLJH5UALJTJGXZ6DG"
            : "32X4OLFWW285XJWVDIWLQXWVGH0TDB",
        Comparator: "DoesNotExist",
        ActionsGuarded: "DiscoverPreviewAndAccept"
    },
    willBang: {
        //MEW: useful to filter people who are scheduled to do our HIT.
        QualificationTypeId: runningLive
            ? "3H3KEN1OLSVM98I05ACTNWVOM3JBI9"
            : "3Q14PV9RQ817STQZOSBE3H0UXC7M1J",
        Comparator: "Exists",
        ActionsGuarded: "DiscoverPreviewAndAccept"
    },
    willNotBang: {
        //MEW: useful to filter people we don't want to work with.
        QualificationTypeId: runningLive
            ? "3H3KEN1OLSVM98I05ACTNWVOM3JBI9"
            : "3Q14PV9RQ817STQZOSBE3H0UXC7M1J",
        Comparator: "DoesNotExist",
        ActionsGuarded: "DiscoverPreviewAndAccept"
    }
};
var qualsForLive = [quals.onlyUSA, quals.hitsAccepted(500), quals.hasBanged];
var qualsForTesting = [quals.onlyUSA, quals.hitsAccepted(0)];
var scheduleQuals = [
    quals.onlyUSA,
    quals.hitsAccepted(0),
    quals.hasBanged,
    quals.willNotBang
];
var safeQuals = runningLive ? qualsForLive : qualsForTesting;
// Makes the MTurk externalHIT object, defaults to 700 px tall.
var externalHIT = function (taskURL, height) {
    if (height === void 0) { height = 700; }
    return '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>' +
        taskURL +
        "</ExternalURL><FrameHeight>" +
        height +
        "</FrameHeight></ExternalQuestion>";
};
var mturk = new AWS.MTurk({ endpoint: endpoint });
// * startTask *
// -------------------------------------------------------------------
// Notifies that task has started, cancel HIT posting.
var startTask = function () {
    taskStarted = true;
};
// * updatePayment *
// -------------------------------------------------------------------
// Changes the bonusPrice depending on the total time Turker has spent on the task.
//
// Takes a number as a parameter.
var updatePayment = function (totalTime) {
    bonusPrice = (hourlyWage * (totalTime / 60) - rewardPrice).toFixed(2);
    if (parseFloat(bonusPrice) < 0) {
        bonusPrice = "0";
    }
};
// * getBalance *
// -------------------------------------------------------------------
// Console-logs the balance of the associated account.
// This will return $10,000.00 in the MTurk Developer Sandbox.
var getBalance = function (callback) {
    mturk.getAccountBalance(function (err, data) {
        if (err)
            console.log(err, err.stack);
        // an error occurred
        else {
            console.log(data); // successful response
            if (typeof callback === "function")
                callback(data.AvailableBalance);
        }
    });
};
// * makeHIT *
// -------------------------------------------------------------------
// Creates and posts a HIT.
//
// Requires multiple Parameters.
// Must manually add Qualification Requirements if desired.
var makeHIT = function (chooseQual, title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, hitContent, callback) {
    // if a schedule bang, change quals to scheduleQuals
    var quals = [];
    if (chooseQual == "safeQuals")
        quals = safeQuals;
    else if (chooseQual == "scheduleQuals")
        quals = scheduleQuals;
    var makeHITParams = {
        Title: title,
        Description: description,
        AssignmentDurationInSeconds: 60 * assignmentDuration,
        LifetimeInSeconds: 60 * lifetime,
        Reward: String(rewardPrice),
        AutoApprovalDelayInSeconds: 60 * autoApprovalDelay,
        Keywords: keywords,
        MaxAssignments: maxAssignments,
        QualificationRequirements: quals,
        Question: hitContent
    };
    mturk.createHIT(makeHITParams, function (err, data) {
        if (err)
            console.log(err, err.stack);
        else {
            console.log("Posted", data.HIT.MaxAssignments, "assignments:", data.HIT.HITId);
            currentHitId = data.HIT.HITId;
            if (typeof callback === "function")
                callback(data.HIT);
        }
    });
};
// * returnHIT *
// -------------------------------------------------------------------
// Retrieves the details of a specified HIT.
//
// Takes HIT ID as parameter.
var returnHIT = function (hitId, callback) {
    var returnHITParams = { HITId: hitId /* required */ };
    mturk.getHIT(returnHITParams, function (err, data) {
        if (err)
            console.log("Error: " + err.message);
        // an error occurred
        else
            callback(data); // successful response
    });
};
// * getHITURL *
// -------------------------------------------------------------------
// Retrieves the URL of a specified HIT.
//
// Takes HIT ID as parameter.
var getHITURL = function (hitId, callback) {
    var url = "";
    mturk.getHIT({ HITId: hitId }, function (err, data) {
        if (err)
            console.log("Error: " + err.message);
        else {
            url =
                "https://worker.mturk.com/projects/" + data.HIT.HITGroupId + "/tasks";
        }
        console.log(url);
        if (typeof callback === "function")
            callback(url);
    });
};
// * workOnActiveHITs *
// -------------------------------------------------------------------
// Retrieves all active HITs.
//
// Returns an array of Active HITs.
var workOnActiveHITs = function (callback) {
    mturk.listHITs({ MaxResults: 100 }, function (err, data) {
        if (err) {
            console.log("Error: " + err.message);
        }
        else {
            if (typeof callback === "function") {
                callback(data.HITs.filter(function (h) { return h.HITStatus === "Assignable"; }).map(function (h) { return h.HITId; }));
            }
        }
    });
};
// * listAssignments *
// -------------------------------------------------------------------
// Retrieves all active HIT assignments, returns the assignments
//
// Takes a HITId as a parameter
var listAssignments = function (HITId, callback, paginationToken, passthrough) {
    if (paginationToken === void 0) { paginationToken = null; }
    if (passthrough === void 0) { passthrough = []; }
    mturk.listAssignmentsForHIT({ HITId: HITId, MaxResults: 100, NextToken: paginationToken }, function (err, data) {
        if (err)
            console.log("Error: " + err.message);
        else {
            passthrough = passthrough.concat(data.Assignments);
            if (data.NumResults === 100) {
                listAssignments(HITId, callback, data.NextToken, passthrough);
            }
            else {
                if (typeof callback === "function")
                    callback(passthrough);
            }
        }
    });
};
// * expireHIT *
// -------------------------------------------------------------------
// Expires HIT by updating the time-until-expiration to 0.
// Users who have already accepted the HIT should still be able to finish and submit.
//
// Takes a HIT ID as a parameter
var expireHIT = function (HITId) {
    mturk.updateExpirationForHIT({ HITId: HITId, ExpireAt: new Date("0") }, function (err) {
        if (err) {
            console.log("Error in expireHIT: " + err.message);
        }
        else {
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
var deleteHIT = function (theHITId) {
    mturk.deleteHIT({ HITId: theHITId }, function (err) {
        if (err)
            console.log("Error: " + err.message);
        else
            console.log("Deleted HIT:", theHITId);
    });
};
// * createQualification *
// -------------------------------------------------------------------
// Creates a qualification that will be assigned to an individual that accepts the task. That individual will
// not be able to see it task again.
//
// Takes a string for the name of the qualification type as parameter.
// Returns the qualificationTypeId of the newly created qualification.
var createQualification = function (name) {
    var qualificationParams = {
        Description: "This user has already accepted a HIT for this specific task. We only allow one completion of this task per worker." /* required */,
        Name: name /* required */,
        QualificationTypeStatus: "Active" /* required */
    };
    mturk.createQualificationType(qualificationParams, function (err, data) {
        if (err)
            console.log(err, err.stack);
        // an error occurred
        else
            console.log(data); // successful response
        // qualificationId = data.QualificationTypeId;  // if running HIT immediately
        return data.QualificationType;
    });
};
// * setAssignmentsPending *
// -------------------------------------------------------------------
// Keeps track of how many assignments have been accepted by Turkers - necessary for HIT reposting.
// Called whenever a user accepts a HIT (server.js)
var setAssignmentsPending = function (data) {
    usersAcceptedHIT = data;
    hitsLeft = maxAssignments - usersAcceptedHIT;
    if (taskStarted)
        hitsLeft = 0;
    console.log("users accepted: ", usersAcceptedHIT);
    console.log("hits left: ", hitsLeft);
    if (taskStarted) {
        expireHIT(currentHitId);
        console.log("expired active HITs");
    }
};
// * assignQualificationToUsers *
// -------------------------------------------------------------------
// Assigns a qualification to users who have already completed the task - does not let workers repeat task
// Takes users in Database as a parameter, fetches mturk Id.
var assignQualificationToUsers = function (users, qual) {
    users
        .filter(function (u) { return u.mturkId; })
        .forEach(function (user) {
        var assignQualificationParams = {
            QualificationTypeId: qual.QualificationTypeId,
            WorkerId: user.mturkId,
            IntegerValue: 1,
            SendNotification: false
        };
        mturk.associateQualificationWithWorker(assignQualificationParams, function (err, data) {
            if (err)
                console.log(err, err.stack);
            // an error occurred
            else
                console.log("Assigned", qual.QualificationTypeId, "to", user.mturkId); // successful response
        });
    });
};
// * assignQualificationToUsers *
// -------------------------------------------------------------------
// Assigns a qualification to users who have already completed the task - does not let workers repeat task
// Takes single userId string as param, and qual as
var assignQuals = function (user, qual) {
    var assignQualificationParams = {
        QualificationTypeId: qual.QualificationTypeId,
        WorkerId: user,
        IntegerValue: 1,
        SendNotification: false
    };
    mturk.associateQualificationWithWorker(assignQualificationParams, function (err, data) {
        if (err)
            console.log("Error assigning ", qual.QualificationTypeId, " to ", user);
        // an error occurred
        else
            console.log("Assigned ", qual.QualificationTypeId, " to ", user);
    });
};
// * unassignQualificationFromUsers *
// -------------------------------------------------------------------
// Removes a qualification to users who have already completed the task - does not let workers repeat task
var unassignQualificationFromUsers = function (users, qual) {
    users
        .filter(function (u) { return u.mturkId; })
        .forEach(function (user) {
        var assignQualificationParams = {
            QualificationTypeId: qual.QualificationTypeId,
            WorkerId: user.mturkId
        };
        mturk.disassociateQualificationFromWorker(assignQualificationParams, function (err, data) {
            if (err)
                console.log(err, err.stack);
            // an error occurred
            else
                console.log("Un-Assigned", qual.QualificationTypeId, "from", user.mturkId); // successful response
        });
    });
};
// * unassignQuals *
// -------------------------------------------------------------------
// Removes a qualification to users who have already completed the task - does not let workers repeat task
// takes a userId as a string as paramter, and the qualification
var unassignQuals = function (user, qual, reason) {
    var assignQualificationParams = {
        QualificationTypeId: qual.QualificationTypeId,
        WorkerId: user,
        Reason: reason
    };
    mturk.disassociateQualificationFromWorker(assignQualificationParams, function (err, data) {
        if (err)
            console.log("Error unassigning ", qual.QualificationTypeId, " from ", user);
        // an error occurred
        else
            console.log("Unassigned ", qual.QualificationTypeId, " from ", user);
    });
};
// * disassociateQualification *
// -------------------------------------------------------------------
// Revokes a previously assigned qualification from a specified user.
//
// Takes the qualification ID, worker ID, and reason as parateters - strings.
var disassociateQualification = function (qualificationId, workerId, reason) {
    var disassociateQualificationParams = {
        QualificationTypeId: qualificationId /* required */,
        WorkerId: workerId /* required */,
        Reason: reason
    };
    mturk.disassociateQualificationFromWorker(disassociateQualificationParams, function (err, data) {
        if (err)
            console.log(err, err.stack);
        // an error occurred
        else
            console.log(data); // successful response
    });
};
// * listUsersWithQualification *
// -------------------------------------------------------------------
// Lists MTurk users who have a specific qualification
var listUsersWithQualification = function (qual, max, callback) {
    if (max > 100)
        max = 100;
    var userWithQualificationParams = {
        QualificationTypeId: qual.QualificationTypeId,
        MaxResults: max,
        Status: "Granted"
    };
    mturk.listWorkersWithQualificationType(userWithQualificationParams, function (err, data) {
        if (err)
            console.log(err, err.stack);
        // an error occurred
        else {
            if (typeof callback === "function")
                callback(data);
        }
    });
};
// recursive version of function - returns an array of workerIds
var listUsersWithQualificationRecursively = function (qual, callback, paginationToken, passthrough) {
    if (paginationToken === void 0) { paginationToken = null; }
    if (passthrough === void 0) { passthrough = []; }
    mturk.listWorkersWithQualificationType({
        QualificationTypeId: qual.QualificationTypeId,
        MaxResults: 100,
        NextToken: paginationToken,
        Status: "Granted"
    }, function (err, data) {
        if (err)
            console.log(err, err.stack);
        else {
            passthrough = passthrough.concat(data.Qualifications.map(function (a) { return a.WorkerId; }));
            if (data.NumResults === 100) {
                listUsersWithQualificationRecursively(qual, callback, data.NextToken, passthrough);
            }
            else {
                if (typeof callback === "function")
                    callback(passthrough);
            }
        }
    });
};
// * payBonuses *
// -------------------------------------------------------------------
// Bonus all users in DB who have leftover bonuses.
//
// Takes users as a parameter.
// Returns an array of bonused users.
var payBonuses = function (users, callback) {
    var successfullyBonusedUsers = [];
    users
        .filter(function (u) { return u.mturkId !== "A19MTSLG2OYDLZ" && u.mturkId.length > 5; })
        .filter(function (u) { return u.bonus !== 0; })
        .forEach(function (u) {
        mturk.sendBonus({
            AssignmentId: u.assignmentId,
            BonusAmount: String(u.bonus),
            Reason: "Thanks for participating in our HIT!",
            WorkerId: u.mturkId,
            UniqueRequestToken: u.id
        }, function (err, data) {
            if (err) {
                if (err.message.includes('The idempotency token "' +
                    u.id +
                    '" has already been processed.')) {
                    console.log("Already bonused", u.bonus, u.id, u.mturkId);
                    successfullyBonusedUsers.push(u);
                }
                else {
                    console.log("NOT bonused\t", u.bonus, u.id, u.mturkId, err.message);
                }
            }
            else {
                successfullyBonusedUsers.push(u);
                console.log("Bonused:", u.bonus, u.id, u.mturkId);
            }
            if (typeof callback === "function") {
                callback(successfullyBonusedUsers);
            }
            return successfullyBonusedUsers;
        });
    });
};
// * blockWorker *
// -------------------------------------------------------------------
// Blocks a particular worker.
//
// Takes workerID and reason as parameters - strings.
var blockWorker = function (reason, workerId) {
    var blockWorkerParams = {
        Reason: reason /* required */,
        WorkerId: workerId /* required */ // string
    };
    mturk.createWorkerBlock(blockWorkerParams, function (err, data) {
        if (err)
            console.log(err, err.stack);
        // an error occurred
        else
            console.log(data); // successful response
    });
};
// * checkBlocks *
// -------------------------------------------------------------------
// Lists workers that have been blocked. An option to remove all worker blocks.
var checkBlocks = function (removeBlocks) {
    if (removeBlocks === void 0) { removeBlocks = false; }
    mturk.listWorkerBlocks({}, function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            console.log("You have the following blocks:", data);
            if (removeBlocks) {
                data.WorkerBlocks.forEach(function (worker) {
                    mturk.deleteWorkerBlock({ WorkerId: worker.WorkerId, Reason: "not needed" }, function (err, data) {
                        if (err) {
                            console.log(err, err.stack);
                        }
                        else {
                            console.log("Removed block on", worker.WorkerId, data);
                        }
                    });
                });
            }
        }
    });
};
// * returnCurrentHIT *
// -------------------------------------------------------------------
// Returns the current active HIT ID
var returnCurrentHIT = function () {
    return currentHitId;
};
// * launchBang *
// -------------------------------------------------------------------
// Launches Scaled-Humanity Fracture experiment
var launchBang = function (callback) {
    // HIT Parameters
    var time = Date.now();
    var HITTitle = "Write online ads - bonus up to $" + hourlyWage + " / hour (" + time + ")";
    var description = "Work in groups to write ads for new products. This task will take approximately " +
        Math.round(roundMinutes * numRounds + 10) +
        " minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $" +
        bonusPrice +
        ".";
    var assignmentDuration = 60 * taskDuration;
    var lifetime = 60 * timeActive;
    var reward = String(rewardPrice);
    var autoApprovalDelay = 60 * taskDuration;
    var keywords = "ads, writing, copy editing, advertising";
    var maxAssignments = numAssignments;
    var hitContent = externalHIT(taskURL);
    makeHIT("safeQuals", HITTitle, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, hitContent, function (HIT) {
        if (typeof callback === "function")
            callback(HIT);
    });
    var delay = 1;
    // only continues to post if not enough people accepted HIT
    // Reposts every timeActive(x) number of minutes to keep HIT on top - stops reposting when enough people join
    setTimeout(function () {
        if (hitsLeft > 0 && !taskStarted) {
            time = Date.now();
            numAssignments = hitsLeft;
            var HITTitle_1 = "Write online ads - bonus up to $" +
                hourlyWage +
                " / hour (" +
                time +
                ")";
            var params2 = {
                Title: HITTitle_1,
                Description: "Work in groups to write ads for new products. This task will take approximately " +
                    Math.round(roundMinutes * numRounds + 10) +
                    " minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $" +
                    bonusPrice +
                    ".",
                AssignmentDurationInSeconds: 60 * taskDuration,
                LifetimeInSeconds: 60 * timeActive,
                Reward: String(rewardPrice),
                AutoApprovalDelayInSeconds: 60 * taskDuration,
                Keywords: "ads, writing, copy editing, advertising",
                MaxAssignments: numAssignments,
                QualificationRequirements: safeQuals,
                Question: externalHIT(taskURL)
            };
            mturk.createHIT(params2, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                }
                else {
                    console.log("Posted", data.HIT.MaxAssignments, "assignments:", data.HIT.HITId);
                    currentHitId = data.HIT.HITId;
                    var currentHITTypeId = data.HIT.HITTypeId;
                    var currentHITGroupId = data.HIT.HITGroupId;
                    // // notify here - randomize list - notify again each time a new HIT is posted if have not yet rolled over
                    // let subject = "We launched our new ad writing HIT. Join now, spaces are limited."
                    // console.log(data.HIT)
                    // let URL = ''
                    // getHITURL(currentHitId, function(url) {
                    //   URL = url;
                    //   let message = "You’re invited to join our newly launched HIT on Mturk; there are limited spaces and it will be closed to new participants in about 15 minutes!  Check out the HIT here: " + URL + " \n\nYou're receiving this message because you you indicated that you'd like to be notified of our upcoming HIT during this time window. If you'd like to stop receiving notifications please email your MTurk ID to: scaledhumanity@gmail.com";
                    //   console.log("message to willBangers", message);
                    //   if(!URL) {
                    //     throw "URL not defined"
                    //   }
                    //   let maxWorkersToNotify = 100; // cannot be more than 100
                    //   listUsersWithQualificationRecursively(quals.willBang, function(data) {
                    //     let notifyList = getRandomSubarray(data, maxWorkersToNotify)
                    //     notifyWorkers(notifyList, subject, message)
                    //   })
                    // })
                }
            });
            delay++;
        }
        else {
            clearTimeout();
            expireHIT(currentHitId);
        }
    }, 1000 * 60 * timeActive * delay);
};
// * notifyWorkers
// -------------------------------------------------------------------
// Sends a message to all users specified
var notifyWorkers = function (WorkerIds, subject, message) {
    mturk.notifyWorkers({ WorkerIds: WorkerIds, MessageText: message, Subject: subject }, function (err, data) {
        if (err)
            console.log("Error notifying workers:", err.message);
        // an error occurred
        else
            console.log("Notified ", WorkerIds.length, " workers:", subject); // successful response
    });
};
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
var checkQualsRecursive = function (qualObject, callback, paginationToken, passthrough) {
    if (paginationToken === void 0) { paginationToken = null; }
    if (passthrough === void 0) { passthrough = []; }
    var userWithQualificationParams = {
        QualificationTypeId: qualObject.QualificationTypeId,
        MaxResults: 100,
        NextToken: paginationToken,
        Status: "Granted"
    };
    mturk.listWorkersWithQualificationType(userWithQualificationParams, function (err, data) {
        if (err)
            console.log(err, err.stack);
        else {
            passthrough = passthrough.concat(data.Qualifications.map(function (a) { return a.WorkerId; }));
            if (data.NumResults === 100) {
                checkQualsRecursive(qualObject, callback, data.NextToken, passthrough);
            }
            else {
                callback(passthrough);
            }
        }
    });
};
