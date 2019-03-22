require("dotenv").config();
const chalk = require("chalk");
const args = require("yargs").argv;

//Environmental settings, set in .env
const runningLocal = process.env.RUNNING_LOCAL === "TRUE";
const runningLive = process.env.RUNNING_LIVE === "TRUE"; //ONLY CHANGE ON SERVER
const teamSize = parseInt(process.env.TEAM_SIZE);
const roundMinutes = parseFloat(process.env.ROUND_MINUTES);
const taskURL = args.url || process.env.TASK_URL;

//Parameters for waiting qualifications
const secondsToWait = 20; //number of seconds users must have been on pretask to meet qualification (e.g. 120)
const secondsSinceResponse = 59; //number of seconds since last message users sent to meet pretask qualification (e.g. 20)
const secondsToHold1 = 1200; //maximum number of seconds we allow someone to stay in the pretask (e.g. 720)
const secondsToHold2 = 200; //maximum number of seconds of inactivity that we allow in pretask (e.g. 60)
const maxWaitChatMinutes = 20;

// Toggles
const runExperimentNow = true;
const issueBonusesNow = runningLive;
const notifyWorkersOn = runningLive;
const runViaEmailOn = false;
const usingWillBang = runningLive;
const aggressiveNotifyOn = runningLive;
const notifyUs = runningLive;

const cleanHITs = true;
const assignQualifications = runningLive;
const debugModeOn = !runningLive;

const suddenDeath = false;

const randomConditionOn = false;
const randomRoundOrderOn = true;
const randomProductOn = true;

const waitChatOn = true; //MAKE SURE THIS IS THE SAME IN CLIENT, MAKE SURE TRUE WHEN RUNNING LIVE
const extraRoundOn = false; //Only set to true if teamSize = 4, Requires waitChatOn = true.
const psychologicalSafetyOn = false;
const starterSurveyOn = false;
const midSurveyOn = true;
const midSurveyStatusOn = false; //Only set to true if teamSize = 4, Requires waitChatOn = true.
const creativeSurveyOn = false;
const satisfactionSurveyOn = false;
const conflictSurveyOn = false;
const blacklistOn = false;
const teamfeedbackOn = false;
const checkinOn = false;
const timeCheckOn = false; // tracks time user spends on task and updates payment - also tracks
// how long each task is taking
const requiredOn = runningLive;
const checkinIntervalMinutes = roundMinutes / 3;
const qFifteenOn = true;
const qSixteenOn = true;
const postSurveyOn = true;
const demographicsSurveyOn = false;

if (midSurveyStatusOn && teamSize != 4) {
  throw "Status survey only functions at team size 4";
}

//Testing toggles
const autocompleteTestOn = false; //turns on fake team to test autocomplete

console.log(
  runningLive
    ? chalk.red.inverse("\n RUNNING LIVE ")
    : chalk.green.inverse("\n RUNNING SANDBOXED ")
);
console.log(runningLocal ? "Running locally" : "Running remotely");

// Question Files
const fs = require("fs");
const txt = "txt/";
const midSurveyFile = txt + "midsurvey-q.txt";
const midSurveyStatusFile = txt + "midsurveystatus-q.txt";
const psychologicalSafetyFile = txt + "psychologicalsafety-q.txt";
const checkinFile = txt + "checkin-q.txt";
const blacklistFile = txt + "blacklist-q.txt";
const feedbackFile = txt + "feedback-q.txt";
const starterSurveyFile = txt + "startersurvey-q.txt";
const postSurveyFile = txt + "postsurvey-q.txt";
const demographicsSurveyFile = txt + "demographics-q.txt";
const conflictSurveyFile = txt + "conflict-q.txt";
const creativeSurveyFile = txt + "creative-q.txt";
const satisfactionSurveyFile = txt + "satisfaction-q.txt";
const botFile = txt + "botquestions.txt";
const leaveHitFile = txt + "leave-hit-q.txt";
const qFifteenFile = txt + "qfifteen-q.txt";
const qSixteenFile = txt + "qsixteen-q.txt";

// Answer Option Sets
const answers = {
  answers: [
    "Strongly Disagree",
    "Disagree",
    "Neutral",
    "Agree",
    "Strongly Agree"
  ],
  answerType: "radio",
  textValue: true
};

const scale7 = {
  answers: ["1 (Not at all)", "2", "3", "4", "5", "6", "7 (Highly)"],
  answerType: "radio",
  textValue: true
};

const scale7A = {
  answers: [
    "1 (Disagree Strongly)",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7 (Agree Strongly)"
  ],
  answerType: "radio",
  textValue: true
};

const scale5Q = {
  answers: ["1 (Not at all)", "2", "3", "4", "5 (Highly)"],
  answerType: "radio",
  textValue: true
};

const scale5 = {
  answers: ["1 (None)", "2", "3", "4", "5 (A lot)"],
  answerType: "radio",
  textValue: true
};

const face = {
  answers: ["D:", "]:", "|:", "[:", ":D"],
  answerType: "radio",
  textValue: true
};

const dem1 = {
  answers: [
    "Less than High School",
    "High school or equiv",
    "Some college, no degree",
    "Associate degree",
    "Bachelors degree",
    "Masters degree",
    "Professional degree",
    "Doctorate"
  ],
  answerType: "radio",
  textValue: true
};

const dem2 = {
  answers: ["Male", "Female", "Other"],
  answerType: "radio",
  textValue: true
};

const dem4 = {
  answers: [
    "Less than $20,000",
    "$20,000 to $34,999",
    "$35,000 to $49,999",
    "$50,000 to $74,999",
    "$75,000 to $99,999",
    "Over $100,000"
  ],
  answerType: "radio",
  textValue: true
};

const dem6 = {
  answers: [
    "American Indian or Alaska Native",
    "Asian",
    "Black or African American",
    "Native Hawaiian or Other Pacific Islander",
    "White",
    "Other"
  ],
  answerType: "checkbox",
  textValue: true
};

const YNAnswers = {
  answers: ["Yes", "No"],
  answerType: "radio",
  textValue: true
};

const binaryAnswers = {
  answers: ["Keep this team", "Do not keep this team"],
  answerType: "radio",
  textValue: true
};
const textAnswer = {
  answers: [""],
  answerType: "text",
  textValue: true
};
const leaveHitAnswers = {
  answers: ["End Task and Send Feedback", "Return to Task"],
  answerType: "radio",
  textValue: false
};

// Setup basic express server
let tools = require("./tools");
let mturk = require("./mturkTools");
let express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server); //, {transports: ['websocket']}
const port = args.port || process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server listening at port", port);
});

Array.prototype.pick = function() {
  return this[Math.floor(Math.random() * this.length)];
};
Array.prototype.byID = function(id) {
  return this.find(user => user.id === id);
};
Array.prototype.byMturkId = function(mturkId) {
  return this.find(user => user.mturkId === mturkId);
};
Array.prototype.set = function() {
  const setArray = [];
  this.forEach(element => {
    if (!setArray.includes(element)) {
      setArray.push(element);
    }
  });
  return setArray;
};

function ioSocketsEmit(event, message) {
  if (debugModeOn) {
    console.log(event, message);
  }
  return io.sockets.emit(event, message);
}

function ioEmitById(socketId, event, message, socket, user) {
  if (debugModeOn) {
    let isActive = null;
    let isConnected = null;
    if (user) {
      isActive = user.active;
      isConnected = user.connected;
    }
    let printMessage = message;
    if (event === "chatbot") {
      printMessage = "all the questions";
    }
    console.log(
      socket.id,
      socket.mturkId,
      isActive,
      isConnected,
      event,
      printMessage
    );
  }
  return io.in(socketId).emit(event, message);
}

function useUser(socket, callback, err = "Guarded against undefined user") {
  //let user = users.byID(u.id)
  let user = users.byMturkId(socket.mturkId);
  if (typeof user !== "undefined" && typeof callback === "function") {
    callback(user);
  } else {
    console.log(chalk.red(err), socket.id, "\n", err.stack);
    if (debugModeOn) {
      console.trace();
    }
  }
}

// Check balance
mturk.getBalance(function(balance) {
  if (runningLive && balance <= 400) {
    console.log(chalk.red.inverse.bold("\n!!! BROKE !!!\n"));
  }
});

// Save debug logs for later review
const util = require("util");
const trueLog = console.log;
const debugDir = "debug/";

if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir);
}

log_file = debugDir + "debug" + Date.now() + ".log";
console.log = function(...msg) {
  msg.unshift("[" + new Date().toISOString() + "]");
  trueLog(
    msg
      .map(item => {
        return util.format(item);
      })
      .join(" ")
  ); //uncomment if you want logs
  msg.map(item => {
    fs.appendFile(log_file, util.format(item) + " ", function(err) {
      if (err) {
        return trueLog(err);
      }
    });
  });
  fs.appendFile(log_file, "\n", function(err) {
    if (err) {
      f;
      return trueLog(err);
    }
  });
};

//if (runExperimentNow){
// Experiment variables
/* const conditionsAvailable = ['control','treatment','baseline'] */
const presetCondition = randomConditionOn
  ? ["control", "treatment"].pick()
  : "treatment";
const currentCondition = args.condition || presetCondition;
let treatmentNow = false;
let firstRun = false;
let hasAddedUsers = false; //lock on adding users to db/experiment for experiment
let batchCompleteUpdated = false;

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
const ordering = randomRoundOrderOn
  ? [[1, 2, 1, 3], [1, 2, 3, 1], [2, 1, 3, 1]].pick()
  : [1, 2, 1, 3];
const conditions = {
  control: ordering,
  treatment: ordering,
  baseline: [1, 2, 3, 2]
}; //,4]} modified extra roudn to deal with createTeams

const experimentRoundIndicator = extraRoundOn ? 2 : 1; //This record what round of the ordering is the experimental round.
const experimentRound = conditions[currentCondition].lastIndexOf(
  experimentRoundIndicator
); //assumes that the manipulation is always the last instance of team 1's interaction.
console.log(currentCondition, "with", conditions[currentCondition]);

const numRounds = conditions.baseline.length;

const numberOfRooms = teamSize * numRounds;
const people = extraRoundOn
  ? tools.letters.slice(0, teamSize ** 2 + teamSize)
  : tools.letters.slice(0, teamSize ** 2);
const teams = tools.createTeams(teamSize, numRounds - 1, people, extraRoundOn);

const batchID = Date.now();
console.log("Launching batch", batchID);

const homeDIR = require("os").homedir();
const willBangDBName = ".data/willBang";
const willBangDMLocation = runningLocal
  ? willBangDBName
  : `${homeDIR}/${willBangDBName}`;

// Setting up DB
const Datastore = require("nedb");
const db = {};
db.users = new Datastore({
  filename: ".data/users",
  autoload: true,
  timestampData: true
});
db.chats = new Datastore({
  filename: ".data/chats",
  autoload: true,
  timestampData: true
});
db.batch = new Datastore({
  filename: ".data/batch",
  autoload: true,
  timestampData: true
});
db.time = new Datastore({
  filename: ".data/time",
  autoload: true,
  timestampData: true
});
db.ourHITs = new Datastore({
  filename: ".data/ourHITs",
  autoload: true,
  timestampData: true
});
db.willBang = new Datastore({
  filename: willBangDMLocation,
  autoload: true,
  timestampData: true
});

function updateUserInDB(user, field, value) {
  db.users.update(
    { mturkId: user.mturkId, batch: batchID },
    { $set: { [field]: value } },
    {},
    err =>
      console.log(
        err
          ? `${chalk.red("Err recording ")} ${field}: ${err}`
          : `Updated ${field} for ${user.mturkId} ${JSON.stringify(
              value,
              null,
              2
            )}`
      )
  );
}

//Mturk background tasks
db.users.find({}, (err, usersInDB) => {
  if (err) {
    console.log("DB for MTurk:" + err);
  } else {
    if (issueBonusesNow) {
      mturk.payBonuses(usersInDB, bonusedUsers => {
        bonusedUsers.forEach(u => updateUserInDB(u, "bonus", 0));
      });
    }
    if (assignQualifications && runningLive) {
      mturk.listUsersWithQualificationRecursively(
        mturk.quals.hasBanged,
        data => {
          console.log(
            `Number of users with qualification hasBanged: ${data.length}`
          );
        }
      );
    }
    if (notifyWorkersOn && runningLive) {
      mturk.listUsersWithQualificationRecursively(
        mturk.quals.willBang,
        data => {
          console.log(
            `Number of users with qualification willBang: ${data.length}`
          );
        }
      );
    }
  }
});

// expires active HITs in the DB
if (cleanHITs) {
  mturk.workOnActiveHITs(activeHITs => {
    db.ourHITs.find({}, (err, HITsInDB) => {
      if (err) {
        console.log("Err loading HITS for expiration:" + err);
      } else {
        HITsInDB.map(h => h.HITId)
          .filter(h => activeHITs.includes(h))
          .forEach(mturk.expireHIT);
      }
    });
  });
}

if (runExperimentNow) {
  mturk.launchBang(batchID, function(HIT) {
    logTime();
    storeHIT(HIT.HITId);
    // Notify workers that a HIT has started if we're doing recruiting by email
    if (notifyWorkersOn) {
      let subject = `We launched our new HIT. Join now, spaces are limited.`;
      console.log(HIT);
      let URL = ``;
      mturk.getHITURL(HIT.HITId, function(url) {
        URL = url;
        let message = `You’re invited to join our newly launched HIT on Mturk; there are limited spaces and it will be closed to new participants in about 15 minutes! \n\nCheck out the HIT here: ${URL} \n\nYou're receiving this message because you indicated that you'd like to be notified of our upcoming HIT during this time window. If you'd like to stop receiving notifications please email your MTurk ID to: scaledhumanity@gmail.com`;
        console.log("message to willBangers", message);
        if (!URL) {
          throw "URL not defined";
        }
        if (usingWillBang) {
          // removes people who no longer have willBang qual from db.willBang
          db.willBang.find({}, (err, willBangers) => {
            if (err) {
              console.log(`ERROR cleaning willBang db: ${err}`);
            } else {
              mturk.listUsersWithQualificationRecursively(
                mturk.quals.willBang,
                function(data) {
                  let willBangIds = willBangers.map(u => u.id);
                  willBangIds.forEach(willBangID => {
                    if (!data.includes(willBangID)) {
                      // if user in db.willBang no longer
                      // has willBang qual
                      db.willBang.remove(
                        { id: willBangID },
                        { multi: true },
                        function(err, numRemoved) {
                          if (err) {
                            console.log(
                              `Error removing from willBang db: ${err}`
                            );
                          } else {
                            console.log(
                              `${willBangID} REMOVED FROM WILLBANG DB (${numRemoved})`
                            );
                          }
                        }
                      );
                    }
                  });
                }
              );
            }
          });
          // Use this function to notify only x users <= 100
          let maxWorkersToNotify = 100; // cannot be more than 100

          // Get workers to notify from - all times are GMT (NOT PST!!) bc server time is GMT
          let currentHour = new Date(Date.now()).getHours();
          const timePeriods = {
            13: "morning",
            14: "morning",
            15: "morning",
            16: "midday",
            17: "midday",
            18: "midday",
            19: "afternoon",
            20: "afternoon",
            21: "afternoon",
            22: "evening",
            23: "evening",
            24: "evening"
          };

          const currentTimePeriod = timePeriods[currentHour];
          if (currentTimePeriod === undefined) {
            // randomize list
            mturk.listUsersWithQualificationRecursively(
              mturk.quals.willBang,
              function(data) {
                let notifyList = getRandomSubarray(data, maxWorkersToNotify);
                mturk.notifyWorkers(notifyList, subject, message);
                console.log(`Notified ${notifyList.length} workers`);
              }
            );
          } else {
            // use the time buckets
            console.log("Current Time Period: " + currentTimePeriod);
            db.willBang.find(
              { timePreference: currentTimePeriod },
              (err, currentTimePoolWorkers) => {
                if (err) {
                  console.log("DB for MTurk:" + err);
                } else {
                  if (currentTimePoolWorkers.length > maxWorkersToNotify) {
                    currentTimePoolWorkers = getRandomSubarray(
                      currentTimePoolWorkers,
                      maxWorkersToNotify
                    );
                  }
                  console.log(
                    "Time Pool Workers: " + currentTimePoolWorkers.length
                  );
                  let timePoolNotifyList = currentTimePoolWorkers.map(
                    u => u.id
                  );
                  let moreworkersneeded =
                    maxWorkersToNotify - currentTimePoolWorkers.length;
                  if (aggressiveNotifyOn ? true : moreworkersneeded > 0) {
                    //if we don't have enough
                    // people with current time preference to notify
                    mturk.notifyWorkers(timePoolNotifyList, subject, message);
                    mturk.listUsersWithQualificationRecursively(
                      mturk.quals.willBang,
                      function(data) {
                        let notifyList = getRandomSubarray(
                          data,
                          aggressiveNotifyOn
                            ? maxWorkersToNotify
                            : moreworkersneeded
                        );
                        let i = notifyList.length;
                        while (i--) {
                          if (timePoolNotifyList.includes(notifyList[i])) {
                            notifyList.splice(i, 1);
                          }
                        }
                        mturk.notifyWorkers(notifyList, subject, message);
                      }
                    );
                  } else {
                    let workerstonotify = getRandomSubarray(
                      timePoolNotifyList,
                      maxWorkersToNotify
                    );
                    mturk.notifyWorkers(workerstonotify, subject, message);
                  }
                }
              }
            );
          }
        }
      });
    }
  });
}

//Add more products
let products = [
  {
    name: "Thé-tis Tea : Plant-based seaweed tea, rich in minerals",
    url:
      "https://www.kickstarter.com/projects/1636469325/the-tis-tea-plant-based-high-rich-minerals-in-seaw"
  },
  {
    name: "Stool Nº1",
    url: "https://www.kickstarter.com/projects/390812913/stool-no1"
  },
  {
    name: "LetB Color - take a look at time in different ways",
    url:
      "https://www.kickstarter.com/projects/letbco/letb-color-take-a-look-at-time-in-different-ways"
  },
  {
    name: "FLECTR 360 OMNI – cycling at night with full 360° visibility",
    url: "https://www.kickstarter.com/projects/outsider-team/flectr-360-omni"
  },
  {
    name: "The Ollie Chair: Shape-Shifting Seating",
    url:
      "https://www.kickstarter.com/projects/144629748/the-ollie-chair-shape-shifting-seating"
  }
];

if (randomProductOn) {
  products = shuffle(products);
}

let users = []; //the main local user storage
let userPool = []; //accumulates users pre-experiment
let waitchatStart = 0;
let currentRound = 0; //PK: talk about 0-indexed v 1-indexed round numbers (note: if change -> change parts
// of code reliant on 0-indexed round num)
let startTime = 0;
let userAcquisitionStage = true;
let experimentOver = false;
let usersFinished = 0;

// keeping track of time
let taskStartTime = getSecondsPassed(); // reset for each start of new task
let taskEndTime = 0;
let taskTime = 0;

// Building task list
//if (runExperimentNow){
let eventSchedule = [];
if (starterSurveyOn) {
  eventSchedule.push("starterSurvey");
}
let roundSchedule = [];

roundSchedule.push("ready"); //This is the chat task.
if (midSurveyOn) {
  roundSchedule.push("midSurvey");
}
if (midSurveyStatusOn) {
  roundSchedule.push("midSurveyStatus");
}
if (creativeSurveyOn) {
  roundSchedule.push("creativeSurvey");
}
if (satisfactionSurveyOn) {
  roundSchedule.push("satisfactionSurvey");
}
if (conflictSurveyOn) {
  roundSchedule.push("conflictSurvey");
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
if (postSurveyOn) {
  eventSchedule.push("postSurvey");
}
if (demographicsSurveyOn) {
  eventSchedule.push("demographicsSurvey");
}
eventSchedule.push("finished");
console.log("This batch will include:", eventSchedule);
//}

app.use(express.static("public"));

// Disconnect leftover users
Object.keys(io.sockets.sockets).forEach(socketID => {
  console.log(socketID);
  if (userPool.every(user => user.id !== socketID)) {
    console.log("Removing leftover socket: " + socketID);
    io.in(socketID).emit("get IDs", "broken");
    // io.in(socketID).disconnect(true)
  }
});

//if (runExperimentNow){
// Adds Batch data for this experiment. unique batchID based on time/date
db.batch.insert(
  {
    batchID: batchID,
    batchComplete: false,
    starterSurveyOn: starterSurveyOn,
    midSurveyOn: midSurveyOn,
    midSurveyStatusOn: midSurveyStatusOn,
    creativeSurveyOn: creativeSurveyOn,
    conflictSurveyOn: conflictSurveyOn,
    satisfactionSurveyOn: satisfactionSurveyOn,
    demographicsSurveyOn: demographicsSurveyOn,
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
  },
  (err, usersAdded) => {
    if (err) console.log("There's a problem adding batch to the DB: ", err);
    else if (usersAdded) console.log("Batch added to the DB");
    console.log(
      "Leftover sockets from previous run: " + Object.keys(io.sockets.sockets)
    );
    if (!firstRun) {
      Object.keys(io.sockets.sockets).forEach(socketID => {
        console.log("SOCKET DISCONNECT IN BATCH INSERT");
        io.sockets.sockets[socketID].disconnect(true);
      });
      firstRun = true;
    }
  }
); // eventSchedule instead of all of the toggles? (missing checkinOn) //PK: what does this comment mean?
//}

// Chatroom
io.on("connection", socket => {
  //PK: what are these bools for?
  let experimentStarted = false; //NOTE: this will be set multiple times but I don't think that's
  // what is wanted in this case

  const workerStartTime = getSecondsPassed();
  const currentBonus = () => {
    mturk.updatePayment(getSecondsPassed() - workerStartTime);
  };

  function createUsername() {
    const name_structure = tools.makeName();
    socket.name_structure = name_structure;
    socket.username = name_structure.username;
    socket.emit("set username", {
      username: socket.username,
      name_structure: name_structure
    });
  }

  socket.on("connected", data => {
    const mturkId = data.mturkId;
    const assignmentId = data.assignmentId;
    socket.mturkId = mturkId;
    socket.assignmentId = assignmentId;
    socket.join(mturkId);

    if (users.byMturkId(mturkId)) {
      console.log(chalk.blue(`Reconnected ${mturkId} in users`));
      let user = users.byMturkId(mturkId);
      user.connected = true;
      user.assignmentId = assignmentId;
      user.id = socket.id;
      user.turkSubmitTo = data.turkSubmitTo;

      mturk.setAssignmentsPending(getUsersConnected().length);
    }
    if (userPool.byMturkId(mturkId)) {
      let user = userPool.byMturkId(mturkId);
      console.log(
        chalk.blue(
          `RECONNECTED ${mturkId} in user pool (${user.id} => ${socket.id})`
        )
      );
      socket.name_structure = data.name_structure;
      socket.username = data.name_structure.username;
      user.connected = true;
      user.active = false;
      user.assignmentId = assignmentId;
      user.id = socket.id;
      user.turkSubmitTo = data.turkSubmitTo;
    } else {
      createUsername();
      console.log(chalk.blue("NEW USER CONNECTED"));
    }
    console.log(
      chalk.blue(
        `SOCKET: ${socket.id} | MTURK ID: ${socket.mturkId} | NAME: ${
          socket.username
        } | ASSIGNMENT ID: ${socket.assignmentId}`
      )
    );
  });

  socket.on("heartbeat", () => {
    if (socket.connected) {
      io.in(socket.id).emit("heartbeat");
    }
  });
  socket.on("accepted HIT", data => {
    console.log("ACCEPTED HIT CALLED");
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

      issueFinish(
        socket,
        runViaEmailOn
          ? "We don't need you to work right now. Please await further" +
              " instructions from scaledhumanity@gmail.com."
          : "We have enough users on this task. Submit below" +
              " and you will be compensated appropriately for your time. Thank you!"
      );
      return;
    }
    if (userPool.byMturkId(data.mturkId)) {
      //if it's a reconnected user
      let user = userPool.byMturkId(data.mturkId);
      console.log(
        `${data.mturkId} REJOINED USER POOL (${user.id} => ${socket.id})`
      );

      user.id = socket.id;
      user.connected = true;
      user.turkSubmitTo = data.turkSubmitTo;
      user.assignmentId = data.assignmentId;
    } else {
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

    if (userPool.length === 1) {
      //first user entered waitchat
      waitchatStart = data.timeAdded;
    }

    mturk.setAssignmentsPending(getPoolUsersConnected().length);

    Object.keys(io.sockets.sockets).forEach(socketID => {
      if (
        userPool.every(user => {
          return user.id !== socketID;
        })
      ) {
        console.log("Removing dead socket:", socketID);
        io.in(socketID).emit("get IDs", "broken");
      }
    });
    logTime();
    console.log(
      `Sockets active: ${Object.keys(io.sockets.sockets)} of ${teamSize}`
    );
    updateUserPool();
  });

  function updateUserPool() {
    if (!userAcquisitionStage) return;

    function secondsSince(event) {
      return (Date.now() - event) / 1000;
    }

    function updateUsersActive() {
      userPool.forEach(user => {
        //PK: rename secondsToWait
        user.active =
          secondsSince(user.timeAdded) > secondsToWait &&
          secondsSince(user.timeLastActivity) < secondsSinceResponse;
        let numUsersWanted = extraRoundOn
          ? teamSize ** 2 + teamSize
          : teamSize ** 2;
        let weightedHoldingSeconds =
          secondsToHold1 +
          0.33 *
            (secondsToHold1 / (numUsersWanted - getPoolUsersActive().length)); // PK: make isUserInactive fxn
        if (
          !user.removed &&
          (secondsSince(user.timeAdded) > weightedHoldingSeconds ||
            secondsSince(user.timeLastActivity) > secondsToHold2)
        ) {
          user.removed = true;
          console.log("removing user because of inactivity:", user.id);
          io.in(user.mturkId).emit("get IDs", "broken");
        }
      });
    }

    if (waitChatOn) updateUsersActive();
    const usersActive = getPoolUsersActive();
    const usersConnected = getPoolUsersConnected();
    console.log("Users active: " + usersActive.length);
    console.log("Users connected: " + usersConnected.length);
    console.log("Users in pool: " + userPool.length);
    let numUsersWanted = extraRoundOn
      ? teamSize ** 2 + teamSize
      : teamSize ** 2; //turn into const at start
    if (waitChatOn) {
      if (!hasAddedUsers && usersActive.length >= numUsersWanted) {
        //if have enough active users and had
        // not added users before
        logTime();
        hasAddedUsers = true;
        for (let i = 0; i < usersActive.length; i++) {
          //for every active user
          let user = usersActive[i];
          console.log("active user " + (i + 1) + ": " + user.name);
          if (i < numUsersWanted) {
            //take the 1st teamssize **2 users and add them
            ioEmitById(user.mturkId, "echo", "add user", socket, user);
            ioEmitById(user.mturkId, "initiate experiment", null, socket, user);
          } else {
            //else emit finish
            console.log("EMIT FINISH TO EXTRA ACTIVE WORKER");
            issueFinish(
              user,
              runViaEmailOn
                ? "We don't need you to work at this specific moment, " +
                    "but we may have tasks for you soon. Please await further instructions from " +
                    "scaledhumanity@gmail.com."
                : "Thanks for participating, you're all done!"
            );
          }
        }
        userPool
          .filter(user => !usersActive.byMturkId(user.mturkId))
          .forEach(user => {
            //
            console.log("EMIT FINISH TO NONACTIVE OR DISCONNECTED WORKER");
            issueFinish(
              user,
              runViaEmailOn
                ? "We don't need you to work at this specific moment, " +
                    "but we may have tasks for you soon. Please await further instructions from " +
                    "scaledhumanity@gmail.com."
                : "Thanks for participating, you're all done!"
            );
          });
      } else {
        if (secondsSince(waitchatStart) / 60 >= maxWaitChatMinutes) {
          console.log(chalk.red("Waitchat time limit reached"));
          userAcquisitionStage = false;
          io.in(socket.mturkId).emit("echo", "kill-all");
        }
      }
    } else {
      // waitchat off - I think the below should be usersConnected instead of usersActive as inactive users aren't being made active
      if (usersActive.length >= numUsersWanted) {
        ioSocketsEmit("update number waiting", { num: 0 });
        console.log(
          "there are " + usersActive.length + " users: " + usersActive
        );
        for (let i = 0; i < usersActive.length; i++) {
          io.in(usersActive[i].mturkId).emit("show chat link");
        }
      } else {
        ioSocketsEmit("update number waiting", {
          num: teamSize ** 2 - usersActive.length
        });
      }
    }
  }

  function makeUser(data) {
    return {
      id: socket.id,
      mturkId: data.mturkId,
      assignmentId: data.assignmentId,
      batch: batchID,
      room: "",
      rooms: [],
      bonus: 0,
      person: "",
      name: socket.username,
      ready: false,
      friends: [],
      friends_history: [socket.name_structure.parts], // list of aliases to avoid, which includes the user's
      // username//PK: is it okay to store this in the socket?
      connected: true, //PK: what does user.active mean? is this ever set to false? I want to use 'active'
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
        statusCheck: {},
        statusTeams: {},
        demographicsCheck: {},
        conflictCheck: {},
        creativeCheck: {},
        satisfactionCheck: {},
        psychologicalSafety: {},
        teamfeedback: {},
        manipulationCheck: "",
        blacklistCheck: "",
        qFifteenCheck: {},
        qSixteenCheck: {},
        engagementFeedback: ""
      }
    };
  }

  socket.on("add user", () => {
    if (!userAcquisitionStage) {
      issueFinish(
        socket,
        runViaEmailOn
          ? "We don't need you to work at this specific moment, but we may have " +
              "tasks for you soon. Please await further instructions from scaledhumanity@gmail.com."
          : "We have enough users on this task. Hit the button below and you will be compensated appropriately " +
              "for your time. Thank you!"
      ); //PK: come back to this
      return;
    }
    if (users.byMturkId(socket.mturkId)) {
      console.log("ERR: ADDING A USER ALREADY IN USERS");
    }
    let newUser = makeUser(userPool.byMturkId(socket.mturkId));
    users.push(newUser);
    console.log(
      `${newUser.name} (${newUser.mturkId}) added to users.\nTotal users: ${
        users.length
      }`
    );
    //add friends for each user once the correct number of users is reached
    let numUsersRequired = extraRoundOn
      ? teamSize ** 2 + teamSize
      : teamSize ** 2;
    if (users.length === numUsersRequired) {
      // if the last user was just added
      console.log("USER POOL:\n" + userPool.map(u => u.mturkID));
      console.log("MTURK IDS: ");
      users.forEach(user => {
        //mutate the friend list of each user
        user.friends = users.map(u => {
          //create the alias through which each user sees every other user
          if (user.mturkId !== u.mturkId) {
            return {
              mturkId: u.mturkId,
              alias: tools.makeName().username,
              tAlias: tools.makeName().username
            };
          } else {
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
      users.forEach(u => {
        // console.log("People length:", people.length, ", People:", people)
        u.person = people.pop();
      });
      // assigns hasBanged to new users
      if (assignQualifications && runningLive) {
        const hasBangers = users.map(a => a.mturkId);
        hasBangers.forEach(u => mturk.assignQuals(u, mturk.quals.hasBanged));
      }
      // remove willBang qualification from people who rolled over
      // remove people who rolled over from willBang database
      if (usingWillBang) {
        const hasBangers = users.map(a => a.mturkId);
        hasBangers.forEach(u => {
          mturk.unassignQuals(
            u,
            mturk.quals.willBang,
            "This qualification is used to qualify a user to " +
              "participate in our HIT. We only allow one participation per user, so that is why we are " +
              "removing this qualification. Thank you!"
          );
          db.willBang.remove({ id: u }, { multi: true }, function(
            err,
            numRemoved
          ) {
            if (err) console.log("Error removing from db.willBang: ", err);
            else console.log(`${u} REMOVED FROM WILLBANG DB (${numRemoved})`);
          });
        });
      }
      if (notifyUs) {
        mturk.notifyWorkers(
          ["A19MTSLG2OYDLZ"],
          `Rolled ${currentCondition} on ${taskURL}`,
          `Rolled over with: ${currentCondition} on port ${port} at ${taskURL}.`
        );
      }
      userAcquisitionStage = false;
      mturk.startTask();
    }

    db.users.insert(newUser, err => {
      console.log(
        err ? `Didn't store user: ${err}` : `Added ${newUser.name} to DB.`
      );
    });
  });

  socket.on("update user pool", data => {
    if (!userPool.byMturkId(socket.mturkId)) {
      console.log(
        "***USER UNDEFINED*** in update user pool ..this would crash our thing but haha whatever"
      );
      console.log("SOCKET ID: " + socket.id);
      return;
    } //PK: quick fix
    if (!userPool.byMturkId(socket.mturkId).connected) {
      console.log("block ***USER NOT CONNECTED*** in update user pool");
      return;
    }
    userPool.byMturkId(socket.mturkId).timeLastActivity = data.time;
    updateUserPool();
  });

  socket.on("log", data => {
    console.log(data);
  });

  //Route messages
  socket.on("new message", function(message) {
    newMessage(message);
  });

  function newMessage(message) {
    useUser(socket, user => {
      if (!user.connected) {
        console.log("block ***USER NOT CONNECTED*** in new message");
        return;
      }
      let cleanMessage = message;
      users.forEach(u => {
        cleanMessage = aliasToID(u, cleanMessage);
      });

      db.chats.insert(
        {
          room: user.room,
          userID: socket.id,
          message: cleanMessage,
          time: getSecondsPassed(),
          batch: batchID,
          round: currentRound
        },
        err => {
          if (err) console.log("Error storing message:", err);
          else
            console.log(
              "Message in",
              user.room,
              "from",
              user.name + ":",
              cleanMessage
            );
        }
      );

      users
        .filter(f => f.room === user.room)
        .forEach(f => {
          socket.broadcast.to(f.mturkId).emit("new message", {
            username: idToAlias(f, String(socket.mturkId)),
            message: idToAlias(f, cleanMessage)
          });
        });
    });
  }

  //when the client emits 'new checkin', this listens and executes
  socket.on("new checkin", function(data) {
    useUser(socket, user => {
      user.results.checkin.push({
        round: currentRound,
        room: user.room,
        result: data
      });
      updateUserInDB(user, "results.checkin", user.results.checkin);
    });
  });

  socket.on("load bot qs", () => {
    ioEmitById(socket.mturkId, "chatbot", loadQuestions(botFile), socket);
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", function(reason) {
    // changes connected to false if disconnected user in userPool
    console.log(
      chalk.red(
        `[${new Date().toISOString()}]: Disconnecting socket: ${
          socket.id
        } because ${reason}`
      )
    );
    if (reason === "transport error") {
      //console.log(socket);
      console.log("TRANSPORT");
    }
    if (
      userPool.find(function(element) {
        return element.mturkId === socket.mturkId;
      })
    ) {
      userPool.byMturkId(socket.mturkId).connected = false;
      let usersActive = getPoolUsersActive();
      if (usersActive.length >= teamSize ** 2) {
        ioSocketsEmit("update number waiting", { num: 0 });
      } else {
        ioSocketsEmit("update number waiting", {
          num: teamSize ** 2 - usersActive.length
        });
      }
      if (userAcquisitionStage)
        mturk.setAssignmentsPending(getPoolUsersConnected().length);
      else mturk.setAssignmentsPending(getUsersConnected().length);
    }

    if (
      !users.find(function(element) {
        return element.mturkId === socket.mturkId;
      })
    )
      return;
    useUser(socket, user => {
      user.connected = false;
      user.ready = !suddenDeath;
      notEnoughUsers = false;

      // update DB with change
      updateUserInDB(user, "connected", false);
      console.log(socket.username + ": " + user.mturkId + " HAS LEFT");

      runReady();

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
      if (!experimentOver && suddenDeath && experimentStarted) {
        storeHIT();

        console.log("User left, emitting cancel to all users");

        if (!extraRoundOn || notEnoughUsers) {
          storeHIT();

          console.log("User left, emitting cancel to all users");
          let totalTime = getSecondsPassed();

          if (timeCheckOn) {
            db.time.insert({ totalTaskTime: totalTime }, (err, timeAdded) => {
              if (err)
                console.log(
                  "There's a problem adding total time to the DB: ",
                  err
                );
              else if (timeAdded) console.log("Total time added to the DB");
            });
          }

          users
            .filter(u => u.mturkId !== socket.mturkId)
            .forEach(u => {
              let cancelMessage =
                "<strong>Someone left the task.</strong><br> <br> \
            Unfortunately, our group task requires a specific number of users to run, \
            so once a user leaves, our task cannot proceed. <br><br> \
            To complete the task, please provide suggestions of ways to \
            prevent people leaving in future runs of the study. <br><br> \
            Since the team activity had already started, you will be additionally \
            bonused for the time spent working with the team.";
              if (experimentStarted) {
                // Add future bonus pay
                u.bonus = currentBonus();
                updateUserInDB(u, "bonus", u.bonus);
                storeHIT();
              }
              issueFinish(u, cancelMessage);
            });
        }
      }
      if (!suddenDeath && !userAcquisitionStage) {
        // sets users to ready when they disconnect
        user.ready = true;
      }
    });
  });

  socket.on("ready-to-all", () => {
    console.log(chalk.red.inverse("god is ready"));
    users
      .filter(user => !user.ready)
      .forEach(user =>
        ioEmitById(socket.mturkId, "echo", "ready", socket, user)
      );
  });

  socket.on("active-to-all", () => {
    console.log(chalk.red.inverse("god is active"));
    ioSocketsEmit("echo", "active");
  });

  socket.on("notify-more", () => {
    console.log(chalk.red.inverse("god wants more humans"));
    let HITId = mturk.returnCurrentHIT();
    // let HITId = process.argv[2];
    let subject =
      "We launched our new ad writing HIT. Join now, spaces are limited.";
    console.log(HITId);
    let URL = "";
    mturk.getHITURL(HITId, function(url) {
      URL = url;
      let message =
        "You’re invited to join our newly launched HIT on Mturk; there are limited spaces " +
        "and it will be closed to new participants in about 15 minutes!  Check out the HIT here: " +
        URL +
        " \n\nYou're receiving this message because you you indicated that you'd like to be notified of our " +
        "upcoming HIT during this time window. If you'd like to stop receiving notifications please email " +
        "your MTurk ID to: scaledhumanity@gmail.com";
      console.log("message to willBangers", message);
      if (!URL) {
        throw "URL not defined";
      }
      if (usingWillBang) {
        // Use this function to notify only x users <= 100
        let maxWorkersToNotify = 100; // cannot be more than 100 if non-recursive
        mturk.listUsersWithQualificationRecursively(
          mturk.quals.willBang,
          function(qualifiedWorkers) {
            let notifyList = getRandomSubarray(
              qualifiedWorkers,
              maxWorkersToNotify
            );
            mturk.notifyWorkers(notifyList, subject, message);
          }
        );
      }
    });
  });

  socket.on("active", () => {
    useUser(socket, user => {
      user.active = true;
      console.log("users active:", users.filter(u => u.active === true).length);
    });
  });

  socket.on("kill-all", killAll);

  function killAll() {
    console.log(chalk.red("Terminating all live clients."));
    users.forEach(() => updateUserInDB(socket, "bonus", currentBonus()));
    ioSocketsEmit("finished", {
      message:
        "We have had to cancel the rest of the task. Submit and you will be bonused for your time.",
      finishingCode: "kill-all",
      turkSubmitTo: "",
      assignmentId: "",
      crashed: false
    });
  }
  socket.on("next event", () => {
    useUser(socket, user => {
      let currentEvent = user.currentEvent;
      let eventSchedule = user.eventSchedule;
      console.log(
        "Event " +
          currentEvent +
          ": " +
          eventSchedule[currentEvent] +
          " | User: " +
          user.name
      );

      if (eventSchedule[currentEvent] === "starterSurvey") {
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "starterSurvey",
            questions: loadQuestions(starterSurveyFile),
            interstitial: false,
            showHeaderBar: false
          },
          socket,
          user
        );
        taskStartTime = getSecondsPassed();
      } else if (eventSchedule[currentEvent] === "ready") {
        if (checkinOn) {
          ioEmitById(
            socket.mturkId,
            "load",
            {
              element: "checkin",
              questions: loadQuestions(checkinFile),
              interstitial: true,
              showHeaderBar: true
            },
            socket,
            user
          );
        }
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "leave-hit",
            questions: loadQuestions(leaveHitFile),
            interstitial: true,
            showHeaderBar: true
          },
          socket,
          user
        );
        ioEmitById(socket.mturkId, "echo", "ready", socket, user);
      } else if (eventSchedule[currentEvent] === "midSurvey") {
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "midSurvey",
            questions: loadQuestions(midSurveyFile),
            interstitial: false,
            showHeaderBar: true
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "midSurveyStatus") {
        console.log("currentEvent === midSurveyStatus");

        let thisElement = "midSurveyStatusR" + currentRound.toString();

        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: thisElement,
            questions: loadQuestions(midSurveyStatusFile, user),
            interstitial: false,
            showHeaderBar: true
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "creativeSurvey") {
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "creativeSurvey",
            questions: loadQuestions(creativeSurveyFile),
            interstitial: false,
            showHeaderBar: true
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "satisfactionSurvey") {
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "satisfactionSurvey",
            questions: loadQuestions(satisfactionSurveyFile),
            interstitial: false,
            showHeaderBar: true
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "conflictSurvey") {
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "conflictSurvey",
            questions: loadQuestions(conflictSurveyFile),
            interstitial: false,
            showHeaderBar: true
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "psychologicalSafety") {
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "psychologicalSafety",
            questions: loadQuestions(psychologicalSafetyFile),
            interstitial: false,
            showHeaderBar: true
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "teamfeedbackSurvey") {
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "teamfeedbackSurvey",
            questions: loadQuestions(feedbackFile, user),
            interstitial: false,
            showHeaderBar: true
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "blacklistSurvey") {
        experimentOver = true;
        console.log({
          element: "blacklistSurvey",
          questions: loadQuestions(blacklistFile, user),
          interstitial: false,
          showHeaderBar: false
        });
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "blacklistSurvey",
            questions: loadQuestions(blacklistFile, user),
            interstitial: false,
            showHeaderBar: false
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "qFifteen") {
        experimentOver = true;
        ioEmitById(
          user.mturkId,
          "load",
          {
            element: "qFifteen",
            questions: loadQuestions(qFifteenFile, user),
            interstitial: false,
            showHeaderBar: false
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "qSixteen") {
        experimentOver = true;
        ioEmitById(
          user.mturkId,
          "load",
          {
            element: "qSixteen",
            questions: loadQuestions(qSixteenFile, user),
            interstitial: false,
            showHeaderBar: false
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "postSurvey") {
        //Launch post survey
        experimentOver = true;
        let survey = postSurveyGenerator(user);
        user.results.manipulation = survey.correctAnswer;
        updateUserInDB(user, "results.manipulation", user.results.manipulation);
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: "postSurvey",
            questions: loadQuestions(postSurveyFile, user),
            interstitial: false,
            showHeaderBar: false
          },
          socket,
          user
        );
      } else if (eventSchedule[currentEvent] === "demographicsSurvey") {
        experimentOver = true;
        ioEmitById(
          user.mturkId,
          "load",
          {
            element: "demographicsSurvey",
            questions: loadQuestions(demographicsSurveyFile, user),
            interstitial: false,
            showHeaderBar: false
          },
          socket,
          user
        );
      } else if (
        eventSchedule[currentEvent] === "finished" ||
        currentEvent > eventSchedule.length
      ) {
        if (!batchCompleteUpdated) {
          db.batch.update(
            { batchID: batchID },
            { $set: { batchComplete: true } },
            {},
            err =>
              console.log(
                err
                  ? "Err updating batch completion" + err
                  : "Marked batch " + batchID + " competed in DB"
              )
          );
          batchCompleteUpdated = true;
        }

        user.bonus = Number(mturk.bonusPrice);
        updateUserInDB(user, "bonus", user.bonus);

        storeHIT();

        usersFinished += 1;
        console.log(usersFinished, "users have finished.");
        if (notifyUs) {
          mturk.notifyWorkers(
            ["A19MTSLG2OYDLZ"],
            `Completed ${currentCondition} on ${taskURL}`,
            `Batch ${batchID} completed: ${currentCondition} on port ${port} at ${taskURL}.`
          );
        }
        ioEmitById(
          socket.mturkId,
          "finished",
          {
            message: "Thanks for participating, you're all done!",
            finishingCode: socket.id,
            turkSubmitTo: mturk.submitTo,
            assignmentId: user.assignmentId
          },
          socket,
          user
        );
      }
      user.currentEvent += 1;
    });
  });

  // Main experiment run
  socket.on("ready", runReady);

  function runReady() {
    useUser(socket, user => {
      user.ready = true;
      console.log(socket.username, "is ready");

      if (users.filter(u => !u.ready).length) {
        console.log(
          "some users not ready",
          users.filter(u => !u.ready).map(u => u.name)
        );
        return;
      }

      treatmentNow =
        currentCondition === "treatment" && currentRound === experimentRound;
      const conditionRound = conditions[currentCondition][currentRound] - 1;

      // Replaceing user with extraRound
      if (extraRoundOn && user.rooms.length === 1) {
        users.forEach(u => {
          if (
            tools.letters.slice(0, teamSize ** 2).includes(u.person) &&
            !u.connected
          ) {
            disconnectedsRoom = u.room;
            Object.entries(teams[0]).forEach(([roomName, room]) => {
              if (roomName === disconnectedsRoom) {
                replacingPersonName = room[teamSize];
              }
            });
            //u is the user who left
            //replacingPersonName is the v.person of some v in users who will replace u
            users
              .filter(v => v.person === replacingPersonName)
              .forEach(v => {
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
        badUsers = [];
        users.forEach(u => {
          if (u) {
            if (
              tools.letters
                .slice(teamSize ** 2, teamSize ** 2 + teamSize)
                .includes(u.person)
            ) {
              badUsers.push(u);
            }
          }
        });

        badUsers.forEach(u => {
          issueFinish(
            u,
            runViaEmailOn
              ? "Please click submit below and await further instructions " +
                  "from scaledhumanity@gmail.com."
              : "Thank you for participating in our task! Click the " +
                  "submit button below and you will be compensated at the promised rate for the time you " +
                  "have spent."
          );
          u.connected = false;
        });
      }

      Object.entries(teams[conditionRound]).forEach(([roomName, room]) => {
        users
          .filter(u => room.includes(u.person))
          .forEach(u => {
            u.room = roomName;
            u.rooms.push(roomName);
            updateUserInDB(u, "rooms", u.rooms);
            u.ready = false; //return users to unready state
            if (!suddenDeath && !u.connected) {
              u.ready = true;
            }
            console.log(u.name, "-> room", u.room);
          });
      });

      //Notify user 'initiate round' and send task.

      let currentProduct = products[currentRound];

      console.log("Current Product:", currentProduct);

      let taskText =
        "Design text advertisement for <strong><a href='" +
        currentProduct.url +
        "' target='_blank'>" +
        currentProduct.name +
        "</a></strong>!";

      experimentStarted = true;

      users.forEach(u => {
        if (autocompleteTestOn) {
          let teamNames = [
            tools.makeName().username,
            tools.makeName().username,
            tools.makeName().username,
            tools.makeName().username,
            tools.makeName().username
          ];
          console.log(teamNames);
          ioEmitById(
            u.mturkId,
            "initiate round",
            {
              task: taskText,
              team: teamNames,
              duration: roundMinutes,
              randomAnimal: tools.randomAnimal,
              round: currentRound + 1,
              runningLive: runningLive
            },
            socket,
            u
          ); //rounds are 0 indexed
        } else {
          let teamMates = u.friends.filter(friend => {
            return (
              users.byMturkId(friend.mturkId) &&
              users.byMturkId(friend.mturkId).connected &&
              users.byMturkId(friend.mturkId).room === u.room &&
              friend.mturkId !== u.mturkId
            );
          });
          // console.log(teamMates)
          let team_Aliases = tools.makeName(
            teamMates.length,
            u.friends_history
          );

          if (team_Aliases === false) {
            killAll();
            console.log(chalk.red.inverse("Friend list failure."));
          }

          user.friends_history = u.friends_history.concat(team_Aliases);
          for (i = 0; i < teamMates.length; i++) {
            if (treatmentNow) {
              teamMates[i].tAlias = team_Aliases[i].join("");
              team_Aliases[i] = team_Aliases[i].join("");
            } else {
              if (currentRound === 0) {
                //if first round, create aliases
                teamMates[i].alias = team_Aliases[i].join("");
                team_Aliases[i] = team_Aliases[i].join("");
              } else {
                //if not, use previously created aliases
                team_Aliases[i] = teamMates[i].alias;
              }
            }
          }

          team_Aliases.push(u.name); //now push user for autocomplete
          //let myteam = user.friends.filter(friend => { return (users.byID(friend.id).room == user.room)});
          // io.in(user.id).emit('initiate round', {task: taskText, team: user.friends.filter(friend =>
          // { return users.byID(friend.id).room == user.room }).map(friend => { return treatmentNow
          // ? friend.tAlias : friend.alias }), duration: roundMinutes })
          ioEmitById(
            u.mturkId,
            "initiate round",
            {
              task: taskText,
              team: team_Aliases,
              duration: roundMinutes,
              randomAnimal: tools.randomAnimal,
              round: currentRound + 1
            },
            socket,
            u
          ); //round 0 indexed
        }
      });

      console.log("Issued task for:", currentProduct.name);
      console.log(
        "Started round",
        currentRound,
        "with,",
        roundMinutes,
        "minute timer."
      );

      // save start time
      startTime = new Date().getTime();

      // Initialize steps
      const taskSteps = [
        {
          time: 0.001,
          message: `<strong>DO NOT REFRESH OR LEAVE THE PAGE! If you do, it may terminate the task for your team members and you will not be compensated.</strong>`
        },
        {
          time: 0.002,
          message: `You will receive the bonus pay at the stated hourly rate only if you<strong> fill out all survey questions and complete all rounds.</strong>`
        },
        {
          time: 0.003,
          message: `The entire HIT will take no more than ${Math.round(
            roundMinutes * numRounds + 15
          )} minutes total.`
        },
        { time: 0.005, message: `<strong>Task:</strong><br>${taskText}` },
        {
          time: 0.005,
          message: `<strong>Directions:</strong><br>1. Check out the link above and collaborate with your team members in the chat room to develop a text advertisement<br>2. The ad must be no more than <strong>30 characters long</strong>. <br>3. Instructions will be given for submitting the team's final product. <br>4. You have ${textifyTime(
            roundMinutes
          )} to complete this round. <br>5. Your final advertisement will appear online. <strong>The more successful it is, the larger the bonus each team member will receive.</strong>`
        },
        {
          time: 0.007,
          message: `<strong>Example:</strong><br>Text advertisements for 'Renaissance Golf Club': <br><ul style='list-style-type:disc'><li><strong>An empowering modern club</strong><br></li><li><strong>A private club with reach</strong><br></li><li><strong>Don't Wait. Discover Renaissance Today</strong></li></ul><br>`
        },
        {
          time: 0.01,
          message:
            "<br><strong>HIT bot: Take a minute to review all instructions above.</strong>"
        },
        {
          time: 0.15,
          message:
            "<br><strong>HIT bot: Say hello to your team members! Begin brainstorming ideas together.</strong>"
        },
        {
          time: 0.4,
          message:
            "<br><strong>HIT bot: As a team, discuss and narrow down your ideas. Collaborate to create the most compelling text ad.</strong>"
        },
        {
          time: 0.85,
          message:
            "<br><strong>HIT bot: Polish your team's favorite ad and get ready to submit.</strong>"
        },
        {
          time: 0.9,
          message:
            "<br><strong>HIT bot: Submit the team's final ad by sending a message with a '!' directly in front of the text ad. Only the final submission with a '!' will be counted.</strong>"
        },
        {
          time: 0.95,
          message: "<br><strong>HIT bot: Last chance to submit!</strong>"
        },
        {
          time: 0.96,
          message:
            "<br><strong>HIT bot: This round is ending soon. Time to say goodbye to your teammates!</strong>"
        }
      ];

      // Execute steps
      taskSteps.forEach(step => {
        setTimeout(() => {
          if (step.message) {
            console.log(chalk.inverse(" Task step "), step.message);
            ioSocketsEmit("message clients", step.message);
          }
          if (typeof step.action === "function") step.action();
        }, step.time * roundMinutes * 60 * 1000);
      });

      //Round warning
      // make timers run in serial
      setTimeout(() => {
        console.log("time warning", currentRound);
        users.forEach(user => {
          ioEmitById(
            user.mturkId,
            "timer",
            { time: roundMinutes * 0.2 },
            socket,
            user
          );
        });

        //Done with round
        setTimeout(() => {
          console.log("done with round", currentRound);
          users.forEach(user => {
            ioEmitById(
              user.mturkId,
              "stop",
              {
                round: currentRound,
                survey:
                  midSurveyOn ||
                  creativeSurveyOn ||
                  satisfactionSurveyOn ||
                  conflictSurveyOn ||
                  midSurveyStatusOn ||
                  teamfeedbackOn ||
                  psychologicalSafetyOn
              },
              socket,
              user
            );
          });
          currentRound += 1; // guard to only do this when a round is actually done.
          console.log(currentRound, "out of", numRounds);
        }, 1000 * 60 * 0.2 * roundMinutes);
      }, 1000 * 60 * 0.8 * roundMinutes);

      if (checkinOn) {
        let numPopups = 0;
        let interval = setInterval(() => {
          if (numPopups >= roundMinutes / checkinIntervalMinutes - 1) {
            clearInterval(interval);
          } else {
            socket.emit("checkin popup");
            numPopups++;
          }
        }, 1000 * 60 * checkinIntervalMinutes);
      }
    });
  }

  //if broken, tell users they're done and disconnect their socket
  socket.on("broken", () => {
    console.log("ON BROKEN CALLED");
    issueFinish(
      socket,
      runViaEmailOn
        ? "We've experienced an error. Please wait for an email from " +
            "scaledhumanity@gmail.com with restart instructions."
        : "The task has finished early. " +
            "You will be compensated by clicking submit below."
    );
  });

  socket.on("starterSurveySubmit", data => {
    useUser(socket, user => {
      user.results.starterCheck = responseToJSON(data);
      updateUserInDB(user, "results.starterCheck", user.results.starterCheck);
    });
  });

  socket.on("midSurveySubmit", data => {
    useUser(socket, user => {
      user.results.viabilityCheck[currentRound] = responseToJSON(data);
      updateUserInDB(
        user,
        "results.viabilityCheck",
        user.results.viabilityCheck
      );
    });
  });

  socket.on("midSurveyStatusSubmit", data => {
    useUser(socket, user => {
      user.results.statusCheck[currentRound] = responseToJSON(data);
      updateUserInDB(user, "results.statusCheck", user.results.statusCheck);
    });
  });

  socket.on("creativeSurveySubmit", data => {
    useUser(socket, user => {
      user.results.creativeCheck[currentRound] = responseToJSON(data);
      updateUserInDB(user, "results.creativeCheck", user.results.creativeCheck);
    });
  });

  socket.on("satisfactionSurveySubmit", data => {
    useUser(socket, user => {
      user.results.satisfactionCheck[currentRound] = responseToJSON(data);
      updateUserInDB(
        user,
        "results.satisfactionCheck",
        user.results.satisfactionCheck
      );
    });
  });

  socket.on("conflictSurveySubmit", data => {
    useUser(socket, user => {
      user.results.conflictCheck[currentRound] = responseToJSON(data);
      updateUserInDB(user, "results.conflictCheck", user.results.conflictCheck);
    });
  });
  socket.on("psychologicalSafetySubmit", data => {
    useUser(socket, user => {
      user.results.psychologicalSafety[currentRound] = responseToJSON(data);
      updateUserInDB(
        user,
        "results.psychologicalSafety",
        user.results.psychologicalSafety
      );
    });
  });

  socket.on("teamfeedbackSurveySubmit", data => {
    useUser(socket, user => {
      user.results.teamfeedback[currentRound] = responseToJSON(data);
      updateUserInDB(user, "results.teamfeedback", user.results.teamfeedback);
    });
  });

  socket.on("mturk_formSubmit", data => {
    useUser(socket, user => {
      user.results.engagementFeedback = responseToJSON(data);
      updateUserInDB(
        user,
        "results.engagementFeedback",
        user.results.engagementFeedback
      );
    });
  });

  socket.on("qFifteenSubmit", data => {
    useUser(socket, user => {
      user.results.qFifteenCheck = responseToJSON(data);
      updateUserInDB(user, "results.qFifteenCheck", user.results.qFifteenCheck);
    });
  });

  socket.on("qSixteenSubmit", data => {
    useUser(socket, user => {
      user.results.qSixteenCheck = responseToJSON(data);
      updateUserInDB(user, "results.qSixteenCheck", user.results.qSixteenCheck);
    });
  });

  socket.on("postSurveySubmit", data => {
    useUser(socket, user => {
      user.results.manipulationCheck = responseToJSON(data);
      updateUserInDB(
        user,
        "results.manipulationCheck",
        user.results.manipulationCheck
      );
    });
  });

  socket.on("demographicsSurveySubmit", data => {
    useUser(socket, user => {
      user.results.demographicsCheck = responseToJSON(data);
      updateUserInDB(
        user,
        "results.demographicsCheck",
        user.results.demographicsCheck
      );
    });
  });

  socket.on("blacklistSurveySubmit", data => {
    useUser(socket, user => {
      user.results.blacklistCheck = responseToJSON(data);
      updateUserInDB(
        user,
        "results.blacklistCheck",
        user.results.blacklistCheck
      );
    });
  });

  //loads qs in text file, returns json array
  function loadQuestions(questionFile, user = null) {
    const prefix = questionFile.substr(
      txt.length,
      questionFile.indexOf(".") - txt.length
    );

    let questions = [];
    let i = 0;
    fs.readFileSync(questionFile)
      .toString()
      .split("\n")
      .filter(n => n.length !== 0)
      .forEach(function(line) {
        let questionObj = {};
        i++;
        questionObj["name"] = prefix + i;

        //each question in the text file should be formatted: ANSWERTAG.QUESTION ex: YN.Are you part of Team Mark?
        questionObj["question"] = line.substr(
          line.indexOf("|") + 1,
          line.length
        );
        let answerTag = line.substr(0, line.indexOf("|"));
        if (answerTag === "S1") {
          // scale 1 radio
          answerObj = answers;
        } else if (answerTag === "S5") {
          // scale 5 radio
          answerObj = scale5;
        } else if (answerTag === "S5Q") {
          // scale 5 radio
          answerObj = scale5Q;
        } else if (answerTag === "S7") {
          // scale 7 radio
          answerObj = scale7;
        } else if (answerTag === "SFACE") {
          answerObj = face;
        } else if (answerTag === "YN1") {
          answerObj = YNAnswers;
        } else if (answerTag === "YN") {
          // yes no
          answerObj = binaryAnswers;
        } else if (answerTag === "D1") {
          answerObj = dem1;
        } else if (answerTag === "D2") {
          answerObj = dem2;
        } else if (answerTag === "D4") {
          answerObj = dem4;
        } else if (answerTag === "D6") {
          answerObj = dem6;
        } else if (answerTag === "YN15") {
          // yes no
          answerObj = binaryAnswers;
          teamIndex = [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0][i];
          if (teamIndex === 0) throw "YN15 answers reporting teams incorrectly";
          // else
          let team = getTeamMembers(user)[teamIndex - 1];
          questionObj["question"] += ` Team  ${teamIndex} (${team}).`;
        } else if (answerTag === "STAT") {
          // prepare status survey questions
          if (teamSize !== 4) throw "Not enough team members for survey format";

          let curTeams = getTeamMembersArray(user);
          let lastTeam = curTeams[curTeams.length - 1];

          // if members dropped, add N/A
          while (lastTeam.length < 4) {
            lastTeam.push({ name: "N/A", mturkId: "N/A" });
          }
          answerObj = scale7A;

          let curMember = (i - 2) % 5;
          questionObj["question"] =
            `${lastTeam[curMember]["name"]}` + questionObj["question"];

          // update user object with order of status survey team members at last survey question
          if (i === 20) {
            let newTeam = [
              lastTeam[0]["mturkId"],
              lastTeam[1]["mturkId"],
              lastTeam[2]["mturkId"],
              lastTeam[3]["mturkId"]
            ];
            user.results.statusTeams[currentRound] = newTeam;
            updateUserInDB(
              user,
              "results.statusTeams",
              user.results.statusTeams
            );
          }
        } else if (answerTag === "TR") {
          //team radio
          getTeamMembers(user).forEach((team, index) => {
            questionObj["question"] +=
              " Team " + (index + 1) + " (" + team + "),";
          });
          questionObj["question"] = questionObj["question"].slice(0, -1);
          answerObj = {
            answers: ["Team 1", "Team 2", "Team 3", "Team 4"],
            answerType: "radio",
            textValue: true
          };
        } else if (answerTag === "MTR") {
          //team checkbox
          getTeamMembers(user).forEach(function(team, index) {
            questionObj["question"] +=
              " Team " + (index + 1) + " (" + team + "),";
          });
          questionObj["question"] = questionObj["question"].slice(0, -1);
          answerObj = {
            answers: [
              "Team 1 and Team 2",
              "Team 2 and Team 3",
              "Team 3 and Team 4",
              "Team 1 and Team 3",
              "Team 1 and Team 4",
              "Team 2 and Team 4"
            ],
            answerType: "radio",
            textValue: true
          };
        } else if (answerTag === "LH") {
          //leave hit yn
          answerObj = leaveHitAnswers;
        } else if (answerTag === "TX") {
          answerObj = textAnswer;
        } else {
          //chatbot qs
          answerObj = {};
        }

        questionObj["answers"] = answerObj.answers;
        questionObj["answerType"] = answerObj.answerType;
        questionObj["textValue"] = answerObj.textValue;

        questionObj["required"] =
          requiredOn && answerObj.answerType === "radio";
        questions.push(questionObj);
      });
    return questions;
  }

  function issueFinish(socket, message, finishingCode = socket.id) {
    if (!socket) {
      console.log("Undefined user in issueFinish");
      return;
    }
    console.log(chalk.red("Issued finish to " + socket.mturkId));
    ioEmitById(
      socket.mturkId,
      "finished",
      { message: message, finishingCode: finishingCode, crashed: false },
      socket
    );
  }
});

// return subset of userPool
function getPoolUsersConnected() {
  return userPool.filter(user => user.connected);
}

function getPoolUsersActive() {
  return userPool.filter(user => user.active && user.connected);
}

// return subset of users
function getUsersConnected() {
  return users.filter(user => user.connected);
}

//replaces user.friend aliases with corresponding user IDs
function aliasToID(user, newString) {
  user.friends.forEach(friend => {
    let currentAlias = treatmentNow ? friend.tAlias : friend.alias;
    let aliasRegEx = new RegExp(currentAlias, "g");
    newString = newString.replace(aliasRegEx, friend.mturkId);
  });
  return newString;
}

//replaces other users IDs with user.friend alieses in string
function idToAlias(user, newString) {
  user.friends.forEach(friend => {
    let idRegEx = new RegExp(friend.mturkId, "g");
    let currentAlias = treatmentNow ? friend.tAlias : friend.alias;
    newString = newString.replace(idRegEx, currentAlias);
  });
  return newString;
}

//returns time since task began
function getSecondsPassed() {
  return (new Date().getTime() - startTime) / 1000;
}

function replicate(arr, times) {
  let al = arr.length,
    rl = al * times,
    res = new Array(rl);
  for (let i = 0; i < rl; i++) res[i] = arr[i % al];
  return res;
}

const getTeamMembers = user => {
  // Makes a list of teams this user has worked with
  const roomTeams = user.rooms.map((room, rIndex) => {
    return users.filter(user => {
      return user.rooms[rIndex] === room;
    });
  });

  // Makes a human friendly string for each team with things like 'you' for the current user,
  // commas and 'and' before the last name.
  return roomTeams.map((team, tIndex) =>
    team.reduce((total, current, pIndex, pArr) => {
      const friend = user.friends.find(
        friend => friend.mturkId === current.mturkId
      );
      let name =
        experimentRound === tIndex && currentCondition === "treatment"
          ? friend.tAlias
          : friend.alias;
      if (name === user.name) {
        name = "you";
      }
      return (
        name +
        (pIndex === 0 ? "" : pIndex + 1 === pArr.length ? " and " : ", ") +
        total
      );
    }, "")
  );
};

function getTeamMembersArray(user) {
  // Makes a list of teams this user has worked with
  const roomTeams = user.rooms.map((room, rIndex) => {
    return users.filter(
      user => user.rooms[rIndex] === room && user.connected === true
    );
  });

  // Makes a human friendly string for each team with things like 'you' for the current user,
  // commas and 'and' before the last name.
  return roomTeams.map((team, tIndex) =>
    team.reduce((total, current) => {
      const friend = user.friends.find(
        friend => friend.mturkId === current.mturkId
      );

      let name =
        experimentRound === tIndex && currentCondition === "treatment"
          ? friend.tAlias
          : friend.alias;
      if (name === user.name) {
        name = "you";
      }

      var newTeamMember = {};
      newTeamMember["name"] = name;
      newTeamMember["mturkId"] = friend.mturkId;

      return total.concat([newTeamMember]);
    }, [])
  );
}

//PK: delete this fxn and use the normal survey mechanism?
// This function generates a post survey for a user (listing out each team they were part of),
// and then provides the correct answer to check against.
function postSurveyGenerator(user) {
  const answers = getTeamMembers(user);
  // Makes a list of teams that are the correct answer, e.g., "Team 1 and Team 3"
  let correctAnswer = answers
    .map((team, index) => {
      if (conditions[currentCondition][index] === experimentRoundIndicator) {
        return "Team " + (index + 1);
      } else {
        return "";
      }
    })
    .filter(a => a.length !== 0);
  if (correctAnswer.length === 1) {
    correctAnswer = "none";
  } else {
    correctAnswer = correctAnswer.join(" and ");
  }
  console.log("Manipulation check:", answers, correctAnswer);
  return {
    question: "Select teams you think consisted of the same people.",
    name: "postsurvey",
    answers: answers,
    answerType: "checkbox",
    correctAnswer: correctAnswer
  };
}

function storeHIT(currentHIT = mturk.returnCurrentHIT()) {
  db.ourHITs.insert({ HITId: currentHIT, batch: batchID }, (err, HITAdded) => {
    if (err) console.log("There's a problem adding HIT to the DB: ", err);
    else if (HITAdded) console.log("HIT added to the DB: ", currentHIT);
  });
}

// parses results from surveys to proper format for JSON file
function responseToJSON(rawResposne) {
  let JSONResponse = {};
  rawResposne.split("&").forEach(responsePair => {
    let response = responsePair.split("=");
    index = response[0].split("-q");
    JSONResponse[index[1]] = response[1] ? decode(response[1]) : "";
  });
  return JSONResponse;
}

function decode(encoded) {
  return unescape(encoded.replace(/\+/g, " "));
}

const logTime = () => {
  let timeNow = new Date(Date.now());
  // console.log("This is as of " +  (Date.now()-batchID)/1000 +
  // " seconds since starting the experiment. Printed at", timeNow.getHours()+":"
  // +timeNow.getMinutes()+":"+timeNow.getSeconds()+".")
  console.log(
    "This is as of " +
      (Date.now() - batchID) / 1000 +
      " seconds since starting the experiment. Printed at",
    timeNow.toString()
  );
};

function getRandomSubarray(arr, size) {
  return shuffle(arr).slice(0, size);
}

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

function textifyTime(duration) {
  let durationString = "";
  if (duration < 1) {
    durationString = Math.round(duration * 60) + " seconds";
  } else if (duration === 1) {
    durationString = "one minute";
  } else {
    durationString = duration + " minutes";
  }
  return durationString;
}
