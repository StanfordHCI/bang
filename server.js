//Settings
const devMode = false
const checkinOn = true
const teamSize = 1
const roundMinutes = .2
const checkinIntervalMinutes = .1;

// Settup toggles
const autocompleteTest = false //turns on fake team to test autocomplete
const midSurveyToggle = true
const blacklistToggle = true

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

// Setting up DB
const Datastore = require('nedb'),
    db = {};
    db.users = new Datastore({ filename:'.data/users', autoload: true });
    db.chats = new Datastore({ filename:'.data/chats', autoload: true });
    db.products = new Datastore({ filename:'.data/products', autoload: true });
    db.checkins = new Datastore({ filename:'.data/checkins', autoload: true});
    db.midSurvey = new Datastore({ filename:'.data/midSurvey', autoload: true}); // to store midSurvey results - MAIKA

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

// Routing
app.use(express.static('public'));

// Chatroom
io.on('connection', (socket) => {
    let addedUser = false;

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

        db.chats.insert({'room':currentRoom,'userID':socket.id, 'message': message}, (err, usersAdded) => {
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
      db.checkins.insert({'room':currentRoom, 'userID':socket.id, 'value': value, 'time': getSecondsPassed()}, (err, usersAdded) => {
          if(err) console.log("There's a problem adding a checkin to the DB: ", err);
          else if(usersAdded) console.log("Checkin added to the DB");
        });
    });

    //Login
    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (mturkID) {
        if (addedUser) return;

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

        // Add user to graph and add others as friends
        const newUser = {
          'id': socket.id,
          'mturk': mturkID,
          'room': '',
          'rooms':[],
          'person': people.pop(),
          'name': socket.username,
          'ready': false,
          'friends': users.map(user => {
            return {'id': user.id,
                    'alias': tools.makeName(),
                    'tAlias':tools.makeName() }}),
          'active': true,
          'results':{
            'condition':currentCondition,
            'format':conditions[currentCondition],
            'manipulation':[],
            'viabilityCheck':'', // survey questions after each round - MAIKA
            'manipulationCheck':'',
            'blacklistCheck':'' // check whether the team member blacklisted
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

        //each client knows the alias of the new user
        // users.forEach(user => {
            // io.in(user.id).emit('user joined ', {
            //     username: idToAlias(user, socket.username),
            //     numUsers: numUsers(user.room)
            // });
        // })
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        if (addedUser) {
          users.byID(socket.id).active = false //set user to inactive
          users.byID(socket.id).ready = false //set user to not ready

          // update DB with change
          db.users.update({ id: socket.id }, {$set: {active: false}}, {}, (err, numReplaced) => {
                          console.log(err ? "Activity not changed:" + err : "User left " + socket.id)
          })

          // users.forEach(user => {
          //   socket.broadcast.to(user.id).emit('user left', {
          //     username: idToAlias(user, socket.username),
          //     numUsers: numUsers(user.room)
          //     });
          // })

          // Report rooms' completeness
          console.log( "Rooms now incomplete:", incompleteRooms() )
        }
    });

    // Main experiment run
    socket.on('ready', function (data) {

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

      if (currentRound < numRounds){
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

        users.forEach(user => {
          if (autocompleteTest) {
            let teamNames = [tools.makeName(), tools.makeName(), tools.makeName(), tools.makeName(), tools.makeName()]
            console.log(teamNames)
            io.in(user.id).emit('go', {task: taskText, team: teamNames })
          } else {
            io.in(user.id).emit('go', {task: taskText, team: user.friends.filter(friend => { return users.byID(friend.id).room == user.room }).map(friend => { return treatmentNow ? friend.tAlias : friend.alias }) })
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
            users.forEach(user => { io.in(user.id).emit('stop', {round: currentRound}) });

            console.log('launching midSurvey', currentRound);
            users.forEach(user => { io.in(user.id).emit('midSurvey', midSurvey(user)) });

            currentRound += 1 // guard to only do this when a round is actually done.
            console.log(currentRound, "out of", numRounds)
          }, 1000 * 60 * 0.1 * roundMinutes)
        }, 1000 * 60 * 0.9 * roundMinutes)

      }

        //record start checkin time in db
        let currentRoom = users.byID(socket.id).room
        db.checkins.insert({'room':currentRoom, 'userID':socket.id, 'value': 0, 'time': getSecondsPassed()}, (err, usersAdded) => {
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
      
        
        
      
      //Launch post survey
      if (currentRound >= numRounds) {
        users.forEach(user => {
          user.ready = false
          let survey = postSurveyGenerator(user)
          user.results.manipulation = survey.correctAnswer
          db.users.update({ id: socket.id }, {$set: {"results.manipulation": user.results.manipulation}}, {}, (err, numReplaced) => { console.log(err ? err : "Stored manipulation: " + user.name) })
          io.in(user.id).emit('postSurvey', {questions: survey.questions, answers:survey.answers})
        })
      }
  });

   // Task after each round - midSurvey - MAIKA
   socket.on('midSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    let currentRoom = users.byID(socket.id).room
    user.results.viabilityCheck = data
    console.log(user.name, "submitted survey:", user.results.viabilityCheck);

    //let result = data.location.search.slice(6);
    //user.results.viabilityCheck = result
    db.midSurvey.insert({'userID':socket.id, 'room':currentRoom, 'name':user.name, 'midSurvey': user.results.viabilityCheck}, (err, usersAdded) => {
      if(err) console.log("There's a problem adding midSurvey to the DB: ", err);
      else if(usersAdded) console.log("MidSurvey added to the DB");
    });
    console.log(data)
  });

  // Task
  socket.on('postSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    //in the future this could be checked.
    user.results.manipulationCheck = data //(user.results.manipulation == data) ? true : false
    console.log(user.name, "submitted survey:", user.results.manipulationCheck);

    db.users.update({ id: socket.id }, {$set: {"results.manipulationCheck": user.results.manipulationCheck}}, {}, (err, numReplaced) => { console.log(err ? err : "Stored manipulation: " + user.name) })
    io.in(socket.id).emit('blacklistSurvey');
  });

  socket.on('blacklistSurveySubmit', (data) => {
    let user = users.byID(socket.id)
    //in the future this could be checked.
    user.results.blacklistCheck = data //(user.results.manipulation == data) ? true : false
    // console.log(user.name, "submitted blacklist survey:", user.results.blacklistCheck);
    console.log(user.name, "submitted blacklist survey:", data);

    db.users.update({ id: socket.id }, {$set: {"results.blacklistCheck": user.results.blacklistCheck}}, {}, (err, numReplaced) => { console.log(err ? err : "Stored blacklist: " + user.name) })
    io.in(socket.id).emit('finished', {finishingCode: socket.id});
  });

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


//returns number of users in a room: room -> int
const numUsers = room => users.filter(user => user.room === room).length

//used to check if users are supposed to be in the study based on: mturkID -> boolean
const checkUser = mturkID => true

//Returns a random remaining room space, or error if none. () -> room | error
const incompleteRooms = () => rooms.filter(room => numUsers(room) < teamSize)
const assignRoom = () => incompleteRooms().pick()

//define midSurvey - MAIKA - returns answers from individual
const midSurvey = (user) => {
  return {questions:{'Q1': { question:"The members of this team could work for a long time together.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q2': { question:"Most of the members of this team would welcome the opportunity to work as a group again in the future.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q3': { question:"This team has the capacity for long-term success. ",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q4': { question:"This team has what it takes to be effective in the future. ",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q5': { question:"This team would work well together in the future.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q6': { question:"This team has positioned itself well for continued success. ",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q7': { question:"This team has the ability to perform well in the future.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q8': { question:"This team has the ability to function as an ongoing unit.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q9': { question:"This team should continue to function as a unit.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q10': { question:"This team has the resources to perform well in the future.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q11': { question:"This team is well positioned for growth over time.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q12': { question:"This team can develop to meet future challenges. ",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q13': { question:"This team has the capacity to sustain itself.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q14': { question:"This team has what it takes to endure in future performance episodes.",
                            answers:["1. strongly disagree", "2. disagree", "3. neutral", "4. agree", "5. strongly agree"] },
                     'Q15': { question:"If you had the choice, would you like to work with the same team in a future round?",
                            answers:["1. No", "5. Yes"] }  }}
}

// This function generates a post survey for a user (listing out each team they were part of), and then provides the correct answer to check against.
const postSurveyGenerator = (user) => {
  // Makes a list of teams this user has worked with
  const roomTeams = user.rooms.map((room, rIndex) => { return users.filter(user => user.rooms[rIndex] == room) })

  // Makes a human friendly string for each team with things like 'you' for the current user, commas and 'and' before the last name.
  const answers = roomTeams.map((team, tIndex) => team.reduce((total, current, pIndex, pArr)=>{
    const friend = user.friends.find(friend => friend.id == current.id)
    let name = ((experimentRound == tIndex && currentCondition == "treatment") ? friend.tAlias : friend.alias)
    if (name == user.name) {name = "you"}
    return name + (pIndex == 0 ? "" : ((pIndex + 1) == pArr.length ? " and " : ", ")) + total
  },""))

  // Makes a list comtaining the 2 team same teams, or empty if none.
  let correctAnswer = answers.filter((team,index) => {
    return conditions[currentCondition][index] == experimentRoundIndicator })
  if (correctAnswer.length == 1) {correctAnswer = ""}
  console.log(answers,correctAnswer)

  return { question:"Select teams you think consisted of the same people.",
           answers: answers,
           correctAnswer: correctAnswer }
}
