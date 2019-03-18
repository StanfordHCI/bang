//Setting up utilities
import * as dotenv from "dotenv";
dotenv.config();
import * as yargs from "yargs";
let args = yargs.argv;
import chalk from "chalk";
import * as fs from "fs";

//importing our libraries
let tools = require("./tools");
let mturk = require("./mturkTools");

// Initializing variables
const runningLocal = process.env.RUNNING_LOCAL === "TRUE";
const runningLive = process.env.RUNNING_LIVE === "TRUE";
const teamSize = parseInt(process.env.TEAM_SIZE);
const roundMinutes = parseFloat(process.env.ROUND_MINUTES);
const taskURL = new URL(String(args.url || process.env.TASK_URL));

const runExperimentNow = true;
const runViaEmailOn = false;
const cleanHITs = false;
const issueBonusesNow = runningLive;
const notifyWorkersOn = runningLive;
const usingWillBang = runningLive;
const aggressiveNotifyOn = runningLive;
const notifyUs = runningLive;
const notifyUsMturkID = "A19MTSLG2OYDLZ";
const assignQualifications = runningLive;

//Randomization
const randomCondition = false;
const randomRoundOrder = true;
const randomTaskOrder = true;

const suddenDeath = false;
const waitChatOn = false; //MAKE SURE THIS IS THE SAME IN CLIENT
const extraRoundOn = false; //Only set to true if teamSize = 4, Requires waitChatOn = true.
const psychologicalSafetyOn = false;
const starterSurveyOn = false;
const midSurveyOn = runningLive;
const blacklistOn = false;
const teamfeedbackOn = false;
const checkinOn = false;
// how long each task is taking
const requiredOn = runningLive;
const checkinIntervalMinutes = roundMinutes / 3;
const qFifteenOn = true;
const qSixteenOn = true;

//Testing toggles
const debugMode = !runningLive;
const autocompleteTestOn = false; //turns on fake team to test autocomplete

//Waitchat settings
const waitChatParms = {
  minTime: 20, //seconds
  lastActivity: 59, //seconds
  maxTime: 1200, //seconds
  maxInactivity: 200 //seconds
};

//Launch reporting
console.log(
  runningLive
    ? chalk.red.inverse("\n RUNNING LIVE ")
    : chalk.green.inverse("\n RUNNING SANDBOXED ")
);
console.log(runningLocal ? "Running locally" : "Running remotely");

const batchID = Date.now();
console.log("Launching batch", batchID);

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
const binaryAnswers = {
  answers: ["Keep this team", "Do not keep this team"],
  answerType: "radio",
  textValue: true
};
const leaveHitAnswers = {
  answers: ["End Task and Send Feedback", "Return to Task"],
  answerType: "radio",
  textValue: false
};

// Setup basic express server
import * as express from "express";
import * as bodyParser from "body-parser";
const app = express();
const server = require("http").createServer(app);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const io = require("socket.io")(server); //, {transports: ['websocket']}
// MEW: args.port does returns unknown, so it must be coerced into string, then int.
const port = parseInt(String(args.port || process.env.PORT || 3000));
server.listen(port, () => {
  console.log(`Server listening at ${taskURL.hostname}:${port}.`);
});

function authenticate(user) {
  return user.workerId == notifyUsMturkID;
  // if user in db, is it for this session?
  // if user not in db, is the session full?
}

app.use((req, res, next) => {
  if (!req.query.workerId) {
    next();
  } else if (authenticate(req.query)) {
    next();
  } else {
    res.redirect("/leave");
  }
});

app.get("/admin", (_req, res) => {
  res.redirect("/god.html");
});

app.get("/test", (_req, res) => {
  let assignmentId = String(Date.now() ** 2);
  let workerId = String(Date.now());
  let hitId = String(Date.now() / 5);
  let submitTo = "https%3A%2F%2Fworkersandbox.mturk.com";
  res.redirect(
    `/?assignmentId=${assignmentId}&hitId=${hitId}&workerId=${workerId}&turkSubmitTo=${submitTo}`
  );
});

app.get("/leave", (_req, res) => {
  res.send(
    "Thanks for trying our task. You can't participate at this time. Please return the HIT."
  );
});

//starting sequence
//onboard user - check identity, move to position if needed, show IRB if needed
//waitchat - put user in chat context, store answers
//group task sequence
//group task - realtime interaction, incremental messages
//follow up surveys
//closing sequence
//closing surveys

declare global {
  interface Array<T> {
    find(predicate: (search: T) => boolean): T;
  }
}

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError("Array.prototype.find called on null or undefined");
    }
    if (typeof predicate !== "function") {
      throw new TypeError("predicate must be a function");
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;
    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

function userByMturkId(users, MturkId) {
  return users.find(user => user.mturkId === MturkId);
}

function ioSocketsEmit(event, message) {
  if (debugMode) {
    console.log(event, message);
  }
  return io.sockets.emit(event, message);
}

function ioEmitById(socketId, event, message, socket, user) {
  if (debugMode) {
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
  let user = userByMturkId(users, socket.mturkId);
  if (typeof user !== "undefined" && typeof callback === "function") {
    callback(user);
  } else {
    console.log(chalk.red(err), socket.id, "\n");
    if (debugMode) {
      console.trace();
    }
  }
}

// Check balance
mturk.getBalance(balance => {
  if (runningLive && balance <= 400) {
    mturk.notifyWorkers(
      [notifyUsMturkID],
      `ADD MORE FUNDS to MTURK! We have only $${balance}.`
    );
    console.log(chalk.red.inverse.bold("\n!!! BROKE !!!\n"));
  }
});

// Save debug logs for later review
import util = require("util");
const trueLog = console.log;
const debugDir = "debug/";

if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir);
}

let log_file = `${debugDir}debug ${Date.now()}.log`;
console.log = function(...msg) {
  msg.unshift(`[${new Date().toISOString()}]`);
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
      return trueLog(err);
    }
  });
};

// Experiment variables
const conditionOptions = ["control", "treatment"];
const currentCondition =
  args.condition || randomCondition
    ? tools.chooseOne(conditionOptions)
    : "control";
const roundOrderOptions = [[1, 2, 1, 3], [1, 2, 3, 1], [2, 1, 3, 1]];
const roundOrdering = randomRoundOrder
  ? tools.chooseOne(roundOrderOptions)
  : roundOrderOptions[0];

//MEW: State variables for a given run are currently stored like this:
let treatmentNow = false;
let firstRun = false;
let hasAddedUsers = false; //lock on adding users to db/experiment for experiment
let batchCompleteUpdated = false;

const experimentRoundIndicator = 1; //This record what round of the roundOrdering is the experimental round.
const experimentRound = roundOrdering.lastIndexOf(experimentRoundIndicator); //assumes that the manipulation is always the last instance of team 1's interaction.
console.log(currentCondition, "with", roundOrdering);
const numRounds = roundOrdering.length;

const people = extraRoundOn
  ? tools.letters.slice(0, teamSize ** 2 + teamSize)
  : tools.letters.slice(0, teamSize ** 2);
const teams = tools.createTeams(teamSize, numRounds - 1, people, extraRoundOn); //added '-1' to numRounds
//}

// Setting up the databases
import Datastore = require("nedb");
const db = {
  users: new Datastore({
    filename: ".data/users",
    autoload: true,
    timestampData: true
  }),
  chats: new Datastore({
    filename: ".data/chats",
    autoload: true,
    timestampData: true
  }),
  batch: new Datastore({
    filename: ".data/batch",
    autoload: true,
    timestampData: true
  }),
  time: new Datastore({
    filename: ".data/time",
    autoload: true,
    timestampData: true
  }),
  ourHITs: new Datastore({
    filename: ".data/ourHITs",
    autoload: true,
    timestampData: true
  }),
  willBang: new Datastore({
    filename: ".data/willBang",
    autoload: true,
    timestampData: true
  }),
  allUsers: new Datastore({
    filename: ".data/allUsers",
    autoload: true,
    timestampData: true
  })
};

function updateUserInDB(user, field, value) {
  db.users.update(
    { mturkId: user.mturkId, batch: batchID },
    { $set: { [field]: value } },
    {},
    err => {
      return console.log(
        err
          ? chalk.red("Err recording ") + field + ": " + err
          : "Updated " +
              field +
              " for " +
              user.mturkId +
              " " +
              JSON.stringify(value, null, 2)
      );
    }
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
            "Number of users with qualification hasBanged:",
            data.length
          );
        }
      );
    }
    if (notifyWorkersOn && runningLive) {
      mturk.listUsersWithQualificationRecursively(
        mturk.quals.willBang,
        data => {
          console.log(
            "Number of users with qualification willBang:",
            data.length
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
  mturk.launchBang(function(HIT) {
    logTime();
    storeHIT(HIT.HITId);
    // Notify workers that a HIT has started if we're doing recruiting by email
    if (notifyWorkersOn) {
      // let HITId = process.argv[2];
      let subject =
        "We launched our new ad writing HIT. Join now, spaces are limited.";
      console.log(HIT);
      let URL = "";
      mturk.getHITURL(HIT.HITId, function(url) {
        URL = url;
        let message =
          "You’re invited to join our newly launched HIT on Mturk; there are limited spaces and " +
          "it will be closed to new participants in about 15 minutes!  Check out the HIT here: " +
          URL +
          " \n\nYou're receiving this message because you indicated that you'd like to be notified of our" +
          " upcoming HIT during this time window. If you'd like to stop receiving notifications please " +
          "email your MTurk ID to: scaledhumanity@gmail.com";
        console.log("message to willBangers", message);
        if (!URL) {
          throw "URL not defined";
        }
        if (usingWillBang) {
          // removes people who no longer have willBang qual from db.willBang
          db.willBang.find({}, (err, willBangers) => {
            if (err) {
              console.log("ERROR cleaning willBang db: " + err);
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
                          if (err)
                            console.log(
                              "Error removing from willBang db: " + err
                            );
                          else
                            console.log(
                              willBangID +
                                " REMOVED FROM WILLBANG DB (" +
                                numRemoved +
                                ")"
                            );
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
          let currenttimePeriod = "";
          let currentHour = new Date(Date.now()).getHours();
          if (13 <= currentHour && currentHour <= 15) {
            currenttimePeriod = "morning";
          } else if (16 <= currentHour && currentHour <= 18) {
            currenttimePeriod = "midday";
          } else if (19 <= currentHour && currentHour <= 21) {
            currenttimePeriod = "afternoon";
          } else if (
            (22 <= currentHour && currentHour <= 23) ||
            currentHour === 0
          ) {
            currenttimePeriod = "evening";
          } else if (1 <= currentHour && currentHour <= 3) {
            currenttimePeriod = "late evening";
          } else {
            currenttimePeriod = "no bucket";
          }
          if (currenttimePeriod === "no bucket") {
            // randomize list
            mturk.listUsersWithQualificationRecursively(
              mturk.quals.willBang,
              function(data) {
                let notifyList = getRandomSubarray(data, maxWorkersToNotify);
                mturk.notifyWorkers(notifyList, subject, message);
                console.log("Notified", notifyList.length, "workers");
              }
            );
          } else {
            // use the time buckets
            console.log("Current Time Period: " + currenttimePeriod);
            db.willBang.find(
              { timePreference: currenttimePeriod },
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

const taskStepDefaults = [
  {
    time: 0.1,
    message:
      "<strong>Step 1. List out ideas you like. Shoot for around 3 per person.</strong>"
  },
  {
    time: 0.4,
    message:
      "<strong>Step 2. As a group choose 3 favorite ideas and discuss why you like them.</strong>"
  },
  {
    time: 0.7,
    message:
      "<strong>Step 3. Can you all choose one favorite idea? If not, can you convince others your favorite idea is the best?</strong>"
  }
];

const taskSet = [
  {
    name: "Thé-tis Tea : Plant-based seaweed tea, rich in minerals",
    steps: taskStepDefaults,
    url:
      "https://www.kickstarter.com/projects/1636469325/the-tis-tea-plant-based-high-rich-minerals-in-seaw"
  },
  {
    name: "LetB Color - take a look at time in different ways",
    steps: taskStepDefaults,
    url:
      "https://www.kickstarter.com/projects/letbco/letb-color-take-a-look-at-time-in-different-ways"
  },
  {
    name: "FLECTR 360 OMNI – cycling at night with full 360° visibility",
    steps: taskStepDefaults,
    url: "https://www.kickstarter.com/projects/outsider-team/flectr-360-omni"
  },
  {
    name: "The Ollie Chair: Shape-Shifting Seating",
    steps: taskStepDefaults,
    url:
      "https://www.kickstarter.com/projects/144629748/the-ollie-chair-shape-shifting-seating"
  }
];

const tasks = randomTaskOrder ? shuffle(taskSet) : taskSet;

let users = []; //the main local user storage
let userPool = []; //accumulates users pre-experiment
let waitchatStart = 0;
let currentRound = 0;
let startTime = 0;
let userAcquisitionStage = true;
let experimentOver = false;
let usersFinished = 0;

// keeping track of time
let taskStartTime = getSecondsPassed(); // reset for each start of new task
let taskEndTime = 0;
let taskTime = 0;

// Load task file and create schedule
const taskFile = String(args.task || process.env.TASK_FILE);
const taskJSON = JSON.parse(fs.readFileSync(taskFile, "utf8"));
console.log(
  `Tasks loaded from: ${chalk.green.inverse(taskFile)}:
	${JSON.stringify(taskJSON, null, 2)}`
);
let eventSchedule = [];
taskJSON.forEach(task => {
  if (typeof task === "string") eventSchedule.push(task);
  else
    eventSchedule = eventSchedule.concat(replicate(task.subTasks, task.times));
});
eventSchedule.push("finished");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Disconnect leftover users
Object.keys(io.sockets.sockets).forEach(socketID => {
  console.log(socketID);
  if (userPool.every(user => user.id !== socketID)) {
    console.log("Removing dead socket: " + socketID);
    console.log("SOCKET DISCONNECT IN LEFTOVER USER");
    io.in(socketID).emit("get IDs", "broken");
    // io.in(socketID).disconnect(true)
  }
});

// Adds Batch data for this experiment. unique batchID based on time/date
db.batch.insert(
  {
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
    condition: currentCondition,
    format: roundOrdering,
    experimentRound: experimentRound,
    numRounds: numRounds,
    tasks: tasks,
    taskJSON: taskJSON,
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
);

io.on("connection", socket => {
  let experimentStarted = false;

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
    // Laura: tracking all visited users
    db.allUsers.insert({ workerId: mturkId }, (err) => {
      if (err) console.log('Err adding ' + mturkId + ' to allUsers DB:', err);
      else console.log('Added ' + mturkId + ' to allUsers DB.');
    });
    socket.mturkId = mturkId;
    socket.assignmentId = assignmentId;
    socket.join(mturkId);
    if (userByMturkId(users, mturkId)) {
      console.log(chalk.blue("Reconnected " + mturkId + " in users"));
      let user = userByMturkId(users, mturkId);
      user.connected = true;
      user.assignmentId = assignmentId;
      user.id = socket.id;
      user.turkSubmitTo = data.turkSubmitTo;
      mturk.setAssignmentsPending(getUsersConnected().length);
    }
    if (userByMturkId(userPool, mturkId)) {
      let user = userByMturkId(userPool, mturkId);
      console.log(
        chalk.blue(
          "RECONNECTED " +
            mturkId +
            " in user pool (" +
            user.id +
            " => " +
            socket.id +
            ")"
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
        "SOCKET: " +
          socket.id +
          " | MTURK ID: " +
          socket.mturkId +
          " | NAME: " +
          socket.username +
          "| ASSIGNMENT ID: " +
          socket.assignmentId
      )
    );
  });

  socket.on("heartbeat", _data => {
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
    if (userByMturkId(userPool, data.mturkId)) {
      //if it's a reconnected user
      let user = userByMturkId(userPool, data.mturkId);
      console.log(
        data.mturkId +
          " REJOINED USER POOL (" +
          user.id +
          " => " +
          socket.id +
          ")"
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
    // debugLog(userPool, "users accepted currently: " + userPool.length)

    Object.keys(io.sockets.sockets).forEach(socketID => {
      if (
        userPool.every(user => {
          return user.id !== socketID;
        })
      ) {
        console.log("Removing dead socket: " + socketID);
        io.in(socketID).emit("get IDs", "broken");
      }
    });
    logTime();
    console.log(
      "Sockets active: " + Object.keys(io.sockets.sockets) + " of " + teamSize
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
        user.active =
          secondsSince(user.timeAdded) > waitChatParms.minTime &&
          secondsSince(user.timeLastActivity) < waitChatParms.lastActivity;
        let numUsersWanted = extraRoundOn
          ? teamSize ** 2 + teamSize
          : teamSize ** 2;
        let weightedHoldingSeconds =
          waitChatParms.maxTime +
          0.33 *
            (waitChatParms.maxTime /
              (numUsersWanted - getPoolUsersActive().length)); // PK: make isUserInactive fxn
        if (
          !user.removed &&
          (secondsSince(user.timeAdded) > weightedHoldingSeconds ||
            secondsSince(user.timeLastActivity) > waitChatParms.maxInactivity)
        ) {
          user.removed = true;
          console.log("removing user because of inactivity:", user.id);
          io.in(user.mturkId).emit("get IDs", "broken");
        }
      });
    }

    if (waitChatOn) updateUsersActive();
    const usersActive = getPoolUsersActive();
    console.log("Users active: " + usersActive.length);
    console.log("Users connected: " + getPoolUsersConnected().length);
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
            // io.in(user.mturkId).emit("echo", "add user");
            // io.in(user.mturkId).emit('initiate experiment');
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
          .filter(user => !userByMturkId(usersActive, user.mturkId))
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
        if (secondsSince(waitchatStart) / 60 >= waitChatParms.maxTime / 60) {
          console.log(chalk.red("Waitchat time limit reached"));
          userAcquisitionStage = false;
          io.in(socket.mturkId).emit("echo", "kill-all");
        }
      }
    } else {
      // waitchat off
      if (usersActive.length >= numUsersWanted) {
        // io.sockets.emit('update number waiting', {num: 0});
        ioSocketsEmit("update number waiting", { num: 0 });
        console.log(
          "there are " + usersActive.length + " users: " + usersActive
        );
        for (let i = 0; i < usersActive.length; i++) {
          io.in(usersActive[i].mturkId).emit("show chat link");
        }
      } else {
        // io.sockets.emit('update number waiting', {num: teamSize ** 2 - usersActive.length});
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
      bonus: mturk.bonusPrice,
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
        format: roundOrdering,
        manipulation: {},
        checkin: {},
        starterCheck: {},
        viabilityCheck: {},
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

  socket.on("add user", _data => {
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
    if (userByMturkId(users, socket.mturkId)) {
      console.log("ERR: ADDING A USER ALREADY IN USERS");
    }
    let newUser = makeUser(userByMturkId(userPool, socket.mturkId));
    users.push(newUser);
    console.log(
      newUser.name +
        " (" +
        newUser.mturkId +
        ") added to users.\n" +
        "Total users: " +
        users.length
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
            `This qualification is used to qualify a user to participate in our HIT. We only allow one participation per user, so that is why we are removing this qualification. Thank you!`
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
          [notifyUsMturkID],
          `Rolled ${currentCondition} on ${taskURL.hostname}`,
          `Rolled over with: ${currentCondition} on port ${port} at ${
            taskURL.hostname
          }.`
        );
      }
      userAcquisitionStage = false;
      mturk.startTask();
    }

    db.users.insert(newUser, (err, _usersAdded) => {
      console.log(err ? `users DB error: ${err}` : `Stored ${newUser.name}`);
    });

    //PK: need to emit login to each? or can we delete login fxn in client if no longer in use (login sets
    // connected to true, is this needed?)
    //io.in(user.id).emit('login', {numUsers: numUsers(user.room)})
  });

  socket.on("update user pool", data => {
    if (!userByMturkId(userPool, socket.mturkId)) {
      console.log(
        "***USER UNDEFINED*** in update user pool ..this would crash our thing but haha whatever"
      );
      console.log("SOCKET ID: " + socket.id);
      return;
    } //PK: quick fix
    if (!userByMturkId(userPool, socket.mturkId).connected) {
      console.log("block ***USER NOT CONNECTED*** in update user pool");
      return;
    }
    userByMturkId(userPool, socket.mturkId).timeLastActivity = data.time;
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
        (err, _chatsAdded) => {
          if (err) console.log("Error storing message:", err);
          else
            console.log(`${user.room}: ${user.mturkId} says: ${cleanMessage}`);
        }
      );
      users
        .filter(f => f.room === user.room)
        .forEach(f => {
          socket.broadcast.to(f.mturkId).emit("new message", {
            // TODO
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
    useUser(socket, user => {
      console.log(chalk.inverse.red("Loading bot questions"));
      ioEmitById(
        socket.mturkId,
        "chatbot",
        loadQuestions("botquestions"),
        socket,
        user
      );
    });
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", function(reason) {
    // changes connected to false if disconnected user in userPool
    console.log(
      chalk.red(`Disconnecting socket: ${socket.id} because ${reason}`)
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
      userByMturkId(userPool, socket.mturkId).connected = false;
      let usersActive = getPoolUsersActive();
      if (usersActive.length >= teamSize ** 2) {
        ioSocketsEmit("update number waiting", { num: 0 });
        // io.sockets.emit('update number waiting', {num: 0});
      } else {
        ioSocketsEmit("update number waiting", {
          num: teamSize ** 2 - usersActive.length
        });
        // io.sockets.emit('update number waiting', {num: (teamSize ** 2) - usersActive.length});
      }
      if (userAcquisitionStage)
        mturk.setAssignmentsPending(getPoolUsersConnected().length);
      else mturk.setAssignmentsPending(getUsersConnected().length);
    }

    // if (!users.every(user => socket.id !== user.id)) {//socket id is found in users
    //newMessage('has left the chatroom')

    if (!users.find(i => i.mturkId === socket.mturkId)) return;
    useUser(socket, user => {
      user.connected = false;
      user.ready = !suddenDeath;
      let notEnoughUsers = false;

      // update DB with change
      updateUserInDB(user, "connected", false);
      console.log(`${socket.username}: ${user.mturkId} HAS LEFT`);
      // if (!experimentOver && !debugMode) {
      //     mturk.notifyWorkers([user.mturkId], "You've disconnected from our HIT", "You've disconnected from our" +
      //         " HIT. If you are unaware of why you have been disconnected, please email scaledhumanity@gmail.com"
      //         + " with your Mturk ID and the last things you did in the HIT.\n\nMturk ID: " + user.mturkId +
      //         "\nAssignment ID: " + user.assignmentId + '\nHIT ID: ' + mturk.returnCurrentHIT())
      // }
      if (!experimentOver && !suddenDeath) {
        // console.log("Sudden death is off, so we will not cancel the run")
      }

      console.log(`Connected users: ${getUsersConnected().length}`);
      //if things don't work look at this part of the code?
      if (!experimentOver && suddenDeath && experimentStarted) {
        storeHIT();

        console.log("User left, emitting cancel to all users");

        if (!extraRoundOn || notEnoughUsers) {
          storeHIT();

          console.log("User left, emitting cancel to all users");
          let totalTime = getSecondsPassed();

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
              issueFinish(u, cancelMessage, true);
            });
        }
      }
      if (!suddenDeath && !userAcquisitionStage) {
        // sets users to ready when they disconnect
        user.ready = true; // TODO: remove user from users
      }
    });
  });

  socket.on("ready-to-all", _data => {
    console.log(chalk.red("god is ready"));
    users
      .filter(user => !user.ready)
      .forEach(
        user => ioEmitById(socket.mturkId, "echo", "ready", socket, user)
        // io.in(socket.mturkId).emit('echo', 'ready')
      );
    //io.sockets.emit('echo','ready')
  });

  socket.on("active-to-all", _data => {
    console.log(chalk.red("god is active"));
    ioSocketsEmit("echo", "active");
    // io.sockets.emit('echo', 'active');
  });

  socket.on("notify-more", _data => {
    console.log(chalk.red("god wants more humans"));
    let HITId = mturk.returnCurrentHIT();
    // let HITId = process.argv[2];
    let subject =
      "We launched our new ad writing HIT. Join now, spaces are limited.";
    console.log(HITId);
    let URL = "";
    mturk.getHITURL(HITId, function(url) {
      URL = url;
      let message = `You’re invited to join our newly launched HIT on Mturk; there are limited spaces and it will be closed to new participants in about 15 minutes! Check out the HIT here: ${URL}\n\nYou're receiving this message because you you indicated that you'd like to be notified of our upcoming HIT during this time window. If you'd like to stop receiving notifications please email your MTurk ID to: scaledhumanity@gmail.com`;
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

  socket.on("active", _data => {
    useUser(socket, user => {
      user.active = true;
      console.log("users active:", users.filter(u => u.active === true).length);
    });
  });

  socket.on("kill-all", _data => {
    console.log(chalk.red("god is angry"));
    users.forEach(() => updateUserInDB(socket, "bonus", currentBonus()));
    ioSocketsEmit("finished", {
      message: `We have had to cancel the rest of the task. Submit and you will be bonused for your time.`,
      finishingCode: "kill-all",
      turkSubmitTo: "",
      assignmentId: "",
      crashed: false
    });
  });

  socket.on("next event", _data => {
    useUser(socket, user => {
      function loadActivity(
        event: string,
        headerOn = true,
        interstitialOn = false
      ) {
        console.log(user, socket.mturkID);
        ioEmitById(
          socket.mturkId,
          "load",
          {
            element: event,
            questions: loadQuestions(event, user),
            interstitial: interstitialOn,
            showHeaderBar: headerOn
          },
          socket,
          user
        );
      }

      user["currentActivity"] = user.eventSchedule[user.currentEvent];
      console.log(
        `Event ${user.currentEvent} of ${user.eventSchedule.length}: ${
          user.currentActivity
        }`
      );

      if (user.currentActivity === "starterSurvey") {
        loadActivity(user.currentActivity);
      } else if (user.currentActivity === "ready") {
        if (checkinOn) loadActivity("checkin", true, true);
        loadActivity("leave-hit", true, true);
        ioEmitById(socket.mturkId, "echo", "ready", socket, user);
      } else if (
        [
          "blacklistSurvey",
          "qFifteen",
          "qSixteen",
          "manipulationCheck"
        ].includes(user.currentActivity)
      ) {
        experimentOver = true;
        loadActivity(user.currentActivity, false, false);
      } else if (
        user.currentActivity === "finished" ||
        user.currentEvent > user.eventSchedule.length
      ) {
        if (!batchCompleteUpdated) {
          db.batch.update(
            { batchID: batchID },
            { $set: { batchComplete: true } },
            {},
            err =>
              console.log(
                err
                  ? `Err updating batch completion: ${err}`
                  : `Marked batch ${batchID} competed in DB`
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
            [notifyUsMturkID],
            `Completed ${currentCondition} on ${taskURL.hostname}`,
            `${batchID} completed ${currentCondition} at ${taskURL.hostname}.`
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
      } else loadActivity(user.currentActivity);
      user.currentEvent += 1;
    });
  });

  // Main experiment run
  socket.on("ready", function(_data) {
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

      //can we move this into its own on.*** call //PK: still relevant?
      console.log("all users ready -> starting experiment");

      treatmentNow =
        currentCondition === "treatment" && currentRound === experimentRound;
      const conditionRound = roundOrdering[currentRound] - 1;

      // secondReadyIndex = eventSchedule.indexOf("ready", eventSchedule.indexOf("ready") + 1)

      console.log("user.rooms.length:", user.rooms.length);

      // Replaceing user with extraRound
      if (extraRoundOn && user.rooms.length === 1) {
        let replacingPersonName = "";
        users.forEach(u => {
          if (
            tools.letters.slice(0, teamSize ** 2).includes(u.person) &&
            !u.connected
          ) {
            let disconnectedsRoom = u.room;
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
        let badUsers = [];
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

      Object.entries(teams[conditionRound]).forEach(
        ([roomName, room]: [string, string]) => {
          users
            .filter(u => {
              room.includes(u.person);
            })
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
        }
      );

      //Notify user 'initiate round' and send task.

      let currentTask = tasks[currentRound];

      console.log("Current Product:", currentTask);

      let taskText =
        "Design text advertisement for <strong><a href='" +
        currentTask.url +
        "' target='_blank'>" +
        currentTask.name +
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
              userByMturkId(users, friend.mturkId) &&
              userByMturkId(users, friend.mturkId).connected &&
              userByMturkId(users, friend.mturkId).room === u.room &&
              friend.mturkId !== u.mturkId
            );
          });
          let team_Aliases = tools.makeName(
            teamMates.length,
            u.friends_history
          );
          user.friends_history = u.friends_history.concat(team_Aliases);
          let i = 0;
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

      console.log("Issued task for:", currentTask.name);
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
      const taskSteps = currentTask.steps;

      // Execute steps
      taskSteps.forEach(step => {
        setTimeout(() => {
          if (step.message) {
            console.log(chalk.red("Task step:"), step.message);
            ioSocketsEmit("message clients", step.message);
            // ioEmitById(user.mturkId, "message clients", step.message)
          }
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
                survey: midSurveyOn || teamfeedbackOn || psychologicalSafetyOn
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
  });

  //if broken, tell users they're done and disconnect their socket
  socket.on("broken", _data => {
    console.log("ON BROKEN CALLED");
    issueFinish(
      socket,
      runViaEmailOn
        ? "We've experienced an error. Please wait for an email from " +
            "scaledhumanity@gmail.com with restart instructions."
        : "The task has finished early. " +
            "You will be compensated by clicking submit below.",
      false,
      "broken"
    );
  });

  // Store data for all surveys
  socket.on("submit", data => {
    useUser(socket, user => {
      const structuredResults = parseResults(data);
      const activity = user.currentActivity;
      if (experimentOver) user.results[activity] = structuredResults;
      else user.results[activity][currentRound] = structuredResults;
      updateUserInDB(user, `results.${activity}`, user.results[activity]);
    });
  });

  //loads qs in text file, returns json array
  function loadQuestions(instrument: string, user = null) {
    let questions = [];
    fs.readFileSync(`txt/${instrument}.txt`)
      .toString()
      .split("\n")
      .filter(n => n.length !== 0)
      .forEach((line, index) => {
        let questionObj = {};
        questionObj["name"] = instrument + (index + 1);
        questionObj["question"] = line.substr(
          line.indexOf("|") + 1,
          line.length
        );
        let answerTag = line.substr(0, line.indexOf("|"));
        let answerObj;
        if (answerTag === "S1") {
          // scale 1 radio
          answerObj = answers;
        } else if (answerTag === "YN") {
          // yes no
          answerObj = binaryAnswers;
        } else if (answerTag === "YN15") {
          // yes no
          answerObj = binaryAnswers;
          let team = getTeamMembers(user)[index];
          questionObj["question"] += ` Team ${index + 1} (${team}).`;
        } else if (answerTag === "TR") {
          //team radio
          getTeamMembers(user).forEach((team, index) => {
            questionObj["question"] += ` Team ${index + 1} (${team}).`;
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

  function issueFinish(
    socket,
    message,
    crashed = false,
    finishingCode = socket.id
  ) {
    if (!socket) {
      console.log("Undefined user in issueFinish");
      return;
    }
    console.log(chalk.red("Issued finish to " + socket.mturkId));
    useUser(socket, user => {
      ioEmitById(
        socket.mturkId,
        "finished",
        { message: message, finishingCode: finishingCode, crashed: crashed },
        socket,
        user
      );
    });
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

function replicate(subArray: any[], times: number) {
  const subArraySize = subArray.length;
  const repeatedArraySize = subArraySize * times;
  const resultingArray = new Array(repeatedArraySize);
  for (let i = 0; i < repeatedArraySize; i++)
    resultingArray[i] = subArray[i % subArraySize];
  return resultingArray;
}

const getTeamMembers = user => {
  // Makes a list of teams this user has worked with
  const roomTeams = user.rooms.map((room, rIndex) => {
    return users.filter(user => user.rooms[rIndex] === room);
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

//PK: delete this fxn and use the normal survey mechanism?
// This function generates a post survey for a user (listing out each team they were part of),
// and then provides the correct answer to check against.
function postSurveyGenerator(user) {
  const answers = getTeamMembers(user);
  // Makes a list of teams that are the correct answer, e.g., "Team 1 and Team 3"
  let correctAnswer = answers
    .map((_team, round) => {
      if (roundOrdering[round] === experimentRoundIndicator) {
        return "Team " + (round + 1);
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
function parseResults(data: string) {
  let parsedResults = {};
  data.split("&").forEach(responsePair => {
    let response = responsePair.split("=");
    let index = response[0].split("-q");
    parsedResults[index[1]] = response[1] ? decode(response[1]) : "";
  });
  return parsedResults;
}

const decode = (encoded: string) => unescape(encoded.replace(/\+/g, " "));

const logTime = () => {
  let timeNow = new Date(Date.now());
  console.log(
    "This is as of " +
      (Date.now() - batchID) / 1000 +
      " seconds since starting the experiment. Printed at",
    timeNow.toString()
  );
};

const getRandomSubarray = (arr: any[], size: number) => {
  return shuffle(arr).slice(0, size);
};

function shuffle(array: any[]) {
  let currentIndex = array.length;
  let temporaryValue: any;
  let randomIndex: number;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}
