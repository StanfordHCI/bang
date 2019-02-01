var mturk = require("./mturkTools");
var fs = require("fs");
var Datastore = require("nedb");
var db = {
    willBang: new Datastore({
        filename: ".data/willBang",
        autoload: true,
        timestampData: true
    }),
    users: new Datastore({
        filename: ".data/users",
        autoload: true,
        timestampData: true
    }),
    ourHITs: new Datastore({
        filename: ".data/ourHITs",
        autoload: true,
        timestampData: true
    })
};
// What are we doing?
var notification_type = process.argv[2];
var HITId = process.argv[3];
// File paths
var bonusworkersStorage = "./txt/bonusworkers.txt";
// var repayworkersHITstorage = "./txt/currentrepayHIT.txt"
var bonusworkers = fs
    .readFileSync(bonusworkersStorage)
    .toString()
    .split("\n");
var bonusworkersDict = {};
bonusworkers.forEach(function (line) {
    bonusworkersDict[line.split(",")[0]] = parseFloat(line.split(",")[1]);
});
console.log("bonusworkers", bonusworkers);
console.log("bonusworkersDict", bonusworkersDict);
console.log("key", Object.keys(bonusworkersDict));
switch (notification_type) {
    // case "weCrashed":
    //   mturk.listAssignments(HITId, data => {
    //     let subject = "Our system crashed. You will be compensated for your time.";
    //     let message = "You will be bonused for the time you spent on our task. Thank you for your time.";
    //     mturk.notifyWorkers(data.map(a => a.WorkerId), subject, message);
    //   });
    //   break;
    case "killTask":
        mturk.expireHIT(HITId);
        break;
    case "listActiveTasks":
        mturk.workOnActiveHITs(console.log);
        break;
    case "listwillBangers":
        mturk.listUsersWithQualificationRecursively(mturk.quals.willBang, function (data) {
            console.log("Number of users with qualification willBang:", data.length);
        });
        break;
    case "savewillBangersinDatabase":
        mturk.listUsersWithQualificationRecursively(mturk.quals.willBang, function (data) {
            data.forEach(function (workerID) {
                db.willBang.insert({ id: workerID, timePreference: "" }, function (err, usersAdded) {
                    if (err)
                        console.log("There's a problem adding users to the willBang DB: ", err);
                    else if (usersAdded)
                        console.log("Users added to the willBang DB: " + workerID);
                });
            });
        });
        break;
    case "HandleQualsforUsersinDB":
        db.users.find({}, function (err, usersInDB) {
            if (err) {
                console.log("DB for MTurk:" + err);
            }
            else {
                mturk.unassignQualificationFromUsers(usersInDB, mturk.quals.willBang);
                mturk.assignQualificationToUsers(usersInDB, mturk.quals.hasBanged);
            }
        });
        break;
    case "expireBangs":
        // mturk.workOnActiveHITs(H => H.forEach(mturk.expireHIT)) -- THIS KILLS ALL ACTIVE HITS
        mturk.workOnActiveHITs(function (activeHITs) {
            db.ourHITs.find({}, function (err, HITsInDB) {
                if (err) {
                    console.log("Err loading HITS for expiration:" + err);
                }
                else {
                    HITsInDB.map(function (h) { return h.HITId; })
                        .filter(function (h) { return activeHITs.includes(h); })
                        .forEach(mturk.expireHIT);
                }
            });
        });
        break;
    case "bonusworkers": //Check if people from our list has accepted the repay HIT and bonus them
        // Find a current repay HIT
        var repayHITs = [];
        mturk.workOnActiveHITs(function (activeHITs) {
            activeHITs.forEach(function (HITId) {
                mturk.returnHIT(HITId, function (data) {
                    if (data.HIT.Title == "Hit to repay workers") {
                        // Find people in our list of people to repay
                        mturk.listAssignments(HITId, function (data) {
                            var repayacceptors = data
                                .filter(function (a) { return a.WorkerId in bonusworkers; })
                                .map(function (a) {
                                return {
                                    mturkId: a.WorkerId,
                                    assignmentId: a.AssignmentId,
                                    bonus: bonusworkers[a.WorkerId],
                                    id: null
                                };
                            });
                            // Bonus Them and remove their name from repay list
                            mturk.payBonuses(repayacceptors, function (successfullyBonusedUsers) {
                                var successfullyBonusedUsersID = successfullyBonusedUsers.map(function (u) { return u.mturkId; });
                                var unsuccessfullyBonusedUsers = [];
                                Object.keys(bonusworkersDict).forEach(function (_key, value) {
                                    if (!successfullyBonusedUsersID.includes(value)) {
                                        unsuccessfullyBonusedUsers.push(value);
                                    }
                                });
                                // MEW: previous lines aim to reproduce this funcionality due to inconsistant access of Dictionary.
                                // let unsuccessfullyBonusedUsers = bonusworkersDict.filter(
                                //   u => !successfullyBonusedUsersID.includes(u)
                                // );
                                fs.writeFile(bonusworkersStorage, unsuccessfullyBonusedUsers.join("\n"), function (err) {
                                    if (err)
                                        throw err;
                                    console.log("Workers already bonused have been removed from " + bonusworkersStorage + "!");
                                });
                            });
                        });
                    }
                });
            });
        });
        break;
    case "notifybonusworkers": // Tell people on our list they need to accept our repay HIT
        var repayHITnumber_1 = 0;
        mturk.workOnActiveHITs(function (activeHITs) {
            activeHITs.forEach(function (HITId) {
                mturk.returnHIT(HITId, function (data) {
                    if (data.HIT.Title == "Hit to repay workers") {
                        console.log("YOYO", HITId);
                        mturk.getHITURL(HITId, function (url) {
                            var subject = "Accept this HIT to be bonused";
                            var message = "We've created a bonus HIT to ensure you are properly bonused for our earlier HIT. Your bonus will be issued within 1 day. Please accept it and submit. " +
                                url;
                            repayHITnumber_1 += 1;
                            if (repayHITnumber_1 > 1) {
                                console.log("You've got more than 1 repay HIT. Breaking to ensure you don't spam people!");
                                return;
                            }
                            console.log("The message is", message);
                            mturk.notifyWorkers(Object.keys(bonusworkersDict), subject, message);
                        });
                    }
                });
            });
        });
        break;
    case "createrepayHITs": // Create a new repay HIT
        var title = "Hit to repay workers";
        var description = "Only complete this hit if you have been expressly advised to and have been given a completion code already.";
        var assignmentDuration = 60;
        var lifetime = 10000;
        var autoApprovalDelay = 4320;
        var keywords = "repay";
        var maxAssignments = 100;
        var reward = 0.01;
        var taskURL = fs.readFileSync("./repayworkers.html").toString();
        mturk.makeHIT("noQuals", title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, function (HIT) {
            var HITId = HIT.HITId;
        });
        break;
    case "killrepayHITs": // Kill all current repay HITs
        mturk.workOnActiveHITs(function (activeHITs) {
            activeHITs.forEach(function (HITId) {
                mturk.returnHIT(HITId, function (data) {
                    if (data.HIT.Title == "Hit to repay workers") {
                        mturk.expireHIT(HITId);
                    }
                });
            });
        });
        break;
}
