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
const randomRoundOrderOn = false;
const randomTaskOrderOn = false;

const waitChatOn = true; //MAKE SURE THIS IS THE SAME IN CLIENT, MAKE SURE TRUE WHEN RUNNING LIVE
const extraRoundOn = false; //Only set to true if teamSize = 4, Requires waitChatOn = true.
const starterSurveyOn = false;
const midSurveyOn = false;
const midSurveyStatusOn = false; //Only set to true if teamSize = 4, Requires waitChatOn = true.
const psychologicalSafetyOn = true;
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
const qFifteenOn = false;
const qSixteenOn = false;
const postSurveyOn = false;
const demographicsSurveyOn = true;

//Just Mark for now. Feel free to add your ID, and finish a task for us so you can get notificaions too.
const notifyUsList = ["A19MTSLG2OYDLZ", "A1Y1EKZLN97X0O", "AY2B3BC40LYOO"];

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
    "Some college",
    "Undergraduate degree",
    "Graduate degree",
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
  answerType: "radio",
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
    if (notifyUs) {
      mturk.notifyWorkers(
        notifyUsList,
        `ADD MORE FUNDS: $${balance} left`,
        `EOM`
      );
    }
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

// Settings for 4 rounds.
// uses a new random team each time (we don't care about double-counting participants)
const conditions = {
  control: [1, 2, 3, 4],
  treatment: [1, 2, 3, 4],
  baseline: [1, 2, 3, 4]
}; 

const experimentRoundIndicator = extraRoundOn ? 2 : 1; //This record what round of the ordering is the experimental round.
const experimentRound = conditions[currentCondition].lastIndexOf(
  experimentRoundIndicator
); //assumes that the manipulation is always the last instance of team 1's interaction.
console.log(currentCondition, "with", conditions[currentCondition]);

const numRounds = conditions.baseline.length;

//const numberOfRooms = teamSize * numRounds; // DOESN'T DO ANYTHING
const people = extraRoundOn
  ? tools.letters.slice(0, teamSize ** 2 + teamSize)
  : tools.letters.slice(0, teamSize ** 2);
const teams = tools.createTeams(teamSize, numRounds, people, extraRoundOn);

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

function updateUserInDB(user, field, value, singleBatch = true) {
  //MW: When singleBatch == false, this modifies more than one documents across all batches because otherwise some records wont be edited, e.g. when bonusing.
  const query = singleBatch
    ? { mturkId: user.mturkId, batch: batchID }
    : { mturkId: user.mturkId };
  const settings = singleBatch ? {} : { multi: true };
  db.users.update(query, { $set: { [field]: value } }, settings, err =>
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
        bonusedUsers.forEach(u => updateUserInDB(u, "bonus", 0, false));
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
        let message = `You’re invited to join our newly launched HIT on Mturk; there are limited spaces and it will be closed to new participants in about 15 minutes! \n\nCheck out the HIT here: ${URL} \n\nIf the HIT is "unavailable", it likely means spaces have been filled. Don't worry, you'll be notified of the next time we upload a new HIT.\n\nYou're receiving this message because you indicated that you'd like to be notified of our upcoming HIT during this time window. If you'd like to stop receiving notifications please email your MTurk ID to: scaledhumanity@gmail.com`;
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
let tasks = [
    {
      "student" : "baisrohan",
      "suid": "rbais",
      "scaffold": "Welcome! You are not only here to decide a title for a GoFundMe page, but also to have fun and play with creative endeavors! To relax the chat room here some steps to help you get you all settled in. First talk about your favorite movie and favorite album and why they are your favorites and then tell a short somewhat embarrassing story about yourself (only ones you are comfortable with). Then decide if the GoFundMe title should fall into the category of “serious/informative” or “funny/light-hearted”. After you decided this, go around in a circle and shoot an idea while the other two talk about what they like and dislike about the idea. Then move on to the next person. If you feel like you’re taking too long say “pass” to keep the flow going. Keep doing so until you found a title that you all agree to be great. Keep it respectful, but have fun! https://www.gofundme.com/untitled-michael-jackson-documentary-series",
    },
    {
      "student" : "campbellcallinrose",
      "suid": "caillinc",
      "scaffold": "Hello team! Your goal for the next fifteen minutes is to develop a new name for this gofundme page - ​https://www.gofundme.com/children-of-yemen-dying​ . Before we begin, everyone share your three favorite foods! Please don’t tell anyone if you disagree with some of their preferences. But, once everyone has shared, make sure to nicely tell at least one person that you agree with one of their favorite foods! Afterwards, please work as a team to come up with a new gofundme campaign title!",
    },
    {
      "student" : "chenryanjeffrey",
      "suid": "rjc45",
      "scaffold": "Thanks so much for being a part of this group study! You have a STRICT 15 minutes to come up with a creative title for this GoFundMe campaign in order to increase donations: https://www.gofundme.com/protect-the-national-butterfly-center<br>Here are my suggested keys to success! 1) Give you best arguments for pineapples on pizza or not, respectfully. 2) Everyone throws out their worst possible (PG) and funniest ideas for a new name for the campaign. 3) Work collaboratively to come up with a great name that everyone agrees on, that will bring in donation$!"
    },
    {
      "student" : "chetryneha",
      "suid": "nchetry",
      "scaffold": "Hey there! You guys will be competing against other teams to come up with a dOPE title for a Go Fund ME campaign. Because we are the BEST team, we’re each going to list out a pseudonym we wanna go by, pronouns, and post some memes that we adore. After a couple of minutes we’ll start brainstorming ideas for titles. Before, our 15 mins are up we’ll nominate our top choice for our team submission. Link to the go-fund me page is here https://www.gofundme.com/Atlas-SF7​. Please quickly review this page for about 2 mins before you begin ! Let’s GOOOOO.<br><br>I’ll keep time :)"
    },
    {
      "student" : "choprasahil",
      "suid": "schopra8",
      "scaffold": "Hi everyone! Today, we’ve gathered you all here today for 15 minutes to help come up with the name for a GoFundMe campaign. But first, can everyone please introduce themselves (using your handles — not your real names)? It would be great if you could all go around and describe the best meal you’ve had in the past week. After ~5 minutes of sharing, proceed to the activity and spend ~10 minutes brainstorming possible ideas for the following GoFundMe Campaign ( https://www.gofundme.com/rc8xea-youth-suicide-prevention​ ). At the end, please come to a consensus and report back your team’s best campaign title. Thanks for participating! And have fun :)<br><br>As a reminder, make sure to switch to brainstorming activity after 5-6 minutes. If someone, can volunteer keep time that would be great :)"
    },
    {
      "student" : "chowying",
      "suid": "yingchow",
      "scaffold": "Hello everyone! Thank you so much for being here! The three of you will be brainstorming campaign names for a gofundme campaign today. The only two “rules” are that everyone’s real names remain anonymous and that we finish everything within 15 minutes (b/c everyone is so busy haha). Everything else is fair game— please do share all ideas that come to mind, even those that you don’t think are good.😊<br><br>Starting off, take 1-2 minutes to introduce yourselves with literally any name that is not your real name… and also three emojis that describe your day today!<br><br>The gofundme campaign we are trying to come up with names for today is: https://www.gofundme.com/uchsd2-support-for-ryker . Go ahead and take some time to look through this page to familiarize yourself with the campaign, and I’ll let you take it away from here. I’ll check back in 10 minutes or so, when you’ll have decided on the best name!"
    },
    {
      "student" : "halpernelanddakota",
      "suid": "elanh",
      "scaffold": "Start by introducing yourself. Everyone say your name, where you are from, and if you could only eat one food (dish) for the rest of your life what would it be? Next each one of you should brainstorm 3 ideas for a title of this GoFundMe page (https://www.gofundme.com/chicago- polar-vortex-relief), then discuss and choose a single final favorite for the entire group. You will have 15 minutes to come up with your final choice.<br>After the 15 minute time limit you will be asked to individually fill out a short survey."
    },
    {
      "student" : "hardingdylan",
      "suid": "dharding",
      "scaffold": "Hey team! Welcome to the brainstorming session. Our goal today is to come up with a name for a GoFundMe page. Before we get started, I want you to take a second to think of a hot take/an unpopular opinion about food (eg. I like pineapple on pizza) that you hold. Now, share that with the group. Once everyone has shared one unpopular opinion we’ll move on to the GoFundMe portion. Take a few moments to read over this https://www.gofundme.com/paradisestrong-fire-relief GoFundMe description and then begin 15 minutes of name brainstorming as a team. Be ready to share your team’s consensus at the end of the 15 minutes.",
    },
    {
      "student" : "jassimyasmeen",
      "suid": "yasmeenj",
      "scaffold": "Hi everyone! Thank you so much for offering to take part in this. First, let’s get the conversation started on a lighter note. Each share the worst pick up line you’ve ever heard. Maybe someone else’s pick up line inspires you to come up with one of your own? Have fun with this for a few minutes. Then, look at this gofundme page (link below) and collectively brainstorm a better title. Jointly vote on the best title and send it in a final text on the group chat. You have 15 minutes to do this!<br>Link to gofundme page: https://www.gofundme.com/malibu-home-and-ranch-loss-in-fire"
    },
    {
      "student" : "manueltiffanymagsanoc",
      "suid": "manuel14",
      "scaffold": "Please begin by each sharing a norm you would like to set for the team to ensure that these 15 minutes are as efficient/successful as possible! Take a few minutes to discuss any disagreements about these norms. Finally, start brainstorming titles for this GoFundMe campaign:​ ​https://www.gofundme.com/bridge-receiving-center",
    },
    {
      "student" : "riggsjasonney",
      "suid": "jnriggs",
      "scaffold": "Hi there, you three!<br><br>Your mission is to brainstorm a wAcKy title for the following GoFundMe campaign: https://www.gofundme.com/ari-and-miriams-wedding​.<br><br>The only rule is: you must use the word “laser” somewhere in each title you propose. No idea is too crazy - go nuts; joke around together<br><br>When there are 30 seconds left, you should all agree together upon a final choice of title and announce it.",
    },
    {
      "student" : "rolon-osunamanuel",
      "suid": "mrolonos",
      "scaffold": "Welcome and thank you for your creative contribution! Today you will be coming up with a title for a Go Fund Me, do not worry about what it is for just try and make the title so that it gets the most donations. To start, each person think of three titles that you believe would be best for the Go Fund Me. Place a “*” next to your favorite one.<br><br>Ex: USER1:​ Go Fund Me Title, Title for Go Fund Me, Cool Go Fund Me Title​*<br><br>Once you have shared your wonderful titles, work to create a final title for the Go Fund Me. Try to consider the benefits of each title. When ready, make it clear what the final title will be.",
    },
    {
      "student" : "semeniutadaniel",
      "suid": "dsemeniu",
      "scaffold": "Hey! Today you’re going to be working on brainstorming titles for a GoFundMe campaign. You’ve got 15 minutes to come up with the best idea you can as a team. Don’t be afraid to share whatever comes to mind. This isn’t a competition between your ideas; ultimately, the goal is to come up with something that would be able to help someone else. We want to get the best title we can during the time allotted to help the fundraiser. No idea is bad, and no one will know who said what. Again, you guys are a team – not individuals. Feel free to build off of each other’s ideas, throw out anything and everything you can think of, and even make some riskier suggestions! There is no wrong answer and no “winner.” This is a great way to make some friends while helping a worthy cause. Have fun team! :)<br>The GoFundMe campaign is here: https://www.gofundme.com/fusion-four-fll-team-to-worlds. Take a minute to read it before coming back. When you’re back, share a few thoughts about the girls’ story to let everyone know you’re ready to start!",
    },
    {
      "student" : "sisayabanezertedla",
      "suid": "atsisay",
      "scaffold": "Thank you for participating in my study. The purpose of this study will be to brainstorm a new title for the “Race Across France Documentary” GoFundMe project. You will have 15 minutes to meet each other, brainstorm, and then select a favorite title to submit. In order to create a fun and effective brainstorm, please follow the instructions below<br><br>The best teams are the teams in which everyone can say anything without judgement. Since you are all anonymous, I encourage you to spend the first couple of minutes spouting out stupid, crazy ideas/conspiracies; brutally honest opinions about the go fund me project; or talk about a random non-sexual turn-on. Use the time to feel like a group. No matter what, always try to never dissuade others’ opinion/statements and always try to build others up. Remember you have 15 minutes start to end to come up with an alternative name. May you cross that finish line.<br><br>GoFundMe Project: https://www.gofundme.com/Cyclingracedocumentary<br>",
    },
    {
      "student" : "thainloghan",
      "suid": "loghan",
      "scaffold": "Thank you for taking part in this brainstorming session! I’m really thankful for your time and appreciate the time and effort you put into this task :)<br>Your task is to think of a title for this GoFundMe over the next 15 minutes: https://www.gofundme.com/asian-ocean-ultimate-championship-2019​.<br>Take a moment now to skim the GoFundMe Page.<br><br>Great, before we start, I want to remind everyone that this is a safe space. Feel free to share as much or as little information as you want in response to the questions. Let’s get started.<br><br>1. What’s one thing that made you smile today? Take turns sharing.<br>2. After you’re done, we’ll start brainstorming! Take 2 minutes to individually come up with 3-6<br>names for the GoFundMe page. Please be as wacky as you want. There are no bad ideas. At this<br>stage, it’s quantity over quality :)<br>3. Pick 2-3 ideas that are not yours that you really liked and bold them. If an idea has already been<br>bolded, italicize it to show that you like it. Discuss the final ideas in bold and italics and pick an idea to run with. Feel free to combine and remix bolded titles!",
    },
    {
      "student" : "tyagisachi",
      "suid": "tsachi",
      "scaffold": "Welcome to the team - let’s get started with some norms for this brainstorm session!<br><br>The team must find the title for a GoFundMe campaign whose proceeds will go to a Sea Turtle hatchery and rescue center in Sri Lanka.<br>First, introduce yourselves to the team with an animal you relate to - be silly and creative! Give a brief explanation (1-2 sentences) why you think you’re like this animal.<br><br>Next, we’ll go around the team such that each teammate gives at least one idea for the GoFundMe campaign title.<br><br>Now you can either build on a title idea already mentioned by a teammate or create a new title if you have a different idea. Be sure to be respectful if you choose to pivot to a different idea - give constructive criticism and back up your idea with reasoning.",
    },
    {
      "student" : "venkatramanamrita",
      "suid": "amritav",
      "scaffold": "Hi everyone! Thank you for taking the time to participate in this study! Just so we all get to know each other a little better, go ahead and message the group your favorite song right now! Mine is YOSEMITE by Travis Scott.<br><br>Your task is simple: the three of you should come up with a creative title for the following GoFundMe Campaign with the goal of getting the most donations Here is the campaign: ​https://www.gofundme.com/save-knox-the-wolfhound<br><br>Feel free to be creative with the title and to give feedback on each others' suggestions. I'll check back in soon to see what you guys come up with!",
    },
    {
      "student" : "vermariya",
      "suid": "riyav",
      "scaffold": "Let’s talk about our funniest, favorite animal stories, and come up with as many animal puns as possible! <br>Our end goal: title this GoFundMe Campaign: https://www.gofundme.com/woodstockfarmsanctuary<br>Go wild!",
    },
    {
      "student" : "vlahakisciscovan",
      "suid": "vlahakis",
      "scaffold": "When you make a response to the group, remember to include a ❤ emoji at the end. If you forget to do this, ​you must reply to the group​ “I love you guys! ❤❤❤”. If you forget to do this, someone else must reply​ “I love you guys! ❤❤❤” before continuing.<br><br>First, everyone start by sharing a funny story about yourself. ❤<br><br>Now, brainstorm and come to a consensus on a name for this GoFundMe campaign:<br>https://www.gofundme.com/please-help-save-emilia​ ❤ <br><br>All ideas are welcome ❤❤❤",
    },
    {
      "student" : "wangkatedana",
      "suid": "katewang",
      "scaffold": "Hi everyone! You will be brainstorming a title for this GoFundMe campaign: https://www.gofundme.com/camp-fire-evacuation-fund​. You’ll start by having each person list 2 ideas that immediately come to mind. Next, you’ll iterate through each option, discussing what you like/don’t like about each. As you go through, keep a list of words/phrases that you particularly like. You will then go through the list of words/phrases that you liked and create two titles using those. You will then pick your favorite and submit it. Have fun, and don’t be afraid to be honest with your opinions!",
    },
    {
      "student" : "woojeffreybryan",
      "suid": "jbwoo",
      "scaffold": "Welcome everyone! :D Let’s have some fun ^__^ You have fifteen minutes together total, so take a moment to just chat with each other.<br><br>Brainstorm as many titles for this GoFundMe campaign as possible to help it generate attention.<br><br>https://www.gofundme.com/help-angel-cakes-rebuild<br><br>Remember, there is no such thing as a bad idea here! Take some risks (Aliens! Virtual reality! Hope! And everything in between :D)<br><br>Make sure to support each other’s ideas even if it isn’t your favorite. People might say things that might sound ridiculous, but that’s part of the process!<br><br>Afterwards, focus and select your team’s favorite idea. You’re a team, so make sure to support each other. You may disagree on the best idea, but try to be respectful of everyone’s different opinions.<br><br>Remember, everyone always brings something unique to the table! The best teams are the ones that can discuss their opinions openly and honestly while respecting other people’s differences. Have fun!<br><br>I will send a 10 minute, 5 minute, and 1 minute warning along the way. Time is short so make sure to make every minute count! Remember to pick a final idea at the end.",
    },
    {
      "student" : "zhougrace",
      "suid": "gkzhou",
      "scaffold": "You guys’ task will be to come up with an attractive, alternative title for this GoFundMe campaign together in 15 minutes: https://www.gofundme.com/Please-Help-a-Bookstore-Remain.1. First, visit the page to get the gist of what the campaign is about. 2. Next, share at least three of your ideas! Include at least one ridiculous title among them -- you never know what might stick. :) 3. When everyone’s done listing their title ideas, choose your favorite title created by someone else. Share why you like it and, if you have one, a suggestion to make it even better. 4. After that, discuss as a group to choose one title to use. Then you’re done! (Remember: It’s totally okay -- encouraged, in fact -- to ask for help or bring up any problems at any point of this process!)",
    },
    {
      "student" : "maivythiennguyen",
      "suid": "vmai2",
      "scaffold": "You all have 15 minutes to finish the task below. Good luck!<br><br>An explosion hit downtown Durham, North Carolina, destroying a beloved local coffee shop called Kaffeinate. The owners (known as the Lee family) lost not only their shop, but their father to the explosion.<br><br>Your task is to brainstorm a campaign title for a GoFundMe campaign, supporting the Lee family:​ https://www.gofundme.com/lee-family-support<br><br>First, take 5 minutes to read the full description, and brainstorm some potential titles on your own.<br>All ideas are welcome! From the ​obvious5 to the ​wild​.<br>After 5 minutes, come together and discuss the titles you’ve come up with. Feel free to pivot/remix off each other’s ideas.<br>After 15 minutes, share your finalized campaign title!",
    },
    {
      "student" : "liseanxianming",
      "suid": "xmli",
      "scaffold": "Hey there! Welcome to an anonymous chat room. Here, you will find a few other people whom you may not know, and together you guys are a team on this document.<br><br>Your team's goal will be to brainstorm creative titles for a GoFundMe campaign, with the aim of helping that campaign attract donations. That GoFundMe campaign is here.<br><br>You will have 15 minutes to meet each other, brainstorm, and then select a favorite title to submit. That’s it! Pretty simple. <br><br>Feel free to start writing! Get to know each other, create a team name, post a few jokes to get started.",
    },
    {
      "student" : "coleryan",
      "suid": "rcole34",
      "scaffold": "Hey everyone! As a team, you will spend the next 15 minutes brainstorming catchy campaign names for the following GoFundMe page to attract as many donations as possible:<br><br>Rachel is designing a new board game called A Mile in Her Shoes to try to give players a sense for what daily life can be like for women and people of color. She needs to raise money to finish testing the game and begin production to get it on shelves by this summer!<br><br>First, to get to know your teammates a little, everyone will share something about themselves that not many people know! Then we’ll get down to business and everyone will share a couple ideas for campaign names that come to mind and discuss things they like about different options. Feel free to try adding something to a teammate’s idea or combining ideas together that have already been said. Finally, discuss as a group some of your favorite options and what you like about them. Come to a decision on which name to use.<br><br>Remember that there are no bad ideas in a brainstorm, so have fun with this and don’t shoot down anyone’s ideas! The other people here are your teammates for the next 15 minutes, so be respectful and help each other arrive at the best name possible!",
    },
    {
      "student" : "alfouzanyasmeen",
      "suid": "yasmeena",
      "scaffold": "Hi, team!<br><br>I hope y’all are ready to do some social good using 15 minutes of your time, because it’s happening. If you think you’ve done enough good deed to hit your ‘brownie points’ quota for the year already, don’t worry, I heard it usually rolls over. (also, we’re not even halfway into the year so maybe stop being saints) (mmmm brownies) (ok I need to stop getting distracted)<br><br>In order to create a great GoFundMe campaign, we need the following: A cause, a description, and a title. We got the first two covered, but it is up to you to come up with a short title that is fit for this cause: https://www.gofundme.com/action- for-a-cause (An initiative to help displaced people who are homeless. Purchasing, renovating, furnishing properties to place the misfortunate in a comfortable living situation.)<br><br>What makes a good GoFundMe title? It should be descriptive of the cause and attractive, but, most importantly: it’s the one you and the rest of the team agree on, and unanimously vote on. Remember: the title is the first thing people see of a campaign! Gotta make ‘em click.<br><br>To start, say hi to everyone and mention your favorite thing about having a home and a roof over your head, it could be as silly or as serious as you want. (if you don’t/didn’t have one, mention your least favorite thing about not having one)",
    },
    {
      "student" : "anzaldopaulina",
      "suid": "panzaldo",
      "scaffold": "Hola! I’m so excited to have you today! So, there are 3 of you in this Slack and you’ll be brainstorming creative titles for this GroupMe campaign:<br> https://www.gofundme.com/stanford-spokes-2019 -- it’s actually a campaign by Stanford Spokes, some fellow trees! <br><br>You have 15 minutes to accomplish this goal :) But before you jump right into it, let’s go ahead and:<br><br> 1) Break the ice! Fill in the blank “When I dance, I look like _____” and share with your peers<br><br>2) Go ahead and share ideas! Each of you takes a turn to share 3-5 ideas for campaign titles<br><br>3) Mix & match titles! Each of you will combine an idea of yours with someone else’s and see ~~magic happen~~<br><br>4) Talk about the new ideas generated<br><br>5) Pick the title you’re all most excited about <br><br>Let us break the ice!! Remember you have a 15 minute limit for the entire activity :)",
    },
    {
      "student" : "bacontaylorlouise",
      "suid": "tbacon",
      "scaffold": "(1) You are a team. <br>(2) You are competing with other teams to brainstorm ideas for the title of a fundraiser to buy books for underprivileged children. You are already at an advantage as the other team lost a player for using derogatory language. <br>(3) When brainstorming an idea, all language must be kind and constructive. You should using welcoming and inclusive language, focusing on what is best for the team. If you violate the spirit of this rule, you will be removed from the brainstorm.<br>(4) To start, each player should submit a terrible idea for a fundraiser. Afterwards, each player picks their favorite idea and submits one idea better than it and one idea worse. You should not say which is the better and which is the worse idea. (Please submit ideas in the format last idea -> new idea, new idea)<br>(5) You can only react to ideas using emojis - not words - or contribute new ideas. <br>(6) Ready, set, go!",
    },
    {
      "student" : "barbulescuolivia",
      "suid": "oliviaeb",
      "scaffold": "The GoFundMe page you will be renaming is here: https://www.gofundme.com/wildcats-special-needs-cheer-team-us-national<br><br>Before you begin collaborating:<br>1. Each watch this video on YouTube: https://www.youtube.com/watch?v=DV_3qx-oBms<br>2. Then, each share a weird thing that happened to you this week (1-2 sentences). First Panda, then Toucan, then Parrot will share.<br>3. Start brainstorming!<br>",
    },
    {
      "student" : "barnettben",
      "suid": "barnett3",
      "scaffold": "Say hello to your new team! You will have 15 minutes to collectively come up with a GoFundMe campaign title as facilitated by the following exercises. Be sure to keep track of time!<br>1. In alphabetical order of username, please share your favorite punny joke (I.e. Why do milking stools only have 3 legs? Because the cow has the udder! :) )<br>2. Now, teach something to your teammates! This can be a fun fact, something about yourself, a simple skill, or anything else you find interesting.<br>3. As a team, over the next ~5 minutes, brainstorm titles for imaginary GoFundMe campaigns that you would expect to attract lots of donations. If you’re having trouble coming up with effective titles, try discussing ​qualities​ of such titles with your team first.<br>4. Pick your favorite title that came from a ​different ​team member and make a new version of it. Share the modified title with your team.<br>5. Lastly, in the remaining time, choose the best title among ​all ​brainstormed names to submit as a team.",
    },
    {
      "student" : "arorasho",
      "suid": "shoarora",
      "scaffold": "In your group, you will have 15 minutes to come up with a title for this GoFundMe campaign:<br><br>https://www.gofundme.com/TerrorBytes-4561<br><br>Here’s a breakdown of how to spend the 15 minutes:<br><br>[1 min] read this prompt. pick someone to run a timer for each of these steps.<br><br>[2 min] read the GoFundMe page, and briefly discuss the campaign (who it’s for, why they’re fundraising).<br><br>[2 min] come up with as many potential titles as you can. it doesn’t matter how good or bad. send them to your group as you come up with them, but don’t worry too much about their ideas. again, the goal is quantity.<br><br>[4 min] read through all the ideas you came up with and choose 2 you like that someone else came up with. discuss why you like the ones you chose.<br><br>[6 min] with the remaining time, refine the ideas and aspects you like and discussed to come up with your final title.<br>",
    },
    {
      "student" : "blakegordonleo",
      "suid": "gblake",
      "scaffold": "Your mission: brainstorm title/slogan ideas for the GoFundMe campaign “Sponsor Solar Kits for Zambia Health Clinics!” (https://www.gofundme.com/solar-kit-sponsorships-for-zambia-health- clinics). You have 15 minutes to choose your favorite idea. Here’s how to do it:<br><br>(1) Share: In the first 5 minutes, share a bit about yourself in a round-robin style<br>a. On the first pass, share a highlight from your week<br>b. On the second pass, share an embarrassing moment from your childhood (like<br>“The time I ripped my pants...”)<br>(2) Spew: Spend the next 8 minutes throwing as many ideas out there as you can. No filter. (3) Choose: Pick your favorite idea.<br><br>Have fun!",
    },
    {
      "student" : "bruzzesetommyanthony",
      "suid": "tbru",
      "scaffold": "Teams have 15 minutes to brainstorm and select a title for the following GoFundMe campaign to attract the most donations possible:<br><br>Hi, I’m a dancer from Los Angeles. I’m asking for donations to create a new perspective of dance with a short film.<br>The beautiful thing about films like Footloose, Dirty Dancing, and West Side Story is that they unite people from every culture, every country, EVERYWHERE.<br>And that’s all from dance.<br><br>Here’s how we will do it:<br>1. You are a collaborative team. You are meant to succeed together. Ask questions and do not feel like you are slowing down the team when you ask them.<br>2. First, everyone take turns saying quick title ideas that come to mind. They don’t have to be perfect or overly developed. Repeat until everyone has said 3 ideas.<br>3. Second, everyone then say the *ONE* title idea that their partners suggested that was their favorite.<br>4. From these 2/3 titles selected, continue collaborating until your team decides on your final title idea.<br>5. You can start right away.",
    },
    {
      "student" : "camatagraziellagisiger",
      "suid": "gcamata",
      "scaffold": "Welcome friends! Your task is to come up with a name for a Go Fund Me campaign aiming to raise money for the threatened California tiger salamanders that live in Lake Lagunita on Stanford Campus.<br><br>Two easy rules:<br>1. Before rejecting any idea, first acknowledge at least one positive thing about it.<br>2. If two group members disagree about one thing, the third member will be a tie-breaker.<br><br>5 minute exercise:<br><br>Write 2-3 sentences on a difficult experience you’ve had in your personal life <br><br>Write 1-2 sentences on something you’re excited about in your life right now<br><br>After everyone has shared their responses, get started on brainstorming a name! You have until [now + 15 mins] (PST) to finalize the name!",
    },
    {
      "student" : "chenjessica",
      "suid": "jchens",
      "scaffold": "Hi everyone! Thanks for joining us today 😊 You have 15 minutes to complete the following tasks as a team, without any communication from me:<br><br>Goal: Brainstorm creative titles for this GoFundMe campaign, with the aim of helping that campaign attract donations: https://www.gofundme.com/rc8xea-youth-suicide-prevention <br><br>The catch: Go around the team, and every time someone proposes an idea, the next person should respond with \"Yes, AND... (add something that builds on the first idea)\".<br><br>For example:<br>A: let's bake a cake!<br>B: yes, and let's make it red velvet.<br>C: yes, and let's put ice cream inside.<br>A: yes, and we could also have a sundae bar.<br><br>You'll be doing a few rounds of warm up before going for the goal:<br>Round 1) Brainstorm ideas for your joint birthday party.<br>- Go around the team at least 3 times<br>Round 2) Take a few minutes to read over the GoFundMe, then brainstorm words (adjectives, verbs, nouns, etc.) related to the GoFundMe.<br>- Go around the team at least 3 times<br>Round 3) Brainstorm as many titles as you can for the GoFundMe campaign<br>- Go around the team as many times as you can!<br><br>Remember, the focus is on supporting and uplifting your teammates' ideas, not criticizing them.",
    },
    {
      "student" : "davisglennmichael",
      "suid": "gmdavis",
      "scaffold": "In your team of 3, you will be working together to brainstorm a creative new title for this GoFundMe campaign: https://www.gofundme.com/help-us-build-aloha-animal-sanctuary<br><br>You will have 15 minutes to discuss and come up with a title that you think will attract more donations. However, research shows that teams come up with better and more creative brainstorming results if everyone feels comfortable taking risks and is not worried about making mistakes.<br><br>Before you start brainstorming titles for the GoFundMe campaign, please take at least half of the time to build team comfort and solidarity (Steps 1 and 2).<br><br>1. First, take turns answering the question “What should a healthy relationship provide for the people in it?” and give your reactions to each other person’s answers (agree, disagree, etc.; discussion is encouraged!)<br>2. Next, discuss and establish some group norms to follow during your brainstorming session. Some examples are “everyone speaks for the same amount of time”, “no negative criticisms of other people’s ideas”, “all ideas must build on others’ ideas”, “each person should come up with at least 10 different titles”, “all members are equal”, “we will elect a leader”.<br>3. Finally, following the group norms, begin brainstorming titles for the GoFundMe campaign.<br>4. As a group, decide on the title that you think is best.",
    },
    {
      "student" : "dolesecolinjames",
      "suid": "cdolese",
      "scaffold": "Welcome to this team brainstorming exercise! You're all going to work together to come up with a great campaign title for a GoFundMe campaign (see campaign description at the bottom). You have exactly 15 minutes, so don't spend too much time on any one step. Go for quantity first, and quality later.<br><br>-----------------------------------------------------------------------------------------------------<br><br>\"It is amazing what you can accomplish if you do not care who gets the credit.\"— Harry S Truman<br><br>1. First learn about your teammates. Quickly take turns sharing the one job you would choose if money didn’t matter and a silly 3-4 word GoFundMe campaign title for raising money to pursue this job. Spend at most 2 minutes on this.<br><br>Example: I would be a baker. My campaign title would be: “Let’s get this bread.”<br><br>2. Now for the official task: read the campaign description at the bottom. Everyone share two themes or ideas that jump out at you and should be reflected in a good title.<br><br>3. Using these themes, each person come up with two title ideas. Then check in on what your team feels good about. Have each person select two favorite titles from the previous ideas and share with the team.<br><br>4. Finally, discuss the most selected titles, improve upon them or generate new titles, and decide on a final one.<br><br>https://www.gofundme.com/xatuk-huberto039s-sculpture-studio",
    },
    {
      "student" : "zwarensteinamanda",
      "suid": "amandazw",
      "scaffold": "Your task is to come up with a new title for this expired GoFundMe Campaign Every Kid Deserves a Bike:<br>https://www.gofundme.com/everykid<br><br>You will have 15 minutes to complete the five steps below, though you may finish earlier.<br><br>Step 1: Use the first minute or so to review the provided campaign.<br>Step 2: When everyone is ready, begin by sharing the last time you had your favorite dessert and what you would name your pet hamster if you had one.<br>Step 3: For the next few minutes (2-3), brainstorm ideas. Each person enter in as many ideas as they can think of to the chat, where ​QUANTITY​ matters over quality. Out-of-the-box ideas are encouraged!! Some things to consider: tone, creativity, sparking interest.<br>Step 4: Use the next minute or two to choose the 3 ideas you liked the best, even if they weren’t yours. When everyone is ready, share your top 3!<br>Step 5: Use the remaining time to discuss the top ideas, and choose a final title. This can be a combination of ideas, or a single idea. You can make a note of your final choice in the chat, and exit the chatroom at any time.<br><br>REMEMBER! This is an environment of respect and non-judgement - please treat your fellow thinkers accordingly. I will not answer questions or moderate your chat, except to provide a 2-minute warning - this will be my last message.",
    },
    {
      "student" : "nicandrovincentcastillo",
      "suid": "nicandro",
      "scaffold": "Hey everyone! You will have 15 minutes together to generate effective titles for the following GoFundMe campaign: https://bit.ly/2KUVe7J Our approach to generating ideas will be round-robin style. <br><br>One person will be the idea generator while the other two will be idea augmenters. The generator will start with an idea, then the augmenters will respond by adding or editing the original title. Idea generators can submit titles at any time. After five minutes, rotate roles. At the end, come to a consensus for a good title!<br><br>Try to approach this exercise with a “Yes, and…” mentality. And remember: each idea comes from a person, so treat them with respect!",
    },
    {
      "student" : "phamalexnhienthiengia",
      "suid": "apham7",
      "scaffold": "Hi everyone! Thank you so much for taking time out of your busy days to help me with this project. Today, we will be spending fifteen minutes to brainstorm catchy titles for a gofundme campaign.<br><br>Before starting, let’s get to know each other. Spend around three to five minutes introducing yourself briefly by sharing your name and your “rose, bud, and thorn”. (Rose and Thorn: the high and low point of your week, Bud: What you’re looking forward to.) Feel free to comment on each others’ weeks. Hopefully by the end of this you all feel like friends. :)<br><br>After the short icebreaker, let’s ideate! Spend the remaining time focusing on generating ideas and supporting the ideas that you like. Avoid criticizing ideas and instead focus on positive language. Focus on inclusive language that allows others to contribute to the conversation. **Pretend like there are NO bad ideas.**<br><br>Thanks for reading through everything! Here’s the link to the campaign! https:// www.gofundme.com/Keep-WAGS-Pet-Adoption-open-2019-2020 Have fun!",
    },
    {
      "student" : "ramjayen",
      "suid": "jjram",
      "scaffold": "Hey y’all, here is the five-step process to come up with an awesome GoFundMe title for this GoFundMe: https://www.gofundme.com/reed-raider-national-championship !<br><br>1. Introduce yourself and tell everyone your most embarrassing moment from childhood<br>2. Spend 2 minutes reading the campaign<br>3. Perform three rounds of going around and providing titles that fit this template and provide feedback (feel free to change format. After each round provide feedback on the previous round<br>4. Champion one title idea and provide pro’s and con’s, then decide on a title name",
    },
    {
      "student" : "rishanitalalramzi",
      "suid": "trishani",
      "scaffold": "This will be a discussion on finding the best name for a GoFundMe campaign against Deforestation in the Amazon. I want this chat to be comfortable to all, so it is super important for it to be low stress, building on ideas and sharing constructive criticism.<br><br>Please share in 3 sentences where you are from, your thoughts on deforestation, and your favourite pastime activity.<br><br>Next, please take the next 4 mins to note down 3 ideas for titles, you may ask around for inspiration and brainstorm as a team if you wish. For the remainder of the time, you will discuss which title is best, along with modifications you may want to perform. Remember to say at least 1 good thing about a title before down voting it, along with constructive criticism.<br><br>I will let you know when there is 5mins left, and 1min as well.",
    },
    {
      "student" : "rusakgili",
      "suid": "gili",
      "scaffold": "Welcome everyone! Thanks so much for your time. *Here is your task*:<br><br>Help your friends at Stanford Spokes come up with a new title for their GoFundMe Campaign!<br><br>The three of you will work together to come up with a title for this campaign of students cycling from SF to DC while teaching educational workshops (https://www.gofundme.com/stanford- spokes-2019).<br><br>You are a team!<br>*First*, get to know each other -- share a fun story of an adventure you recently went on (doesn’t have to be a cross-country cycling trip;) ).<br>*Second*, everyone share two titles as suggestions.<br>*Third*, discuss -- compliment each other, offer variants of names, mix and match names. Be creative and kind.<br>*Fourth*, come to a consensus. Feel free to make a Slack poll by typing: /poll “What name?” “Awesome name 1” “Awesome name 2” ...<br><br>Remember you only have 15 minutes and it is important that we hear everyone’s ideas and thoughts. Good luck and have fun!",
    },
    {
      "student" : "sharpblakecynthia",
      "suid": "bsharp4",
      "scaffold": "1. 36 Questions that Lead to Love (and group project success!):​ The New York Times released an article entitled “36 questions that lead to love” in 2015. Here are three of them as a way to quickly get to know the other people in this group. For the first six to eight minutes, go through each question, answer, read and respond to your groupmates.<br>Set 1: Given the choice of anyone in the world dead or alive, whom would you want as a dinner guest?<br>Set 2: Is there something that you’ve dreamed of doing for a long time? Why haven’t you done it?<br>Set 3: Your house, containing everything you own, catches fire. After saving your loved ones and pets, you have time to safely make a final dash to save any one item. What would it be? Why?<br><br>2. Individual Brainstorm:​ View this GoFundMe<br>(h​ttps://www.gofundme.com/restoring-vision-in-ethiopia)​ and think of a more effective and creative name for the project and send it to the other group members.<br><br>3. Group Brainstorm:​ View the two other suggestions in the group and try to combine or remix either or both of their ideas.<br><br>4. Final Decision:​ Chose as a group one of the six options to use as the final title for that campaign.",
    },
    {
      "student" : "smithtylerotha",
      "suid": "tosmith",
      "scaffold": "Hey everyone! Today you’re going to work together to brainstorm a title for this GoFundMe this task.<br><br>To get to know each other better, here are a few icebreakers. Everyone should answer them before jumping into the brainstorming session:<br><br>● If you could wake up tomorrow having gained any one quality or ability, what would it be?<br>● For what in your life do you feel most grateful?<br>● What do you value most in a friendship?<br><br>When you finish the icebreakers, feel free to bounce ideas back and forth, discuss, and come up with a kickass title!",
    },
    {
      "student" : "trotsyukartem",
      "suid": "atrotsyu",
      "scaffold": "Hello everyone! Thank you for agreeing to participate. The goal of this chat is to brainstorm ideas for a successful GoFundMe Campaign to save a polar bear, Bo. Bo was injured while trying to find food. His home used to be covered with ice but is now submerged in water. We need your help to think of ways to raise money for “Our Planet Wildlife Foundation” so that Bo can get the treatment he needs to survive.<br><br>First off, introductions. Each participant, please choose one of the following questions to answer.<br><br>1) If you weren't on this chat, what would you be doing?<br>2) if you would eat any dish right now, what would it be?<br>3) if money was no object, where would you go on a vacation?<br><br>Next, do a big picture brainstorm of how you would structure Bo’s Go Fund Me campaign. Some discussion thoughts - What title would you use? What audience do you want to target? Which online/print platforms would you use?<br><br>At the end, report your group’s thoughts.<br><br>Afterwards, you will be invited to anonymously rate your experience today. <br><br>Thank you again for participating. Let’s figure out how to save Bo!",
    },
    {
      "student" : "wangjuliamegan",
      "suid": "jwang00",
      "scaffold": "Fundraiser: Keep Tahoe Blue<br>We are trying to raise money for the Keep Tahoe Blue organization! They are working to protect the environment around Lake Tahoe in four different ways: combating pollution, promoting restoration, tackling invasive species, and protecting the shoreline.<br>Scaffold:<br>1. When you think of the fundraiser, what is the first word or phrase that comes to mind?<br>2. Adapt a song lyric (of your favorite song!!) or create a pun using the fundraiser topic.<br>3. Give a couple reasons why you think this fundraiser is important or what makes it a good cause to donate to.<br>4. Now share 2 ideas for creative names/slogans for the fundraiser. You can use any inspiration from earlier ideas.<br>5. Mix, revise, or add on to one or two of your group members ideas and send in the new title.<br>6. As a team, discuss and pick the top two names you brainstormed.<br>7. Now vote on these two names to make the final choice.",
    },
    {
      "student" : "wangnaixincathy",
      "suid": "cathywnx",
      "scaffold": "Hi guys! Please brainstorm a GoFundMe campaign title for the protection of polar bear. Creativity is encouraged! There’s no wrong answer really :)<br>You have exactly 15 minutes!<br><br>Here are the rules:<br>1. Introduce yourself to each other by describing a silly incident in your recent life. Get to know each other a little bit :)<br>2. Go around in turn and produce one campaign title per time, and the two other participants will give compliment, or compliment followed by critics.<br>3. When it goes around the second time, each participant can choose to keep the original title, or give a new one, and similarly, the two other participants can choose to give compliment, or compliment followed by critics.<br>This goes on until there are 5 minutes left, and the floor will be open for discussion, where all 3 participants should feel free to talk about which title to decide on.<br><br>At the end of the 15 minutes, the 3 participants will produce one final title campaign title, but also leaving 2 honorable mentions for the admin to record.<br>(Please don’t reveal your identity at any point in the chatroom)<br>Have fun!",
    },
    {
      "student" : "zhengkally",
      "suid": "kally",
      "scaffold": "Brainstorm new names for the following go fund me: https://www.gofundme.com/mac-shack-food-truck<br><br>1. Set a timer for four minutes (someone on the team should volunteer to keep track of time) Each person write as many ideas that you can think of. No ideas are bad ideas. Write down anything that comes to mind. If they have been done before, write it down. If they seem obvious, write it down. This should be a stream of consciousness rather than fully formed ideas.<br>2. Take three minutes to share and group your ideas. As each member explains their ideas the other team members should be starting to categorize the names(if possible).<br>3. Set a timer for three minutes. Write down as many ideas as possible. Build off of your teammates ideas. Copying is the ultimate form of flattery. Write down any idea that comes to mind.<br>4. Set a timer for 2 minutes. Each member should share their new name ideas.<br>5. Set a timer for 2 minutes. Each member should vote on their favorite name by adding their initial next to it. Each team member gets 3 votes. Majority vote wins as the final name. If there is a tie iterate on the names that are tied with each team member getting one vote for this round.",
    },
    {
      "student" : "lincassandra",
      "suid": "clin98",
      "scaffold": "Welcome! The three of you are going to be working together to come up with a title for a GoFundMe campaign. <br><br>First, let’s set some rules:<br>- This is a fast brainstorming session! Throw out whatever comes to your mind. There are no bad ideas.<br>- We respect everyone’s opinions and values. <br>- Take space, make space: let’s make this an environment where everyone feels they can contribute!<br><br>Let’s start with a quick word association game. Everyone go around, popcorn-style, and share a few words that comes to mind when you hear the word ‘dog’.<br>----------------------<br>Next, please read the article for the GoFundMe page here: https://www.gofundme.com/milton-the-dog<br><br>You’re on your way! Think of the stories and feelings you associate with pets (could be dogs, cats, etc.) You can also think of movies about pets. Share them with the group if you’d like! Then,<br>- Everyone come up with three ideas!<br>- Discuss each idea as a group. Share what you like about the idea, give feedback, remix them (change them up) as you like.<br>- Narrow your list down to two ideas and vote on your favorite!<br><br>You won’t be able to ask me questions during this time, but I will give you a five-minute reminder and tell you when time is up. Go for it!",
    },
    {
      "student" : "kimkyegahyun",
      "suid": "ghkim",
      "scaffold": "Hi there! Welcome to the team!<br>You are a group of good-hearted, passionate but forgetful goldfish, so when alone, each of you can’t think more than 10 seconds per try. So three of you decided to work together to bump up that brain games.<br>The team’s task is to come up with a creative title for GoFundMe campaign, with the aim of helping that campaign attract donation The campaign is for an individual from Mexico, who have gathered rare chili peppers across the continent in wildest places. He now wants to create a business out of it to support his sick brother.<br>1. Take a turn to spit out a word, phrase, or a full name you can think of for the campaign. Don’t think more than 10 sec and write whatever that comes to your mind.<br>2. When you spit, you can add “...” at the end to indicate it’s not complete. e.g. “I don’t know ...”<br>3. If the previous person ended with “...”, the next person should built upon the incomplete name e.g. “... about you but this campaign is lit”<br>Do this at least for three rounds. After three rounds your brain would be warmed up enough to think longer, so you don’t have to do the spit format.<br>If you are done reading this instruction, say hi to the others! Spit turn follows the order that people said hi, once everyone said it. Have fun! I’ll come back after 15 minutes to check the final name.",
    },
    {
      "student" : "lapastoraandy",
      "suid": "awlapas",
      "scaffold": "Welcome! To start off, take a second to look at this GoFundMe page:<br>https://www.gofundme.com/help-rebuild-ilan-ramon-day-school<br>We want to brainstorm a good name for this fundraiser that is trying to raise money to rebuild a school that was destroyed by a fire. Please follow these steps:<br><br>1. Tell everyone a fun fact about yourself. Once everyone has gone, each of you come up with a quick fun question to ask the other two! <br>2. Take one minute and type out every single idea for a name for the goFundMe that pops into your mind. At the end of the minute, send your list to the group.<br>3. Choose your favorite two titles from the other two participants and suggest one or two improvements to each of these.<br>4. Collectively choose a top three from these improved titles and spend the remaining time (or less time if needed!) refining to choose your overall favorite title.<br><br>I’ll stop you once 15 minutes have elapsed. Ready, set, go!<br>",
    },
    {
      "student" : "huttonsydneygrace",
      "suid": "shutton1",
      "scaffold": "In this exercise, we are going to brainstorm creative titles for a GoFundMe campaign, with the aim of helping that campaign attract donations<br><br><br>Before we get started, I want to establish that there are no bad ideas! We want to generate as many ideas as possible, so don't feel afraid to think outside the box or say the first thing that comes to mind :)<br><br><br>Here’s the plan:<br><br><br>1. We are going to spend the first 3 minutes getting to know each other. Please take turns writing 2 truths and 1 lie, while the other participants try to guess the lie. <br>2. Next, please check out this GoFundMe https://www.gofundme.com/de4g5m-help-andy-walk-again<br>3. To start this brainstorm, please list out all the most obvious titles you can think of! (Ex:” Please donate money for medical expenses”)<br>4. When you feel like you have exhausted obvious titles, please list all the most out-there titles you can think of (Ex: “TRAGEDY ALERT: Innocent teen, pillar of the community victim of drive by - please help!!!”)<br>5. Then just keep generating all the ideas you can think of, eventually picking your favorite as a group. Build off each other’s ideas! We know you will come up with a great title!",
    },
    {
      "student" : "gartlandjackjoseph",
      "suid": "gartland",
      "scaffold": "Thanks for your help! Your goal is to work as a team to develop a name for this GoFundMe campaign: https://www.gofundme.com/slc6a1-connect. You will have 15 minutes to do this.<br><br>Please briefly review the webpage, and let your group know the first 3 words that come to mind when you see the topic. After you’ve shared your words, share your opinions on others’ words and how you might use them as a jumping off point for creating a good title. Then, you can dive right in!<br><br>Throughout your brainstorming, please keep the following guidelines in mind:<br><br>Always ask for feedback on your own ideas and respond politely and honestly when others ask for your thoughts on their ideas<br><br>Be polite! If you disagree with someone on your team, ask them to explain the reasoning behind their idea. If you still disagree, politely suggest an alternative and explain why you think it is an improvement.<br><br>Stay on topic... Except when that’s not yielding results: If your team members are discussing something, don’t change the subject abruptly. Instead, if there’s something else you think you need to address, acknowledge other’s contributions then politely suggest your topic.",
    },
    {
      "student" : "garcia-camargoisabella",
      "suid": "bellagc",
      "scaffold": "Hello Team! Today we will be helping the organization StandUp For Kids, who work to support homeless youth in our area. They have created a GoFundMe campaign (https://www.gofundme.com/webehomelessyouth) that could use some more traffic, so we need YOUR help to come up with an attention-grabbing title!<br><br>The current Title is: Inspire + Empower Homeless Youth<br><br>First, let’s start off with a quick icebreaker to get the creative juices flowing... your team has suddenly found itself on a deserted island! However, you find a magic genie that can grant you three items off the following list of (surprisingly useful) options.... get together and rank the importance of each item to your team’s survival to report back to the genie. (HINT: many of these have some hidden survival-ready uses... get creative!)<br>⁃ 30 gallon-jugs of milk<br>⁃ A friendly monkey named Tibby<br>⁃ 1 ton of Wrigley’s chewing gum<br>⁃ 500 bags of spicy Cheetos<br>⁃ A singular pencil sharpener<br>⁃ 300 pairs of Air Jordans<br>⁃ 100 down pillows<br><br>[[spend 4-6 minutes on this activity]]<br><br>Once you have finished the ice breaker, transition that creative energy into your task as a team. Start off with each team member proposing one title idea and discuss common threads. Then, come up with one idea that incorporates the best contributions from each team member, and iterate from there. Good luck!",
    },
    {
      "student" : "agarwalashwinkumar",
      "suid": "aaga",
      "scaffold": "Welcome! Let’s get right down to it.<br><br>You are part of a team of 3 people and your goal is to brainstorm a new title for this GoFundMe campaign:<br><br>https://www.gofundme.com/seanlewfilm<br>[video] https://www.youtube.com/watch?v=O1T-HxC_jlg&t=3s<br><br>You’re gonna have 15 minutes total to collectively come up with a title. Here’s how you should aim to spend your time:<br>- Spend the first few minutes getting to know each other by<br>- A) briefly explaining why you chose the pseudonym that you have<br>- B) describing the most interesting thing(s) in your immediate surroundings (without giving your identity away)<br>- and C) telling everyone your greatest fear (!!) [My greatest fear is permanently losing the ability to love].<br><br>- Then take a few minutes to read through the campaign page and watch some of the video, and come back with some *terrible* ideas for titles. Shitty ideas only. You don’t even have to be funny. Try to spit out at least 3 bad ideas each.<br><br>- Once you’re bored of that, you can transition into thinking of some titles that are actually “good”. Maybe some of the bad ideas inspired something else. Whatever it is just run with it.<br><br>- Towards the end of the 15 minutes (or earlier if you feel like) you can start “remixing” previous title ideas (change words, rearrange the order etc.) to hone in on a final title.<br><br>- Make sure you’ve all agreed on a final title before 15 minutes are up That’s it! Have fun with it and good luck!",
    },
    {
      "student" : "patelveeral",
      "suid": "veeral",
      "scaffold": "Hey all—thank you for participating in this exercise for my homework assignment.<br><br>Here are the rules, you and your 2 teammates have 15 minutes to brainstorm a new creative title for the following GoFundMe campaign: https://www.gofundme.com/c9kjd-bernard-noble​.<br><br>Our main goal is to help this campaign attract more donations with a better title.<br><br>Before we get started, however, please share one thing you believe you have in common with your anonymous teammates.<br><br>I’ll send a reminder to submit your final title when there’s 5 minutes left.<br><br>Good luck!",
    },
    {
      "student" : "wongcaseysheyeong",
      "suid": "wongcs",
      "scaffold": "Hi! First of all just wanted to say thank you so much for doing this! I super appreciate it. It will only take 15 minutes with a short survey at the end. For this prototype, you will be working in groups of three to eventually create a title for a GoFundMe Campaign. First you’ll have a short introduction, then you’ll do a quick ice breaker activity, and then brainstorm titles for the campaign and vote for your favorite one. After, you will submit the favorite title and then individually submit the title you chose and individually answer a questionnaire (which is 7 questions long and you rate your response). <br><br>Here is the task! Please read through this before setting a timer for 15 minutes. <br>1. Introduce yourself! Say your name (first only), age, where you are from, and the most unusual thing you like to eat and a statement on why others should try it. (ex. “Casey, 20, from Baltimore Maryland, and I liked eating ketchup sandwiches growing up because they were light and easy and also sweet with the bread and ketchup) <br>2. Briefly type up your best work experience, either with a group at school, internship, or full time job. Spend about 30 seconds typing it up and then feel free to talk about it for a a few minutes. <br>3. Each person brainstorm 3 Titles for the following GoFundMe Campaign: https://www.gofundme.com/milton-the-dog. Try to make the titles diversified, meaning it could be simple, witty, or a dark horse idea (a little risky, but effective?). <br>4. Discuss the ideas and then vote on your favorite ones! Make sure that when the timer goes off you have chosen a title! <br>5. When you are done, text me and I will send you a survey for each of you to fill out individually :) <br><br>Ok! Set the Timer and Get started! <br>",
    },
    {
      "student" : "velascosonia",
      "suid": "svela7",
      "scaffold": "Hello all. Welcome to a new task with your newly formed team! Today, you will be heading towards the goal of submitting a GoFundMe campaign with the aim of helping that campaign attract donations for a new shelter for homeless children, but before that we need to get adjusted to your new team! :grinning:<br><br>So, we’re gonna take some time to set up ourselves and introduce ourselves. Let’s start by answering some of the following questions! Take your time answering and asking about each other. Use below as a starting point.<br><br>- What’s your favorite drink?<br>- Weirdest food you’ve eaten?<br>- Thoughts on babies?<br>- Describe the last time you got angry/frustrated. - What would you do with a million dollars?<br>- Do you have a hobby? What is it?<br>- Walk us through the last time you last took a risk.<br><br>Ex:<br>- Person A: I like boba!<br>- Person B: What’s that?<br>- Person A: :hushed: only the greatest drink! You have to try it!<br><br>Now, think about your team and your original goal to jointly come up with a single name for the campaign. In initial brainstorming, remember quantity is always best before narrowing choices. Also think of just typing out a list of about 3-5 names and then decide when everyone presses ‘enter’ to submit responses to get you started on brainstorming.<br><br>At the end, write “Campaign NAME: _______” to signal your team’s submission. (15 minutes max)",
    },
    {
      "student" : "rosenfeldclairelior",
      "suid": "clairero",
      "scaffold": "Welcome! You three are going to work together &amp; combine your collective brainpower, creativity, and awesomeness to generate a GoFundMe title for a campaign raising money for a summer reading program in Vermont:)<br><br>1. In the next 15 minutes, you three will be a team! So, to begin, discuss who will fill which role: time manager (ensures team obeys time limits for each portion of the brainstorm; should have a way to keep track of time!), cheerleader (supports teammates with compliments and encouragement), and scaffold navigator (makes sure the group follows these scaffold instructions) (1 minute).<br><br>2. Next, everyone read the campaign page: https://www.gofundme.com/f/2ug2vd-summer-reading (1 minute).<br><br>3. Start your brainstorm by compiling as many words/phrases as possible that you think relate to this fundraiser (2 minutes). Be creative! Write as many as possible!<br><br>4. After this brainstorm, discuss what information your GoFundMe title should contain. Discuss other qualities a &ldquo;good&rdquo; GoFundMe title should have (1 minute).<br><br>5. Next, start your title brainstorm! First, come up as many simple-- but informative-- titles for this GoFundMe as possible (1 minute).<br><br>6. Next, looking at those titles, brainstorm new titles that are especially creative and attention grabbing (2 minutes). Try alliteration! Try humor! Try an emotional appeal! Again, compile as many as possible!<br><br>7. Now, look back your list of related words and the qualities of a good GoFundMe title from earlier (step 4). Using this as inspiration, brainstorm new titles, either building off ones you&rsquo;ve already created or creating new titles entirely, and again, write down as many as you can! (1 minutes).",
    },
 ];

if (randomTaskOrderOn) {
  tasks = shuffle(tasks);
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

// Building task list
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
    products: tasks,
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
      console.log(data);
      let user = userPool.byMturkId(mturkId);
      console.log(
        chalk.blue(
          `RECONNECTED ${mturkId} in user pool (${user.id} => ${socket.id})`
        )
      );
      if (data.name_structure !== undefined && data.name_structure.username !== undefined) {
        console.log("DIDN'T HAVE TO CALL CREATEUSERNAME");
        socket.name_structure = data.name_structure;
        socket.username = data.name_structure.username;
      } else {
        console.log("HAD TO CALL CREATEUSERNAME");
        createUsername();
      }
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
        `We have enough users for this task. Please submit this task and you will be conpensated.<br>We will release more tasks like this soon and you can participate in the entire task to reach the full bonus.`
      );
      return;
    }
    const newUser = makeUser(userPool.byMturkId(socket.mturkId));
    users.push(newUser);
    console.log(`${newUser.name} (${newUser.mturkId}) added to users.`);

    //add friends for each user once the correct number of users is reached
    const numUsersRequired = teamSize ** 2;
    if (users.length === numUsersRequired) {
      console.log(`USER POOL: ${userPool.map(u => u.mturkId)}`);
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
      });
      // assign people to rooms/teams
      users.forEach(u => {
        u.person = people.pop();
      });
      const batchMturkIds = users.map(a => a.mturkId);
      // assigns hasBanged to new users
      if (assignQualifications && runningLive) {
        batchMturkIds.forEach(u => mturk.assignQuals(u, mturk.quals.hasBanged));
      }
      // remove willBang qualification from people who rolled over
      // remove people who rolled over from willBang database
      if (usingWillBang && runningLive) {
        batchMturkIds.forEach(u => {
          mturk.unassignQuals(
            u,
            mturk.quals.willBang,
            `We remove this qualification after workers pass a certain part of our experiment, to avoid repeating that part. It is not a problem with your work. Thanks for working on this experiment.`
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
          notifyUsList,
          `Rolled ${batchID} ${currentCondition} on ${taskURL}`,
          `Rolled over with: ${currentCondition} on port ${port} at ${taskURL}.`
        );
      }
      userAcquisitionStage = false;
      mturk.startTask();
    }

    db.users.insert(newUser, err => {
      console.log(
        err ? `Didn't store user: ${err}` : `Added ${newUser.mturkId} to DB.`
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

  //when the client emits 'typing', we broadcast it to tothers
  socket.on("typing", () => {
    useUser(socket, user => {
      users
        .filter(f => f.room === user.room)
        .forEach(f => {
          socket.broadcast.to(f.mturkId).emit("typing", {
            username: idToAlias(f, String(socket.mturkId))
          });
        });
    });
  });

  //when the client emits 'stop typing', we broadcast it to tothers
  socket.on("stop typing", () => {
    useUser(socket, user => {
      users
        .filter(f => f.room === user.room)
        .forEach(f => {
          socket.broadcast.to(f.mturkId).emit("stop typing", {
            username: idToAlias(f, String(socket.mturkId))
          });
        });
    });
  });

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

      // if (!experimentOver && !debugMode) {
      //     mturk.notifyWorkers([user.mturkId], "You've disconnected from our HIT", "You've disconnected from our" +
      //         " HIT. If you are unaware of why you have been disconnected, please email scaledhumanity@gmail.com"
      //         + " with your Mturk ID and the last things you did in the HIT.\n\nMturk ID: " + user.mturkId +
      //         "\nAssignment ID: " + user.assignmentId + '\nHIT ID: ' + mturk.returnCurrentHIT())
      // }

      //Handle last submitter leaving during a survey
      // if (user.eventSchedule[user.currentEvent] != "ready" && !experimentOver) {
      //   setTimeout(() => {
      //     if (!socket.connected) {
      //       console.log(
      //         "User has perminantly left during survey. Set to ready."
      //       );
      //       runReady();
      //     }
      //   }, 15 * 1000);
      // }

      console.log("Connected users: " + getUsersConnected().length);
      if (!suddenDeath && !userAcquisitionStage) {
        // sets users to ready when they disconnect
        user.ready = true;
      }
    });
  });

  //This appears to not work.
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
        eventSchedule[currentEvent] === "emergency-exit" ||
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
            notifyUsList,
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

      db.batch.count({batchComplete: true}, function (err, batchnum){
        experimentStarted = true;

        users.forEach(u => {
          if (autocompleteTestOn) {
          // WE DON'T USE THIS FOR 278
            let currentTask = tasks[batchnum*4 + currentRound];
            console.log("Current Product:", currentTask);
            let taskText = currentTask.scaffold;
            let teamNames = [
              tools.makeName().username,
              tools.makeName().username,
              tools.makeName().username,
              tools.makeName().username,
              tools.makeName().username
            ];
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
            let done_batch_pairs = Math.floor(batchnum/2);
            let tasks_per_pair = 12;
            let curr_rooms = Object.keys(teams[conditionRound]);
            let room_num = curr_rooms.indexOf(u.room);
            let rooms_per_round = curr_rooms.length;
            let task_index = tasks_per_pair*done_batch_pairs + currentRound*rooms_per_round + room_num;
            console.log(task_index);
        
            let currentTask = tasks[task_index];

            console.log("Current Product:", currentTask);

            let taskText = currentTask.scaffold;

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

        //console.log("Issued task for:", currentTask.student);
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
            id: 1,
            time: 0.001,
            message: `<strong>Be careful not to refresh or leave the page! If you do, you will not be able to return to the task and will not be compensated for your time.</strong>`
          },
          {
            id: 2,
            time: 0.002,
            message: `<strong>There are a total of 4 rounds of team interaction with a reflection survey following each one. You will receive the stated bonus pay if you thoughtfully fill out every survey question!</strong>`
          },
          {
            id: 3,
            time: 0.003,
            message: `The entire HIT will take no more than ${Math.round(
              roundMinutes * numRounds + 15
            )} minutes total.`
          },
          { id: 4, time: 0.005, message: `edited` },
          {
            id: 5,
            time: 0.005,
            message: `<strong>Reminders:</strong><br>1. Check out the instructions above and collaborate with your team members in the chat room to develop a text advertisement<br>2. The ad must be no more than <strong>30 characters long</strong>. <br>3. Instructions will be given for submitting the team's final product. <br>4. You have ${textifyTime(
              roundMinutes
            )} to complete this round.`
          },
          {
            id: 6,
            time: 0.007,
            message: `<strong>Example:</strong><br>Text advertisements for 'Renaissance Golf Club': <br><ul style='list-style-type:disc'><li><strong>An empowering modern club</strong><br></li><li><strong>A private club with reach</strong><br></li><li><strong>Don't Wait. Discover Renaissance Today</strong></li></ul><br>`
          },
          {
            id: 7,
            time: 0.01,
            message:
              "<br><strong>HIT bot: Take a minute to review all instructions above.</strong>"
          },
          {
            id: 8,
            time: 0.9,
            message:
              "<br><strong>HIT bot: Submit the team's final ad by sending a message with a '!' directly in front of the text ad. Only the final submission with a '!' will be counted.</strong>"
          },
          {
            id: 9,
            time: 0.95,
            message: "<br><strong>HIT bot: Last chance to submit!</strong>"
          },
        ];

        // Execute steps
        taskSteps.forEach(step => {
          setTimeout(() => {
            if (step.message) {
              if (step.id === 4) {
                console.log(chalk.inverse(" Task step "), "variable");
                let curr_rooms = Object.keys(teams[conditionRound]);
                curr_rooms.forEach(r => {
                  users.filter(u => u.room === r).forEach(user => {
                    let done_batch_pairs = Math.floor(batchnum/2);
                    let tasks_per_pair = 12;
                    let room_num = curr_rooms.indexOf(user.room);
                    let rooms_per_round = curr_rooms.length;
                    let task_index = tasks_per_pair*done_batch_pairs + currentRound*rooms_per_round + room_num;
                    let taskText = tasks[task_index].scaffold;
                    let message = `<strong>Directions:</strong><br><br><strong>${taskText}</strong>`;
                    ioEmitById(user.mturkId,
                      "message clients",
                      message, 
                      socket,
                      user
                    );
                  });
                });
              } else {
                console.log(chalk.inverse(" Task step "), step.message);
                ioSocketsEmit("message clients", step.message);
              }
            }
            if (typeof step.action === "function") step.action();
          }, step.time * roundMinutes * 60 * 1000);
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
        }, 1000 * 60 * roundMinutes);

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
            "You will be compensated by clicking submit below. If you completed rounds of the main task, you will be bonused based on the time it took to complete those rounds."
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

  socket.on("emergency-exit", data => {
    useUser(socket, user => {
      user.results.engagementFeedback = responseToJSON(data);
      updateUserInDB(socket, "bonus", currentBonus());
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

// replaces other users IDs with user.friend alieses in string
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
