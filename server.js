//Settings - change for actual deployment
const teamSize = 1
const roundMinutes = .01

// Toggles
const autocompleteTestOn = false //turns on fake team to test autocomplete
const starterSurveyOn = true
const midSurveyOn = true
const blacklistOn = true
const teamfeedbackOn = false
const checkinOn = false
const checkinIntervalMinutes = roundMinutes/30

const bonusUsersOn = true // If true, any remaining bonuses will be run, default to true
const qualificationsOn = false
const runningLocal = true
const runningLive = false//ONLY CHANGE IN VIM ON SERVER

// Question Files
const midSurveyFile = "midsurvey-q.txt"
const checkinFile = "checkin-q.txt"
const blacklistFile = "blacklist-q.txt"
const feedbackFile = "feedback-q.txt"
const starterSurveyFile = "startersurvey-q.txt"
const postSurveyFile = "postsurvey-q.txt"
const fs = require('fs')

// Answer Option Sets
const answers ={answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], answerType: 'radio'}
const binaryAnswers ={answers: ['Yes', 'No'], answerType: 'radio'}


// Setup basic express server
let tools = require('./tools');
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

// Setting up variables
const currentCondition = "treatment"
let treatmentNow = false

const conditionSet = [{"control": [1,2,1], "treatment": [1,2,1], "baseline": [1,2,3]},
                      {"control": [2,1,1], "treatment": [2,1,1], "baseline": [1,2,3]},
                      {"control": [1,1,2], "treatment": [1,1,2], "baseline": [1,2,3]}]

const experimentRoundIndicator = 1
const conditions = conditionSet[0] // or conditionSet.pick() for ramdomized orderings.
const experimentRound = conditions[currentCondition].lastIndexOf(experimentRoundIndicator) //assumes that the manipulation is always the last instance of team 1's interaction.
const numRounds = conditions.baseline.length

const numberOfRooms = teamSize * numRounds
const rooms = tools.letters.slice(0,numberOfRooms)
const people = tools.letters.slice(0,teamSize ** 2)
const population = people.length
const teams = tools.createTeams(teamSize,numRounds,people)

const batchID = Date.now();

// Setting up DB
const Datastore = require('nedb'),
    db = {};
    db.starterSurvey = new Datastore({ filename:'.data/starterSurvey', autoload: true });
    db.users = new Datastore({ filename:'.data/users', autoload: true });
    db.chats = new Datastore({ filename:'.data/chats', autoload: true });
    db.products = new Datastore({ filename:'.data/products', autoload: true });
    db.checkins = new Datastore({ filename:'.data/checkins', autoload: true});
    db.teamFeedback = new Datastore({ filename:'.data/teamFeedback', autoload: true});
    db.blacklist = new Datastore({ filename:'.data/blacklist', autoload: true});
    db.midSurvey = new Datastore({ filename:'.data/midSurvey', autoload: true}); // to store midSurvey results
    db.batch = new Datastore({ filename:'.data/batch', autoload: true}); // to store batch information

// MTurk AWS
const AWS = require('aws-sdk');
require('express')().listen(); //Sets to only relaunch with source changes

AWS.config = {
  "accessKeyId": 'AKIAJV6G2CON2PKCJREA', //process.env.YOUR_ACCESS_ID,
  "secretAccessKey": 'WOGgQar1egg8i8YszXeMXWFaltIoieQSxH/eQrgB', //process.env.YOUR_SECRET_KEY,
  "region": 'us-east-1',
  "sslEnabled": 'true'
};

let endpoint = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
let turkSubmitTo = 'https://workersandbox.mturk.com'

if (runningLive) {
  endpoint = 'https://mturk-requester.us-east-1.amazonaws.com';
  turkSubmitTo = 'https://www.mturk.com'
}

// This initiates the API
// Find more in the docs here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html
const mturk = new AWS.MTurk({ endpoint: endpoint });

// This will return $10,000.00 in the MTurk Developer Sandbox
mturk.getAccountBalance((err, data) => {
  if (err) console.log(err, err.stack); // an error occurred
  else console.log(data);           // successful response
});

// bonus all users in DB who have leftover bonuses
if (bonusUsersOn){
  db.users.find({bonus: {$gt: 0} }, (err, usersInDB) => {
    if (err) {console.log("Err loading users:" + err)}
    usersInDB.forEach((user) => {
      var params = { AssignmentId: user.assignmentId, BonusAmount: String(user.bonus), Reason: "Thanks for participating in our HIT!", WorkerId: user.mturkId, UniqueRequestToken: user.id };
      mturk.sendBonus(params, function(err, data) {
        if (err) {
          console.log( user.id + " bonus not processed: " + err)
        } else {
          console.log(user.id + " bonused: " + data)
          db.users.update( {id: user.id}, {$set: {bonus: 0}}, {}, (err) => { if (err) { console.log("Err recording bonus:" + err)}})
        }
      })
    })
  })
}

// direct them to server URL
let taskURL = 'https://bang.dmorina.com/';
if (runningLocal) {
   taskURL = 'https://localhost:3000/';
}

// HIT Parameters
const taskDuration = 60; // how many minutes - this is a Maximum for the task
const timeActive = 10; // How long a task stays alive in minutes -  repost same task to assure top of list
const numPosts = (2 * taskDuration) / timeActive; // How many times do you want the task to be posted? numPosts * timeActive = total time running HITs
const hourlyWage = 10.50; // changes reward of experiment depending on length - change to 6?
const rewardPrice = (hourlyWage * (((roundMinutes * numRounds) + 10) / 60)).toFixed(2);
let usersAcceptedHIT = 0;
let numAssignments = teamSize * teamSize;
let QualificationReqs = [
  {
    QualificationTypeId:"00000000000000000071",  // US workers only
    LocaleValues:[{
      Country:"US",
    }],
    Comparator:"In",
    ActionsGuarded:"DiscoverPreviewAndAccept"  // only users within the US can see the HIT
  }];

if (qualificationsOn) {
  QualificationReqs.push({
    QualificationTypeId: '00000000000000000040 ',  // more than 1000 HITs
    Comparator: 'GreaterThan',
    IntegerValues: [1000],
    RequiredToPreview: true,
  })
}

const params = {
  Title: 'Write online ads by chat/text with group...',
  Description: 'You will work in a small group in a text/chat environment to write ads for new products. This task will take approximately ' + ((roundMinutes * numRounds) + 10)  + ' minutes in length, hourly pay. If you have already completed this task, do not attempt again.',
  AssignmentDurationInSeconds: 60*taskDuration, // 30 minutes?
  LifetimeInSeconds: 60*(timeActive),  // short lifetime, deletes and reposts often
  Reward: rewardPrice,
  AutoApprovalDelayInSeconds: 60*taskDuration*2,
  Keywords: 'ads, writing, copy editing, advertising',
  MaxAssignments: numAssignments,
  QualificationRequirements: QualificationReqs,
  Question: '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>'+ taskURL + '</ExternalURL><FrameHeight>400</FrameHeight></ExternalQuestion>',
};

// creates single HIT
mturk.createHIT(params,(err, data) => {
  if (err) console.log(err, err.stack);
  else     console.log("First HIT posted");
});

// Blocks users who have already worked with us
// db.users.find({}, (err, usersInDB) => {
//   if (err) {console.log("Err loading users:" + err)}
//   usersInDB.forEach((user) => {
//     let pastUser = user.mturkId;
//     if (pastUser){
//       console.log("Blocking", pastUser);

//       //Block user
//       mturk.createWorkerBlock({ WorkerId: pastUser, Reason: 'Bang' }, (err, data) => { console.log( err ? "Blocking error: " + err : data) });

//       //Unblock user
//       // mturk.deleteWorkerBlock({ WorkerId: pastUser, Reason: 'Bang' }, (err, data) => { console.log( err ? "Unblocking error: " + err : data) });
//     }
//   })
// })

// A quick way to check who we've blocked
// mturk.listWorkerBlocks({},(err,data) => {
//   if (err) {console.log("Blocking error:", err)}
//   console.log("Users currently blocked:", data.WorkerBlocks.filter((user) => user.Reason == "Bang").map((user) => {return user.WorkerId}))
// })

let delay = 1;
// only continues to post if not enough people accepted HIT
setTimeout(() => {
  usersAcceptedHIT = usersAccepted.length;
  if(usersAcceptedHIT < (teamSize * teamSize)) {
    numAssignments = ((teamSize * teamSize) - usersAcceptedHIT);
    mturk.createHIT(params,(err, data) => {
      if (err) console.log(err, err.stack);
      else     console.log("Another HIT posted");
    });
    delay++;
  } else {
    clearTimeout();
  }
}, 1000 * 60 * timeActive * delay)

//Add more products
let products = [{'name':'KOSMOS ink - Magnetic Fountain Pen',
                 'url': 'https://www.kickstarter.com/projects/stilform/kosmos-ink' },
                {'name':'Projka: Multi-Function Accessory Pouches',
                 'url': 'https://www.kickstarter.com/projects/535342561/projka-multi-function-accessory-pouches' },
                {'name':"First Swiss Automatic Pilot's watch in TITANIUM & CERAMIC",
                 'url': 'https://www.kickstarter.com/projects/chazanow/liv-watches-titanium-ceramic-chrono' }]
let users = []; //the main local user storage
let currentRound = 0

let startTime = 0

// Building task list
let task_list = []
if (starterSurveyOn) {
  task_list.push("starterSurvey")
}
let task_loop = []
task_loop.push("ready")
if (midSurveyOn) {
  task_loop.push("midSurvey")
}
if (teamfeedbackOn) {
  task_loop.push("teamfeedbackSurvey")
}
task_loop = replicate(task_loop, numRounds)
task_list= task_list.concat(task_loop)
if (blacklistOn) {
  task_list.push("blacklistSurvey")
}
task_list.push("postSurvey")
task_list.push("finished")
console.log(task_list)

let fullUrl = ''

// array of the users that have accepted the task
let usersAccepted = [];

app.use(express.static('public'));

// Adds Batch data for this experiment. unique batchID based on time/date
db.batch.insert({'batchID': batchID, 'starterSurveyOn':starterSurveyOn,'midSurveyOn':midSurveyOn, 'blacklistOn': blacklistOn,
        'teamfeedbackOn': teamfeedbackOn, 'checkinOn': checkinOn, 'conditions': conditions, 'experimentRound': experimentRound,
        'numRounds': numRounds, 'teamSize': teamSize}, (err, usersAdded) => {
    if(err) console.log("There's a problem adding batch to the DB: ", err);
    else if(usersAdded) console.log("Batch added to the DB");
}); // task_list instead of all of the toggles? (missing checkinOn)

// Chatroom
io.on('connection', (socket) => {
    
    let addedUser = false;
    let taskStarted = false;

    socket.on('log', string => { console.log(string); });

    //Chat engine
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (message) {
        // we tell the client to execute 'new message'
        console.log("received:", socket.username, message);
        let cleanMessage = message;
        users.forEach(user => {
            cleanMessage = aliasToID(user, cleanMessage)
        });

        console.log("converted to:", cleanMessage);

        let currentRoom = users.byID(socket.id).room

        let timeStamp = getSecondsPassed();

        db.chats.insert({'room':currentRoom,'userID':socket.id, 'message': message, 'time': timeStamp, 'batch': batchID, 'round': currentRound}, (err, usersAdded) => {
          if(err) console.log("There's a problem adding a message to the DB: ", err);
          else if(usersAdded) console.log("Message added to the DB");
        });

        users.filter(user => user.room == currentRoom).forEach(user => {
            let customMessage = idToAlias(user, cleanMessage);
            console.log("Sending:",customMessage)
            socket.broadcast.to(user.id).emit('new message', {
                username: idToAlias(user, String(socket.id)),
                message: customMessage
            });
            console.log('new message', user.room, user.name, customMessage)
        });
    });

    //when the client emits 'new checkin', this listens and executes
    socket.on('new checkin', function (value) {
      console.log(socket.username + "checked in with value " + value);
      let currentRoom = users.byID(socket.id).room;
      db.checkins.insert({'room':currentRoom, 'userID':socket.id, 'value': value, 'time': getSecondsPassed(), 'batch':batchID}, (err, usersAdded) => {
          if(err) console.log("There's a problem adding a checkin to the DB: ", err);
          else if(usersAdded) console.log("Checkin added to the DB");
        });
    });

    //Login
    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (data) {
        if (addedUser) {return;}

        // we store the username in the socket session for this client
        socket.username = tools.makeName(); // how they see themselves

        // if (users.length >= population) {
        //     io.in(socket.id).emit('rejected user', {});
        //     console.log('user was rejected');
        //     socket.disconnect()
        //     return
        // }

        io.in(socket.id).emit('accepted user', {name: socket.username});

        users.forEach(user => { user.friends.push({'id': socket.id, 'alias': tools.makeName(), 'tAlias':tools.makeName() }) });

        // Add friends to DB
        db.users.find({}, (err, usersInDB) => {
          if (err) {console.log("Err loading users:" + err)}

          usersInDB.forEach((user) => {
            let localUser = users.byID(user.id)
            if (localUser){
              user.friends = localUser.friends
              db.users.update( {id: user.id}, {$set: {friends: user.friends}}, {}, (err) => { if (err) { console.log("Err adding friends:" + err)}})
            }
          })
        })

        const acceptedUser = usersAccepted.byID(socket.id)

        // Add user to graph and add others as friends
        const newUser = {
          'id': socket.id,
          'mturkId': acceptedUser.mturkId,
          'assignmentId': acceptedUser.assignmentId,
          'room': '',
          'rooms':[],
          'bonus': 0,
          'person': people.pop(),
          'name': socket.username,
          'ready': false,
          'friends': users.map(user => {
            return {'id': user.id,
                    'alias': tools.makeName(),
                    'tAlias':tools.makeName() }}),
          'active': true,
          'task_list': task_list,
          'currentActivity': 0,
          'results':{
            'condition':currentCondition,
            'format':conditions[currentCondition],
            'manipulation':[],
            'starterCheck':[],
            'viabilityCheck':[],
            'manipulationCheck':'',
            'blacklistCheck':''
          }
        };

        newUser.friends.push({'id':newUser.id,
                              'alias': newUser.name,
                              'tAlias':newUser.name})

        db.users.insert(newUser, (err, usersAdded) => {
          console.log( err ? "Didn't store user: " + err : "Added " + newUser.name + " to DB.")
        });

        users.push(newUser)
        addedUser = true;

        users.forEach(user => {
            io.in(user.id).emit('login', {numUsers: numUsers(user.room)})
        });

        console.log('now we have:', users.filter(user => user.active == true).map(user => user.name));
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        // if the user had accepted, removes them from the array of accepted users
        console.log(socket.id)
        if (usersAccepted.find(function(element) {return element.id == socket.id})) {
          console.log('there was a disconnect');
          usersAccepted = usersAccepted.filter(user => user.id != socket.id);
          console.log(usersAccepted)
          console.log("num users accepted:", usersAccepted.length);
          if((teamSize ** 2) - usersAccepted.length < 0) {
            io.sockets.emit('update number waiting', {num: 0});
          } else {
            io.sockets.emit('update number waiting', {num: (teamSize ** 2) - usersAccepted.length});
          }
        }

        if (addedUser) {
          users.byID(socket.id).active = false //set user to inactive
          users.byID(socket.id).ready = false //set user to not ready

          // update DB with change
          db.users.update({ id: socket.id }, {$set: {active: false}}, {}, (err, numReplaced) => { console.log(err ? "Activity not changed: " + err : "User left " + socket.id) })

          // Start cancel process
          console.log("User left, emitting cancel to all users");
          users.forEach((user) => {
            let cancelMessage = "This HIT has crashed. Please submit below and we will accept."
            if (taskStarted) { // Add future bonus pay
              user.bonus += hourlyWage * duration
              db.users.update({ id: user.id }, {$set: {bonus: user.bonus}}, {}, (err, numReplaced) => { console.log(err ? "Bonus not recorded: " + err : "Bonus recorded: " + socket.id) })
              cancelMessage = cancelMessage + " Since the team activity had already started, you will be additionally bonused for the time spent working with the team."
            }
            io.in(user.id).emit('finished', {
                message: cancelMessage,
                finishingCode: user.id,
                turkSubmitTo: turkSubmitTo,
                assignmentId: user.assignmentId
            })
          })
        }
    });

    socket.on("execute experiment", (data) => {
      let user = users.byID(socket.id)
      let currentActivity = user.currentActivity;
      let task_list = user.task_list;
      console.log ("Activity:", currentActivity, "which is", task_list[currentActivity])

      if (task_list[currentActivity] == "starterSurvey") {
        io.in(user.id).emit("load", {element: 'starterSurvey', questions: loadQuestions(starterSurveyFile), interstitial: false});
      }
      else if (task_list[currentActivity] == "ready") {
        if (checkinOn) {
          io.in(user.id).emit("load", {element: 'checkin', questions: loadQuestions(checkinFile), interstitial: true});
        }
        io.in(user.id).emit("echo", "ready");
      }
      else if (task_list[currentActivity] == "midSurvey") {
        io.in(user.id).emit("load", {element: 'midSurvey', questions: loadQuestions(midSurveyFile), interstitial: false});
      }
      else if (task_list[currentActivity] == "teamfeedbackSurvey") {
        io.in(user.id).emit("load", {element: 'teamfeedbackSurvey', questions: loadQuestions(feedbackFile), interstitial: false});
      }
      else if (task_list[currentActivity] == "blacklistSurvey") {
        console.log({element: 'blacklistSurvey', questions: loadQuestions(blacklistFile), interstitial: false})
        io.in(user.id).emit("load", {element: 'blacklistSurvey', questions: loadQuestions(blacklistFile), interstitial: false});
      }
      else if (task_list[currentActivity] == "postSurvey") { //Launch post survey
          user.ready = false
          let survey = postSurveyGenerator(user)
          user.results.manipulation = survey.correctAnswer
          db.users.update({ id: socket.id }, {$set: {"results.manipulation": user.results.manipulation}}, {}, (err, numReplaced) => { console.log(err ? err : "Stored manipulation: " + user.name) })
          io.in(user.id).emit("load", {element: 'postSurvey', questions: loadQuestions(postSurveyFile), interstitial: false});
      }
      else if (task_list[currentActivity] == "finished" || currentActivity > task_list.lenght) {
        // console.log(usersAccepted)
        // console.log(socket.id)

        io.in(socket.id).emit('finished', {
          message: "Thanks for participating, you're all done!",
          finishingCode: socket.id,
          turkSubmitTo: turkSubmitTo,
          assignmentId: user.assignmentId
        })
      }
      user.currentActivity += 1
    })

    // Main experiment run
    socket.on('ready', function (data) {
      //console.log(fullUrl);
      //waits until user ends up on correct link before adding user - repeated code, make function

      users.byID(socket.id).ready = true;
      console.log(socket.username, 'is ready');

      //are we ready to go? if not return empty
      if (users.filter(user => !user.ready).length) {
        console.log("some users not ready", users.filter(user => !user.ready).map(user => user.name))
        return } //are all users ready?
      // if (incompleteRooms().length) {
      //   console.log("Some rooms empty:",incompleteRooms())
      //   return } //are all rooms assigned
      if (users.length != teamSize ** 2) {
        console.log("Need",teamSize ** 2 - users.length,"more users.")
        return
      }

      console.log('all users ready -> starting experiment');
      //do we have more experiments to run? if not, finish

      //can we move this into its own on.*** call

      treatmentNow = (currentCondition == "treatment" && currentRound == experimentRound)
      const conditionRound = conditions[currentCondition][currentRound] - 1

      // assign rooms to peple and reset.
      Object.entries(teams[conditionRound]).forEach(([roomName,room]) => {
        users.filter(user => room.includes(user.person)).forEach(user => {
          user.room = roomName
          user.rooms.push(roomName)
          user.ready = false; //return users to unready state
          console.log(user.name, '-> room', user.room);
        })
      })

      //Notify user 'go' and send task.
      let currentProduct = products[currentRound]
      let taskText = "Design text advertisement for <strong><a href='" + currentProduct.url + "' target='_blank'>" + currentProduct.name + "</a></strong>!"

      taskStarted = true
      users.forEach(user => {
        if (autocompleteTestOn) {
          let teamNames = [tools.makeName(), tools.makeName(), tools.makeName(), tools.makeName(), tools.makeName()]
          console.log(teamNames)
          io.in(user.id).emit('go', {task: taskText, team: teamNames, duration: roundMinutes })
        } else {
          io.in(user.id).emit('go', {task: taskText, team: user.friends.filter(friend => { return users.byID(friend.id).room == user.room }).map(friend => { return treatmentNow ? friend.tAlias : friend.alias }), duration: roundMinutes })
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
          users.forEach(user => { io.in(user.id).emit('stop', {round: currentRound, survey: (midSurveyOn || teamfeedbackOn)}) });
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
        socket.emit('finished', {finishingCode: "broken", turkSubmitTo: turkSubmitTo, assignmentId: data.assignmentId, message: "The task has completed. You will be compensated."})
        socket.disconnect();
        console.log("Sockets active: " + Object.keys(io.sockets.sockets));
  });

  //Launch post survey
  // if (currentRound >= numRounds) {
  //   users.forEach(user => {
  //     user.ready = false
  //     let survey = postSurveyGenerator(user)
  //     io.in(user.id).emit('load postsurvey')
  //     user.results.manipulation = survey.correctAnswer
  //     db.users.update({ id: socket.id }, {$set: {"results.manipulation": user.results.manipulation}}, {}, (err, numReplaced) => { console.log(err ? err : "Stored manipulation: " + user.name) })
  //     io.in(user.id).emit('postSurvey', {questions: survey.questions, answers:survey.answers})
  //   })
  // }
  //if the user has accepted the HIT, add the user to the array usersAccepted
  socket.on('accepted HIT', (data) => {
    usersAccepted.push({
      "id": socket.id,
      "mturkId": data.mturkId,
      "id": String(socket.id),
      "turkSubmitTo": data.turkSubmitTo,
      "assignmentId": data.assignmentId
    });
    console.log(data.turkSubmitTo);
    console.log(usersAccepted,"users accepted currently: " + usersAccepted.length ); //for debugging purposes
    // Disconnect leftover users
    Object.keys(io.sockets.sockets).forEach(socketID => {
      if (usersAccepted.every(acceptedUser => {return acceptedUser.id !== socketID})) {
        console.log("Removing dead socket: " + socketID);
        io.sockets.connected[socketID].emit('get IDs', 'broken');
      }
    });
    console.log("Sockets active: " + Object.keys(io.sockets.sockets));
    // if enough people have accepted, push prompt to start task
    if(usersAccepted.length >= teamSize ** 2) {
      let numWaiting = 0;
      io.sockets.emit('update number waiting', {num: 0});
      usersAccepted.forEach(user => {io.in(user.id).emit('enough people')});
    } else {
      let numWaiting = (teamSize ** 2) - usersAccepted.length;
      io.sockets.emit('update number waiting', {num: numWaiting});
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
    let parsedResults = surveyResults.split('&');
    let arrayLength = parsedResults.length;
    for(var i = 0; i < arrayLength; i++) {
      console.log(parsedResults[i]);
      let result = parsedResults[i].slice(parsedResults[i].indexOf("=") + 1);
      let resultValue = numberToValue(result);
      let qIndex = (parsedResults[i].slice(0, parsedResults[i].indexOf("="))).lastIndexOf('q');
      let questionNumber = (parsedResults[i].slice(0, parsedResults[i].indexOf("="))).slice(qIndex + 1);
      if(questionNumber == "15") {  // because last question is a binary question
        resultValue = numberToBinary(result);
      }
      parsedResults[i] = questionNumber + '=' + resultValue;
    }
    return parsedResults;
  }

  // for 1-5 scale questions based on:
  // Answer Option Sets - around line 22
  // const answers =['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
  function numberToValue(value) {
    return answers[parseInt(value) - 1];  // index 0
  }

  // for binary questions
  // Answer Option Sets - around line 22
  // const binaryAnswers = ['Yes', 'No']
  function numberToBinary(value) {
    return binaryAnswers[parseInt(value) - 1];  // index 0
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

  socket.on('postSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    //in the future this could be checked.
    user.results.manipulationCheck = data //(user.results.manipulation == data) ? true : false
    console.log(user.name, "submitted survey:", user.results.manipulationCheck);
    db.users.update({ id: socket.id }, {$set: {"results.manipulationCheck": user.results.manipulationCheck}}, {}, (err, numReplaced) => { console.log(err ? err : "Stored manipulation: " + user.name) })
  })

  socket.on('blacklistSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    //in the future this could be checked.
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
    const prefix = questionFile.substr(0, questionFile.indexOf('.'))
    let questions = []
    let i = 0
    fs.readFileSync(questionFile).toString().split('\n').forEach(function (line) {
      let questionObj = {};
      i++;
      questionObj['name'] = prefix + i;

      //each question in the text file should be formatted: ANSWERTAG.QUESTION ex: YN.Are you part of Team Mark?
      questionObj['question'] = line.substr(line.indexOf('.')+1, line.length);
      let answerTag = line.substr(0, line.indexOf('.'));
      if(answerTag === "S1") { // scale 1 radio
        answerObj = answers;
      } else if (answerTag === "YN") { // yes no
        answerObj = binaryAnswers;
      } else if (answerTag === "TR") { //team radio
        answerObj = {answers: getTeamMembers(users.byID(socket.id)), answerType: 'radio'};
      } else if (answerTag === "TC") { //team checkbox
        answerObj = {answers: getTeamMembers(users.byID(socket.id)), answerType: 'checkbox'};
      } 
      questionObj['answers'] = answerObj.answers;
      questionObj['answerType'] = answerObj.answerType;
      questions.push(questionObj)
    })
    return questions
  }

});

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

//returns number of users in a room: room -> int
const numUsers = room => users.filter(user => user.room === room).length

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
