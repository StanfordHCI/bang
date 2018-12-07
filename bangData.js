const fs = require('fs');
var exec = require('child_process').exec;
let mturk = require('./mturkTools');

const dir = "./.data/"

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
  fs.readFile(dir + batch + '/' + 'chats.json',(err,chatsJSON) => {
    if (err) {return console.log(err)} else {
      try {
        const chats = JSON.parse(chatsJSON)
        // console.log("\nChats for batch:",batch);
        chats.map(a => a.round).set().sort().forEach(currentRound => {
          // console.log("\nRound", currentRound);
          chats.map(a => a.room).set().sort().forEach(currentRoom => {
            // console.log("\nRoom",currentRoom,"in round",currentRound);
            let ads = chats.sort((a,b) => a.time - b.time).filter(a => a.room == currentRoom && a.round == currentRound).filter(a => a.message[0] === "!")
            // ads.forEach(m => console.log("  ",m.message))
            let chosenAd = ads[ads.length -1]
            ad = {
              batch: chosenAd.batch,
              round: chosenAd.round,
              room: chosenAd.room,
              text: chosenAd.message.slice(1),
              user: chosenAd.userID
            }
            console.log(ad.batch, ad.round, ad.room, ad.text)
          })
        })
      } catch(err) {
        // console.log('File ending error in batch',batch)
      }
    }
  })
}

//Cleanly renders ads for a given batch
function renderAds(batch) {
  fs.readFile(dir + batch + '/' + 'chats.json',(err,chatsJSON) => {
    if (err) {return console.log(err)} else {
      try {
        const chats = JSON.parse(chatsJSON)
        // console.log("\nChats for batch:",batch);
        chats.map(a => a.round).set().sort().forEach(currentRound => {
          // console.log("\nRound", currentRound);
          chats.map(a => a.room).set().sort().forEach(currentRoom => {
            // console.log("\nRoom",currentRoom,"in round",currentRound);
            let ads = chats.sort((a,b) => a.time - b.time).filter(a => a.room == currentRoom && a.round == currentRound) //.filter(a => a.message[0] === "!")
            ads = ads.slice(ads.length - 5)
            ads.forEach(m => console.log("  ",m.message))
            let chosenAd = ads[ads.length -1]
            ad = {
              batch: chosenAd.batch,
              round: chosenAd.round,
              room: chosenAd.room,
              text: chosenAd.message.slice(1,31),
              user: chosenAd.userID
            }

            console.log([ad.batch,ad.round,ad.room,ad.text].join("|"))
            // console.log(ad.text);
          })
        })
      } catch(err) {
        // console.log('File ending error in batch',batch)
      }
    }
  })
}

//Goes through stored data and checks for bonuses. Bonuses any remaining work.
function retroactiveBonus() {
  const batchFolders = fs.readdirSync(dir).filter(f => fs.statSync(dir + f).isDirectory())
  batchFolders.filter(f => fs.readdirSync(dir + f).includes('users.json')).forEach(f => {
    fs.readFile(dir + f + '/' + 'users.json',(err,usersJSON)=> {
      if (err) {return console.log(err)} else {
        try {
          const allUsers = JSON.parse(usersJSON)
          allUsers.forEach(u => {
            if (u.bonus == "6.996.99") u.bonus = "6.99"
            if (u.bonus == "2.002.00") u.bonus = "2.00"
          })
          mturk.payBonuses(allUsers ,paidUsers => {
            allUsers.filter(u => paidUsers.map(p => p.id).includes(u.id)).forEach(u => u.bonus = 0)
            fs.writeFile(dir + f + '/' + 'users.json', JSON.stringify(allUsers,null,2) , (err) => {
              if(err) { return console.log(err)} else {
                /* console.log("saved",f); */
              }
            });
          })
        } catch(err) {console.log('File ending error at:',f)}
      }
    })
  })
}

// Add qualification to all users
function retroactiveQualification(qualification) {
  const batchFolders = fs.readdirSync(dir).filter(f => fs.statSync(dir + f).isDirectory())
  batchFolders.filter(f => fs.readdirSync(dir + f).includes('users.json')).forEach(f => {
    fs.readFile(dir + f + '/' + 'users.json',(err,usersJSON)=> {
      if (err) {return console.log(err)} else {
        const allUsers = JSON.parse(usersJSON)
        mturk.assignQualificationToUsers(allUsers, qualification)
      }
    })
  })
}

//Goes through stored data and adds rooms from chats if they are not propperly stored.
function retroactivelyFixRooms() {
  const batchFolders = fs.readdirSync(dir).filter(f => fs.statSync(dir + f).isDirectory())
  batchFolders.filter(f => fs.readdirSync(dir + f).includes('users.json') && fs.readdirSync(dir + f).includes('chats.json')).forEach(f => {
    fs.readFile(dir + f + '/' + 'users.json',(err,usersJSON)=> {
      if (err) {return console.log(err)} else {
        const users = JSON.parse(usersJSON)
        try {
          if (users[0].rooms.length == 0) {
            fs.readFile(dir + f + '/' + 'chats.json',(err,chatJSON)=> {
              if (err) {return console.log(err)} else {
                const chats = JSON.parse(chatJSON)
                const orderedChats = chats.sort((a,b) => a.time - b.time)
                users.forEach(u => {
                  u.rooms = []
                  let roomsObj = {}
                  orderedChats.filter(c => c.userID == u.id).forEach(c => {
                    roomsObj[c.round] = c.room
                  })
                  try{
                    u.results.format.forEach((f,i) => {
                      const room = roomsObj[i]
                      if (room != null) {
                        u.rooms.push(room)
                      }
                    })
                  } catch(err) {}
                })
                fs.writeFile(dir + f + '/' + 'users.json', JSON.stringify(users,null,2) ,(err) => {
                    if(err) { return console.log(err)} else { console.log("saved",f);}
                  });
              }
            })
          }
        } catch(err) {
        }

      }
    })
  })
}

//Renders a full db by name.
function saveOutBatch(dbName,batch) {
  const batchDir = dir + batch
  if (!fs.existsSync(batchDir)){
    fs.mkdirSync(batchDir);
  }
  db[dbName].find({}, (err, data) => {
    fs.writeFile(batchDir +"/"+ dbName + ".json", JSON.stringify(data.filter(u => u.batch == batch || u.batchID == batch),null,2) , function(err) {
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

function useEachBatchDB(callback) {
  db.batch.find({}, (err,data) => {
    if (err) {console.log(err)} else {
      const batches = data.map(b => b.batchID).sort()
      if (typeof(callback) == 'function') {
        return batches.map(callback)
      }
    }
  })
}

function saveAllData() {
  useEachBatchDB(batch => {
    ['users','chats','batch'].forEach(data => {
      saveOutBatch(data,batch)
    })
  })
}

function downloadData(url,callback) {
  let pemFile = '~/.ssh/sh-batch.pem'
  if (url.includes("mark") || url.includes("bang")) {
    pemFile = '~/.ssh/sh-server.pem'
  }
  const destination = ".data"
  const names = ['users','chats','batch']
  names.forEach(name => {
    const source = "ubuntu@" + url + ":bang/.data/" + name
    const command = ['scp', '-i', pemFile, source, destination]
    exec(command.join(' '), (err, stdout, stderr) => {
      if (err) console.log(err);
      else {
        console.log("Downloaded data from",url);
        if (typeof(callback) == 'function') {
          callback(stdout)
        }
      }
    })
  })
}

function manipulationCheck(batch) {
  fs.readFile(dir + batch + '/' + 'users.json',(err,usersJSON) => {
    if (err) {return console.log(err)} else {
      try {
        const users = JSON.parse(usersJSON)
        let results = {
          batch: batch,
          condition: users[0].results.condition,
          format: users[0].results.format,
          empty: users.filter(user => user.results.manipulationCheck.length === 0).length,
          correct: users.filter(user => user.results.manipulationCheck["1"] === user.results.manipulation).length,
          total: users.length
        }

        if (results.format.length === 4 && results.condition === 'treatment' && results.total >= 9) {

          console.log(results);
        }
        return results
      } catch(err) {
        console.log('File ending error in batch',batch, JSON.parse(usersJSON))
      }
    }
  })
}

function manipulationFix(batch) {
  fs.readFile(dir + batch + '/' + 'users.json',(err,usersJSON) => {
    if (err) {return console.log(err)} else {
      try {
        const users = JSON.parse(usersJSON)
        let newUsers = users.map(u => {
          if (u.results.manipulationCheck === "") {
            u.results.manipulationCheck = {"1":null}
          }
          console.log(u.results.manipulationCheck);
          return u
        })

        fs.writeFile(dir + batch + '/' + 'users.json', JSON.stringify(newUsers,null,2) , (err) => {
          if(err) { return console.log(err)} else {
            /* console.log("saved",f); */
          }
        });

      } catch(err) {
        console.log('File ending error in batch',batch, JSON.parse(usersJSON))
      }
    }
  })
}

function useCompleteBatches(callback) {
  const batchFolders = fs.readdirSync(dir).filter(f => fs.statSync(dir + f).isDirectory())
  return batchFolders.filter(f => fs.readdirSync(dir + f).includes('users.json') && fs.readdirSync(dir + f).includes('chats.json')).filter(f => {
    fs.readFile(dir + f + '/' + 'batch.json',(err,batchJSON)=> {
      if (err) {
        console.log(err)
        return false
      } else {
        const batch = JSON.parse(batchJSON)[0]
        if (batch) {
          if (batch.batchComplete === true) {
            if (typeof(callback) == 'function') {
              callback(batch.batchID)
            }
            return true
          }
        }
      }
    })
  })
}

let correctCount = 0
let totalCount = 0

// manipulationCheck(1537292004662)
// useCompleteBatches(manipulationCheck)

useCompleteBatches(manipulationFix)

//Save from servers
// downloadData("mark.dmorina.com",saveAllData)
// downloadData("bang.dmorina.com",saveAllData)
 // downloadData("b01.dmorina.com",saveAllData)

//Save from local folder
/* saveAllData() */

renderChats(1534356049092)
// useEachBatchDB(renderAds)
/* retroactiveBonus() */
/* retroactivelyFixRooms() */
