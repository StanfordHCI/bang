require('dotenv').config()

//Environmental settings, set in .env
const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE" //ONLY CHANGE ON SERVER
const teamSize = process.env.TEAM_SIZE
const roundMinutes = process.env.ROUND_MINUTES

//Parameters for waiting qualifications
//MAKE SURE secondsToWait > secondsSinceResponse
const secondsToWait = 60 //number of seconds users must have been on pretask to meet qualification (e.g. 120)
const secondsSinceResponse = 59 //number of seconds since last message users sent to meet pretask qualification (e.g. 20)
const secondsToHold1 = 720 //maximum number of seconds we allow someone to stay in the pretask (e.g. 720)
const secondsToHold2 = 180 //maximum number of seconds of inactivity that we allow in pretask (e.g. 60)

// Toggles
const runExperimentNow = true
const issueBonusesNow = false
const emailingWorkers = false

const cleanHITs = false
const assignQualifications = false
const debugMode = !runningLive

const suddenDeath = false
let setPerson = false

const multipleHITs = false // cross-check with mturkTools.js

const randomCondition = false
const randomRoundOrder = false

const waitChatOn = false //MAKE SURE THIS IS THE SAME IN CLIENT
const psychologicalSafetyOn = false
const IRBOn = true
const starterSurveyOn = false
const midSurveyOn = false
const blacklistOn = false
const teamfeedbackOn = false
const checkinOn = false
const timeCheckOn = true // tracks time user spends on task and updates payment - also tracks how long each task is taking
const requiredOn = false
const checkinIntervalMinutes = roundMinutes/30

//Testing toggles
const autocompleteTestOn = false //turns on fake team to test autocomplete
const debugLog = (...args) => {if (debugMode){console.log(...args)}}

console.log(runningLive ? "\nRUNNING LIVE\n" : "\nRUNNING SANDBOXED\n");
console.log(runningLocal ? "Running locally" : "Running remotely");

// Question Files
const fs = require('fs')
const txt = "txt/"
const midSurveyFile = txt + "midsurvey-q.txt"
const psychologicalSafetyFile = txt + "psychologicalsafety-q.txt"
const checkinFile = txt + "checkin-q.txt"
const blacklistFile = txt + "blacklist-q.txt"
const feedbackFile = txt + "feedback-q.txt"
const starterSurveyFile = txt + "startersurvey-q.txt"
const postSurveyFile = txt + "postsurvey-q.txt"
const botFile = txt + 'botquestions.txt'
const IRBFile = txt + 'IRB.txt'
const leaveHitFile = txt + "leave-hit-q.txt"

// Answer Option Sets
const IRB = {answers: ['Agree', 'Disagree and exit the study'], answerType: 'radio', textValue: true}
const answers = {answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], answerType: 'radio', textValue: true}
const binaryAnswers = {answers: ['Yes', 'No'], answerType: 'radio', textValue: true}
const leaveHitAnswers = {answers: ['End Task and Send Feedback', 'Return to Task'], answerType: 'radio', textValue: false}
const IRBAnswers= {answers: ['Agree', 'Disagree, leave task now'], answerType: 'radio', textValue: false}


// Setup basic express server
let tools = require('./tools');
let mturk = require('./mturkTools');
let express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
server.listen(port, () => { console.log('Server listening at port %d', port); });

Array.prototype.pick = function() { return this[Math.floor(Math.random() * this.length)] };
Array.prototype.byID = function(id) { return this.find(user => user.id === id) };
Array.prototype.set = function() {
  const setArray = []
  this.forEach(element => { if (!setArray.includes(element)) { setArray.push(element) } })
  return setArray
};

// Experiment variables
const conditionsAvailalbe = ['control','treatment','baseline']
const currentCondition = randomCondition ? conditionsAvailalbe.pick() : conditionsAvailalbe[1]
let treatmentNow = false
let firstRun = false;
let hasAddedUsers = false;//lock on adding users to db/experiment for experiment

const roundOrdering = [
  {"control": [1,2,1], "treatment": [1,2,1], "baseline": [1,2,3]},
  {"control": [2,1,1], "treatment": [2,1,1], "baseline": [1,2,3]},
  {"control": [1,1,2], "treatment": [1,1,2], "baseline": [1,2,3]}]

const experimentRoundIndicator = 1//PK: is this different that roundNum?
const conditions = randomRoundOrder ? roundOrdering.pick() : roundOrdering[0]
const experimentRound = conditions[currentCondition].lastIndexOf(experimentRoundIndicator) //assumes that the manipulation is always the last instance of team 1's interaction.
console.log(currentCondition,'with',conditions[currentCondition]);
const numRounds = conditions.baseline.length

const numberOfRooms = teamSize * numRounds
const rooms = tools.letters.slice(0,numberOfRooms)
const people = tools.letters.slice(0,teamSize ** 2)
const population = people.length
const teams = tools.createTeams(teamSize,numRounds,people)

const batchID = Date.now();
console.log("Launching batch",batchID);

// Setting up DB
const Datastore = require('nedb'),
    db = {};
    db.users = new Datastore({ filename:'.data/users', autoload: true, timestampData: true });
    db.chats = new Datastore({ filename:'.data/chats', autoload: true, timestampData: true});
    db.starterSurvey = new Datastore({ filename:'.data/starterSurvey', autoload: true, timestampData: true});
    db.checkins = new Datastore({ filename:'.data/checkins', autoload: true, timestampData: true});
    db.teamFeedback = new Datastore({ filename:'.data/teamFeedback', autoload: true, timestampData: true});
    db.psychologicalSafety = new Datastore({ filename:'.data/psychologicalSafety', autoload: true, timestampData: true});
    db.IRB = new Datastore({ filename:'.data/IRB', autoload: true, timestampData: true});
    db.blacklist = new Datastore({ filename:'.data/blacklist', autoload: true, timestampData: true});
    db.midSurvey = new Datastore({ filename:'.data/midSurvey', autoload: true, timestampData: true});
    db.batch = new Datastore({ filename:'.data/batch', autoload: true, timestampData: true});
    db.time = new Datastore({ filename:'.data/time', autoload: true, timestampData: true});
    db.leavingMessage = new Datastore({filename: '.data/leavingMessage', autoload: true, timestampData: true})
    db.ourHITs = new Datastore({ filename:'.data/ourHITs', autoload: true, timestampData: true})

function updateUserInDB(user,field,value) {
  //PK: safeguard here?
  db.users.update( {id: user.id}, {$set: {field: value}}, {},
    err => console.log(err ? "Err recording "+field+": "+err : "Updated "+field+" "+user.id+"\n"+value+"\n")
  )
}

//Mturk background tasks
db.users.find({}, (err, usersInDB) => {
  if (err) {console.log("DB for MTurk:" + err)} else {
    if (issueBonusesNow) {
      mturk.payBonuses(usersInDB).forEach(u => updateUserInDB(u,'bonus',0))
    }
    if (assignQualifications) {
      mturk.assignQualificationToUsers(usersInDB)
      mturk.listUsersWithQualification()
    }
  }
})

// expires active HITs in the DB
if (cleanHITs){
  let activeHITs = mturk.returnActiveHITs();
  db.ourHITs.find({}, (err, HITsInDB) => {
    if (err) {console.log("Err loading HITS for expiration:" + err)} else {
      HITsInDB.forEach((HIT) => {
        let currentHIT = HIT.currentHIT;
        if(activeHITs.includes(currentHIT)) { mturk.expireActiveHits(currentHIT); }
      })
    }
  })
}
if (runExperimentNow){ mturk.launchBang() }


//console.log('running notify')
//mturk.notify();



//Add more products
let products = [{'name':'KOSMOS ink - Magnetic Fountain Pen',
                 'url': 'https://www.kickstarter.com/projects/stilform/kosmos-ink' },
                {'name':'Projka: Multi-Function Accessory Pouches',
                 'url': 'https://www.kickstarter.com/projects/535342561/projka-multi-function-accessory-pouches' },
                {'name':"First Swiss Automatic Pilot's watch in TITANIUM & CERAMIC",
                 'url': 'https://www.kickstarter.com/projects/chazanow/liv-watches-titanium-ceramic-chrono' }]

let users = []; //the main local user storage
let userPool = []; //accumulates users pre-experiment
let currentRound = 0 //PK: talk about 0-indexed v 1-indexed round numbers (note: if change -> change parts of code reliant on 0-indexed round num)
let startTime = 0
let preExperiment = true

// keeping track of time
let taskStartTime = getSecondsPassed(); // reset for each start of new task
let taskEndTime = 0;
let taskTime = 0;

// Building task list
let eventSchedule = []
if (IRBOn) {
  eventSchedule.push("IRB")
}
if (starterSurveyOn) {
  eventSchedule.push("starterSurvey")
}
let roundSchedule = []
roundSchedule.push("ready")
if (midSurveyOn) {
  roundSchedule.push("midSurvey")
}
if (psychologicalSafetyOn) {
  roundSchedule.push("psychologicalSafety")
}
if (teamfeedbackOn) {
  roundSchedule.push("teamfeedbackSurvey")
}
roundSchedule = replicate(roundSchedule, numRounds)
eventSchedule= eventSchedule.concat(roundSchedule)
if (blacklistOn) {
  eventSchedule.push("blacklistSurvey")
}
eventSchedule.push("postSurvey")
eventSchedule.push("finished")
console.log(eventSchedule)

let fullUrl = ''

app.use(express.static('public'));

// Adds Batch data for this experiment. unique batchID based on time/date
db.batch.insert({'batchID': batchID,'IRBon': IRBOn, 'starterSurveyOn':starterSurveyOn,'midSurveyOn':midSurveyOn, 'blacklistOn': blacklistOn,
        'teamfeedbackOn': teamfeedbackOn, 'psychologicalSafetyOn' : psychologicalSafetyOn, 'checkinOn': checkinOn, 'conditions': conditions, 'experimentRound': experimentRound,
        'numRounds': numRounds, 'teamSize': teamSize}, (err, usersAdded) => {
    if(err) console.log("There's a problem adding batch to the DB: ", err);
    else if(usersAdded) console.log("Batch added to the DB");
    console.log("Leftover sockets from previous run:" + Object.keys(io.sockets.sockets));
    if (!firstRun) {
      Object.keys(io.sockets.sockets).forEach(socketID => {
        io.sockets.sockets[socketID].disconnect(true);
      })
      firstRun = true;
    }
}); // eventSchedule instead of all of the toggles? (missing checkinOn) //PK: what does this comment mean?

// Timer to catch ID after HIT has been posted - this is sketchy, as unknown when HIT will be posted
setTimeout(() => {
  if(multipleHITs) {
    let currentHIT = mturk.returnCurrentHIT();
    for(i = 0; i < currentHIT.length(); i++) {
      db.ourHITs.insert({'currentHIT': currentHIT[i]}, (err, HITAdded) => {
        if(err) console.log("There's a problem adding HIT to the DB: ", err);
        else if(HITAdded) console.log("HIT added to the DB: ", currentHIT[i]);
      })
    }
  } else {
    let currentHIT = mturk.returnCurrentHIT();
    db.ourHITs.insert({'currentHIT': currentHIT}, (err, HITAdded) => {
      if(err) console.log("There's a problem adding HIT to the DB: ", err);
      else if(HITAdded) console.log("HIT added to the DB: ", currentHIT);
    })
  }
}, 1000 * 12)

// Chatroom
io.on('connection', (socket) => {
  //PK: what are these bools for?
    let experimentStarted = false //NOTE: this will be set multiple times but I don't think that's what is wanted in this case
    let experimentOver = false

    socket.on('get username', data => {
      name_structure = tools.makeName();
      socket.name_structure = name_structure;
      socket.username = name_structure.username;
      socket.emit('set username', {username: socket.username})
    })

    socket.on('accepted HIT', data => {
      if(users.length === teamSize ** 2) { //this is equivalent to "experiment has started"
        if (emailingWorkers) {
          io.in(socket.id).emit('finished', {
            message: "We don't need you to work right now. Please await further instructions from scaledhumanity@gmail.com. Don't worry, you're still getting paid for your time!",
            finishingCode: socket.id,
            turkSubmitTo: mturk.submitTo,
            assignmentId: data.assignmentId,
            crashed: false
          })
        }
        else {
          io.in(socket.id).emit('finished', {
            message: "We have enough users on this task. Hit the button below and you will be compensated appropriately for your time. Thank you!",
            finishingCode: socket.id,
            turkSubmitTo: mturk.submitTo,
            assignmentId: data.assignmentId,
            crashed: false
          })
        }
        return;
      }
      userPool.push({
        "id": socket.id,
        "mturkId": data.mturkId,
        "turkSubmitTo": data.turkSubmitTo,
        "assignmentId": data.assignmentId,
        "connected": true,
        "active": waitChatOn ? false : true,
        "timeAdded": data.timeAdded,
        "timeLastActivity": data.timeAdded
      });

      mturk.setAssignmentsPending(getPoolUsersConnected().length)
      // debugLog(userPool, "users accepted currently: " + userPool.length)

      // Disconnect leftover users PK: can we do this on start rather than in 'accepted HIT'
        Object.keys(io.sockets.sockets).forEach(socketID => {
          if (userPool.every(user => {return user.id !== socketID})) {
            console.log("Removing dead socket: " + socketID);
            io.in(socketID).emit('get IDs', 'broken');
          }
        });
        var timeNow = new Date(Date.now())
        console.log("This is as of " +  (Date.now()-batchID)/1000 + " seconds since starting the experiment. Printed at", timeNow.getMinutes(), "minutes and", timeNow.getSeconds(), " seconds on the hour.")
        console.log("Sockets active: " + Object.keys(io.sockets.sockets));
        updateUserPool();
    })

    //PK: was there a concurrency reason we used to pass usersAccepted into checkUsersAccepted()
    function updateUserPool(){
      if(users.length === teamSize ** 2) return; //PK: if exp has already started, change to condition on state variable

      function secondsSince(event) {return (Date.now() - event)/1000}
      function updateUsersActive() {
        userPool.forEach(user => {
          //PK: rename secondsToWait
          if(secondsSince(user.timeAdded) > secondsToWait && secondsSince(user.timeLastActivity) < secondsSinceResponse) { // PK: make isUserOnCall fxn
            user.active = true;
          } else {
            user.active = false;
          }
          weightedHoldingSeconds = secondsToHold1 + 0.33*(secondsToHold1/(teamSize**2 - getPoolUsersActive().length)) // PK: make isUserInactive fxn
          if (secondsSince(user.timeAdded) > weightedHoldingSeconds || secondsSince(user.timeLastActivity) > secondsToHold2) {
            console.log('removing user because of inactivity:', user.id);
            io.in(user.id).emit('get IDs', 'broken');
          }
        })
      }

      if(waitChatOn) updateUsersActive();
      const usersActive = getPoolUsersActive();
      console.log("Users active: " + usersActive.length)
      console.log("Users connected: " + getPoolUsersConnected().length)
      console.log("Users in pool: " + userPool.length)
      if(waitChatOn){
        if(!hasAddedUsers && usersActive.length >= teamSize ** 2) {//if have enough active users and had not added users before
          hasAddedUsers = true;
          for(let i = 0; i < usersActive.length; i ++){ //for every active user
            let user = usersActive[i];
            if(i < teamSize ** 2) { //take the 1st teamssize **2 users and add them
              io.in(user.id).emit("echo", "add user");
              io.in(user.id).emit('initiate experiment');
            } else { //else emit finish
              console.log('EMIT FINISH TO EXTRA ACTIVE WORKER')
              if (emailingWorkers) {
                io.in(user.id).emit('finished', {
                  message: "We don't need you to work at this specific moment, but we may have tasks for you soon. Please await further instructions from scaledhumanity@gmail.com. Don't worry, you're still getting paid for your time!",
                  finishingCode: socket.id, turkSubmitTo: mturk.submitTo, assignmentId: user.assignmentId
                });
              }
              else {
                io.in(user.id).emit('finished', {
                  message: "Thanks for participating, you're all done!",
                  finishingCode: socket.id, turkSubmitTo: mturk.submitTo, assignmentId: user.assignmentId
                });
              }
            }
          }
          userPool.filter(user => !usersActive.byID(user.id)).forEach(user => {//
            console.log('EMIT FINISH TO NONACTIVE OR DISCONNECTED WORKER')

            if (emailingWorkers) {
              io.in(user.id).emit('finished', {
                message: "We don't need you to work at this specific moment, but we may have tasks for you soon. Please await further instructions from scaledhumanity@gmail.com. Don't worry, you're still getting paid for your time!",
                finishingCode: socket.id, turkSubmitTo: mturk.submitTo, assignmentId: user.assignmentId
              });
            }
            else {
              io.in(user.id).emit('finished', {
                message: "Thanks for participating, you're all done!",
                finishingCode: socket.id, turkSubmitTo: mturk.submitTo, assignmentId: user.assignmentId
              });
            }
          })
        }
      } else {
        if(usersActive.length >= teamSize ** 2) {
          io.sockets.emit('update number waiting', {num: 0});
          console.log('there are ' + usersActive.length + ' users: ' + usersActive)
          for(let i = 0; i < usersActive.length; i ++){
            io.in(usersActive[i].id).emit('show chat link');
          }
        } else {
          io.sockets.emit('update number waiting', {num: teamSize ** 2 - usersActive.length});
        }
      }

    }

    function makeUser(data) {
      return {
        'id': socket.id,
        'mturkId': data.mturkId,
        'assignmentId': data.assignmentId,
        'room': '',
        'rooms':[],
        'bonus': 0,
        'person': '',
        'name': socket.username,
        'ready': false,
        'friends': [],
        'friends_history': [socket.name_structure.parts], // list of aliases to avoid, which includes the user's username//PK: is it okay to store this in the socket?
        'connected': true, //PK: what does user.active mean? is this ever set to false? I want to use 'active' instead of 'onCall' but need to check if this field is still needed
        'eventSchedule': eventSchedule,
        'currentEvent': 0,
        'results':{
          'condition':currentCondition,
          'format':conditions[currentCondition],
          'manipulation':[],
          'starterCheck':[],
          'viabilityCheck':[],
          'psychologicalSafety':[],
          'IRB':[],
          'manipulationCheck':'',
          'blacklistCheck':'',
          'engagementFeedback': '',
          'teamfracture':'',
          'teamfeedback':'',
        }
      };
    }
    socket.on('add user', data => {
      if (users.length === teamSize ** 2) { // PK: if experiment has already started, change to condition on state variable
        if (emailingWorkers) {
          io.in(socket.id).emit('finished', {
            message: "We don't need you to work right now. Please await further instructions from scaledhumanity@gmail.com. Don't worry, you're still getting paid for your time!",
            finishingCode: socket.id,
            turkSubmitTo: mturk.submitTo,
            assignmentId: data.assignmentId,
            crashed: false
          })
        }
        else {
          io.in(socket.id).emit('finished', {
            message: "We have enough users on this task. Hit the button below and you will be compensated appropriately for your time. Thank you!",
            finishingCode: socket.id,
            turkSubmitTo: mturk.submitTo,
            assignmentId: data.assignmentId,
            crashed: false
          })
        }
        return;
      }
//PK: should i add a quick fix here?
      if(users.byID(socket.id)){
        console.log('ERR: ADDING A USER ALREADY IN USERS')
      }
      let newUser = makeUser(userPool.byID(socket.id));
      users.push(newUser)
      console.log(newUser.name + " added to users.\n" + "Total users: " + users.length)
      //add friends for each user once the correct number of users is reached
      if(users.length === teamSize **2){
        debugLog(userPool, "USER POOL: " + userPool.length)
        console.log('MTURK IDS: ')
        users.forEach(user => { //mutate the friend list of each user
          user.friends = users.map(u => { //create the alias through which each user sees every other user
            if (user.id != u.id) {
              return {'id': u.id,
                    'alias': tools.makeName().username,
                    'tAlias':tools.makeName().username }
            }
            else {
              return {'id': u.id,
                    'alias': u.name,
                    'tAlias': u.name }
            }
          });
          console.log(user.mturkId)
        })
      }

      db.users.insert(newUser, (err, usersAdded) => {
        console.log( err ? "Didn't store user: " + err : "Added " + newUser.name + " to DB.")
      });

      //PK: need to emit login to each? or can we delete login fxn in client if no longer in use (login sets connected to true, is this needed?)
      //io.in(user.id).emit('login', {numUsers: numUsers(user.room)})

    })

    socket.on('update user pool', (data) => {
      if(!userPool.byID(socket.id)) {
        console.log("***USER UNDEFINED*** in update user pool ..this would crash our thing but haha whatever")
        console.log('SOCKET ID: ' + socket.id)
        return;
      }//PK: quick fix
      if(!userPool.byID(socket.id).connected) {
        console.log("block ***USER NOT CONNECTED*** in update user pool")
        return;
      }
      userPool.byID(socket.id).timeLastActivity = data.time;
      updateUserPool()
    });

    socket.on('log', string => { console.log(string); });

    //Route messages
    socket.on('new message', function (message) {
      let user = users.byID(socket.id)//PK: this used to have no 'let'
      if(!user) {
        console.log("***USER UNDEFINED*** in new message ..this would crash out thing but haha whatever")
        console.log('SOCKET ID: ' + socket.id)
        return;
      }
      if(!user.connected) {
        console.log("block ***USER NOT CONNECTED*** in new message")
        return;
      }
      let cleanMessage = message;
      users.forEach(u => { cleanMessage = aliasToID(u, cleanMessage)});

      db.chats.insert({'room':user.room,'userID':socket.id, 'message': cleanMessage, 'time': getSecondsPassed(), 'batch': batchID, 'round': currentRound}, (err, usersAdded) => {
        if(err) console.log("Error storing message:", err)
        else console.log("Message in", user.room, "from",user.name +":" ,cleanMessage)
      });

      users.filter(f => f.room == user.room).forEach(f => {
        socket.broadcast.to(f.id).emit('new message', {
          username: idToAlias(f, String(socket.id)),
          message: idToAlias(f, cleanMessage)
        });
      });
    });

    //when the client emits 'new checkin', this listens and executes
    socket.on('new checkin', function (value) {
      let user = users.byID(socket.id)//PK: this used to have no 'let'
      if(!user) {
        console.log("***USER UNDEFINED*** in new checkin ..this would crash out thing but haha whatever")
        console.log('SOCKET ID: ' + socket.id)
        return;
      }
      if(!user.connected) {
        console.log("block ***USER NOT CONNECTED*** in new checkin")
        return;
      }
      //^new
      console.log(socket.username + "checked in with value " + value);
      let currentRoom = users.byID(socket.id).room;
      db.checkins.insert({'room':currentRoom, 'userID':socket.id, 'value': value, 'time': getSecondsPassed(), 'batch':batchID}, (err, usersAdded) => {
          if(err) console.log("There's a problem adding a checkin to the DB: ", err);
          else console.log("Checkin added to the DB");
        });
    });

    socket.on('load bot qs', () => {
      io.in(socket.id).emit('chatbot', loadQuestions(botFile))
    })


    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        // changes connected to false of disconnected user in userPool
        console.log("Disconnecting socket: " + socket.id)
        if (userPool.find(function(element) {return element.id == socket.id})) {
          console.log('There was a disconnect');
          //userPool = userPool.filter(user => user.id != socket.id);
          userPool.byID(socket.id).connected = false;
          let usersActive = getPoolUsersActive()
          if(usersActive.length >= teamSize ** 2) {
            io.sockets.emit('update number waiting', {num: 0});
          } else {
            io.sockets.emit('update number waiting', {num: (teamSize ** 2) - usersActive.length});
          }

          mturk.setAssignmentsPending(getPoolUsersConnected().length)
        }

        if (!users.every(user => socket.id !== user.id)) {//socket id is found in users
          users.byID(socket.id).connected = false //set user to disconnected
          users.byID(socket.id).ready = false //set user to not ready
          if (!suddenDeath) {users.byID(socket.id).ready = true}

          // update DB with change
          updateUserInDB(socket,'connected',false)

          if (!experimentOver && !suddenDeath) {console.log("Sudden death is off, so we will not cancel the run")}

          if (!experimentOver && suddenDeath && experimentStarted){//PK: what does this if condition mean
            // Start cancel process

            if(multipleHITs) {
              let currentHIT = mturk.returnCurrentHIT();
              for(i = 0; i < currentHIT.length(); i++) {
                db.ourHITs.insert({'currentHIT': currentHIT[i]}, (err, HITAdded) => {
                  if(err) console.log("There's a problem adding HIT to the DB: ", err);
                  else if(HITAdded) console.log("HIT added to the DB: ", currentHIT[i]);
                })
              }
            } else {
              let currentHIT = mturk.returnCurrentHIT();
              db.ourHITs.insert({'currentHIT': currentHIT}, (err, HITAdded) => {
                if(err) console.log("There's a problem adding HIT to the DB: ", err);
                else if(HITAdded) console.log("HIT added to the DB: ", currentHIT);
              })
            }

            console.log("User left, emitting cancel to all users");

            let totalTime = getSecondsPassed();

            if(timeCheckOn) {
              db.time.insert({totalTaskTime: totalTime}, (err, timeAdded) => {
                if(err) console.log("There's a problem adding total time to the DB: ", err);
                else if(timeAdded) console.log("Total time added to the DB");
              })
            }

            users.filter(u => u.id != socket.id).forEach((user) => {
              let cancelMessage = "<strong>Someone left the task.</strong><br> <br> \
              Unfortunately, our group task requires a specific number of users to run, \
              so once a user leaves, our task cannot proceed. <br><br> \
              To complete the task, please provide suggestions of ways to \
              prevent people leaving in future runs of the study. <br><br> \
              Since the team activity had already started, you will be additionally \
              bonused for the time spent working with the team."
              if (experimentStarted) { // Add future bonus pay
                if(timeCheckOn) {
                  mturk.updatePayment(totalTime);
                  user.bonus += mturk.bonusPrice
                } else {
                  user.bonus += mturk.bonusPrice/2
                }
                updateUserInDB(user,'bonus',user.bonus)
                if(multipleHITs) {
                  let currentHIT = mturk.returnCurrentHIT();
                  for(i = 0; i < currentHIT.length(); i++) {
                    db.ourHITs.insert({'currentHIT': currentHIT[i]}, (err, HITAdded) => {
                      if(err) console.log("There's a problem adding HIT to the DB: ", err);
                      else if(HITAdded) console.log("HIT added to the DB: ", currentHIT[i]);
                    })
                  }
                } else {
                  let currentHIT = mturk.returnCurrentHIT();
                  db.ourHITs.insert({'currentHIT': currentHIT}, (err, HITAdded) => {
                    if(err) console.log("There's a problem adding HIT to the DB: ", err);
                    else if(HITAdded) console.log("HIT added to the DB: ", currentHIT);
                  })
                }

              }
              io.in(user.id).emit('finished', {
                  message: cancelMessage,
                  finishingCode: user.id,
                  turkSubmitTo: mturk.submitTo,
                  assignmentId: user.assignmentId,
                  crashed: true
              })
            })
          }
        }
        if (!suddenDeath && users.length !== 0 && !users.every(user => user.id !== socket.id)) { //this sets users to ready when they disconnect; TODO remove user from users
          users.byID(socket.id).ready = true
        }
        //users = users.filter(user => user.id != socket.id); // PK: now users should contain only teamSize ** 2 users (the exact amt for exp), come back when not brain dead

    });

    socket.on("next event", (data) => {
      let user = users.byID(socket.id)
      if(!user) {
        console.log("***USER UNDEFINED*** in 'next event'..this would crash out thing but haha whatever")
        console.log('SOCKET ID: ' + socket.id)
        return;
      }//PK: quick fix, next event still called for 'user' never added to users, come back to this
      if(!user.connected) {
        console.log("block ***USER NOT CONNECTED*** in 'next event'")
        return;
      }
      let currentEvent = user.currentEvent;
      let eventSchedule = user.eventSchedule;
      console.log ("Event " + currentEvent + ": " + eventSchedule[currentEvent] + " | User: " + user.name)

      if (eventSchedule[currentEvent] == "starterSurvey") {
        io.in(user.id).emit("load", {element: 'starterSurvey', questions: loadQuestions(starterSurveyFile), interstitial: false, showHeaderBar: false});
        taskStartTime = getSecondsPassed();
      }
      else if (eventSchedule[currentEvent] == "ready") {
        if(starterSurveyOn && timeCheckOn) {
          recordTime("starterSurvey");
        }
        if (checkinOn) {
          io.in(user.id).emit("load", {element: 'checkin', questions: loadQuestions(checkinFile), interstitial: true, showHeaderBar: true});
        }
        io.in(user.id).emit("load", {element: 'leave-hit', questions: loadQuestions(leaveHitFile), interstitial: true, showHeaderBar: true})
        io.in(user.id).emit("echo", "ready");

      }
      else if (eventSchedule[currentEvent] == "midSurvey") {
        if(timeCheckOn) {
          recordTime("round");
        }
        io.in(user.id).emit("load", {element: 'midSurvey', questions: loadQuestions(midSurveyFile), interstitial: false, showHeaderBar: true});
      }
       else if (eventSchedule[currentEvent] == "psychologicalSafety") {
        if(timeCheckOn) {
          recordTime("round");
        }
        io.in(user.id).emit("load", {element: 'psychologicalSafety', questions: loadQuestions(psychologicalSafetyFile), interstitial: false, showHeaderBar: true});
      }
       else if (eventSchedule[currentEvent] == "IRB") {
        if(timeCheckOn) {
          recordTime("round");
        }
        io.in(user.id).emit("load", {element: 'IRB', questions: loadQuestions(IRBFile), interstitial: false, showHeaderBar: true});
      }
      else if (eventSchedule[currentEvent] == "teamfeedbackSurvey") {
        if(midSurveyOn && timeCheckOn) {
          recordTime("midSurvey");
        } else if(timeCheckOn) {
          recordTime("round");
        }
        io.in(user.id).emit("load", {element: 'teamfeedbackSurvey', questions: loadQuestions(feedbackFile), interstitial: false, showHeaderBar: true});
      }
      else if (eventSchedule[currentEvent] == "blacklistSurvey") {
        experimentOver = true
        if(teamfeedbackOn && timeCheckOn) {
          recordTime("teamfeedbackSurvey");
        } else if(midSurveyOn && timeCheckOn) {
          recordTime("midSurvey");
        } else if(timeCheckOn) {
          recordTime("round");
        } else if(psychologicalSafetyOn) {
          recordTime("psychologicalSafety")}
        console.log({element: 'blacklistSurvey', questions: loadQuestions(blacklistFile), interstitial: false, showHeaderBar: false})
        io.in(user.id).emit("load", {element: 'blacklistSurvey', questions: loadQuestions(blacklistFile), interstitial: false, showHeaderBar: false});
      }
      else if (eventSchedule[currentEvent] == "postSurvey") { //Launch post survey
        if(blacklistOn && timeCheckOn) {
          recordTime("blacklistSurvey");
        } else if(teamfeedbackOn && timeCheckOn) {
          recordTime("teamfeedbackSurvey");
        } else if(midSurveyOn && timeCheckOn) {
          recordTime("midSurvey");
        } else if(timeCheckOn) {
          recordTime("round");
        }
        let survey = postSurveyGenerator(user)
        user.results.manipulation = survey.correctAnswer
        updateUserInDB(user,'results.manipulation',user.results.manipulation)
        io.in(user.id).emit("load", {element: 'postSurvey', questions: loadQuestions(postSurveyFile), interstitial: false, showHeaderBar: false});
      }
      else if (eventSchedule[currentEvent] == "finished" || currentEvent > eventSchedule.length) {
        if(timeCheckOn) {
          recordTime("postSurvey");
        }
        user.bonus += mturk.bonusPrice
        updateUserInDB(user,"bonus",user.bonus)

        if(multipleHITs) {
          let currentHIT = mturk.returnCurrentHIT();
          for(i = 0; i < currentHIT.length(); i++) {
            db.ourHITs.insert({'currentHIT': currentHIT[i]}, (err, HITAdded) => {
              if(err) console.log("There's a problem adding HIT to the DB: ", err);
              else if(HITAdded) console.log("HIT added to the DB: ", currentHIT[i]);
            })
          }
        } else {
          let currentHIT = mturk.returnCurrentHIT();
          db.ourHITs.insert({'currentHIT': currentHIT}, (err, HITAdded) => {
            if(err) console.log("There's a problem adding HIT to the DB: ", err);
            else if(HITAdded) console.log("HIT added to the DB: ", currentHIT);
          })
        }

        io.in(socket.id).emit('finished', {
          message: "Thanks for participating, you're all done!",
          finishingCode: socket.id,
          turkSubmitTo: mturk.submitTo,
          assignmentId: user.assignmentIdd
        })
      }
      user.currentEvent += 1
    })

    // Main experiment run
    socket.on('ready', function (data) {
      if(!users.byID(socket.id)) {
        console.log("***USER UNDEFINED*** in ready ..this would crash out thing but haha whatever")
        console.log('SOCKET ID: ' + socket.id)
        return;
      }
      if(!users.byID(socket.id).connected) {
        console.log("block ***USER NOT CONNECTED*** in ready")
        return;
      }
      //waits until user ends up on correct link before adding user - repeated code, make function //PK: what does this comment mean/ is it still relevant?
      users.byID(socket.id).ready = true;
      console.log(socket.username, 'is ready');

      if (users.filter(u => !u.ready).length ) {
        console.log("some users not ready", users.filter(u => !u.ready).map(u => u.name))
        return
      }

      //PK: still relevant? can we delete this commented out code and/or incompleteRooms()?
      // if (incompleteRooms().length) {
      //   console.log("Some rooms empty:",incompleteRooms())
      //   return } //are all rooms assigned
      if ((suddenDeath || preExperiment) && users.length != teamSize ** 2) {
        console.log("Need",teamSize ** 2 - users.length,"more users.")
        return
      }

      console.log('all users ready -> starting experiment');
      //can we move this into its own on.*** call //PK: still relevant?

      // assign people to rooms/teams before experiment begins
      if(preExperiment){
        users.forEach(u => {
          u.person = people.pop();
        })
         preExperiment = false;
      }
      treatmentNow = (currentCondition == "treatment" && currentRound == experimentRound)
      const conditionRound = conditions[currentCondition][currentRound] - 1

      Object.entries(teams[conditionRound]).forEach(([roomName,room]) => {
        users.filter(u => room.includes(u.person)).forEach(u => {
          u.room = roomName
          u.rooms.push(roomName)
          u.ready = false //return users to unready state
          if (!suddenDeath && !u.connected) {u.ready = true}
          console.log(u.name, '-> room', u.room);
        })
      })

      //Notify user 'initiate round' and send task.
      let currentProduct = products[currentRound]
      let taskText = "Design text advertisement for <strong><a href='" + currentProduct.url + "' target='_blank'>" + currentProduct.name + "</a></strong>!"

      experimentStarted = true
      mturk.startTask();

      users.forEach(user => {
        if (autocompleteTestOn) {
          let teamNames = [tools.makeName().username, tools.makeName().username, tools.makeName().username, tools.makeName().username, tools.makeName().username]
          console.log(teamNames)
          io.in(user.id).emit('initiate round', {task: taskText, team: teamNames, duration: roundMinutes, randomAnimal: tools.randomAnimal, round: currentRound + 1})//rounds are 0 indexed
        } else {
          // Dynamically generate teammate names
          // even if teamSize = 1 for testing, this still works
          let team_Aliases = tools.makeName(teamSize - 1, user.friends_history)
          user.friends_history = user.friends_history.concat(team_Aliases)

          let teamMates = user.friends.filter(friend => { return (users.byID(friend.id)) && (users.byID(friend.id).room == user.room) && (friend.id !== user.id)});
          for (i = 0; i < teamMates.length; i++) {
            if (treatmentNow) {
              teamMates[i].tAlias = team_Aliases[i].join("")
              team_Aliases[i] = team_Aliases[i].join("")
            } else {
              if (currentRound == 0) { //if first round, create aliases
                teamMates[i].alias = team_Aliases[i].join("")
                team_Aliases[i] = team_Aliases[i].join("")
              }
              else { //if not, use previously created aliases
                team_Aliases[i] = teamMates[i].alias
              }
            }
          }

          team_Aliases.push(user.name) //now push user for autocomplete
          //let myteam = user.friends.filter(friend => { return (users.byID(friend.id).room == user.room)});
          // io.in(user.id).emit('initiate round', {task: taskText, team: user.friends.filter(friend => { return users.byID(friend.id).room == user.room }).map(friend => { return treatmentNow ? friend.tAlias : friend.alias }), duration: roundMinutes })
          io.in(user.id).emit('initiate round', {task: taskText, team: team_Aliases, duration: roundMinutes, randomAnimal: tools.randomAnimal, round: currentRound + 1})//round 0 indexed
        }
      })

      console.log('Issued task for:', currentProduct.name)
      console.log('Started round', currentRound, 'with,', roundMinutes, 'minute timer.');

      // save start time
      startTime = (new Date()).getTime();

      //Round warning
      // make timers run in serial
      setTimeout(() => {
        console.log('time warning', currentRound);
        users.forEach(user => { io.in(user.id).emit('timer', {time: roundMinutes * .1}) });

        //Done with round
        setTimeout(() => {
          console.log('done with round', currentRound);
          users.forEach(user => { io.in(user.id).emit('stop', {round: currentRound, survey: (IRBOn || midSurveyOn || teamfeedbackOn || psychologicalSafetyOn) }) });
          currentRound += 1 // guard to only do this when a round is actually done.
          console.log(currentRound, "out of", numRounds)
        }, 1000 * 60 * 0.1 * roundMinutes)
      }, 1000 * 60 * 0.9 * roundMinutes)


      //record start checkin time in db
      let currentRoom = users.byID(socket.id).room
      db.checkins.insert({'room':currentRoom, 'userID':socket.id, 'value': 0, 'time': getSecondsPassed(), 'batch':batchID}, (err, usersAdded) => {
        if(err) console.log("There's a problem adding a checkin to the DB: ", err);
        else if(usersAdded) console.log("Checkin added to the DB");
      });
      if(checkinOn){
        let numPopups = 0;
        let interval = setInterval(() => {
          if(numPopups >= roundMinutes / checkinIntervalMinutes - 1) {
            clearInterval(interval);
          } else {
            socket.emit("checkin popup");
            numPopups++;
          }
        }, 1000 * 60 * checkinIntervalMinutes)
      }
    })

  //if broken, tell users they're done and disconnect their socket
  socket.on('broken', (data) => {
    if (emailingWorkers) {
      socket.emit('finished', {finishingCode: "broken", turkSubmitTo: mturk.submitTo, assignmentId: data.assignmentId, message: "We've experienced an error. Please wait for an email from scaledhumanity@gmail.com with restart instructions."})
    }
    else {
      socket.emit('finished', {finishingCode: "broken", turkSubmitTo: mturk.submitTo, assignmentId: data.assignmentId, message: "The task has finished early. You will be compensated by clicking submit below."})
    }
  });

  // Starter task
   socket.on('starterSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    let currentRoom = user.room
    let parsedResults = parseResults(data);
    user.results.starterCheck = parsedResults
    console.log(user.name, "submitted survey:", user.results.starterCheck);
    db.starterSurvey.insert({'userID':socket.id, 'room':currentRoom, 'name':user.name, 'starterCheck': user.results.starterCheck, 'batch':batchID}, (err, usersAdded) => {
      if(err) console.log("There's a problem adding starterSurvey to the DB: ", err);
      else if(usersAdded) console.log("starterSurvey added to the DB");
    });
  });

  // parses results from surveys to proper format for JSON file
  function parseResults(data) {
    let surveyResults = data;
    console.log(surveyResults)
    let parsedResults = surveyResults.split('&');
    let arrayLength = parsedResults.length;
    for(var i = 0; i < arrayLength; i++) {
      console.log(parsedResults[i]);
      let result = parsedResults[i].slice(parsedResults[i].indexOf("=") + 1);
      let qIndex = (parsedResults[i].slice(0, parsedResults[i].indexOf("="))).lastIndexOf('q');
      let questionNumber = (parsedResults[i].slice(0, parsedResults[i].indexOf("="))).slice(qIndex + 1);
      parsedResults[i] = questionNumber + '=' + result;
    }
    return parsedResults;
  }

   // Task after each round - midSurvey - MAIKA
   socket.on('midSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    let currentRoom = user.room
    let midSurveyResults = parseResults(data);
    user.results.viabilityCheck = midSurveyResults;
    console.log(user.name, "submitted survey:", user.results.viabilityCheck);
    db.midSurvey.insert({'userID':socket.id, 'room':currentRoom, 'name':user.name, 'round':currentRound, 'midSurvey': user.results.viabilityCheck, 'batch':batchID}, (err, usersAdded) => {
      if(err) console.log("There's a problem adding midSurvey to the DB: ", err);
      else if(usersAdded) console.log("MidSurvey added to the DB");
    });
  });

    socket.on('psychologicalSafetySubmit', (data) => {
    let user = users.byID(socket.id)
    let currentRoom = user.room
    let psychologicalSafetyResults = parseResults(data);
    user.results.psychologicalSafety = psychologicalSafetyResults;
    console.log(user.name, "submitted survey:", user.results.psychologicalSafety);
    db.psychologicalSafety.insert({'userID':socket.id, 'room':currentRoom, 'name':user.name, 'round':currentRound, 'psychologicalSafety': user.results.psychologicalSafety, 'batch':batchID}, (err, usersAdded) => {
      if(err) console.log("There's a problem adding psychologicalSafety to the DB: ", err);
      else if(usersAdded) console.log("psychologicalSafety added to the DB");
    });
  });

  socket.on('teamfeedbackSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    let currentRoom = user.room
    user.results.teamfracture = data.fracture
    user.results.teamfeedback = data.feedback
    console.log(user.name, "submitted team fracture survey:", user.results.teamfracture);
    console.log(user.name, "submitted team feedback survey:", user.results.teamfeedback);
    db.teamFeedback.insert({'userID':socket.id, 'room':currentRoom, 'name':user.name, 'teamfracture': user.results.teamfracture, 'teamfeedback' : user.results.teamfeedback, 'batch':batchID}, (err, usersAdded) => {
      if(err) console.log("There's a problem adding TeamFeedback to the DB: ", err);
      else if(usersAdded) console.log("TeamFeedback added to the DB");
    });
  });

  socket.on('mturk_formSubmit', (data) => {
    let user = users.byID(socket.id)
    if(user){ //PK: quick fix for user entering after task has started, come back to this
      user.results.engagementFeedback = data
      updateUserInDB(socket,"results.engagementFeedback",data)
    }

  });

  socket.on('postSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    user.results.manipulationCheck = data
    updateUserInDB(socket,"results.manipulationCheck",data)
  })

  socket.on('blacklistSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    user.results.blacklistCheck = data //(user.results.manipulation == data) ? true : false
    // console.log(user.name, "submitted blacklist survey:", user.results.blacklistCheck);
    console.log(user.name, "submitted blacklist survey:", data);
    db.blacklist.insert({'userID':socket.id, 'name':user.name, 'midSurvey': user.results.blacklistCheck, 'batch':batchID}, (err, usersAdded) => {
      if(err) console.log("There's a problem adding blacklist to the DB: ", err);
      else if(usersAdded) console.log("Blacklist added to the DB");
    });

  });

  //loads qs in text file, returns json array
  function loadQuestions(questionFile) {
    const prefix = questionFile.substr(txt.length, questionFile.indexOf('.') - txt.length)
    let questions = []
    let i = 0
    fs.readFileSync(questionFile).toString().split('\n').filter(n => n.length != 0 ).forEach(function (line) {
      let questionObj = {};
      i++;
      questionObj['name'] = prefix + i;

      //each question in the text file should be formatted: ANSWERTAG.QUESTION ex: YN.Are you part of Team Mark?
      questionObj['question'] = line.substr(line.indexOf('|')+1, line.length);
      let answerTag = line.substr(0, line.indexOf('|'));
      if(answerTag === "S1") { // scale 1 radio
        answerObj = answers;
      } else if (answerTag === "YN") { // yes no
        answerObj = binaryAnswers;
      } else if (answerTag === "AD") { // agree, disagree
        answerObj = IRB;
      } else if (answerTag === "TR") { //team radio
        answerObj = {answers: getTeamMembers(users.byID(socket.id)), answerType: 'radio', textValue: false};
      } else if (answerTag === "TC") { //team checkbox
        answerObj = {answers: getTeamMembers(users.byID(socket.id)), answerType: 'checkbox', textValue: false};
      } else if (answerTag === "LH") { //leave hit yn
        answerObj = leaveHitAnswers;
      } else {//chatbot qs
        answerObj={}
      }

      questionObj['answers'] = answerObj.answers;
      questionObj['answerType'] = answerObj.answerType;
      questionObj['textValue'] = answerObj.textValue;
      questionObj['required'] = false
      if(requiredOn && answerObj.answerType === 'radio') { // only applies to radio buttons in vue template
        questionObj['required'] = true
      }
      questions.push(questionObj)
    })
    return questions
  }

});

// return subset of userPool
function getPoolUsersConnected() {return userPool.filter(user => user.connected)}
function getPoolUsersActive() {return userPool.filter(user => user.active && user.connected)}


//replaces user.friend aliases with corresponding user IDs
function aliasToID(user, newString) {
    user.friends.forEach(friend => {
      let currentAlias = treatmentNow ? friend.tAlias : friend.alias
      let aliasRegEx = new RegExp(currentAlias, 'g');
      newString = newString.replace(aliasRegEx, friend.id)
    });
    return newString
}

//replaces other users IDs with user.friend alieses in string
function idToAlias(user, newString) {
    user.friends.forEach(friend => {
      let idRegEx = new RegExp(friend.id, 'g');
      let currentAlias = treatmentNow ? friend.tAlias : friend.alias
      newString = newString.replace(idRegEx, currentAlias)
    });
    return newString
}

//returns time since task began
function getSecondsPassed() {
  return ((new Date()).getTime() - startTime)/1000;
}

function replicate(arr, times) {
  let al = arr.length,
      rl = al*times,
      res = new Array(rl);
  for (let i=0; i<rl; i++)
      res[i] = arr[i % al];
  return res;
}

//PK: we call this fxn many times, is it necessary?
//PK: why do we need to record the length of each task? if this is for bonusing, can we avoid calling this fxn so many times and just do once when the exp ends?
// records length of each task
const recordTime = (event) => {
  taskEndTime = getSecondsPassed();
  taskTime = taskStartTime - taskEndTime;
  db.time.insert({event: taskTime}, (err, timeAdded) => {
    if(err) console.log("There's a problem adding", event, "time to the DB: ", err);
    else if(timeAdded) console.log(event, "time added to the DB");
  })
  taskStartTime = getSecondsPassed();
}

//returns number of users in a room: room -> int
const numUsers = room => users.filter(user => user.room === room).length

//PK: is this being used/ okay to delete/ for future stuff?
//Returns a random remaining room space, or error if none. () -> room | error
const incompleteRooms = () => rooms.filter(room => numUsers(room) < teamSize)
const assignRoom = () => incompleteRooms().pick()

const getTeamMembers = (user) => {
  // Makes a list of teams this user has worked with
  const roomTeams = user.rooms.map((room, rIndex) => { return users.filter(user => user.rooms[rIndex] == room) })

  // Makes a human friendly string for each team with things like 'you' for the current user, commas and 'and' before the last name.
  const answers = roomTeams.map((team, tIndex) => team.reduce((total, current, pIndex, pArr)=>{
    const friend = user.friends.find(friend => friend.id == current.id)
    let name = ((experimentRound == tIndex && currentCondition == "treatment") ? friend.tAlias : friend.alias)
    if (name == user.name) {name = "you"}
    return name + (pIndex == 0 ? "" : ((pIndex + 1) == pArr.length ? " and " : ", ")) + total
  },""))
  return answers;
}

function time(s) {
    return new Date(s * 1e3).toISOString().slice(-13, -5);
}

//PK: delete this fxn and use the normal survey mechanism?
// This function generates a post survey for a user (listing out each team they were part of), and then provides the correct answer to check against.
const postSurveyGenerator = (user) => {
  const answers = getTeamMembers(user);

  // Makes a list comtaining the 2 team same teams, or empty if none.
  let correctAnswer = answers.filter((team,index) => {
    return conditions[currentCondition][index] == experimentRoundIndicator })
  if (correctAnswer.length == 1) {correctAnswer = ""}
  console.log(answers,correctAnswer)

  return { question:"Select teams you think consisted of the same people.",
           name: "postsurvey",
           answers: answers,
           answerType: 'checkbox',
           correctAnswer: correctAnswer }
}
