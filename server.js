require('dotenv').config()

//Environmental settings, set in .env
const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE" //ONLY CHANGE ON SERVER
const teamSize = process.env.TEAM_SIZE = 2
const roundMinutes = 2

//Parameters for waiting qualifications
const secondsToWait = 20 //number of seconds users must have been on pretask to meet qualification (e.g. 120)
const secondsSinceResponse = 20 //number of seconds since last message users sent to meet pretask qualification (e.g. 20)
const secondsToHold1 = 720 //maximum number of seconds we allow someone to stay in the pretask (e.g. 720)
const secondsToHold2 = 420 //maximum number of seconds of inactivity that we allow in pretask (e.g. 60)

// Toggles
const runExperimentNow = true
const issueBonusesNow = true
const cleanHITs = false
const assignQualifications = false
const debugMode = !runningLive

const suddenDeath = false

const randomCondition = false
const randomRoundOrder = false

const psychologicalSafetyOn = true
const starterSurveyOn = false
const midSurveyOn = false
const blacklistOn = false
const teamfeedbackOn = false
const checkinOn = false
const timeCheckOn = true // tracks time user spends on task and updates payment - also tracks how long each task is taking
const requiredOn = runningLive
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

const roundOrdering = [
  {"control": [1,2,1], "treatment": [1,2,1], "baseline": [1,2,3]},
  {"control": [2,1,1], "treatment": [2,1,1], "baseline": [1,2,3]},
  {"control": [1,1,2], "treatment": [1,1,2], "baseline": [1,2,3]}]

const experimentRoundIndicator = 1
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

// Setting up DB
const Datastore = require('nedb'),
    db = {};
    db.starterSurvey = new Datastore({ filename:'.data/starterSurvey', autoload: true });
    db.users = new Datastore({ filename:'.data/users', autoload: true });
    db.chats = new Datastore({ filename:'.data/chats', autoload: true });
    db.products = new Datastore({ filename:'.data/products', autoload: true });
    db.checkins = new Datastore({ filename:'.data/checkins', autoload: true});
    db.teamFeedback = new Datastore({ filename:'.data/teamFeedback', autoload: true});
    db.psychologicalSafety = new Datastore({ filename:'.data/psychologicalSafety', autoload: true}); // to store psychological safety results
    db.blacklist = new Datastore({ filename:'.data/blacklist', autoload: true});
    db.midSurvey = new Datastore({ filename:'.data/midSurvey', autoload: true}); // to store midSurvey results
    db.batch = new Datastore({ filename:'.data/batch', autoload: true}); // to store batch information
    db.time = new Datastore({ filename:'.data/time', autoload: true}); // store duration of tasks


const updateUserInDB = (user,feild,value) => { db.users.update(
  {id: user.id}, {$set: {feild: value}}, {},
  err => console.log(err ? "Err recording "+feild+": "+err : "Updated "+feild+" "+user.id+"\n"+value+"\n")
)}

require('express')().listen(); //Sets to only relaunch with source changes

//Mturk Calls
if (runningLive){
  db.users.find({}, (err, usersInDB) => {
    if (err) {console.log("Err loading users for background tasks:" + err)} else {
      if (issueBonusesNow) {
        mturk.payBonuses(usersInDB).forEach(u => updateUserInDB(u,'bonus',0))
        // usersInDB.forEach(u => updateUserInDB(u,'bonus',0)) Clears all stored bonuses
      }
      if (assignQualifications) {
        db.users.find({}, (err, usersInDB) => {
          if (err) {console.log("Err loading users:" + err)}
          mturk.assignQualificationToUsers(usersInDB);
        })
        mturk.listUsersWithQualification()
      }
    }
  })
}

if (cleanHITs){ mturk.expireActiveHits() }
if (runExperimentNow){ mturk.launchBang() }

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
let enoughPeople = false

// keeping track of time
let taskStartTime = getSecondsPassed(); // reset for each start of new task
let taskEndTime = 0;
let taskTime = 0;

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
if (psychologicalSafetyOn) {
  task_loop.push("psychologicalSafety")
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
}); // task_list instead of all of the toggles? (missing checkinOn)

// Chatroom
io.on('connection', (socket) => {
    //NOTE: THIS fxn is called multiple times so these conditions will be set multiple times
    let addedUser = false
    let taskStarted = false
    let taskOver = false
    // let enoughPeople = false

    socket.on('log', string => { console.log(string); });

    //Route messages
    socket.on('new message', function (message) {
      user = users.byID(socket.id)
      let cleanMessage = message;
      users.forEach(u => { cleanMessage = aliasToID(u, cleanMessage) });

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

    //Login
    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (data) {
        if (addedUser) {return}

        // we store the username in the socket session for this client
        name_structure = tools.makeName();
        socket.username = name_structure.username; // how they see themselves

        // if (users.length >= population) {
        //     io.in(socket.id).emit('rejected user', {});
        //     console.log('user was rejected');
        //     socket.disconnect()
        //     return
        // }

        io.in(socket.id).emit('accepted user', {name: socket.username});

        // Adding the user to the friends list for all other users
        users.forEach(user => { user.friends.push({'id': socket.id, 'alias': tools.makeName().username, 'tAlias':tools.makeName().username }) });

        // Add friends to DB
        db.users.find({}, (err, usersInDB) => {
          if (err) {console.log("Err loading users:" + err)}

          usersInDB.forEach((user) => {
            let localUser = users.byID(user.id)
            if (localUser){
              user.friends = localUser.friends
              updateUserInDB(user,'friends',user.friends)
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
          'person': '',
          'name': socket.username,
          'ready': false,
          'friends': users.map(user => {
            return {'id': user.id,
                    'alias': tools.makeName().username,
                    'tAlias':tools.makeName().username }}),
          'friends_history': [name_structure.parts], // list of aliases to avoid, which includes the user's username
          'active': true,
          'task_list': task_list,
          'currentActivity': 0,
          'results':{
            'condition':currentCondition,
            'format':conditions[currentCondition],
            'manipulation':[],
            'starterCheck':[],
            'viabilityCheck':[],
            'psychologicalSafety':[],
            'manipulationCheck':'',
            'blacklistCheck':'',
            'engagementFeedback': '',
            'teamfracture':'',
            'teamfeedback':''
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
        console.log("Socket disconecting is", socket.id)
        if (usersAccepted.find(function(element) {return element.id == socket.id})) {
          console.log('There was a disconnect');
          usersAccepted = usersAccepted.filter(user => user.id != socket.id);

          debugLog(usersAccepted)
          console.log("num users accepted:", usersAccepted.length);
          if((teamSize ** 2) - usersAccepted.length < 0) {
            io.sockets.emit('update number waiting', {num: 0});
          } else {
            io.sockets.emit('update number waiting', {num: (teamSize ** 2) - usersAccepted.length});
          }

          mturk.setAssignmentsPending(usersAccepted.length)
        }

        if (addedUser) {
          users.byID(socket.id).active = false //set user to inactive
          users.byID(socket.id).ready = false //set user to not ready
          if (!suddenDeath) {users.byID(socket.id).ready = true}

          // update DB with change
          updateUserInDB(socket,'active',false)


          if (!taskOver && !suddenDeath) {console.log("Sudden death is off, so we will not cancel the run")}

          if (!taskOver && suddenDeath){
            // Start cancel process
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
              if (taskStarted) { // Add future bonus pay
                if(timeCheckOn) {
                  mturk.updatePayment(totalTime);
                  user.bonus += mturk.bonusPrice
                } else {
                  user.bonus += mturk.bonusPrice/2
                }
                updateUserInDB(user,'bonus',user.bonus)
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
        users = users.filter(user => user.id != socket.id);

    });

    socket.on("execute experiment", (data) => {
      let user = users.byID(socket.id)
      console.log("EXECUTE THE PRISONERS" + socket.id)
      let currentActivity = user.currentActivity;
      let task_list = user.task_list;
      console.log ("Activity:", currentActivity, "which is", task_list[currentActivity])

      if (task_list[currentActivity] == "starterSurvey") {
        io.in(user.id).emit("load", {element: 'starterSurvey', questions: loadQuestions(starterSurveyFile), interstitial: false, showHeaderBar: false});
        taskStartTime = getSecondsPassed();
      }
      else if (task_list[currentActivity] == "ready") {
        if(starterSurveyOn && timeCheckOn) {
          recordTime("starterSurvey");
        }
        if (checkinOn) {
          io.in(user.id).emit("load", {element: 'checkin', questions: loadQuestions(checkinFile), interstitial: true, showHeaderBar: true});
        }
        io.in(user.id).emit("load", {element: 'leave-hit', questions: loadQuestions(leaveHitFile), interstitial: true, showHeaderBar: true})
        io.in(user.id).emit("echo", "ready");

      }
      else if (task_list[currentActivity] == "midSurvey") {
        if(timeCheckOn) {
          recordTime("round");
        }
        io.in(user.id).emit("load", {element: 'midSurvey', questions: loadQuestions(midSurveyFile), interstitial: false, showHeaderBar: true});
      }
       else if (task_list[currentActivity] == "psychologicalSafety") {
        if(timeCheckOn) {
          recordTime("round");
        }
        io.in(user.id).emit("load", {element: 'psychologicalSafety', questions: loadQuestions(psychologicalSafetyFile), interstitial: false, showHeaderBar: true});
      }
      else if (task_list[currentActivity] == "teamfeedbackSurvey") {
        if(midSurveyOn && timeCheckOn) {
          recordTime("midSurvey");
        } else if(timeCheckOn) {
          recordTime("round");
        }
        io.in(user.id).emit("load", {element: 'teamfeedbackSurvey', questions: loadQuestions(feedbackFile), interstitial: false, showHeaderBar: true});
      }
      else if (task_list[currentActivity] == "blacklistSurvey") {
        taskOver = true
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
      else if (task_list[currentActivity] == "postSurvey") { //Launch post survey
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
      else if (task_list[currentActivity] == "finished" || currentActivity > task_list.length) {
        if(timeCheckOn) {
          recordTime("postSurvey");
        }
        user.bonus += mturk.bonusPrice
        updateUserInDB(user,"bonus",user.bonus)

        io.in(socket.id).emit('finished', {
          message: "Thanks for participating, you're all done!",
          finishingCode: socket.id,
          turkSubmitTo: mturk.submitTo,
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

      if (users.filter(u => !u.ready).length) {
        console.log("some users not ready", users.filter(u => !u.ready).map(u => u.name))
        return
      }

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

      // assign rooms to people and reset.
      users.forEach(u => {
        u.person = people.pop();
      })
      Object.entries(teams[conditionRound]).forEach(([roomName,room]) => {
        users.filter(u => room.includes(u.person)).forEach(u => {
          u.room = roomName
          u.rooms.push(roomName)
          u.ready = false //return users to unready state
          if (!suddenDeath && !u.active) {u.ready = true}
          console.log(u.name, '-> room', u.room);
        })
      })

      //Notify user 'go' and send task.
      let currentProduct = products[currentRound]
      let taskText = "Design text advertisement for <strong><a href='" + currentProduct.url + "' target='_blank'>" + currentProduct.name + "</a></strong>!"

      taskStarted = true
      users.forEach(user => {
        if (autocompleteTestOn) {
          let teamNames = [tools.makeName().username, tools.makeName().username, tools.makeName().username, tools.makeName().username, tools.makeName().username]
          console.log(teamNames)
          io.in(user.id).emit('go', {task: taskText, team: teamNames, duration: roundMinutes, randomAnimal: tools.randomAnimal, round: currentRound + 1})//rounds are 0 indexed
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
              teamMates[i].alias = team_Aliases[i].join("")
              team_Aliases[i] = team_Aliases[i].join("")
            }
          }

          team_Aliases.push(user.name) //now push user for autocomplete
          //let myteam = user.friends.filter(friend => { return (users.byID(friend.id).room == user.room)});
          // io.in(user.id).emit('go', {task: taskText, team: user.friends.filter(friend => { return users.byID(friend.id).room == user.room }).map(friend => { return treatmentNow ? friend.tAlias : friend.alias }), duration: roundMinutes })
          io.in(user.id).emit('go', {task: taskText, team: team_Aliases, duration: roundMinutes, randomAnimal: tools.randomAnimal, round: currentRound + 1})//round 0 indexed
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
          users.forEach(user => { io.in(user.id).emit('stop', {round: currentRound, survey: (midSurveyOn || teamfeedbackOn || psychologicalSafetyOn) }) });
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
        socket.emit('finished', {finishingCode: "broken", turkSubmitTo: mturk.submitTo, assignmentId: data.assignmentId, message: "The task has may have had an error. You will be compensated."})
        console.log("Sockets active: " + Object.keys(io.sockets.sockets));
  });

  socket.on('accepted HIT', (data) => {
    usersAccepted.push({
      "id": socket.id,
      "mturkId": data.mturkId,
      "id": String(socket.id),
      "turkSubmitTo": data.turkSubmitTo,
      "assignmentId": data.assignmentId,
      "timeAdded": data.timeAdded,
      "timeLastActivity": data.timeAdded,
      "waiting": false
    });
    mturk.setAssignmentsPending(usersAccepted.length)
    debugLog(usersAccepted,"users accepted currently: " + usersAccepted.length )

    // Disconnect leftover users
    Object.keys(io.sockets.sockets).forEach(socketID => {
      if (usersAccepted.every(acceptedUser => {return acceptedUser.id !== socketID})) {
        console.log("Removing dead socket: " + socketID);
        io.in(socketID).emit('get IDs', 'broken');
      }
    });
    console.log("Sockets active: " + Object.keys(io.sockets.sockets));
    checkUsersAccepted(usersAccepted);
  });

  function checkUsersAccepted(usersAccepted) {
    if (!enoughPeople) {
      usersAccepted.forEach(user => {
      if ((Date.now() - user.timeAdded)/1000 > secondsToWait && (Date.now() - user.timeLastActivity)/1000 < secondsSinceResponse) {
        user.waiting = true;
      } else {
        user.waiting = false;
      }
      usersWaiting = usersAccepted.filter(user => user.waiting === true);
      weightedHoldingSeconds = secondsToHold1 + 0.33*(secondsToHold1/(teamSize**2 - usersWaiting.length))
      if ((Date.now() - user.timeAdded)/1000 > weightedHoldingSeconds || (Date.now() - user.timeLastActivity)/1000 > secondsToHold2) {
        io.in(user.id).emit('get IDs', 'broken');
      }
    });

    //for debugging
    for (var i = 0; i < usersAccepted.length; i++) {
      console.log("User", i, "is ready:", String(usersAccepted[i].waiting));
    };

    // if enough people have accepted, push prompt to start task
    usersWaiting = usersAccepted.filter(user => user.waiting === true);
    if(usersWaiting.length >= teamSize ** 2) {//if waiting users is >= required amount
      //io.sockets.emit('update number waiting', {num: 0});
      enoughPeople = true;
      let usersNeeded = teamSize **2;
      console.log('num of users is ' + users.length)
      //users.forEach((user, index) => {//for every user
      for (let index = users.length - 1; index >= 0; index -= 1) {
        user = users[index]
        if(usersWaiting.every(user2 => user.id !== user2.id) || usersNeeded <= 0) {//if that user that is not a waiting user or is extra
          users.splice(index)
          io.in(user.id).emit('finished', {
            message: "Thanks for participating, you're all done!",
            finishingCode: socket.id,
            turkSubmitTo: mturk.submitTo,
            assignmentId: user.assignmentId
          });
        } else { //found a valid user
          usersNeeded--;
        } 
      // console.log("some users not ready", users.filter(user => !user.ready).map(user => user.name))
        // if(!usersWaiting.includes(user)) {
        //   for (var i = 0; i < users.length; i++) {
        //     if(users[i].id === user.id) {
        //       users.splice(i);
        //     }
        //   }
        // }
      };

      for (var i = 0; i < teamSize ** 2; i++) {
        io.in(users[i].id).emit('enough people');
      };
      

      //send rest of users to finished
      // for (var i = teamSize**2; i < usersAccepted.length; i++) {
      //   if(usersWaiting[i] !== null) {
      //     io.in(usersWaiting[i].id).emit('finished');
      //   }
      // }
    } else {
      let numWaiting = (teamSize ** 2) - usersAccepted.length;
      io.sockets.emit('update number waiting', {num: numWaiting});
    }
    }
  }

  socket.on('accepted user chatted', (data) => {
    usersAccepted.filter(user => user.id === socket.id).forEach(user => {user.timeLastActivity = data.time});
    checkUsersAccepted(usersAccepted);
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
    user.results.engagementFeedback = data
    updateUserInDB(socket,"results.engagementFeedback",data)
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
