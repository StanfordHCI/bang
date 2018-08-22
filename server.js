require('dotenv').config()
var colors = require('colors')

//Environmental settings, set in .env
const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE" //ONLY CHANGE ON SERVER
const teamSize = process.env.TEAM_SIZE
const roundMinutes = process.env.ROUND_MINUTES

//Parameters for waiting qualifications
//MAKE SURE secondsToWait > secondsSinceResponse
const secondsToWait = 60 //number of seconds users must have been on pretask to meet qualification (e.g. 120)
const secondsSinceResponse = 59 //number of seconds since last message users sent to meet pretask qualification (e.g. 20)
const secondsToHold1 = 1000 //maximum number of seconds we allow someone to stay in the pretask (e.g. 720)
const secondsToHold2 = 200 //maximum number of seconds of inactivity that we allow in pretask (e.g. 60)
const maxWaitChatMinutes = 20

// Toggles
const runExperimentNow = true
const issueBonusesNow = true
const notifyWorkersOn = false
const runViaEmailOn = false
const usingWillBang = false

const cleanHITs = false
const assignQualifications = true
const debugMode = !runningLive

const suddenDeath = false
let setPerson = false

const randomCondition = false
const randomRoundOrder = false
const randomProduct = false

const waitChatOn = true //MAKE SURE THIS IS THE SAME IN CLIENT
const psychologicalSafetyOn = false
const starterSurveyOn = false
const midSurveyOn = true
const blacklistOn = true
const teamfeedbackOn = false
const checkinOn = false
const timeCheckOn = false // tracks time user spends on task and updates payment - also tracks how long each task is taking
const requiredOn = runningLive
const checkinIntervalMinutes = roundMinutes/3

//Testing toggles
const autocompleteTestOn = false //turns on fake team to test autocomplete
const debugLog = (...args) => {if (debugMode){console.log(...args)}}

console.log(runningLive ? "\n RUNNING LIVE ".red.inverse : "\n RUNNING SANDBOXED ".green.inverse);
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
const leaveHitFile = txt + "leave-hit-q.txt"

// Answer Option Sets
const answers = {answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], answerType: 'radio', textValue: true}
const binaryAnswers = {answers: ['Yes', 'No'], answerType: 'radio', textValue: true}
const leaveHitAnswers = {answers: ['End Task and Send Feedback', 'Return to Task'], answerType: 'radio', textValue: false}

// Setup basic express server
let tools = require('./tools');
let mturk = require('./mturkTools');
let express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
server.listen(port, () => { console.log('Server listening at port %d', port) });

Array.prototype.pick = function() { return this[Math.floor(Math.random() * this.length)] };
Array.prototype.byID = function(id) { return this.find(user => user.id === id) };
Array.prototype.set = function() {
  const setArray = []
  this.forEach(element => { if (!setArray.includes(element)) { setArray.push(element) } })
  return setArray
};

function useUser(u,f,err = "Guarded against undefined user") {
  let user = users.byID(u.id)
  if (typeof user != 'undefined' && typeof f === "function") {f(user)}
  else { console.log(err.red,u.id) }
}

// Save debug logs for later review
const util = require('util');
const trueLog = console.log;
const debugDir = ".data/debug/"

if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir)
}
log_file = debugDir + "debug" + Date.now() + ".log";
console.log = function(...msg) {
  trueLog(msg.map(item => {return util.format(item)}).join(" ")); //uncomment if you want logs
    msg.map(item => {
      fs.appendFile(log_file, util.format(item) + " ", function(err) {
        if(err) {
            return trueLog(err);
        }
      });
    })
    fs.appendFile(log_file, "\n", function(err) {
      if(err) {
          return trueLog(err);
      }
    });
}

//if (runExperimentNow){
  // Experiment variables
  const conditionsAvailalbe = ['control','treatment','baseline']
  const currentCondition = randomCondition ? conditionsAvailalbe.pick() : conditionsAvailalbe[1]
  let treatmentNow = false
  let firstRun = false;
  let hasAddedUsers = false;//lock on adding users to db/experiment for experiment
  let batchCompleteUpdated = false;

  const roundOrdering = [
    {control: [1,2,1], treatment: [1,2,1], baseline: [1,2,3]},
    {control: [2,1,1], treatment: [2,1,1], baseline: [1,2,3]},
    {control: [1,1,2], treatment: [1,1,2], baseline: [1,2,3]}]

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

//}

//if (runExperimentNow) {
  const batchID = Date.now();

  console.log("Launching batch",batchID);
//}

// Setting up DB
const Datastore = require('nedb')
const db = {}
db.users = new Datastore({ filename:'.data/users', autoload: true, timestampData: true });
db.chats = new Datastore({ filename:'.data/chats', autoload: true, timestampData: true});
db.batch = new Datastore({ filename:'.data/batch', autoload: true, timestampData: true});
db.time = new Datastore({ filename:'.data/time', autoload: true, timestampData: true});
db.ourHITs = new Datastore({ filename:'.data/ourHITs', autoload: true, timestampData: true})

function updateUserInDB(user,field,value) {
  db.users.update( {id: user.id}, {$set: {[field]: value}}, {},
    err => console.log(err ? "Err recording ".red +field+": "+err : "Updated " + field + " for " + user.id + " " + JSON.stringify(value,null,2))
  )
}

//Mturk background tasks
db.users.find({}, (err, usersInDB) => {
  if (err) {console.log("DB for MTurk:" + err)} else {
    if (issueBonusesNow) {
      mturk.payBonuses(usersInDB, (bonusedUsers) => {
        bonusedUsers.forEach(u => updateUserInDB(u,'bonus',0))
      })
    }
    if (assignQualifications && runningLive) {
      mturk.listUsersWithQualificationRecursively(mturk.quals.hasBanged, (data) => {
        console.log("Number of users with qualification hasBanged:", data.length)
      });
    }
  }
})

// expires active HITs in the DB
if (cleanHITs){
  mturk.workOnActiveHITs(activeHITs => {
    db.ourHITs.find({}, (err, HITsInDB) => {
      if (err) {console.log("Err loading HITS for expiration:" + err)} else {
        HITsInDB.map(h => h.HITId).filter(h => activeHITs.includes(h)).forEach(mturk.expireHIT)
      }
    })
  })
}

if (runExperimentNow){ mturk.launchBang(function(HIT) {
  storeHIT(HIT.HITId)
  // Notify workers that a HIT has started if we're doing recruiting by email
  if (notifyWorkersOn) {
    // let HITId = process.argv[2];
    let subject = "We launched our new ad writing HIT. Join now, spaces are limited."
    console.log(HIT)
    let URL = ''
    mturk.getHITURL(HIT.HITId, function(url) {
      URL = url;
      let message = "You’re invited to join our newly launched HIT on Mturk; \
      there are limited spaces! You can join it by clicking this link " + URL;
      console.log("message to willBangers", message);
      if (!URL) {
        throw "URL not defined"
      }
      if(usingWillBang) {
        let maxWorkersToNotify = 100; // cannot be more than 100
        mturk.listUsersWithQualification(mturk.quals.willBang, maxWorkersToNotify, function(data) { // notifies all willBang
          mturk.notifyWorkers(data.Qualifications.map(a => a.WorkerId), subject, message)
          }); // must return from mturkTools
      }
    });
  }
}) }

//Add more products
let products = [
  {name:'KOSMOS ink - Magnetic Fountain Pen', url:'https://www.kickstarter.com/projects/stilform/kosmos-ink'},
  {name:'Projka: Multi-Function Accessory Pouches', url:'https://www.kickstarter.com/projects/535342561/projka-multi-function-accessory-pouches'},
  {name:"First Swiss Automatic Pilot's watch in TITANIUM & CERAMIC", url:'https://www.kickstarter.com/projects/chazanow/liv-watches-titanium-ceramic-chrono'},
  {name:"Nomad Energy- Radically Sustainable Energy Drink", url:'https://www.kickstarter.com/projects/1273663738/nomad-energy-radically-sustainable-energy-drink'},
  {name:"Thé-tis Tea : Plant-based seaweed tea, rich in minerals", url:'https://www.kickstarter.com/projects/1636469325/the-tis-tea-plant-based-high-rich-minerals-in-seaw'},
  {name:"The Travel Line: Versatile Travel Backpack + Packing Tools", url:'https://www.kickstarter.com/projects/peak-design/the-travel-line-versatile-travel-backpack-packing'},
  {name:"Stool Nº1", url:'https://www.kickstarter.com/projects/390812913/stool-no1'},
  {name:"LetB Color - take a look at time in different ways", url:'https://www.kickstarter.com/projects/letbco/letb-color-take-a-look-at-time-in-different-ways'},
  {name:"FLECTR 360 OMNI – cycling at night with full 360° visibility", url:'https://www.kickstarter.com/projects/outsider-team/flectr-360-omni'},
  {name:"Make perfect cold brew coffee at home with the BrewCub", url:'https://www.kickstarter.com/projects/1201993039/make-perfect-cold-brew-coffee-at-home-with-the-bre'},
  {name:'NanoPen | Worlds Smallest & Indestructible EDC Pen Tool', url:'https://www.kickstarter.com/projects/bullet/nanopen-worlds-smallest-and-indestructible-edc-pen?ref=section_design-tech_popular'},
  {name:"The EVERGOODS MQD24 and CTB40 Crossover Backpacks", url:'https://www.kickstarter.com/projects/1362258351/the-evergoods-mqd24-and-ctb40-crossover-backpacks'},
  {name:"Hexgears X-1 Mechanical Keyboard", url:'https://www.kickstarter.com/projects/hexgears/hexgears-x-1-mechanical-keyboard'},
  {name:"KARVD - Modular Wood Carved Wall Panel System", url:'https://www.kickstarter.com/projects/karvdwalls/karvd-modular-wood-carved-wall-panel-system'},
  {name:"PARA: Stationary l Pythagorean l Easy-to-Use Laser Measurer", url:'https://www.kickstarter.com/projects/1619356127/para-stationary-l-pythagorean-l-easy-to-use-laser'},
  {name:"Blox: organize your world!", url:'https://www.kickstarter.com/projects/onehundred/blox-organize-your-world'},
  {name:"Moment - World's Best Lenses For Mobile Photography", url:'https://www.kickstarter.com/projects/moment/moment-amazing-lenses-for-mobile-photography'},
  {name:"The Ollie Chair: Shape-Shifting Seating", url:'https://www.kickstarter.com/projects/144629748/the-ollie-chair-shape-shifting-seating'},
  {name:"Fave: the ideal all-purpose knife!", url:'https://www.kickstarter.com/projects/onehundred/fave-the-ideal-all-purpose-knife'},
]

let users = []; //the main local user storage
let userPool = []; //accumulates users pre-experiment
let waitchatStart = 0
let currentRound = 0 //PK: talk about 0-indexed v 1-indexed round numbers (note: if change -> change parts of code reliant on 0-indexed round num)
let startTime = 0
let userAcquisitionStage = true
let usersFinished = 0

// keeping track of time
let taskStartTime = getSecondsPassed(); // reset for each start of new task
let taskEndTime = 0;
let taskTime = 0;

// Building task list
//if (runExperimentNow){
  let eventSchedule = []
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
  console.log("This batch will include:",eventSchedule)
//}

let fullUrl = ''

app.use(express.static('public'));

// Disconnect leftover users
Object.keys(io.sockets.sockets).forEach(socketID => {
  console.log(socketID)
  if (userPool.every(user => {return user.id !== socketID})) {
    console.log("Removing dead socket: " + socketID);
    io.in(socketID).emit('get IDs', 'broken');
    io.in(socketID).disconnect(true)
  }
});

//if (runExperimentNow){
  // Adds Batch data for this experiment. unique batchID based on time/date
  db.batch.insert(
    {
      batchID: batchID,
      batchComplete: false,
      starterSurveyOn:starterSurveyOn,
      midSurveyOn: midSurveyOn,
      blacklistOn: blacklistOn,
      teamfeedbackOn: teamfeedbackOn,
      psychologicalSafetyOn : psychologicalSafetyOn,
      checkinOn: checkinOn,
      conditions: conditions,
      experimentRound: experimentRound,
      numRounds: numRounds,
      teamSize: teamSize
    }, (err, usersAdded) => {
      if(err) console.log("There's a problem adding batch to the DB: ", err);
      else if(usersAdded) console.log("Batch added to the DB");
      console.log("Leftover sockets from previous run:" + Object.keys(io.sockets.sockets));
      if (!firstRun) {
        Object.keys(io.sockets.sockets).forEach(socketID => {
          io.sockets.sockets[socketID].disconnect(true);
        })
        firstRun = true;
      }
    }
  )// eventSchedule instead of all of the toggles? (missing checkinOn) //PK: what does this comment mean?
//}


// Timer to catch ID after HIT has been posted - this is sketchy, as unknown when HIT will be posted

// Chatroom
io.on('connection', (socket) => {
  //PK: what are these bools for?
  let experimentStarted = false //NOTE: this will be set multiple times but I don't think that's what is wanted in this case
  let experimentOver = false

  const workerStartTime = getSecondsPassed();
  const currentBonus = () => {
    mturk.updatePayment(getSecondsPassed() - workerStartTime)
  }

  socket.on('get username', data => {
    name_structure = tools.makeName();
    socket.name_structure = name_structure;
    socket.username = name_structure.username;
    socket.emit('set username', {username: socket.username})
  })

  socket.on('accepted HIT', data => {
    if(!userAcquisitionStage) {
      //updateUserInDB(socket,'bonus',currentBonus())
      if (!socket) {
        console.log("no socket in accepted HIT")
        return;
      }
      issueFinish(socket,runViaEmailOn ? "We don't need you to work right now. Please await further instructions from scaledhumanity@gmail.com." : "We have enough users on this task. Submit below and you will be compensated appropriately for your time. Thank you!")
      return;
    }
    userPool.push({
      id: socket.id,
      mturkId: data.mturkId,
      turkSubmitTo: data.turkSubmitTo,
      assignmentId: data.assignmentId,
      connected: true,
      active: waitChatOn ? false : true,
      timeAdded: data.timeAdded,
      timeLastActivity: data.timeAdded
    });
    if(userPool.length == 1){//first user entered waitchat
      waitchatStart = data.timeAdded
    }

    mturk.setAssignmentsPending(getPoolUsersConnected().length)
    // debugLog(userPool, "users accepted currently: " + userPool.length)

      Object.keys(io.sockets.sockets).forEach(socketID => {
        if (userPool.every(user => {return user.id !== socketID})) {
          console.log("Removing dead socket: " + socketID);
          io.in(socketID).emit('get IDs', 'broken');
        }
      });
      var timeNow = new Date(Date.now())
      console.log("This is as of " +  (Date.now()-batchID)/1000 + " seconds since starting the experiment. Printed at", timeNow.getHours()+":"+timeNow.getMinutes()+":"+timeNow.getSeconds()+".")
      console.log("Sockets active: " + Object.keys(io.sockets.sockets) + " of " + teamSize);
      updateUserPool();
  })

  function updateUserPool(){
    if(!userAcquisitionStage) return;

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
        if (!user.removed && (secondsSince(user.timeAdded) > weightedHoldingSeconds || secondsSince(user.timeLastActivity) > secondsToHold2)) {
          user.removed = true;
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
            issueFinish(user, runViaEmailOn ? "We don't need you to work at this specific moment, but we may have tasks for you soon. Please await further instructions from scaledhumanity@gmail.com." : "Thanks for participating, you're all done!")
          }
        }
        userPool.filter(user => !usersActive.byID(user.id)).forEach(user => {//
          console.log('EMIT FINISH TO NONACTIVE OR DISCONNECTED WORKER')
          issueFinish(user, runViaEmailOn ? "We don't need you to work at this specific moment, but we may have tasks for you soon. Please await further instructions from scaledhumanity@gmail.com." : "Thanks for participating, you're all done!")
        })
      } else {
        if(secondsSince(waitchatStart) / 60 >= maxWaitChatMinutes) {
          console.log("Waitchat time limit reached".red)
          io.in(socket.id).emit('echo', 'kill-all')
        }
      }
    } else { // waitchat off
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
      id: socket.id,
      mturkId: data.mturkId,
      assignmentId: data.assignmentId,
      batch: batchID,
      room: '',
      rooms:[],
      bonus: mturk.bonusPrice,
      person: '',
      name: socket.username,
      ready: false,
      friends: [],
      friends_history: [socket.name_structure.parts], // list of aliases to avoid, which includes the user's username//PK: is it okay to store this in the socket?
      connected: true, //PK: what does user.active mean? is this ever set to false? I want to use 'active' instead of 'onCall' but need to check if this field is still needed
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
        engagementFeedback: '',
      }
    };
  }

  socket.on('add user', data => {
    if (!userAcquisitionStage) {
      issueFinish(socket, runViaEmailOn ? "We don't need you to work at this specific moment, but we may have tasks for you soon. Please await further instructions from scaledhumanity@gmail.com." : "We have enough users on this task. Hit the button below and you will be compensated appropriately for your time. Thank you!")//PK: come back to this
      return;
    }
    if(users.byID(socket.id)) {console.log('ERR: ADDING A USER ALREADY IN USERS')}
    let newUser = makeUser(userPool.byID(socket.id));
    users.push(newUser)
    console.log(newUser.name + " added to users.\n" + "Total users: " + users.length)
    //add friends for each user once the correct number of users is reached
    if(users.length === teamSize **2){ // if the last user was just added
      console.log("USER POOL:\n" + userPool.map(u => u.mturkID))
      console.log('MTURK IDS: ')
      users.forEach(user => { //mutate the friend list of each user
        user.friends = users.map(u => { //create the alias through which each user sees every other user
          if (user.id != u.id) {
            return {
              id: u.id,
              alias: tools.makeName().username,
              tAlias:tools.makeName().username }
          }
          else {
            return {
              id: u.id,
              alias: u.name,
              tAlias: u.name }
          }
        });
        console.log(user.mturkId)
      })
      // assign people to rooms/teams
      users.forEach(u => {
        u.person = people.pop();
      })
      userAcquisitionStage = false;
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

  socket.on('log', data => { console.log(data); });

  //Route messages
  socket.on('new message', function (message) {
    newMessage(message)
  });

  function newMessage(message) {
    useUser(socket, (user) =>{
      if(!user.connected) {
        console.log("block ***USER NOT CONNECTED*** in new message")
        return;
      }
      let cleanMessage = message;
      users.forEach(u => { cleanMessage = aliasToID(u, cleanMessage)});

      db.chats.insert({
          room: user.room,
          userID: socket.id,
          message: cleanMessage,
          time: getSecondsPassed(),
          batch: batchID,
          round: currentRound
        }, (err, usersAdded) => {
        if(err) console.log("Error storing message:", err)
        else console.log("Message in", user.room, "from",user.name +":" ,cleanMessage)
      });

      users.filter(f => f.room == user.room).forEach(f => {
        socket.broadcast.to(f.id).emit('new message', {
          username: idToAlias(f, String(socket.id)),
          message: idToAlias(f, cleanMessage)
        });
      });
    })
  }

  //when the client emits 'new checkin', this listens and executes
  socket.on('new checkin', function (data) {
    useUser(socket,user => {
      user.results.checkin.push({
        round:currentRound,
        room: user.room,
        result:data
      })
      updateUserInDB(user,"results.checkin",user.results.checkin)
    })
  })

  socket.on('load bot qs', () => {
    io.in(socket.id).emit('chatbot', loadQuestions(botFile))
  })

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    // changes connected to false of disconnected user in userPool
    console.log("Disconnecting socket:", socket.id)
    if (userPool.find(function(element) {return element.id == socket.id})) {
      userPool.byID(socket.id).connected = false;
      let usersActive = getPoolUsersActive()
      if(usersActive.length >= teamSize ** 2) {
        io.sockets.emit('update number waiting', {num: 0});
      } else {
        io.sockets.emit('update number waiting', {num: (teamSize ** 2) - usersActive.length});
      }

      mturk.setAssignmentsPending(getPoolUsersConnected().length)
    }

    // if (!users.every(user => socket.id !== user.id)) {//socket id is found in users
    newMessage('has left the chatroom')
    useUser(socket,user => {
      user.connected = false
      user.ready = suddenDeath ? false : true

      // update DB with change
      updateUserInDB(user,'connected',false)

      if (!experimentOver && !suddenDeath) {console.log("Sudden death is off, so we will not cancel the run")}

      console.log("Connected users: " + getUsersConnected().length);
      if (!experimentOver && suddenDeath && experimentStarted){
        storeHIT()

        console.log("User left, emitting cancel to all users");
        let totalTime = getSecondsPassed();

        if(timeCheckOn) {
          db.time.insert({totalTaskTime: totalTime}, (err, timeAdded) => {
            if(err) console.log("There's a problem adding total time to the DB: ", err);
            else if(timeAdded) console.log("Total time added to the DB");
          })
        }

        users.filter(u => u.id != socket.id).forEach((u) => {
          let cancelMessage = "<strong>Someone left the task.</strong><br> <br> \
          Unfortunately, our group task requires a specific number of users to run, \
          so once a user leaves, our task cannot proceed. <br><br> \
          To complete the task, please provide suggestions of ways to \
          prevent people leaving in future runs of the study. <br><br> \
          Since the team activity had already started, you will be additionally \
          bonused for the time spent working with the team."
          if (experimentStarted) { // Add future bonus pay
            u.bonus = currentBonus()
            updateUserInDB(u,'bonus',u.bonus)
            storeHIT()
          }
          issueFinish(u,cancelMessage,true)
        })
      }
      if (!suddenDeath && !userAcquisitionStage) { // sets users to ready when they disconnect
        user.ready = true // TODO: remove user from users
      }
    })
  });

  socket.on('ready-to-all', (data) => {
    console.log("god is ready");
    io.sockets.emit('echo','ready')
  })
  socket.on('kill-all', (data) => {
    console.log("god is angry")
    updateUserInDB(socket,"bonus",currentBonus())
    io.sockets.emit('finished', {
      message: "We have had to cancel the rest of the task. Submit and you will be bonused for your time.",
      finishingCode: "kill-all",
      turkSubmitTo: "",
      assignmentId: "",
      crashed: false
    })
  })

  socket.on("next event", (data) => {
    useUser(socket,(user) => {
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
      else if (eventSchedule[currentEvent] == "teamfeedbackSurvey") {
        if(midSurveyOn && timeCheckOn) {
          recordTime("midSurvey");
        } else if(timeCheckOn) {
          recordTime("round");
        }
        io.in(user.id).emit("load", {element: 'teamfeedbackSurvey', questions: loadQuestions(feedbackFile,user), interstitial: false, showHeaderBar: true});
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
        console.log({element: 'blacklistSurvey', questions: loadQuestions(blacklistFile,user), interstitial: false, showHeaderBar: false})
        io.in(user.id).emit("load", {element: 'blacklistSurvey', questions: loadQuestions(blacklistFile,user), interstitial: false, showHeaderBar: false});
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
        io.in(user.id).emit("load", {element: 'postSurvey', questions: loadQuestions(postSurveyFile,user), interstitial: false, showHeaderBar: false});
      }
      else if (eventSchedule[currentEvent] == "finished" || currentEvent > eventSchedule.length) {
        if(!batchCompleteUpdated) {
          db.batch.update( {batchID: batchID}, {$set: {batchComplete: true}}, {},
            err => console.log(err ? "Err updating batch completion"+err : "Updated batch for complete ")
          )
          batchCompleteUpdated = true;
        }
        if(timeCheckOn) {
          recordTime("postSurvey");
        }
        user.bonus += mturk.bonusPrice
        updateUserInDB(user,"bonus",user.bonus)

        storeHIT()

        usersFinished += 1
        console.log(usersFinished, "users have finished.")

        io.in(socket.id).emit('finished', {
          message: "Thanks for participating, you're all done!",
          finishingCode: socket.id,
          turkSubmitTo: mturk.submitTo,
          assignmentId: user.assignmentId
        })
      }
      user.currentEvent += 1
    })
  })

    // Main experiment run
  socket.on('ready', function (data) {
    useUser(socket,user => {
      //waits until user ends up on correct link before adding user - repeated code, make function //PK: what does this comment mean/ is it still relevant?
      user.ready = true;
      console.log(socket.username, 'is ready');

      if (users.filter(u => !u.ready).length ) {
        console.log("some users not ready", users.filter(u => !u.ready).map(u => u.name))
        return
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

      treatmentNow = (currentCondition == "treatment" && currentRound == experimentRound)
      const conditionRound = conditions[currentCondition][currentRound] - 1

      Object.entries(teams[conditionRound]).forEach(([roomName,room]) => {
        users.filter(u => room.includes(u.person)).forEach(u => {
          u.room = roomName
          u.rooms.push(roomName)
          updateUserInDB(u,"rooms",u.rooms)
          u.ready = false //return users to unready state
          if (!suddenDeath && !u.connected) {u.ready = true}
          console.log(u.name, '-> room', u.room);
        })
      })

      //Notify user 'initiate round' and send task.

      let currentProduct = products[currentRound]

      if(randomProduct) {
        let productInt = getRndInteger(0, products.length);
        let currentProduct = products[productInt]
        products.splice(productInt, 1)
      }
      console.log('Current Product:', currentProduct);

      let taskText = "Design text advertisement for <strong><a href='" + currentProduct.url + "' target='_blank'>" + currentProduct.name + "</a></strong>!"

      experimentStarted = true
      mturk.startTask();

      users.forEach(u => {
        if (autocompleteTestOn) {
          let teamNames = [tools.makeName().username, tools.makeName().username, tools.makeName().username, tools.makeName().username, tools.makeName().username]
          console.log(teamNames)
          io.in(u.id).emit('initiate round', {task: taskText, team: teamNames, duration: roundMinutes, randomAnimal: tools.randomAnimal, round: currentRound + 1, runningLive: runningLive})//rounds are 0 indexed
        } else {
          // Dynamically generate teammate names
          // even if teamSize = 1 for testing, this still works

          let teamMates = u.friends.filter(friend => { return (users.byID(friend.id)) && users.byID(friend.id).connected && (users.byID(friend.id).room == u.room) && (friend.id !== u.id)});

          let team_Aliases = tools.makeName(teamMates.length, u.friends_history)
          user.friends_history = u.friends_history.concat(team_Aliases)
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

          team_Aliases.push(u.name) //now push user for autocomplete
          //let myteam = user.friends.filter(friend => { return (users.byID(friend.id).room == user.room)});
          // io.in(user.id).emit('initiate round', {task: taskText, team: user.friends.filter(friend => { return users.byID(friend.id).room == user.room }).map(friend => { return treatmentNow ? friend.tAlias : friend.alias }), duration: roundMinutes })
          io.in(u.id).emit('initiate round', {task: taskText, team: team_Aliases, duration: roundMinutes, randomAnimal: tools.randomAnimal, round: currentRound + 1})//round 0 indexed
        }
      })

      console.log('Issued task for:', currentProduct.name)
      console.log('Started round', currentRound, 'with,', roundMinutes, 'minute timer.');

      // assignes hasBanged to new users
      if(assignQualifications && runningLive) {
        const hasBangers = users.map(a => a.mturkId)
        hasBangers.forEach(u => mturk.assignQuals(u, mturk.quals.hasBanged))
      }
      // remove willBang qualification from people who rolled over
      if(usingWillBang) {
        const hasBangers = users.map(a => a.mturkId)
        hasBangers.forEach(u => mturk.unassignQuals(u, mturk.quals.willBang, 'This qualification is used to qualify a user to participate in our HIT. We only allow one participation per user, so that is why we are removing this qualification. Thank you!'))
      }

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
          users.forEach(user => { io.in(user.id).emit('stop', {round: currentRound, survey: (midSurveyOn || teamfeedbackOn || psychologicalSafetyOn) }) });
          currentRound += 1 // guard to only do this when a round is actually done.
          console.log(currentRound, "out of", numRounds)
        }, 1000 * 60 * 0.2 * roundMinutes)
      }, 1000 * 60 * 0.8 * roundMinutes)

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
  })

  //if broken, tell users they're done and disconnect their socket
  socket.on('broken', (data) => {
    issueFinish(socket, runViaEmailOn ? "We've experienced an error. Please wait for an email from scaledhumanity@gmail.com with restart instructions." : "The task has finished early. You will be compensated by clicking submit below.", finishingCode = "broken")
  });

  // Starter task
  socket.on('starterSurveySubmit', (data) => {
    useUser(socket,user => {
      user.results.starterCheck = parseResults(data)
      updateUserInDB(user,"results.starterCheck",user.results.starterCheck)
    })
  });

   // Task after each round - midSurvey - MAIKA
  socket.on('midSurveySubmit', (data) => {
    useUser(socket, user => {
      user.results.viabilityCheck[currentRound] = parseResults(data)
      updateUserInDB(user,"results.viabilityCheck",user.results.viabilityCheck)
    })
  });

  socket.on('psychologicalSafetySubmit', (data) => {
    useUser(socket, user => {
      user.results.psychologicalSafety[currentRound] = parseResults(data)
      updateUserInDB(user,"results.psychologicalSafety",user.results.psychologicalSafety)
    })
  });

  socket.on('teamfeedbackSurveySubmit', (data) => {
    useUser(socket, user => {
      user.results.teamfeedback[currentRound] = parseResults(data)
      updateUserInDB(user,"results.teamfeedback",user.results.teamfeedback)
    })
  });

  socket.on('mturk_formSubmit', (data) => {
    useUser(socket, user => {
      user.results.engagementFeedback = parseResults(data)
      updateUserInDB(socket,"results.engagementFeedback",user.results.engagementFeedback)
    })
  });

  socket.on('postSurveySubmit', (data) => {
    useUser(socket, user => {
      user.results.manipulationCheck = parseResults(data)
      updateUserInDB(socket,"results.manipulationCheck",user.results.manipulationCheck)
    })
  })

  socket.on('blacklistSurveySubmit', (data) => {
    useUser(socket, user => {
      user.results.blacklistCheck = parseResults(data)
      updateUserInDB(user,"results.blacklistCheck",user.results.blacklistCheck)
    })
  });

  //loads qs in text file, returns json array
  function loadQuestions(questionFile,user=null) {
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
      } else if (answerTag === "TR") { //team radio
        getTeamMembers(user).forEach((team, index) => {
          questionObj['question']+=" Team " + (index+1) + " (" + team + '),'
        })
        questionObj['question'] = questionObj['question'].slice(0,-1)
        answerObj = {answers: ["Team 1", "Team 2", "Team 3"], answerType: 'radio', textValue: true};
      } else if (answerTag === "MTR") { //team checkbox
        getTeamMembers(user).forEach(function(team, index){
          questionObj['question']+=" Team " + (index+1) + " (" + team + '),'
        })
        questionObj['question'] = questionObj['question'].slice(0,-1)
        answerObj = {answers: ["Team 1 and Team 2", "Team 2 and Team 3", "Team 1 and Team 3"], answerType: 'radio', textValue: true};
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

  function issueFinish(socket, message, crashed=false, finishingCode = socket.id) {
    if (!socket) {
      console.log("Undefined user in issueFinish")
      return;
    }
    io.in(socket.id).emit('finished', {
      message: message,
      finishingCode: finishingCode,
      crashed: false
    })
  }
});

// return subset of userPool
function getPoolUsersConnected() {return userPool.filter(user => user.connected)}
function getPoolUsersActive() {return userPool.filter(user => user.active && user.connected)}

// return subset of users
function getUsersConnected() {return users.filter(user => user.connected)}

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
  db.time.insert({[event]: taskTime}, (err, timeAdded) => {
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

//PK: delete this fxn and use the normal survey mechanism?
// This function generates a post survey for a user (listing out each team they were part of), and then provides the correct answer to check against.
const postSurveyGenerator = (user) => {
  const answers = getTeamMembers(user);
  // Makes a list comtaining the 2 team same teams, or empty if none.
  let correctAnswer = answers.filter((team,index) => {
    return conditions[currentCondition][index] == experimentRoundIndicator })
  if (correctAnswer.length == 1) {correctAnswer = ""}
  console.log(answers,correctAnswer)

  return {
    question:"Select teams you think consisted of the same people.",
    name: "postsurvey",
    answers: answers,
    answerType: 'checkbox',
    correctAnswer: correctAnswer
  }
}

function time(s) {
  return new Date(s * 1e3).toISOString().slice(-13, -5);
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

function storeHIT(currentHIT = mturk.returnCurrentHIT()) {
  db.ourHITs.insert({HITId: currentHIT, batch:batchID}, (err, HITAdded) => {
    if(err) console.log("There's a problem adding HIT to the DB: ", err);
    else if(HITAdded) console.log("HIT added to the DB: ", currentHIT);
  })
}

// parses results from surveys to proper format for JSON file
function parseResults(data) {
  let parsedResults = {}
  data.split('&').forEach(responsePair => {
    let response = responsePair.split("=")
    index = response[0].split("-q")
    parsedResults[index[1]] = decode(response[1])
  })
  return parsedResults;
}

const decode = (encoded) => {
  return unescape(encoded.replace(/\+/g,  " "));
}
