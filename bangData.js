Array.prototype.set = function() {
  const setArray = []
  this.forEach(element => { if (!setArray.includes(element)) { setArray.push(element) } })
  return setArray
};

const Datastore = require('nedb'),
    db = {};
    db.users = new Datastore({ filename:'.data/users', autoload: true, timestampData: true });
    db.chats = new Datastore({ filename:'.data/chats', autoload: true, timestampData: true});
    db.starterSurvey = new Datastore({ filename:'.data/starterSurvey', autoload: true, timestampData: true});
    db.checkins = new Datastore({ filename:'.data/checkins', autoload: true, timestampData: true});
    db.teamFeedback = new Datastore({ filename:'.data/teamFeedback', autoload: true, timestampData: true});
    db.psychologicalSafety = new Datastore({ filename:'.data/psychologicalSafety', autoload: true, timestampData: true});
    db.blacklist = new Datastore({ filename:'.data/blacklist', autoload: true, timestampData: true});
    db.midSurvey = new Datastore({ filename:'.data/midSurvey', autoload: true, timestampData: true});
    db.batch = new Datastore({ filename:'.data/batch', autoload: true, timestampData: true});
    db.time = new Datastore({ filename:'.data/time', autoload: true, timestampData: true});
    db.leavingMessage = new Datastore({filename: '.data/leavingMessage', autoload: true, timestampData: true})
    db.ourHITs = new Datastore({ filename:'.data/ourHITs', autoload: true, timestampData: true})

function renderChats(batch) {
  db.chats.find({batch: batch}, (err, data) => {
    if (err) {console.log(err)} else {
      data.map(a => a.round).set().sort().forEach(currentRound => {
        console.log("\nRound", currentRound);
        data.map(a => a.room).set().sort().forEach(currentRoom => {
          console.log("\nRoom",currentRoom,"in round",currentRound);
          data.sort((a,b) => a.createdAt-b.createdAt).filter(a => a.room == currentRoom && a.round == currentRound).forEach(a => {
            console.log(" " + a.userID.slice(0,5) + ": " + a.message);
          });
        })
      })
    }
  })
}

renderChats(1533681023319)
