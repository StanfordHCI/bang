// Setup basic express server
let tools = require('./tools');
let express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

let port = process.env.PORT || 3000;
server.listen(port, () => { console.log('Server listening at port %d', port); });

Array.prototype.pick = function() { 
  let m = Math.random();
  
  return this[Math.floor(m * this.length)] };

Array.prototype.choose = function(number) { 
  let chosen = []
  let i
  for (i = 0; i < number; i++) { chosen.push(this.filter(item => !chosen.includes(item)).pick()) }
  return chosen
};
Array.prototype.byID = function(id) { return this.filter(user => user.id === id)[0] };
Array.prototype.set = function() {
  const newArray = []
  this.forEach(element => { if (!newArray.includes(element)) { newArray.push(element) } })
  return newArray
};

// Setting up DB
const Datastore = require('nedb'),
    db = {};
    db.users = new Datastore({ filename:'.data/users', autoload: true });
    db.chats = new Datastore({ filename:'.data/chats', autoload: true });

// Setting up variables
const numberOfRooms = 1
const rooms = tools.letters.slice(0,numberOfRooms)
let users = [];

const teamSize = 4;
const conditions = {"control": [1,2,1], "treatment": [1,2,1], "baseline": [1,2,3]}
const rounds = conditions.baseline

const people = tools.letters.slice(0,teamSize**2) // can be a list of user objects in the future
const teams = tools.createTeams(teamSize,rounds,people)

console.log(teams)

//assign user condition -> assign user letter -> put them in weighting room -> 

let experimentRound = 1;
const roundMinutes = 1;


// const experimentShift = {'A': ['A', 'B'], 'B': ['B', 'A']};

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
    
  // for testing 
  // socket.emit('postSurvey', {questions:{'1':{question:"Two of the four teams you worked with were the same. Select the pair of teams you think were the same", answers:["1 and 2", "1 and 3", "1 and 4", "2 and 3", "2 and 4", "3 and 4"]}}}) //set up the survey

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
        
        users.forEach(user => {
          if (user.room == currentRoom) {
            let friendData = idToAlias(user, nameData);
            socket.broadcast.to(user.id).emit('new message', {
                username: idToAlias(user, socket.username),
                message: friendData
            });
            
            console.log('new message', user.room, user.name, friendData)
          }
        });
    });

    //Login
    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (mturkID) {
        console.log("adding:", mturkID);
        if (addedUser) return;

        // we store the username in the socket session for this client
        socket.username = tools.makeName(); // how they see them
        let room = assignRoom();

        //is the user valid and do we have space for them?
        if (!checkUser(mturkID) || !room) {
            io.in(socket.id).emit('rejected user', {});
            console.log(room);
            console.log('user was rejected');
            socket.disconnect()
            return
        }

        io.in(socket.id).emit('accepted user', {name: socket.username});

        // Add user to other's friends
        db.users.find({}, (err, userpool) => { 
          console.log(err ? "Users not loading:" + err : "Loaded users " + userpool.map(user => {return user.name}))
          
          userpool.forEach((user) => {
            user.friends.push({'name': socket.username, 'alias': tools.makeName()})
            db.users.update({ id: user.id }, {$set: {friends: user.friends}}, {}, (err, numReplaced) => {
              console.log(err ? "Ther's a problem adding friends:" + err : "New friend for " + user.name )
            })
          })
        })
      
        users.forEach(user => { user.friends.push({'name': socket.username, 'alias': tools.makeName()}) });

        // Add user to graph and add others as friends
        const newUser = {
          'id': socket.id,
          'mturk': mturkID,
          'homeRoom': room,
          'room': room,
          'name': socket.username,
          'ready': false,
          'friends': users.map(user => { return {'name': user.id, 'alias': tools.makeName()} }),
          'collaborators':[],
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

        console.log('now we have:', users);

        //each client know the alias of the new user
        users.forEach(user => {
            console.log("lets welcome", socket.username, 'aka', idToAlias(user, socket.username));
            io.in(user.id).emit('user joined ', {
                username: idToAlias(user, socket.username),
                numUsers: numUsers(user.room)
            });
        })
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        if (addedUser) {
            // echo globally that this client has left
            db.users.update({ id: socket.id }, {$set: {active: false}}, {}, (err, numReplaced) => {
                            console.log(err ? "Activity not changed:" + err : "User left" + socket.id)
            })                
            users.forEach(user => {
                socket.broadcast.to(user.id).emit('user left', {
                    username: idToAlias(user, socket.username),
                    numUsers: numUsers(user.room)
                });
            })
        }
    });

    // Task
    socket.on('postSurveySubmit', (data) => {
     console.log("Survey submitted", data)
     io.in(socket.id).emit('finished', {finishingCode: socket.id})
    });

    socket.on('ready', function (data) {
        users.byID(socket.id).ready = true;
        console.log(socket.username, 'is ready');

        //are we ready to go? if not return empty
        if (users.filter(user => !user.ready).length) { return }
        if (assignRoom()) { return }

        //do we have more experiments to run? if not, finish
        if (experimentRound > experimentShift['A'].length) {
            users.forEach(user => {
                io.in(user.id).emit('postSurvey', {questions:{'1':{question:"Two of the four teams you worked with were the same. Select the pair of teams you think were the same", answers:["1 and 2", "1 and 3", "1 and 4", "2 and 3", "2 and 4", "3 and 4"]}}}) //set up the survey
                // io.in(user.id).emit('finished', {finishingCode: user.id})
            });
            return
        }

        console.log('all users ready');

        users.forEach(user => {
            user.ready = false; //return users to unready state
            user.room = experimentShift[user.homeRoom][experimentRound - 1]; //update user room
            console.log(user.name, 'assigned to', user.room);
        });

        //Run experiment
        //tell clients to start experiment
        setTimeout(() => {
          users.forEach(user => {
              io.in(user.id).emit('go', {task: "You have 1 minute to agree in a marketing phrase for a new extra powerful blender. Chat about options. When the chat finishes you will be warned. The last line of the chat is the selected phrase. You will earn a bonus if you create a very good phrase."})
              console.log('started', user.name);
          });
        }, 1000 * 1)


        console.log('Started round', experimentRound, 'with,', roundMinutes, 'minute timer.');
        setTimeout(() => {
            console.log('time warning', experimentRound);
            users.forEach(user => {
                io.in(user.id).emit('timer', {time: 1}) //1 min warning to each client
            });

            setTimeout(() => {
                console.log('done with round', experimentRound);
                users.forEach(user => {
                    io.in(user.id).emit('stop', {round: experimentRound}) //1 min warning to each client
                });
                experimentRound += 1
            }, 1000 * 60 * 0.1 * roundMinutes)
        }, 1000 * 60 * 0.9 * roundMinutes)
    });
  
  socket.on('result', (data) => {
    console.log("Results are in:")
    console.log(data)
    });
});

//replaces usernames with aliases in string: user, string -> string
function idToAlias(user, newString) {
    user.friends.forEach(friend => {
        let nameRE = new RegExp(friend.id, 'g');
        newString = newString.replace(nameRE, friend.alias);
    });
    return newString
}

//replaces aliases with usernames in string: user, string -> string
function aliasToID(user, newString) {
    user.friends.forEach(friend => {
        let aliasRE = new RegExp(friend.alias, 'g');
        newString = newString.replace(aliasRE, friend.id);
    });
    return newString
}

//returns number of users in a room: room -> int
const numUsers = room => users.filter(user => user.room === room).length

//used to check if users are supposed to be in the study based on: mturkID -> boolean
const checkUser = mturkID => true

//Returns a random remaining room space, or error if none. () -> room | error
const assignRoom = () => rooms.filter(room => numUsers(room) < teamSize).pick()

//returns random username: () -> string