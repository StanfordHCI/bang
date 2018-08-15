const fs = require('fs');
var exec = require('child_process').exec;

Array.prototype.set = function() {
  const setArray = []
  this.forEach(element => { if (!setArray.includes(element)) { setArray.push(element) } })
  return setArray
};

const Datastore = require('nedb'),
    db = {};
    db.users = new Datastore({ filename:'.data/users', autoload: true, timestampData: true });
    db.chats = new Datastore({ filename:'.data/chats', autoload: true, timestampData: true});
    db.batch = new Datastore({ filename:'.data/batch', autoload: true, timestampData: true});
    db.time = new Datastore({ filename:'.data/time', autoload: true, timestampData: true});
    db.ourHITs = new Datastore({ filename:'.data/ourHITs', autoload: true, timestampData: true})

//Renders a full db by name.
function renderBatch(dbName, batch) {
  db[dbName].find({}, (err, data) => {
    console.log(JSON.stringify(data.filter(u => u.batch == batch)));
    // console.log(data.filter(u => u.batch == 1534088685920)[0].results)
  })
}

//Cleanly renders chats for a given batch
function renderChats(batch) {
  db.chats.find({batch: batch}, (err, data) => {
    if (err) {console.log(err)} else {
      console.log("\nChats for batch:",batch);
      data.map(a => a.round).set().sort().forEach(currentRound => {
        console.log("\nRound", currentRound);
        data.map(a => a.room).set().sort().forEach(currentRoom => {
          console.log("\nRoom",currentRoom,"in round",currentRound);
          data.sort((a,b) => a.createdAt-b.createdAt).filter(a => a.room == currentRoom && a.round == currentRound).forEach(a => {
            console.log("  " + a.userID.slice(0,5) + ": " + a.message);
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

function useEachBatch(callback) {
  db.batch.find({}, (err,data) => {
    const batches = data.map(b => b.batchID).sort()
    if (typeof(callback) == 'function') {
      batches.forEach(callback)
      return batches
    }
  })
  return console.log("None");
}

function saveAllData() {
  useEachBatch(batch => {
    ['users','chats','batch'].forEach(data => {
      saveOutBatch(data,batch)
    })
  })
}

function downloadData(url,callback) {
  pemFile = '~/.ssh/sh-server.pem'
  source = "ubuntu@"+url+":bang/.data/*"
  destination = ".data"
  command = ['scp', '-i', pemFile, source, destination]
  exec(command.join(' '), (err, stdout, stderr) => {
    if (err) console.log(err);
    else {
      console.log("Saved * data",stdout);
      if (typeof(callback) == 'function') {
        callback(stdout)
      }
    }
  })
}

downloadData("mark.dmorina.com",saveAllData)
// downloadData("bang.dmorina.com",saveAllData)
// useEachBatch(renderChats)
