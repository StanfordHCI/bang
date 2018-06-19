//Settings
const devMode = true
const teamSize = 1;
const roundMinutes = devMode ? 0.001 : 10;

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

// Setting up variables
const currentCondition = "treatment"
let treatmentNow = false
const conditions = {"control": [1,2,1], "treatment": [1,2,1], "baseline": [1,2,3]}
const numRounds = conditions.baseline.length

const numberOfRooms = teamSize * numRounds
const rooms = tools.letters.slice(0,numberOfRooms)
const people = tools.letters.slice(0,teamSize ** 2)
const teams = tools.createTeams(teamSize,numRounds,people)

//Add more products
let products = [{'name':'KOSMOS ink - Magnetic Fountain Pen',
                 'url': 'https://www.kickstarter.com/projects/stilform/kosmos-ink' },
                {'name':'Projka: Multi-Function Accessory Pouches',
                 'url': 'https://www.kickstarter.com/projects/535342561/projka-multi-function-accessory-pouches' },
                {'name':"First Swiss Automatic Pilot's watch in TITANIUM & CERAMIC",
                 'url': 'https://www.kickstarter.com/projects/chazanow/liv-watches-titanium-ceramic-chrono' }]

let users = [];
let currentRound = 0

//emit a 'finish' and go to blank page, restart after some time
//organize to people in rounds based on signup information
// Onboarding
// modify current handshake to get user's MTurk ID and establish connection with client
// Waiting room
//emit a 'start' and go to chat
// Fail
//closing servey
//emit a 'fail' and move everyone to a page that shows a completion code

// Routing
app.use(express.static('public'));

// Chatroom
io.on('connection', (socket) => {
    let addedUser = false;

    socket.on('log', string => { console.log(string); });

    //Chat engine
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
        // we tell the client to execute 'new message'
        console.log("received:", socket.username, data);
        let nameData = data;
        users.forEach(user => {
            nameData = aliasToID(user, nameData)
        });

        console.log("converted to:", nameData);

        let currentRoom = users.byID(socket.id).room

        db.chats.insert({'room':currentRoom,'userID':socket.id, 'message': data}, (err, usersAdded) => {
          if(err) console.log("There's a problem adding a message to the DB: ", err);
          else if(usersAdded) console.log("Message added to the DB");
        });

        users.filter(user => user.room == currentRoom).forEach(user => {
            let friendData = idToAlias(user, nameData);
            socket.broadcast.to(user.id).emit('new message', {
                username: idToAlias(user, socket.username),
                message: friendData
            });
            console.log('new message', user.room, user.name, friendData)
        });
    });

    //Login
    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (mturkID) {
        if (addedUser) return;

        // we store the username in the socket session for this client
        socket.username = tools.makeName(); // how they see themselves
        let room = assignRoom();

        //is the user valid and do we have space for them?
        if (!checkUser(mturkID) || !room) {
            io.in(socket.id).emit('rejected user', {});
            console.log('user was rejected');
            socket.disconnect()
            return
        }

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
          'room': room,
          'person': people.pop(),
          'name': socket.username,
          'ready': false,
          'friends': users.map(user => { return {'id': user.id,
                                                 'alias': tools.makeName(),
                                                 'tAlias':tools.makeName() }}),
          'active': true
        };

        db.users.insert(newUser, (err, usersAdded) => {
          console.log( err ? "There's a problem adding a user to the DB: " + err : "Added to DB: " + newUser.name)
        });

        users.push(newUser)
        addedUser = true;

        users.forEach(user => {
            io.in(user.id).emit('login', {numUsers: numUsers(user.room)})
        });

        console.log('now we have:', users.map(user => user.name));

        //each client knows the alias of the new user
        users.forEach(user => {
          console.log("lets welcome", socket.username, 'aka', idToAlias(user, socket.id));

            // io.in(user.id).emit('user joined ', {
            //     username: idToAlias(user, socket.username),
            //     numUsers: numUsers(user.room)
            // });
        })
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        if (addedUser) {
          users.byID(socket.id).active = false //set user to inactive
          users.byID(socket.id).ready = false //set user to not ready

          // update DB with change
          db.users.update({ id: socket.id }, {$set: {active: false}}, {}, (err, numReplaced) => {
                          console.log(err ? "Activity not changed:" + err : "User left" + socket.id)
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
        console.log("some users not ready", users.filter(user => !user.ready))
        return } //are all users ready?
      // if (incompleteRooms().length) {
      //   console.log("Some rooms empty:",incompleteRooms())
      //   return } //are all rooms assigned
      if (users.length != teamSize ** 2) {
        console.log("not enough users",users.length - teamSize ** 2)
        return
      }

      console.log('all users ready -> starting experiment');

      //do we have more experiments to run? if not, finish

      //can we move this into its own on.*** call

      if (currentRound < numRounds){
        console.log("running")
        treatmentNow = (currentCondition == "treatment" && currentRound == numRounds-1)

        // assign rooms to peple and reset.
        Object.entries(teams[currentRound]).forEach(([roomName,room]) => {
          users.filter(user => room.includes(user.person)).forEach(user => {
            user.room = roomName
            user.ready = false; //return users to unready state
            console.log(user.name, 'assigned to', user.room);
          })
        })

        //Notify user 'go' and send task.
        let currentProduct = products[currentRound]
        let taskText = "Follow the propmpts to design an advertisement for " + currentProduct.name + ". You can find out more about it here: " + currentProduct.url + " "
        users.forEach(user => { io.in(user.id).emit('go', {task: taskText}) })
        console.log('Issued task for:', currentProduct.name)
        console.log('Started round', currentRound, 'with,', roundMinutes, 'minute timer.');

        //Round warning
        // make timers run in serial
        setTimeout(() => {
          console.log('time warning', currentRound);
          users.forEach(user => { io.in(user.id).emit('timer', {time: 1}) })

          //Doen with round
          setTimeout(() => {
            console.log('done with round', currentRound);
            users.forEach(user => { io.in(user.id).emit('stop', {round: currentRound}) });
            currentRound += 1 // guard to only do this when a round is actually done.
            console.log(currentRound, "out of", numRounds)
          }, 1000 * 60 * 0.1 * roundMinutes)
        }, 1000 * 60 * 0.9 * roundMinutes)
      }
      //Launch post survey
      if (currentRound >= numRounds) {
        users.forEach(user => {
          user.ready = false
          io.in(user.id).emit('postSurvey', postSurvey(user))
        })
      }
  });

  // Task
  socket.on('postSurveySubmit', (data) => {
    let result = data.location.search.slice(6);
    console.log("Survey submitted:", result);

    io.in(socket.id).emit('finished', {finishingCode: socket.id});

  });

});

//replaces usernames with aliases in string: user, string -> string
function idToAlias(user, newString) {
    user.friends.forEach(friend => {
      let idRegEx = new RegExp(friend.id, 'gi');
      let friendName = treatmentNow ? friend.tAlias : friend.alias
      newString = newString.replace(idRegEx, friendName)
    });
    return newString
}

//replaces aliases with usernames in string: user, string -> string
function aliasToID(user, newString) {
    user.friends.forEach(friend => {
      let friendName = treatmentNow ? friend.tAlias : friend.alias
      let aliasRegEx = new RegExp(friendName, 'gi');
      newString = newString.replace(aliasRegEx, friend.id)
    });
    return newString
}

//returns number of users in a room: room -> int
const numUsers = room => users.filter(user => user.room === room).length

//used to check if users are supposed to be in the study based on: mturkID -> boolean
const checkUser = mturkID => true

//Returns a random remaining room space, or error if none. () -> room | error
const incompleteRooms = () => rooms.filter(room => numUsers(room) < teamSize)
const assignRoom = () => incompleteRooms().pick()

const postSurvey = (user) => {
  // get collaborators
  // let userTeams = []
  // teams.forEach(round => {
  //   Object.entries(round).forEach(([teamName,team]) => {
  //     console.log("Team",teamName,team)
  //     if (team.includes(user)) {
  //       let group = team.map(person => { return users.find(user => user.person == person) })
  //       console.log(group)
  //       // find members of team
  //       userTeams.push(group)
  //     }
  //   })
  // })

  // get aliases
  // render team options
  return {questions:{'1': { question:"Select which teams you worked with were the same people.",
                            answers:["1 and 2", "1 and 3", "2 and 3","none were the same"] } }}
}
