const fs = require('fs');

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

//Renders a full db by name.
function renderFullDB(dbName) {
  console.log(lastBatch);
  db[dbName].find({}, (err, data) => {
    console.log(JSON.stringify(data.filter(u => u.batch == lastBatch),null,2));
    // console.log(data.filter(u => u.batch == 1534088685920)[0].results)
  })
}

//Cleanly renders chats for a given batch
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

//Renders a full db by name.
function saveOutBatch(dbName,batch) {
  const dir = "./.data/"+ batch
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
  db[dbName].find({}, (err, data) => {
    fs.writeFile(dir +"/"+ dbName + ".json", JSON.stringify(data.filter(u => u.batch == batch),null,2) , function(err) {
      if(err) { return console.log(err)}
      console.log("Batch", batch, dbName,"saved!");
    });
  })
}

function useLatestBatch(callback) {
  db.batch.find({}, (err,data) => {
    const lastBatch = data.map(b => b.batchID).sort().pop()
    if (typeof(callback) == 'function') {
      callback(lastBatch)
      return lastBatch
    }
  })
  return console.log("None");
}

function checkBatches() {
  db.chats.find({}, (err, data) => {

  })
}

// renderFullDB("users")
useLatestBatch(renderChats)
// renderChats()
// saveOutBatch("users",1534088685920)
