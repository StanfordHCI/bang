"use strict";
exports.__esModule = true;
//Setting up env
var dotenv = require("dotenv");
dotenv.config();
//Setting up args
var yargs = require("yargs");
// import {Argv} from "yargs"
var args = yargs.argv;
//Setting up terminal formatting
var chalk_1 = require("chalk");
//Initializing variables
var runningLocal = process.env.RUNNING_LOCAL === "TRUE";
var runningLive = process.env.RUNNING_LIVE === "TRUE"; //ONLY CHANGE ON SERVER
var teamSize = parseInt(process.env.TEAM_SIZE);
var roundMinutes = parseFloat(process.env.ROUND_MINUTES);
var taskURL = args.url || process.env.TASK_URL;
var runExperimentNow = true;
var runViaEmailOn = false;
var cleanHITs = false;
var issueBonusesNow = runningLive;
var notifyWorkersOn = runningLive;
var usingWillBang = runningLive;
var aggressiveNotifyOn = runningLive;
var notifyUs = runningLive;
var assignQualifications = runningLive;
//Randomization
var randomCondition = false;
var randomRoundOrder = true;
var randomProduct = true;
var suddenDeath = false;
var waitChatOn = true; //MAKE SURE THIS IS THE SAME IN CLIENT
var extraRoundOn = false; //Only set to true if teamSize = 4, Requires waitChatOn = true.
var psychologicalSafetyOn = false;
var starterSurveyOn = false;
var midSurveyOn = runningLive;
var blacklistOn = false;
var teamfeedbackOn = false;
var checkinOn = false;
var timeCheckOn = false; // tracks time user spends on task and updates payment - also tracks
// how long each task is taking
var requiredOn = runningLive;
var checkinIntervalMinutes = roundMinutes / 3;
var qFifteenOn = true;
var qSixteenOn = true;
//Testing toggles
var debugMode = !runningLive;
var autocompleteTestOn = false; //turns on fake team to test autocomplete
//Waitchat settings
var waitChatParms = {
    minTime: 20,
    lastActivity: 59,
    maxTime: 1200,
    maxInactivity: 200
};
//Launch reporting
console.log(runningLive ? chalk_1["default"].red.inverse("\n RUNNING LIVE ") : chalk_1["default"].green.inverse("\n RUNNING SANDBOXED "));
console.log(runningLocal ? "Running locally" : "Running remotely");
var batchID = Date.now();
console.log("Launching batch", batchID);
// Question Files
var fs = require("fs");
var txt = "txt/";
var midSurveyFile = txt + "midsurvey-q.txt";
var psychologicalSafetyFile = txt + "psychologicalsafety-q.txt";
var checkinFile = txt + "checkin-q.txt";
var blacklistFile = txt + "blacklist-q.txt";
var feedbackFile = txt + "feedback-q.txt";
var starterSurveyFile = txt + "startersurvey-q.txt";
var postSurveyFile = txt + "postsurvey-q.txt";
var botFile = txt + 'botquestions.txt';
var leaveHitFile = txt + "leave-hit-q.txt";
var qFifteenFile = txt + "qfifteen-q.txt";
var qSixteenFile = txt + "qsixteen-q.txt";
// Answer Option Sets
var answers = {
    answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    answerType: 'radio',
    textValue: true
};
var binaryAnswers = { answers: ['Keep this team', 'Do not keep this team'], answerType: 'radio', textValue: true };
var leaveHitAnswers = {
    answers: ['End Task and Send Feedback', 'Return to Task'],
    answerType: 'radio',
    textValue: false
};
// Setup basic express server
var tools = require('./tools');
var mturk = require('./mturkTools');
var express = require('express');
var bodyParser = require("body-parser");
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server); //, {transports: ['websocket']}
var port = args.port || process.env.PORT || 3000;
server.listen(port, function () {
    console.log('Server listening at port', port);
});
function chooseOne(list) {
    return list[Math.floor(Math.random() * list.length)];
}
function userByMturkId(users, MturkId) {
    return users.find(function (user) { return user.mturkId === MturkId; });
}
//
// Array.prototype.pick = function () {
//     return this[Math.floor(Math.random() * this.length)]
// };
// Array.prototype.byID = function (id) {
//     return this.find(user => user.id === id)
// };
// Array.prototype.byMturkId = function (mturkId) {
//     return this.find(user => user.mturkId === mturkId)
// };
// Array.prototype.set = function () {
//     const set = [];
//     this.forEach(e =>{ if (set.indexOf(e) === -1) {set.push(e)} });
//     return set
// };
// Array.prototype.includes = function (e) {
//   return this.indexOf(e) !== -1
// }
function ioSocketsEmit(event, message) {
    if (debugMode) {
        console.log(event, message);
    }
    return io.sockets.emit(event, message);
}
function ioEmitById(socketId, event, message, socket, user) {
    if (debugMode) {
        var isActive = null;
        var isConnected = null;
        if (user) {
            isActive = user.active;
            isConnected = user.connected;
        }
        var printMessage = message;
        if (event === 'chatbot') {
            printMessage = "all the questions";
        }
        +console.log(socket.id, socket.mturkId, isActive, isConnected, event, printMessage);
    }
    return io["in"](socketId).emit(event, message);
}
function useUser(socket, callback, err) {
    if (err === void 0) { err = "Guarded against undefined user"; }
    var user = userByMturkId(users, socket.mturkId);
    if (typeof user !== 'undefined' && typeof callback === "function") {
        callback(user);
    }
    else {
        console.log(chalk_1["default"].red(err), socket.id, "\n");
        if (debugMode) {
            console.trace();
        }
    }
}
// Check balance
mturk.getBalance(function (balance) {
    if (runningLive && balance <= 400) {
        console.log(chalk_1["default"].red.inverse.bold("\n!!! BROKE !!!\n"));
    }
});
// Save debug logs for later review
var util = require("util");
var trueLog = console.log;
var debugDir = "debug/";
if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir);
}
var log_file = debugDir + "debug" + Date.now() + ".log";
console.log = function () {
    var msg = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        msg[_i] = arguments[_i];
    }
    msg.unshift("[" + (new Date()).toISOString() + "]");
    trueLog(msg.map(function (item) {
        return util.format(item);
    }).join(" ")); //uncomment if you want logs
    msg.map(function (item) {
        fs.appendFile(log_file, util.format(item) + " ", function (err) {
            if (err) {
                return trueLog(err);
            }
        });
    });
    fs.appendFile(log_file, "\n", function (err) {
        if (err) {
            return trueLog(err);
        }
    });
};
//if (runExperimentNow){
// Experiment variables
/* const conditionsAvailalbe = ['control','treatment','baseline'] */
var conditionsAvailalbe = ['control', 'treatment'];
var presetCondition = randomCondition ? conditionsAvailalbe.pick() : conditionsAvailalbe[1];
var currentCondition = args.condition || presetCondition;
var treatmentNow = false;
var firstRun = false;
var hasAddedUsers = false; //lock on adding users to db/experiment for experiment
var batchCompleteUpdated = false;
/* const roundOrdering = extraRoundOn ? [ */
/*   {control: [1,2,3,2], treatment: [1,2,3,2], baseline: [1,2,3,4]}, */
/*   {control: [1,3,2,2], treatment: [1,3,2,2], baseline: [1,2,3,4]}, */
/*   {control: [1,2,2,3], treatment: [1,2,2,3], baseline: [1,2,3,4]}] : [ */
/*   {control: [1,2,1], treatment: [1,2,1], baseline: [1,2,3]}, */
/*   {control: [2,1,1], treatment: [2,1,1], baseline: [1,2,3]}, */
/*   {control: [1,1,2], treatment: [1,1,2], baseline: [1,2,3]}] */
/* const conditions = randomRoundOrder ? roundOrdering.pick() : roundOrdering[0] */
// Settings for 4 rounds.
// const ordering = randomRoundOrder ? [[1, 1, 2, 3], [1, 2, 1, 3], [1, 2, 3, 1], [2, 1, 1, 3], [2, 1, 3, 1], [2, 3, 1, 1]].pick() : [1,2,1,3]
var ordering = randomRoundOrder ? [[1, 2, 1, 3], [1, 2, 3, 1], [2, 1, 3, 1]].pick() : [1, 2, 1, 3];
var conditions = { control: ordering, treatment: ordering, baseline: [1, 2, 3, 2] }; //,4]} modified extra roudn to deal with createTeams
var experimentRoundIndicator = extraRoundOn ? 2 : 1; //This record what round of the ordering is the experimental round.
var experimentRound = conditions[currentCondition].lastIndexOf(experimentRoundIndicator); //assumes that the manipulation is always the last instance of team 1's interaction.
console.log(currentCondition, 'with', conditions[currentCondition]);
var numRounds = conditions.baseline.length;
var people = extraRoundOn ? tools.letters.slice(0, Math.pow(teamSize, 2) + teamSize) : tools.letters.slice(0, Math.pow(teamSize, 2));
var teams = tools.createTeams(teamSize, numRounds - 1, people, extraRoundOn); //added '-1' to numRounds
//}
// Setting up the databases
var Datastore = require("nedb");
var db = {
    users: new Datastore({ filename: '.data/users', autoload: true, timestampData: true }),
    chats: new Datastore({ filename: '.data/chats', autoload: true, timestampData: true }),
    batch: new Datastore({ filename: '.data/batch', autoload: true, timestampData: true }),
    time: new Datastore({ filename: '.data/time', autoload: true, timestampData: true }),
    ourHITs: new Datastore({ filename: '.data/ourHITs', autoload: true, timestampData: true }),
    willBang: new Datastore({ filename: '.data/willBang', autoload: true, timestampData: true })
};
function updateUserInDB(user, field, value) {
    var _a;
    db.users.update({ mturkId: user.mturkId, batch: batchID }, { $set: (_a = {}, _a[field] = value, _a) }, {}, function (err) { return console.log(err ? chalk_1["default"].red("Err recording ") + field + ": " + err : "Updated " + field + " for " +
        user.mturkId + " " + JSON.stringify(value, null, 2)); });
}
//Mturk background tasks
db.users.find({}, function (err, usersInDB) {
    if (err) {
        console.log("DB for MTurk:" + err);
    }
    else {
        if (issueBonusesNow) {
            mturk.payBonuses(usersInDB, function (bonusedUsers) {
                bonusedUsers.forEach(function (u) { return updateUserInDB(u, 'bonus', 0); });
            });
        }
        if (assignQualifications && runningLive) {
            mturk.listUsersWithQualificationRecursively(mturk.quals.hasBanged, function (data) {
                console.log("Number of users with qualification hasBanged:", data.length);
            });
        }
        if (notifyWorkersOn && runningLive) {
            mturk.listUsersWithQualificationRecursively(mturk.quals.willBang, function (data) {
                console.log("Number of users with qualification willBang:", data.length);
            });
        }
    }
});
// expires active HITs in the DB
if (cleanHITs) {
    mturk.workOnActiveHITs(function (activeHITs) {
        db.ourHITs.find({}, function (err, HITsInDB) {
            if (err) {
                console.log("Err loading HITS for expiration:" + err);
            }
            else {
                HITsInDB.map(function (h) { return h.HITId; }).filter(function (h) { return activeHITs.includes(h); }).forEach(mturk.expireHIT);
            }
        });
    });
}
if (runExperimentNow) {
    mturk.launchBang(function (HIT) {
        logTime();
        storeHIT(HIT.HITId);
        // Notify workers that a HIT has started if we're doing recruiting by email
        if (notifyWorkersOn) {
            // let HITId = process.argv[2];
            var subject_1 = "We launched our new ad writing HIT. Join now, spaces are limited.";
            console.log(HIT);
            var URL_1 = '';
            mturk.getHITURL(HIT.HITId, function (url) {
                URL_1 = url;
                var message = "You’re invited to join our newly launched HIT on Mturk; there are limited spaces and " +
                    "it will be closed to new participants in about 15 minutes!  Check out the HIT here: " + URL_1 +
                    " \n\nYou're receiving this message because you indicated that you'd like to be notified of our" +
                    " upcoming HIT during this time window. If you'd like to stop receiving notifications please " +
                    "email your MTurk ID to: scaledhumanity@gmail.com";
                console.log("message to willBangers", message);
                if (!URL_1) {
                    throw "URL not defined";
                }
                if (usingWillBang) {
                    // removes people who no longer have willBang qual from db.willBang
                    db.willBang.find({}, function (err, willBangers) {
                        if (err) {
                            console.log("ERROR cleaning willBang db: " + err);
                        }
                        else {
                            mturk.listUsersWithQualificationRecursively(mturk.quals.willBang, function (data) {
                                var willBangIds = willBangers.map(function (u) { return u.id; });
                                willBangIds.forEach(function (willBangID) {
                                    if (!data.includes(willBangID)) { // if user in db.willBang no longer
                                        // has willBang qual
                                        db.willBang.remove({ id: willBangID }, { multi: true }, function (err, numRemoved) {
                                            if (err)
                                                console.log("Error removing from willBang db: " + err);
                                            else
                                                console.log(willBangID + " REMOVED FROM WILLBANG DB (" + numRemoved
                                                    + ")");
                                        });
                                    }
                                });
                            });
                        }
                    });
                    // Use this function to notify only x users <= 100
                    var maxWorkersToNotify_1 = 100; // cannot be more than 100
                    // Get workers to notify from - all times are GMT (NOT PST!!) bc server time is GMT
                    var currenttimePeriod = "";
                    var currentHour = new Date(Date.now()).getHours();
                    if ((13 <= currentHour) && (currentHour <= 15)) {
                        currenttimePeriod = "morning";
                    }
                    else if ((16 <= currentHour) && (currentHour <= 18)) {
                        currenttimePeriod = "midday";
                    }
                    else if ((19 <= currentHour) && (currentHour <= 21)) {
                        currenttimePeriod = "afternoon";
                    }
                    else if (((22 <= currentHour) && (currentHour <= 23)) || currentHour === 0) {
                        currenttimePeriod = "evening";
                    }
                    else if ((1 <= currentHour) && (currentHour <= 3)) {
                        currenttimePeriod = "late evening";
                    }
                    else {
                        currenttimePeriod = "no bucket";
                    }
                    if (currenttimePeriod === "no bucket") { // randomize list
                        mturk.listUsersWithQualificationRecursively(mturk.quals.willBang, function (data) {
                            var notifyList = getRandomSubarray(data, maxWorkersToNotify_1);
                            mturk.notifyWorkers(notifyList, subject_1, message);
                            console.log("Notified", notifyList.length, "workers");
                        });
                    }
                    else { // use the time buckets
                        console.log("Current Time Period: " + currenttimePeriod);
                        db.willBang.find({ timePreference: currenttimePeriod }, function (err, currentTimePoolWorkers) {
                            if (err) {
                                console.log("DB for MTurk:" + err);
                            }
                            else {
                                if (currentTimePoolWorkers.length > maxWorkersToNotify_1) {
                                    currentTimePoolWorkers = getRandomSubarray(currentTimePoolWorkers, maxWorkersToNotify_1);
                                }
                                console.log("Time Pool Workers: " + currentTimePoolWorkers.length);
                                var timePoolNotifyList_1 = currentTimePoolWorkers.map(function (u) { return u.id; });
                                var moreworkersneeded_1 = maxWorkersToNotify_1 - currentTimePoolWorkers.length;
                                if (aggressiveNotifyOn ? true : moreworkersneeded_1 > 0) { //if we don't have enough
                                    // people with current time preference to notify
                                    mturk.notifyWorkers(timePoolNotifyList_1, subject_1, message);
                                    mturk.listUsersWithQualificationRecursively(mturk.quals.willBang, function (data) {
                                        var notifyList = getRandomSubarray(data, aggressiveNotifyOn ?
                                            maxWorkersToNotify_1 : moreworkersneeded_1);
                                        var i = notifyList.length;
                                        while (i--) {
                                            if (timePoolNotifyList_1.includes(notifyList[i])) {
                                                notifyList.splice(i, 1);
                                            }
                                        }
                                        mturk.notifyWorkers(notifyList, subject_1, message);
                                    });
                                }
                                else {
                                    var workerstonotify = getRandomSubarray(timePoolNotifyList_1, maxWorkersToNotify_1);
                                    mturk.notifyWorkers(workerstonotify, subject_1, message);
                                }
                            }
                        });
                    }
                }
            });
        }
    });
}
//Add more products
var products = [
    // {name: 'KOSMOS ink - Magnetic Fountain Pen', url: 'https://www.kickstarter.com/projects/stilform/kosmos-ink'},
    // {
    //     name: 'Projka: Multi-Function Accessory Pouches',
    //     url: 'https://www.kickstarter.com/projects/535342561/projka-multi-function-accessory-pouches'
    // },
    // {
    //     name: "First Swiss Automatic Pilot's watch in TITANIUM & CERAMIC",
    //     url: 'https://www.kickstarter.com/projects/chazanow/liv-watches-titanium-ceramic-chrono'
    // },
    // {
    //     name: "Nomad Energy- Radically Sustainable Energy Drink",
    //     url: 'https://www.kickstarter.com/projects/1273663738/nomad-energy-radically-sustainable-energy-drink'
    // },
    {
        name: "Thé-tis Tea : Plant-based seaweed tea, rich in minerals",
        url: 'https://www.kickstarter.com/projects/1636469325/the-tis-tea-plant-based-high-rich-minerals-in-seaw'
    },
    // {
    //     name: "The Travel Line: Versatile Travel Backpack + Packing Tools",
    //     url: 'https://www.kickstarter.com/projects/peak-design/the-travel-line-versatile-travel-backpack-packing'
    // },
    // {name: "Stool Nº1", url: 'https://www.kickstarter.com/projects/390812913/stool-no1'},
    {
        name: "LetB Color - take a look at time in different ways",
        url: 'https://www.kickstarter.com/projects/letbco/letb-color-take-a-look-at-time-in-different-ways'
    },
    {
        name: "FLECTR 360 OMNI – cycling at night with full 360° visibility",
        url: 'https://www.kickstarter.com/projects/outsider-team/flectr-360-omni'
    },
    // {
    //     name: "Make perfect cold brew coffee at home with the BrewCub",
    //     url: 'https://www.kickstarter.com/projects/1201993039/make-perfect-cold-brew-coffee-at-home-with-the-bre'
    // },
    // {
    //     name: 'NanoPen | Worlds Smallest & Indestructible EDC Pen Tool',
    //     url: 'https://www.kickstarter.com/projects/bullet/nanopen-worlds-smallest-and-indestructible-edc-pen?' +
    //         'ref=section_design-tech_popular'
    // },
    // {
    //     name: "The EVERGOODS MQD24 and CTB40 Crossover Backpacks",
    //     url: 'https://www.kickstarter.com/projects/1362258351/the-evergoods-mqd24-and-ctb40-crossover-backpacks'
    // },
    // {
    //     name: "Hexgears X-1 Mechanical Keyboard",
    //     url: 'https://www.kickstarter.com/projects/hexgears/hexgears-x-1-mechanical-keyboard'
    // },
    // {
    //     name: "KARVD - Modular Wood Carved Wall Panel System",
    //     url: 'https://www.kickstarter.com/projects/karvdwalls/karvd-modular-wood-carved-wall-panel-system'
    // },
    // {
    //     name: "PARA: Stationary l Pythagorean l Easy-to-Use Laser Measurer",
    //     url: 'https://www.kickstarter.com/projects/1619356127/para-stationary-l-pythagorean-l-easy-to-use-laser'
    // },
    // {
    //     name: "Blox: organize your world!",
    //     url: 'https://www.kickstarter.com/projects/onehundred/blox-organize-your-world'
    // },
    // {
    //     name: "Moment - World's Best Lenses For Mobile Photography",
    //     url: 'https://www.kickstarter.com/projects/moment/moment-amazing-lenses-for-mobile-photography'
    // },
    {
        name: "The Ollie Chair: Shape-Shifting Seating",
        url: 'https://www.kickstarter.com/projects/144629748/the-ollie-chair-shape-shifting-seating'
    }
    // {
    //     name: "Fave: the ideal all-purpose knife!",
    //     url: 'https://www.kickstarter.com/projects/onehundred/fave-the-ideal-all-purpose-knife'
    // },
];
if (randomProduct) {
    products = shuffle(products);
}
var users = []; //the main local user storage
var userPool = []; //accumulates users pre-experiment
var waitchatStart = 0;
var currentRound = 0; //PK: talk about 0-indexed v 1-indexed round numbers (note: if change -> change parts
// of code reliant on 0-indexed round num)
var startTime = 0;
var userAcquisitionStage = true;
var experimentOver = false;
var usersFinished = 0;
// keeping track of time
var taskStartTime = getSecondsPassed(); // reset for each start of new task
var taskEndTime = 0;
var taskTime = 0;
// Building task list
//if (runExperimentNow){
var eventSchedule = [];
if (starterSurveyOn) {
    eventSchedule.push("starterSurvey");
}
var roundSchedule = [];
roundSchedule.push("ready");
if (midSurveyOn) {
    roundSchedule.push("midSurvey");
}
if (psychologicalSafetyOn) {
    roundSchedule.push("psychologicalSafety");
}
if (teamfeedbackOn) {
    roundSchedule.push("teamfeedbackSurvey");
}
roundSchedule = replicate(roundSchedule, numRounds);
eventSchedule = eventSchedule.concat(roundSchedule);
if (blacklistOn) {
    eventSchedule.push("blacklistSurvey");
}
if (qFifteenOn) {
    eventSchedule.push("qFifteen");
}
if (qSixteenOn) {
    eventSchedule.push("qSixteen");
}
eventSchedule.push("postSurvey");
eventSchedule.push("finished");
console.log("This batch will include:", eventSchedule);
//}
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// Disconnect leftover users
Object.keys(io.sockets.sockets).forEach(function (socketID) {
    console.log(socketID);
    if (userPool.every(function (user) { return user.id !== socketID; })) {
        console.log("Removing dead socket: " + socketID);
        console.log("SOCKET DISCONNECT IN LEFTOVER USER");
        io["in"](socketID).emit('get IDs', 'broken');
        // io.in(socketID).disconnect(true)
    }
});
//if (runExperimentNow){
// Adds Batch data for this experiment. unique batchID based on time/date
db.batch.insert({
    batchID: batchID,
    batchComplete: false,
    starterSurveyOn: starterSurveyOn,
    midSurveyOn: midSurveyOn,
    blacklistOn: blacklistOn,
    qFifteenOn: qFifteenOn,
    qSixteenOn: qSixteenOn,
    teamfeedbackOn: teamfeedbackOn,
    psychologicalSafetyOn: psychologicalSafetyOn,
    checkinOn: checkinOn,
    conditions: conditions,
    condition: currentCondition,
    format: conditions[currentCondition],
    experimentRound: experimentRound,
    numRounds: numRounds,
    products: products,
    teamSize: teamSize
}, function (err, usersAdded) {
    if (err)
        console.log("There's a problem adding batch to the DB: ", err);
    else if (usersAdded)
        console.log("Batch added to the DB");
    console.log("Leftover sockets from previous run: " + Object.keys(io.sockets.sockets));
    if (!firstRun) {
        Object.keys(io.sockets.sockets).forEach(function (socketID) {
            console.log('SOCKET DISCONNECT IN BATCH INSERT');
            io.sockets.sockets[socketID].disconnect(true);
        });
        firstRun = true;
    }
}); // eventSchedule instead of all of the toggles? (missing checkinOn) //PK: what does this comment mean?
//}
// Chatroom
io.on('connection', function (socket) {
    //PK: what are these bools for?
    var experimentStarted = false; //NOTE: this will be set multiple times but I don't think that's
    // what is wanted in this case
    var workerStartTime = getSecondsPassed();
    var currentBonus = function () {
        mturk.updatePayment(getSecondsPassed() - workerStartTime);
    };
    function createUsername() {
        var name_structure = tools.makeName();
        socket.name_structure = name_structure;
        socket.username = name_structure.username;
        socket.emit('set username', { username: socket.username, name_structure: name_structure });
    }
    socket.on('connected', function (data) {
        var mturkId = data.mturkId;
        var assignmentId = data.assignmentId;
        socket.mturkId = mturkId;
        socket.assignmentId = assignmentId;
        socket.join(mturkId);
        if (users.byMturkId(mturkId)) {
            console.log(chalk_1["default"].blue('Reconnected ' + mturkId + ' in users'));
            var user = users.byMturkId(mturkId);
            user.connected = true;
            user.assignmentId = assignmentId;
            user.id = socket.id;
            user.turkSubmitTo = data.turkSubmitTo;
            //console.log(users.byMturkId(mturkId))
            mturk.setAssignmentsPending(getUsersConnected().length);
        }
        if (userPool.byMturkId(mturkId)) {
            var user = userPool.byMturkId(mturkId);
            console.log(chalk_1["default"].blue('RECONNECTED ' + mturkId + ' in user pool (' + user.id + ' => ' + socket.id + ')'));
            socket.name_structure = data.name_structure;
            socket.username = data.name_structure.username;
            user.connected = true;
            user.active = false;
            user.assignmentId = assignmentId;
            user.id = socket.id;
            user.turkSubmitTo = data.turkSubmitTo;
            //console.log(userPool.byMturkId(mturkId))
        }
        else {
            createUsername();
            console.log(chalk_1["default"].blue('NEW USER CONNECTED'));
        }
        console.log(chalk_1["default"].blue('SOCKET: ' + socket.id + ' | MTURK ID: ' + socket.mturkId + ' | NAME: ' + socket.username +
            '| ASSIGNMENT ID: ' + socket.assignmentId));
    });
    // socket.on('get username', data => {
    //   let name_structure = tools.makeName();
    //   socket.name_structure = name_structure;
    //   socket.username = name_structure.username;
    //   socket.emit('set username', {username: socket.username})
    // })
    socket.on("heartbeat", function (_data) {
        if (socket.connected) {
            io["in"](socket.id).emit('heartbeat');
        }
    });
    socket.on('accepted HIT', function (data) {
        console.log('ACCEPTED HIT CALLED');
        if (!userAcquisitionStage) {
            //updateUserInDB(socket,'bonus',currentBonus())
            if (!socket) {
                console.log("no socket in accepted HIT");
                return;
            }
            // if(users.byMturkId(socket.mturkId)) { // disconnect due to trans err/close
            //   let user = users.byMturkId(socket.mturkId)
            //   user.currentEvent -= 1
            //   io.in(socket.mturkId).emit('echo', 'next event')
            //   return;
            // }
            issueFinish(socket, runViaEmailOn ? "We don't need you to work right now. Please await further" +
                " instructions from scaledhumanity@gmail.com." : "We have enough users on this task. Submit below" +
                " and you will be compensated appropriately for your time. Thank you!");
            return;
        }
        if (userPool.byMturkId(data.mturkId)) { //if it's a reconnected user
            var user = userPool.byMturkId(data.mturkId);
            console.log(data.mturkId + ' REJOINED USER POOL (' + user.id + ' => ' + socket.id + ')');
            user.id = socket.id;
            user.connected = true;
            user.turkSubmitTo = data.turkSubmitTo;
            user.assignmentId = data.assignmentId;
        }
        else {
            userPool.push({
                id: socket.id,
                mturkId: data.mturkId,
                turkSubmitTo: data.turkSubmitTo,
                assignmentId: data.assignmentId,
                connected: true,
                active: !waitChatOn,
                timeAdded: data.timeAdded,
                timeLastActivity: data.timeAdded
            });
        }
        if (userPool.length === 1) { //first user entered waitchat
            waitchatStart = data.timeAdded;
        }
        mturk.setAssignmentsPending(getPoolUsersConnected().length);
        // debugLog(userPool, "users accepted currently: " + userPool.length)
        Object.keys(io.sockets.sockets).forEach(function (socketID) {
            if (userPool.every(function (user) {
                return user.id !== socketID;
            })) {
                console.log("Removing dead socket: " + socketID);
                io["in"](socketID).emit('get IDs', 'broken');
            }
        });
        logTime();
        console.log("Sockets active: " + Object.keys(io.sockets.sockets) + " of " + teamSize);
        updateUserPool();
    });
    function updateUserPool() {
        if (!userAcquisitionStage)
            return;
        function secondsSince(event) {
            return (Date.now() - event) / 1000;
        }
        function updateUsersActive() {
            userPool.forEach(function (user) {
                user.active = secondsSince(user.timeAdded) > waitChatParms.minTime && secondsSince(user.timeLastActivity) < waitChatParms.lastActivity;
                var numUsersWanted = extraRoundOn ? Math.pow(teamSize, 2) + teamSize : Math.pow(teamSize, 2);
                var weightedHoldingSeconds = waitChatParms.maxTime + 0.33 * (waitChatParms.maxTime / (numUsersWanted -
                    getPoolUsersActive().length)); // PK: make isUserInactive fxn
                if (!user.removed && (secondsSince(user.timeAdded) > weightedHoldingSeconds ||
                    secondsSince(user.timeLastActivity) > waitChatParms.maxInactivity)) {
                    user.removed = true;
                    console.log('removing user because of inactivity:', user.id);
                    io["in"](user.mturkId).emit('get IDs', 'broken');
                }
            });
        }
        if (waitChatOn)
            updateUsersActive();
        var usersActive = getPoolUsersActive();
        console.log("Users active: " + usersActive.length);
        console.log("Users connected: " + getPoolUsersConnected().length);
        console.log("Users in pool: " + userPool.length);
        var numUsersWanted = extraRoundOn ? Math.pow(teamSize, 2) + teamSize : Math.pow(teamSize, 2); //turn into const at start
        if (waitChatOn) {
            if (!hasAddedUsers && usersActive.length >= numUsersWanted) { //if have enough active users and had
                // not added users before
                logTime();
                hasAddedUsers = true;
                for (var i = 0; i < usersActive.length; i++) { //for every active user
                    var user = usersActive[i];
                    console.log('active user ' + (i + 1) + ': ' + user.name);
                    if (i < numUsersWanted) { //take the 1st teamssize **2 users and add them
                        ioEmitById(user.mturkId, "echo", "add user", socket, user);
                        ioEmitById(user.mturkId, 'initiate experiment', null, socket, user);
                        // io.in(user.mturkId).emit("echo", "add user");
                        // io.in(user.mturkId).emit('initiate experiment');
                    }
                    else { //else emit finish
                        console.log('EMIT FINISH TO EXTRA ACTIVE WORKER');
                        issueFinish(user, runViaEmailOn ? "We don't need you to work at this specific moment, " +
                            "but we may have tasks for you soon. Please await further instructions from " +
                            "scaledhumanity@gmail.com." : "Thanks for participating, you're all done!");
                    }
                }
                userPool.filter(function (user) { return !usersActive.byMturkId(user.mturkId); }).forEach(function (user) {
                    console.log('EMIT FINISH TO NONACTIVE OR DISCONNECTED WORKER');
                    issueFinish(user, runViaEmailOn ? "We don't need you to work at this specific moment, " +
                        "but we may have tasks for you soon. Please await further instructions from " +
                        "scaledhumanity@gmail.com." : "Thanks for participating, you're all done!");
                });
            }
            else {
                if (secondsSince(waitchatStart) / 60 >= waitChatParms.maxTime / 60) {
                    console.log(chalk_1["default"].red("Waitchat time limit reached"));
                    userAcquisitionStage = false;
                    io["in"](socket.mturkId).emit('echo', 'kill-all');
                }
            }
        }
        else { // waitchat off
            if (usersActive.length >= numUsersWanted) {
                // io.sockets.emit('update number waiting', {num: 0});
                ioSocketsEmit('update number waiting', { num: 0 });
                console.log('there are ' + usersActive.length + ' users: ' + usersActive);
                for (var i = 0; i < usersActive.length; i++) {
                    io["in"](usersActive[i].mturkId).emit('show chat link');
                }
            }
            else {
                // io.sockets.emit('update number waiting', {num: teamSize ** 2 - usersActive.length});
                ioSocketsEmit('update number waiting', { num: Math.pow(teamSize, 2) - usersActive.length });
            }
        }
    }
    function makeUser(data) {
        return {
            id: socket.id,
            mturkId: data.mturkId,
            assignmentId: data.assignmentId,
            batch: batchID,
            room: '',
            rooms: [],
            bonus: mturk.bonusPrice,
            person: '',
            name: socket.username,
            ready: false,
            friends: [],
            friends_history: [socket.name_structure.parts],
            // username//PK: is it okay to store this in the socket?
            connected: true,
            // instead of 'onCall' but need to check if this field is still needed
            removed: false,
            eventSchedule: eventSchedule,
            currentEvent: 0,
            results: {
                condition: currentCondition,
                format: conditions[currentCondition],
                manipulation: {},
                checkin: {},
                starterCheck: {},
                viabilityCheck: {},
                psychologicalSafety: {},
                teamfeedback: {},
                manipulationCheck: '',
                blacklistCheck: '',
                qFifteenCheck: {},
                qSixteenCheck: {},
                engagementFeedback: ''
            }
        };
    }
    socket.on('add user', function (_data) {
        if (!userAcquisitionStage) {
            issueFinish(socket, runViaEmailOn ? "We don't need you to work at this specific moment, but we may have " +
                "tasks for you soon. Please await further instructions from scaledhumanity@gmail.com." :
                "We have enough users on this task. Hit the button below and you will be compensated appropriately " +
                    "for your time. Thank you!"); //PK: come back to this
            return;
        }
        if (users.byMturkId(socket.mturkId)) {
            console.log('ERR: ADDING A USER ALREADY IN USERS');
        }
        var newUser = makeUser(userPool.byMturkId(socket.mturkId));
        users.push(newUser);
        console.log(newUser.name + " (" + newUser.mturkId + ") added to users.\n" + "Total users: " + users.length);
        //add friends for each user once the correct number of users is reached
        var numUsersRequired = extraRoundOn ? Math.pow(teamSize, 2) + teamSize : Math.pow(teamSize, 2);
        if (users.length === numUsersRequired) { // if the last user was just added
            console.log("USER POOL:\n" + userPool.map(function (u) { return u.mturkID; }));
            console.log('MTURK IDS: ');
            users.forEach(function (user) {
                user.friends = users.map(function (u) {
                    if (user.mturkId !== u.mturkId) {
                        return {
                            mturkId: u.mturkId,
                            alias: tools.makeName().username,
                            tAlias: tools.makeName().username
                        };
                    }
                    else {
                        return {
                            mturkId: u.mturkId,
                            alias: u.name,
                            tAlias: u.name
                        };
                    }
                });
                console.log(user.mturkId);
            });
            // assign people to rooms/teams
            users.forEach(function (u) {
                // console.log("People length:", people.length, ", People:", people)
                u.person = people.pop();
            });
            // assigns hasBanged to new users
            if (assignQualifications && runningLive) {
                var hasBangers = users.map(function (a) { return a.mturkId; });
                hasBangers.forEach(function (u) { return mturk.assignQuals(u, mturk.quals.hasBanged); });
            }
            // remove willBang qualification from people who rolled over
            // remove people who rolled over from willBang database
            if (usingWillBang) {
                var hasBangers = users.map(function (a) { return a.mturkId; });
                hasBangers.forEach(function (u) {
                    mturk.unassignQuals(u, mturk.quals.willBang, 'This qualification is used to qualify a user to ' +
                        'participate in our HIT. We only allow one participation per user, so that is why we are ' +
                        'removing this qualification. Thank you!');
                    db.willBang.remove({ id: u }, { multi: true }, function (err, numRemoved) {
                        if (err)
                            console.log("Error removing from db.willBang: ", err);
                        else
                            console.log(u + " REMOVED FROM WILLBANG DB (" + numRemoved + ")");
                    });
                });
            }
            if (notifyUs) {
                mturk.notifyWorkers(["A19MTSLG2OYDLZ"], "Rolled " + currentCondition + " on " + taskURL, "Rolled over with: " + currentCondition + " on port " + port + " at " + taskURL + ".");
            }
            userAcquisitionStage = false;
            mturk.startTask();
        }
        db.users.insert(newUser, function (err, _usersAdded) {
            console.log(err ? "Didn't store user: " + err : "Added " + newUser.name + " to DB.");
        });
        //PK: need to emit login to each? or can we delete login fxn in client if no longer in use (login sets
        // connected to true, is this needed?)
        //io.in(user.id).emit('login', {numUsers: numUsers(user.room)})
    });
    socket.on('update user pool', function (data) {
        if (!userPool.byMturkId(socket.mturkId)) {
            console.log("***USER UNDEFINED*** in update user pool ..this would crash our thing but haha whatever");
            console.log('SOCKET ID: ' + socket.id);
            return;
        } //PK: quick fix
        if (!userPool.byMturkId(socket.mturkId).connected) {
            console.log("block ***USER NOT CONNECTED*** in update user pool");
            return;
        }
        userPool.byMturkId(socket.mturkId).timeLastActivity = data.time;
        updateUserPool();
    });
    socket.on('log', function (data) {
        console.log(data);
    });
    //Route messages
    socket.on('new message', function (message) {
        newMessage(message);
    });
    function newMessage(message) {
        useUser(socket, function (user) {
            if (!user.connected) {
                console.log("block ***USER NOT CONNECTED*** in new message");
                return;
            }
            var cleanMessage = message;
            users.forEach(function (u) {
                cleanMessage = aliasToID(u, cleanMessage);
            });
            db.chats.insert({
                room: user.room,
                userID: socket.id,
                message: cleanMessage,
                time: getSecondsPassed(),
                batch: batchID,
                round: currentRound
            }, function (err, _chatsAdded) {
                if (err)
                    console.log("Error storing message:", err);
                else
                    console.log("Message in", user.room, "from", user.name + ":", cleanMessage);
            });
            users.filter(function (f) { return f.room === user.room; }).forEach(function (f) {
                socket.broadcast.to(f.mturkId).emit('new message', {
                    username: idToAlias(f, String(socket.mturkId)),
                    message: idToAlias(f, cleanMessage)
                });
            });
        });
    }
    //when the client emits 'new checkin', this listens and executes
    socket.on('new checkin', function (data) {
        useUser(socket, function (user) {
            user.results.checkin.push({
                round: currentRound,
                room: user.room,
                result: data
            });
            updateUserInDB(user, "results.checkin", user.results.checkin);
        });
    });
    socket.on('load bot qs', function () {
        useUser(socket, function (user) {
            ioEmitById(socket.mturkId, 'chatbot', loadQuestions(botFile), socket, user);
        });
    });
    // when the user disconnects.. perform this
    socket.on('disconnect', function (reason) {
        // changes connected to false if disconnected user in userPool
        console.log(chalk_1["default"].red("[" + (new Date()).toISOString() + "]: Disconnecting socket: " + socket.id + " because " + reason));
        if (reason === "transport error") {
            //console.log(socket);
            console.log("TRANSPORT");
        }
        if (userPool.find(function (element) {
            return element.mturkId === socket.mturkId;
        })) {
            userPool.byMturkId(socket.mturkId).connected = false;
            var usersActive = getPoolUsersActive();
            if (usersActive.length >= Math.pow(teamSize, 2)) {
                ioSocketsEmit('update number waiting', { num: 0 });
                // io.sockets.emit('update number waiting', {num: 0});
            }
            else {
                ioSocketsEmit('update number waiting', { num: (Math.pow(teamSize, 2)) - usersActive.length });
                // io.sockets.emit('update number waiting', {num: (teamSize ** 2) - usersActive.length});
            }
            if (userAcquisitionStage)
                mturk.setAssignmentsPending(getPoolUsersConnected().length);
            else
                mturk.setAssignmentsPending(getUsersConnected().length);
        }
        // if (!users.every(user => socket.id !== user.id)) {//socket id is found in users
        //newMessage('has left the chatroom')
        if (!users.find(function (i) { return i.mturkId === socket.mturkId; }))
            return;
        useUser(socket, function (user) {
            user.connected = false;
            user.ready = !suddenDeath;
            var notEnoughUsers = false;
            // update DB with change
            updateUserInDB(user, 'connected', false);
            console.log(socket.username + ": " + user.mturkId + " HAS LEFT");
            // if (!experimentOver && !debugMode) {
            //     mturk.notifyWorkers([user.mturkId], "You've disconnected from our HIT", "You've disconnected from our" +
            //         " HIT. If you are unaware of why you have been disconnected, please email scaledhumanity@gmail.com"
            //         + " with your Mturk ID and the last things you did in the HIT.\n\nMturk ID: " + user.mturkId +
            //         "\nAssignment ID: " + user.assignmentId + '\nHIT ID: ' + mturk.returnCurrentHIT())
            // }
            if (!experimentOver && !suddenDeath) {
                // console.log("Sudden death is off, so we will not cancel the run")
            }
            console.log("Connected users: " + getUsersConnected().length);
            //if things don't work look at this part of the code?
            if (!experimentOver && suddenDeath && experimentStarted) {
                storeHIT();
                console.log("User left, emitting cancel to all users");
                if (!extraRoundOn || notEnoughUsers) {
                    storeHIT();
                    console.log("User left, emitting cancel to all users");
                    var totalTime = getSecondsPassed();
                    if (timeCheckOn) {
                        db.time.insert({ totalTaskTime: totalTime }, function (err, timeAdded) {
                            if (err)
                                console.log("There's a problem adding total time to the DB: ", err);
                            else if (timeAdded)
                                console.log("Total time added to the DB");
                        });
                    }
                    users.filter(function (u) { return u.mturkId !== socket.mturkId; }).forEach(function (u) {
                        var cancelMessage = "<strong>Someone left the task.</strong><br> <br> \
            Unfortunately, our group task requires a specific number of users to run, \
            so once a user leaves, our task cannot proceed. <br><br> \
            To complete the task, please provide suggestions of ways to \
            prevent people leaving in future runs of the study. <br><br> \
            Since the team activity had already started, you will be additionally \
            bonused for the time spent working with the team.";
                        if (experimentStarted) { // Add future bonus pay
                            u.bonus = currentBonus();
                            updateUserInDB(u, 'bonus', u.bonus);
                            storeHIT();
                        }
                        issueFinish(u, cancelMessage, true);
                    });
                }
            }
            if (!suddenDeath && !userAcquisitionStage) { // sets users to ready when they disconnect
                user.ready = true; // TODO: remove user from users
            }
        });
    });
    socket.on('ready-to-all', function (_data) {
        console.log(chalk_1["default"].red("god is ready"));
        users.filter(function (user) { return !user.ready; }).forEach(function (user) {
            return ioEmitById(socket.mturkId, 'echo', 'ready', socket, user);
        }
        // io.in(socket.mturkId).emit('echo', 'ready')
        );
        //io.sockets.emit('echo','ready')
    });
    socket.on('active-to-all', function (_data) {
        console.log(chalk_1["default"].red("god is active"));
        ioSocketsEmit('echo', 'active');
        // io.sockets.emit('echo', 'active');
    });
    socket.on('notify-more', function (_data) {
        console.log(chalk_1["default"].red("god wants more humans"));
        var HITId = mturk.returnCurrentHIT();
        // let HITId = process.argv[2];
        var subject = "We launched our new ad writing HIT. Join now, spaces are limited.";
        console.log(HITId);
        var URL = '';
        mturk.getHITURL(HITId, function (url) {
            URL = url;
            var message = "You’re invited to join our newly launched HIT on Mturk; there are limited spaces " +
                "and it will be closed to new participants in about 15 minutes!  Check out the HIT here: " + URL +
                " \n\nYou're receiving this message because you you indicated that you'd like to be notified of our " +
                "upcoming HIT during this time window. If you'd like to stop receiving notifications please email " +
                "your MTurk ID to: scaledhumanity@gmail.com";
            console.log("message to willBangers", message);
            if (!URL) {
                throw "URL not defined";
            }
            if (usingWillBang) {
                // Use this function to notify only x users <= 100
                var maxWorkersToNotify_2 = 100; // cannot be more than 100 if non-recursive
                mturk.listUsersWithQualificationRecursively(mturk.quals.willBang, function (qualifiedWorkers) {
                    var notifyList = getRandomSubarray(qualifiedWorkers, maxWorkersToNotify_2);
                    mturk.notifyWorkers(notifyList, subject, message);
                });
            }
        });
    });
    socket.on('active', function (_data) {
        useUser(socket, function (user) {
            user.active = true;
            console.log("users active:", users.filter(function (u) { return u.active === true; }).length);
        });
    });
    socket.on('kill-all', function (_data) {
        console.log(chalk_1["default"].red("god is angry"));
        users.forEach(function () { return updateUserInDB(socket, "bonus", currentBonus()); });
        ioSocketsEmit('finished', {
            message: "We have had to cancel the rest of the task. Submit and you will be bonused for your time.",
            finishingCode: "kill-all",
            turkSubmitTo: "",
            assignmentId: "",
            crashed: false
        });
    });
    socket.on("next event", function (_data) {
        useUser(socket, function (user) {
            var currentEvent = user.currentEvent;
            var eventSchedule = user.eventSchedule;
            console.log("Event " + currentEvent + ": " + eventSchedule[currentEvent] + " | User: " + user.name);
            if (eventSchedule[currentEvent] === "starterSurvey") {
                ioEmitById(socket.mturkId, "load", {
                    element: 'starterSurvey',
                    questions: loadQuestions(starterSurveyFile),
                    interstitial: false,
                    showHeaderBar: false
                }, socket, user);
                taskStartTime = getSecondsPassed();
            }
            else if (eventSchedule[currentEvent] === "ready") {
                if (starterSurveyOn && timeCheckOn) {
                    recordTime("starterSurvey");
                }
                if (checkinOn) {
                    ioEmitById(socket.mturkId, "load", {
                        element: 'checkin',
                        questions: loadQuestions(checkinFile),
                        interstitial: true,
                        showHeaderBar: true
                    }, socket, user);
                }
                ioEmitById(socket.mturkId, "load", {
                    element: 'leave-hit',
                    questions: loadQuestions(leaveHitFile),
                    interstitial: true,
                    showHeaderBar: true
                }, socket, user);
                ioEmitById(socket.mturkId, "echo", "ready", socket, user);
            }
            else if (eventSchedule[currentEvent] === "midSurvey") {
                if (timeCheckOn) {
                    recordTime("round");
                }
                ioEmitById(socket.mturkId, "load", {
                    element: 'midSurvey',
                    questions: loadQuestions(midSurveyFile),
                    interstitial: false,
                    showHeaderBar: true
                }, socket, user);
            }
            else if (eventSchedule[currentEvent] === "psychologicalSafety") {
                if (timeCheckOn) {
                    recordTime("round");
                }
                ioEmitById(socket.mturkId, "load", {
                    element: 'psychologicalSafety',
                    questions: loadQuestions(psychologicalSafetyFile),
                    interstitial: false,
                    showHeaderBar: true
                }, socket, user);
            }
            else if (eventSchedule[currentEvent] === "teamfeedbackSurvey") {
                if (midSurveyOn && timeCheckOn) {
                    recordTime("midSurvey");
                }
                else if (timeCheckOn) {
                    recordTime("round");
                }
                ioEmitById(socket.mturkId, "load", {
                    element: 'teamfeedbackSurvey',
                    questions: loadQuestions(feedbackFile, user),
                    interstitial: false,
                    showHeaderBar: true
                }, socket, user);
            }
            else if (eventSchedule[currentEvent] === "blacklistSurvey") {
                experimentOver = true;
                if (teamfeedbackOn && timeCheckOn) {
                    recordTime("teamfeedbackSurvey");
                }
                else if (midSurveyOn && timeCheckOn) {
                    recordTime("midSurvey");
                }
                else if (timeCheckOn) {
                    recordTime("round");
                }
                else if (psychologicalSafetyOn) {
                    recordTime("psychologicalSafety");
                }
                console.log({
                    element: 'blacklistSurvey',
                    questions: loadQuestions(blacklistFile, user),
                    interstitial: false,
                    showHeaderBar: false
                });
                ioEmitById(socket.mturkId, "load", {
                    element: 'blacklistSurvey',
                    questions: loadQuestions(blacklistFile, user),
                    interstitial: false,
                    showHeaderBar: false
                }, socket, user);
            }
            else if (eventSchedule[currentEvent] === "qFifteen") {
                experimentOver = true;
                if (blacklistOn && timeCheckOn) {
                    recordTime("blacklistSurvey");
                }
                else if (teamfeedbackOn && timeCheckOn) {
                    recordTime("teamfeedbackSurvey");
                }
                else if (midSurveyOn && timeCheckOn) {
                    recordTime("midSurvey");
                }
                else if (timeCheckOn) {
                    recordTime("round");
                }
                ioEmitById(user.mturkId, "load", {
                    element: 'qFifteen',
                    questions: loadQuestions(qFifteenFile, user),
                    interstitial: false,
                    showHeaderBar: false
                }, socket, user);
            }
            else if (eventSchedule[currentEvent] === "qSixteen") {
                experimentOver = true;
                if (qFifteenOn && timeCheckOn) {
                    recordTime("qFifteen");
                }
                else if (blacklistOn && timeCheckOn) {
                    recordTime("blacklistSurvey");
                }
                else if (teamfeedbackOn && timeCheckOn) {
                    recordTime("teamfeedbackSurvey");
                }
                else if (midSurveyOn && timeCheckOn) {
                    recordTime("midSurvey");
                }
                else if (timeCheckOn) {
                    recordTime("round");
                }
                ioEmitById(user.mturkId, "load", {
                    element: 'qSixteen',
                    questions: loadQuestions(qSixteenFile, user),
                    interstitial: false,
                    showHeaderBar: false
                }, socket, user);
            }
            else if (eventSchedule[currentEvent] === "postSurvey") { //Launch post survey
                experimentOver = true;
                if (qSixteenOn && timeCheckOn) {
                    recordTime("qSixteen");
                }
                else if (qFifteenOn && timeCheckOn) {
                    recordTime("qFifteen");
                }
                else if (blacklistOn && timeCheckOn) {
                    recordTime("blacklistSurvey");
                }
                else if (teamfeedbackOn && timeCheckOn) {
                    recordTime("teamfeedbackSurvey");
                }
                else if (midSurveyOn && timeCheckOn) {
                    recordTime("midSurvey");
                }
                else if (timeCheckOn) {
                    recordTime("round");
                }
                var survey = postSurveyGenerator(user);
                user.results.manipulation = survey.correctAnswer;
                updateUserInDB(user, 'results.manipulation', user.results.manipulation);
                ioEmitById(socket.mturkId, "load", {
                    element: 'postSurvey',
                    questions: loadQuestions(postSurveyFile, user),
                    interstitial: false,
                    showHeaderBar: false
                }, socket, user);
            }
            else if (eventSchedule[currentEvent] === "finished" || currentEvent > eventSchedule.length) {
                if (!batchCompleteUpdated) {
                    db.batch.update({ batchID: batchID }, { $set: { batchComplete: true } }, {}, function (err) { return console.log(err ? "Err updating batch completion" + err : "Marked batch " + batchID + " competed in DB"); });
                    batchCompleteUpdated = true;
                }
                if (timeCheckOn) {
                    recordTime("postSurvey");
                }
                user.bonus = Number(mturk.bonusPrice);
                updateUserInDB(user, "bonus", user.bonus);
                storeHIT();
                usersFinished += 1;
                console.log(usersFinished, "users have finished.");
                if (notifyUs) {
                    mturk.notifyWorkers(["A19MTSLG2OYDLZ"], "Completed " + currentCondition + " on " + taskURL, "Batch " + batchID + " completed: " + currentCondition + " on port " + port + " at " + taskURL + ".");
                }
                ioEmitById(socket.mturkId, 'finished', {
                    message: "Thanks for participating, you're all done!",
                    finishingCode: socket.id,
                    turkSubmitTo: mturk.submitTo,
                    assignmentId: user.assignmentId
                }, socket, user);
            }
            user.currentEvent += 1;
        });
    });
    // Main experiment run
    socket.on('ready', function (_data) {
        useUser(socket, function (user) {
            //waits until user ends up on correct link before adding user - repeated code, make function
            // PK: what does this comment mean/ is it still relevant?
            user.ready = true;
            console.log(socket.username, 'is ready');
            if (users.filter(function (u) { return !u.ready; }).length) {
                console.log("some users not ready", users.filter(function (u) { return !u.ready; }).map(function (u) { return u.name; }));
                return;
            }
            //PK: still relevant? can we delete this commented out code and/or incompleteRooms()?
            // if (incompleteRooms().length) {
            //   console.log("Some rooms empty:",incompleteRooms())
            //   return } //are all rooms assigned
            // I think this is irrelevant now
            // if ((suddenDeath || !userAquisitionStage) && users.length != teamSize ** 2) {
            //   console.log("Need",teamSize ** 2 - users.length,"more users.")
            //   return
            // }
            //can we move this into its own on.*** call //PK: still relevant?
            console.log('all users ready -> starting experiment');
            treatmentNow = (currentCondition === "treatment" && currentRound === experimentRound);
            var conditionRound = conditions[currentCondition][currentRound] - 1;
            // secondReadyIndex = eventSchedule.indexOf("ready", eventSchedule.indexOf("ready") + 1)
            console.log("user.rooms.length:", user.rooms.length);
            // Replaceing user with extraRound
            if (extraRoundOn && user.rooms.length === 1) {
                users.forEach(function (u) {
                    if (tools.letters.slice(0, Math.pow(teamSize, 2)).includes(u.person) && !u.connected) {
                        var disconnectedsRoom_1 = u.room;
                        Object.entries(teams[0]).forEach(function (_a) {
                            var roomName = _a[0], room = _a[1];
                            if (roomName === disconnectedsRoom_1) {
                                var replacingPersonName = room[teamSize];
                            }
                        });
                        //u is the user who left
                        //replacingPersonName is the v.person of some v in users who will replace u
                        users.filter(function (v) { return v.person === replacingPersonName; }).forEach(function (v) {
                            v.room = u.room;
                            v.rooms = u.rooms;
                            v.person = u.person;
                            v.name = u.name;
                            v.friends = u.friends;
                        });
                    }
                });
                //badUsers contains all of the users we don't need anymore. At most, this is 4 users.
                // At minimum, it's 0.
                var badUsers_1 = [];
                users.forEach(function (u) {
                    if (u) {
                        if (tools.letters.slice(Math.pow(teamSize, 2), Math.pow(teamSize, 2) + teamSize).includes(u.person)) {
                            badUsers_1.push(u);
                        }
                    }
                });
                badUsers_1.forEach(function (u) {
                    issueFinish(u, runViaEmailOn ? "Please click submit below and await further instructions " +
                        "from scaledhumanity@gmail.com." : "Thank you for participating in our task! Click the " +
                        "submit button below and you will be compensated at the promised rate for the time you " +
                        "have spent.");
                    u.connected = false;
                });
            }
            Object.entries(teams[conditionRound]).forEach(function (_a) {
                var roomName = _a[0], room = _a[1];
                users.filter(function (u) { return room.includes(u.person); }).forEach(function (u) {
                    u.room = roomName;
                    u.rooms.push(roomName);
                    updateUserInDB(u, "rooms", u.rooms);
                    u.ready = false; //return users to unready state
                    if (!suddenDeath && !u.connected) {
                        u.ready = true;
                    }
                    console.log(u.name, '-> room', u.room);
                });
            });
            //Notify user 'initiate round' and send task.
            var currentProduct = products[currentRound];
            console.log('Current Product:', currentProduct);
            var taskText = "Design text advertisement for <strong><a href='" + currentProduct.url +
                "' target='_blank'>" + currentProduct.name + "</a></strong>!";
            experimentStarted = true;
            users.forEach(function (u) {
                if (autocompleteTestOn) {
                    var teamNames = [tools.makeName().username, tools.makeName().username, tools.makeName().username,
                        tools.makeName().username, tools.makeName().username];
                    console.log(teamNames);
                    ioEmitById(u.mturkId, 'initiate round', {
                        task: taskText,
                        team: teamNames,
                        duration: roundMinutes,
                        randomAnimal: tools.randomAnimal,
                        round: currentRound + 1,
                        runningLive: runningLive
                    }, socket, u); //rounds are 0 indexed
                }
                else {
                    // Dynamically generate teammate names
                    // even if teamSize = 1 for testing, this still works
                    // users.forEach(u => {
                    //   console.log(u.id, u.room)
                    // })
                    var teamMates = u.friends.filter(function (friend) {
                        return (users.byMturkId(friend.mturkId)) && users.byMturkId(friend.mturkId).connected
                            && (users.byMturkId(friend.mturkId).room === u.room) && (friend.mturkId !== u.mturkId);
                    });
                    // console.log(teamMates)
                    var team_Aliases = tools.makeName(teamMates.length, u.friends_history);
                    user.friends_history = u.friends_history.concat(team_Aliases);
                    var i = 0;
                    for (i = 0; i < teamMates.length; i++) {
                        if (treatmentNow) {
                            teamMates[i].tAlias = team_Aliases[i].join("");
                            team_Aliases[i] = team_Aliases[i].join("");
                        }
                        else {
                            if (currentRound === 0) { //if first round, create aliases
                                teamMates[i].alias = team_Aliases[i].join("");
                                team_Aliases[i] = team_Aliases[i].join("");
                            }
                            else { //if not, use previously created aliases
                                team_Aliases[i] = teamMates[i].alias;
                            }
                        }
                    }
                    team_Aliases.push(u.name); //now push user for autocomplete
                    //let myteam = user.friends.filter(friend => { return (users.byID(friend.id).room == user.room)});
                    // io.in(user.id).emit('initiate round', {task: taskText, team: user.friends.filter(friend =>
                    // { return users.byID(friend.id).room == user.room }).map(friend => { return treatmentNow
                    // ? friend.tAlias : friend.alias }), duration: roundMinutes })
                    ioEmitById(u.mturkId, 'initiate round', {
                        task: taskText,
                        team: team_Aliases,
                        duration: roundMinutes,
                        randomAnimal: tools.randomAnimal,
                        round: currentRound + 1
                    }, socket, u); //round 0 indexed
                }
            });
            console.log('Issued task for:', currentProduct.name);
            console.log('Started round', currentRound, 'with,', roundMinutes, 'minute timer.');
            // save start time
            startTime = (new Date()).getTime();
            // Initialize steps
            var taskSteps = [
                {
                    time: 0.1,
                    message: "<strong>Step 1. List out ideas you like. Shoot for around 3 per person.</strong>"
                },
                {
                    time: 0.4,
                    message: "<strong>Step 2. As a group choose 3 favorite ideas and discuss why you like them.</strong>"
                },
                {
                    time: 0.7,
                    message: "<strong>Step 3. Can you all choose one favorite idea? If not, can you convince others your favorite idea is the best?</strong>"
                }
            ];
            // Execute steps
            taskSteps.forEach(function (step) {
                setTimeout(function () {
                    if (step.message) {
                        console.log(chalk_1["default"].red("Task step:"), step.message);
                        ioSocketsEmit("message clients", step.message);
                        // ioEmitById(user.mturkId, "message clients", step.message)
                    }
                }, step.time * roundMinutes * 60 * 1000);
            });
            //Round warning
            // make timers run in serial
            setTimeout(function () {
                console.log('time warning', currentRound);
                users.forEach(function (user) {
                    ioEmitById(user.mturkId, 'timer', { time: roundMinutes * .2 }, socket, user);
                });
                //Done with round
                setTimeout(function () {
                    console.log('done with round', currentRound);
                    users.forEach(function (user) {
                        ioEmitById(user.mturkId, 'stop', {
                            round: currentRound,
                            survey: (midSurveyOn || teamfeedbackOn || psychologicalSafetyOn)
                        }, socket, user);
                    });
                    currentRound += 1; // guard to only do this when a round is actually done.
                    console.log(currentRound, "out of", numRounds);
                }, 1000 * 60 * 0.2 * roundMinutes);
            }, 1000 * 60 * 0.8 * roundMinutes);
            if (checkinOn) {
                var numPopups_1 = 0;
                var interval_1 = setInterval(function () {
                    if (numPopups_1 >= roundMinutes / checkinIntervalMinutes - 1) {
                        clearInterval(interval_1);
                    }
                    else {
                        socket.emit("checkin popup");
                        numPopups_1++;
                    }
                }, 1000 * 60 * checkinIntervalMinutes);
            }
        });
    });
    //if broken, tell users they're done and disconnect their socket
    socket.on('broken', function (_data) {
        console.log('ON BROKEN CALLED');
        issueFinish(socket, runViaEmailOn ? "We've experienced an error. Please wait for an email from " +
            "scaledhumanity@gmail.com with restart instructions." : "The task has finished early. " +
            "You will be compensated by clicking submit below.", false, "broken");
    });
    // Starter task
    socket.on('starterSurveySubmit', function (data) {
        useUser(socket, function (user) {
            user.results.starterCheck = parseResults(data);
            updateUserInDB(user, "results.starterCheck", user.results.starterCheck);
        });
    });
    // Task after each round - midSurvey - MAIKA
    socket.on('midSurveySubmit', function (data) {
        useUser(socket, function (user) {
            user.results.viabilityCheck[currentRound] = parseResults(data);
            updateUserInDB(user, "results.viabilityCheck", user.results.viabilityCheck);
        });
    });
    socket.on('psychologicalSafetySubmit', function (data) {
        useUser(socket, function (user) {
            user.results.psychologicalSafety[currentRound] = parseResults(data);
            updateUserInDB(user, "results.psychologicalSafety", user.results.psychologicalSafety);
        });
    });
    socket.on('teamfeedbackSurveySubmit', function (data) {
        useUser(socket, function (user) {
            user.results.teamfeedback[currentRound] = parseResults(data);
            updateUserInDB(user, "results.teamfeedback", user.results.teamfeedback);
        });
    });
    socket.on('mturk_formSubmit', function (data) {
        useUser(socket, function (user) {
            user.results.engagementFeedback = parseResults(data);
            updateUserInDB(user, "results.engagementFeedback", user.results.engagementFeedback);
        });
    });
    socket.on('qFifteenSubmit', function (data) {
        useUser(socket, function (user) {
            user.results.qFifteenCheck = parseResults(data);
            updateUserInDB(user, "results.qFifteenCheck", user.results.qFifteenCheck);
        });
    });
    socket.on('qSixteenSubmit', function (data) {
        useUser(socket, function (user) {
            user.results.qSixteenCheck = parseResults(data);
            updateUserInDB(user, "results.qSixteenCheck", user.results.qSixteenCheck);
        });
    });
    socket.on('postSurveySubmit', function (data) {
        useUser(socket, function (user) {
            user.results.manipulationCheck = parseResults(data);
            updateUserInDB(user, "results.manipulationCheck", user.results.manipulationCheck);
        });
    });
    socket.on('blacklistSurveySubmit', function (data) {
        useUser(socket, function (user) {
            user.results.blacklistCheck = parseResults(data);
            updateUserInDB(user, "results.blacklistCheck", user.results.blacklistCheck);
        });
    });
    //loads qs in text file, returns json array
    function loadQuestions(questionFile, user) {
        if (user === void 0) { user = null; }
        var prefix = questionFile.substr(txt.length, questionFile.indexOf('.') - txt.length);
        var questions = [];
        var i = 0;
        fs.readFileSync(questionFile).toString().split('\n').filter(function (n) { return n.length !== 0; }).forEach(function (line) {
            var questionObj = {};
            i++;
            questionObj['name'] = prefix + i;
            //each question in the text file should be formatted: ANSWERTAG.QUESTION ex: YN.Are you part of Team Mark?
            questionObj['question'] = line.substr(line.indexOf('|') + 1, line.length);
            var answerTag = line.substr(0, line.indexOf('|'));
            var answerObj;
            if (answerTag === "S1") { // scale 1 radio
                answerObj = answers;
            }
            else if (answerTag === "YN") { // yes no
                answerObj = binaryAnswers;
            }
            else if (answerTag === "YN15") { // yes no
                answerObj = binaryAnswers;
                var team = getTeamMembers(user)[i - 1];
                questionObj['question'] += " Team " + (i) + " (" + team + ').';
            }
            else if (answerTag === "TR") { //team radio
                getTeamMembers(user).forEach(function (team, index) {
                    questionObj['question'] += " Team " + (index + 1) + " (" + team + '),';
                });
                questionObj['question'] = questionObj['question'].slice(0, -1);
                answerObj = { answers: ["Team 1", "Team 2", "Team 3", "Team 4"], answerType: 'radio', textValue: true };
            }
            else if (answerTag === "MTR") { //team checkbox
                getTeamMembers(user).forEach(function (team, index) {
                    questionObj['question'] += " Team " + (index + 1) + " (" + team + '),';
                });
                questionObj['question'] = questionObj['question'].slice(0, -1);
                answerObj = {
                    answers: ["Team 1 and Team 2", "Team 2 and Team 3", "Team 3 and Team 4", "Team 1 and Team 3", "Team 1 and Team 4", "Team 2 and Team 4"],
                    answerType: 'radio',
                    textValue: true
                };
            }
            else if (answerTag === "LH") { //leave hit yn
                answerObj = leaveHitAnswers;
            }
            else { //chatbot qs
                answerObj = {};
            }
            questionObj['answers'] = answerObj.answers;
            questionObj['answerType'] = answerObj.answerType;
            questionObj['textValue'] = answerObj.textValue;
            questionObj['required'] = requiredOn && answerObj.answerType === 'radio';
            questions.push(questionObj);
        });
        return questions;
    }
    function issueFinish(socket, message, crashed, finishingCode) {
        if (crashed === void 0) { crashed = false; }
        if (finishingCode === void 0) { finishingCode = socket.id; }
        if (!socket) {
            console.log("Undefined user in issueFinish");
            return;
        }
        console.log(chalk_1["default"].red('Issued finish to ' + socket.mturkId));
        useUser(socket, function (user) {
            ioEmitById(socket.mturkId, 'finished', { message: message, finishingCode: finishingCode, crashed: crashed }, socket, user);
        });
    }
});
// return subset of userPool
function getPoolUsersConnected() {
    return userPool.filter(function (user) { return user.connected; });
}
function getPoolUsersActive() {
    return userPool.filter(function (user) { return user.active && user.connected; });
}
// return subset of users
function getUsersConnected() {
    return users.filter(function (user) { return user.connected; });
}
//replaces user.friend aliases with corresponding user IDs
function aliasToID(user, newString) {
    user.friends.forEach(function (friend) {
        var currentAlias = treatmentNow ? friend.tAlias : friend.alias;
        var aliasRegEx = new RegExp(currentAlias, 'g');
        newString = newString.replace(aliasRegEx, friend.mturkId);
    });
    return newString;
}
//replaces other users IDs with user.friend alieses in string
function idToAlias(user, newString) {
    user.friends.forEach(function (friend) {
        var idRegEx = new RegExp(friend.mturkId, 'g');
        var currentAlias = treatmentNow ? friend.tAlias : friend.alias;
        newString = newString.replace(idRegEx, currentAlias);
    });
    return newString;
}
//returns time since task began
function getSecondsPassed() {
    return ((new Date()).getTime() - startTime) / 1000;
}
function replicate(arr, times) {
    var al = arr.length, rl = al * times, res = new Array(rl);
    for (var i = 0; i < rl; i++)
        res[i] = arr[i % al];
    return res;
}
//PK: we call this fxn many times, is it necessary?
//PK: why do we need to record the length of each task? if this is for bonusing, can we avoid calling this
// fxn so many times and just do once when the exp ends?
// records length of each task
var recordTime = function (event) {
    var _a;
    taskEndTime = getSecondsPassed();
    taskTime = taskStartTime - taskEndTime;
    db.time.insert((_a = {}, _a[event] = taskTime, _a), function (err, timeAdded) {
        if (err)
            console.log("There's a problem adding", event, "time to the DB: ", err);
        else if (timeAdded)
            console.log(event, "time added to the DB");
    });
    taskStartTime = getSecondsPassed();
};
var getTeamMembers = function (user) {
    // Makes a list of teams this user has worked with
    var roomTeams = user.rooms.map(function (room, rIndex) {
        return users.filter(function (user) { return user.rooms[rIndex] === room; });
    });
    // Makes a human friendly string for each team with things like 'you' for the current user,
    // commas and 'and' before the last name.
    return roomTeams.map(function (team, tIndex) { return team.reduce(function (total, current, pIndex, pArr) {
        var friend = user.friends.find(function (friend) { return friend.mturkId === current.mturkId; });
        var name = ((experimentRound === tIndex && currentCondition === "treatment") ? friend.tAlias : friend.alias);
        if (name === user.name) {
            name = "you";
        }
        return name + (pIndex === 0 ? "" : ((pIndex + 1) === pArr.length ? " and " : ", ")) + total;
    }, ""); });
};
//PK: delete this fxn and use the normal survey mechanism?
// This function generates a post survey for a user (listing out each team they were part of),
// and then provides the correct answer to check against.
var postSurveyGenerator = function (user) {
    var answers = getTeamMembers(user);
    // Makes a list of teams that are the correct answer, e.g., "Team 1 and Team 3"
    var correctAnswer = answers.map(function (_team, index) {
        if (conditions[currentCondition][index] === experimentRoundIndicator) {
            return "Team " + (index + 1);
        }
        else {
            return "";
        }
    }).filter(function (a) { return a.length !== 0; });
    if (correctAnswer.length === 1) {
        correctAnswer = "none";
    }
    else {
        correctAnswer = correctAnswer.join(" and ");
    }
    console.log("Manipulation check:", answers, correctAnswer);
    return {
        question: "Select teams you think consisted of the same people.",
        name: "postsurvey",
        answers: answers,
        answerType: 'checkbox',
        correctAnswer: correctAnswer
    };
};
function storeHIT(currentHIT) {
    if (currentHIT === void 0) { currentHIT = mturk.returnCurrentHIT(); }
    db.ourHITs.insert({ HITId: currentHIT, batch: batchID }, function (err, HITAdded) {
        if (err)
            console.log("There's a problem adding HIT to the DB: ", err);
        else if (HITAdded)
            console.log("HIT added to the DB: ", currentHIT);
    });
}
// parses results from surveys to proper format for JSON file
function parseResults(data) {
    var parsedResults = {};
    data.split('&').forEach(function (responsePair) {
        var response = responsePair.split("=");
        var index = response[0].split("-q");
        parsedResults[index[1]] = response[1] ? decode(response[1]) : "";
    });
    return parsedResults;
}
var decode = function (encoded) {
    return unescape(encoded.replace(/\+/g, " "));
};
var logTime = function () {
    var timeNow = new Date(Date.now());
    // console.log("This is as of " +  (Date.now()-batchID)/1000 +
    // " seconds since starting the experiment. Printed at", timeNow.getHours()+":"
    // +timeNow.getMinutes()+":"+timeNow.getSeconds()+".")
    console.log("This is as of " + (Date.now() - batchID) / 1000 +
        " seconds since starting the experiment. Printed at", timeNow.toString());
};
function getRandomSubarray(arr, size) {
    return shuffle(arr).slice(0, size);
}
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}
