const fs = require("fs");
const exec = require("child_process").exec;
const mturk = require("./mturkTools");

const serverURL = "c01.dmorina.com";
const dbLocation = ".data";
const dir = `./${dbLocation}/`;

Array.prototype.set = function() {
  const setArray = [];
  this.forEach(element => {
    if (!setArray.includes(element)) {
      setArray.push(element);
    }
  });
  return setArray;
};

const Datastore = require("nedb"),
  db = {};
db.users = new Datastore({
  filename: ".data/users",
  autoload: true,
  timestampData: true
});
db.chats = new Datastore({
  filename: ".data/chats",
  autoload: true,
  timestampData: true
});
db.batch = new Datastore({
  filename: ".data/batch",
  autoload: true,
  timestampData: true
});
db.time = new Datastore({
  filename: ".data/time",
  autoload: true,
  timestampData: true
});
db.ourHITs = new Datastore({
  filename: ".data/ourHITs",
  autoload: true,
  timestampData: true
});

const rooms = ["A", "B", "C", "D"];
const products = [
  {
    category: "Tea",
    name: "Thé-tis Tea : Plant-based seaweed tea, rich in minerals",
    url:
      "https://www.kickstarter.com/projects/1636469325/the-tis-tea-plant-based-high-rich-minerals-in-seaw"
  },
  {
    category: "Stool",
    name: "Stool Nº1",
    url: "https://www.kickstarter.com/projects/390812913/stool-no1"
  },
  {
    category: "Clock",
    name: "LetB Color - take a look at time in different ways",
    url:
      "https://www.kickstarter.com/projects/letbco/letb-color-take-a-look-at-time-in-different-ways"
  },
  {
    category: "Light",
    name: "FLECTR 360 OMNI – cycling at night with full 360° visibility",
    url: "https://www.kickstarter.com/projects/outsider-team/flectr-360-omni"
  },
  {
    category: "Chair",
    name: "The Ollie Chair: Shape-Shifting Seating",
    url:
      "https://www.kickstarter.com/projects/144629748/the-ollie-chair-shape-shifting-seating"
  }
];

//Renders a full db by name.
function renderBatch(dbName, batch) {
  db[dbName].find({}, (err, data) => {
    console.log(JSON.stringify(data.filter(u => u.batch == batch)));
    // console.log(data.filter(u => u.batch == 1534088685920)[0].results)
  });
}

//Cleanly renders chats for a given batch
function renderChats(batch) {
  fs.readFile(dir + batch + "/" + "chats.json", (err, chatsJSON) => {
    if (err) {
      return console.log(err);
    } else {
      try {
        const chats = JSON.parse(chatsJSON);
        console.log("\nChats for batch:", batch);
        chats
          .map(a => a.round)
          .set()
          .sort()
          .forEach(currentRound => {
            console.log("\nRound", currentRound);
            chats
              .map(a => a.room)
              .set()
              .sort()
              .forEach(currentRoom => {
                console.log("\nRoom", currentRoom, "in round", currentRound);
                chats
                  .sort((a, b) => a.time - b.time)
                  .filter(a => a.room == currentRoom && a.round == currentRound)
                  .forEach(m =>
                    console.log(`${m.userID.substring(0, 5)}  ${m.message}`)
                  );
                // console.log(`Ad: ${ad.text}`);
              });
          });
      } catch (err) {
        console.log("File ending error in batch", batch);
      }
    }
  });
}

//Cleanly renders ads for a given batch
function renderAds(batch) {
  fs.readFile(dir + batch + "/" + "chats.json", (err, chatsJSON) => {
    if (err) {
      return console.log(err);
    } else {
      try {
        const chats = JSON.parse(chatsJSON);
        // console.log("\nChats for batch:",batch);
        chats
          .map(a => a.round)
          .set()
          .sort()
          .forEach(currentRound => {
            // console.log("\nRound", currentRound);
            chats
              .map(a => a.room)
              .set()
              .sort()
              .forEach(currentRoom => {
                // console.log("\nRoom",currentRoom,"in round",currentRound);
                let ads = chats
                  .sort((a, b) => a.time - b.time)
                  .filter(a => a.room == currentRoom && a.round == currentRound)
                  .filter(a => a.message[0] === "!");
                ads = ads.slice(ads.length - 5);
                // ads.forEach(m => console.log("  ", m.message));
                console.log(batch);
                let chosenAd = ads[ads.length - 1];
                console.log(Object.keys(chosenAd).length);
                // ad = {
                //   batch: chosenAd.batch,
                //   round: chosenAd.round,
                //   room: chosenAd.room,
                //   text: chosenAd.message.slice(1, 31),
                //   user: chosenAd.userID
                // };
                // console.log([ad.batch, ad.round, ad.room, ad.text].join("|"));
                // console.log(ad.text);
              });
          });
      } catch (err) {
        throw err;
      }
    }
  });
}

function generateAdsCSVRow(batch) {
  //get chats database
  fs.readFile(dir + batch + "/" + "chats.json", (err, chatsRAW) => {
    if (err) throw err;
    else {
      fs.readFile(dir + batch + "/" + "batch.json", (err, batchRAW) => {
        if (err) throw err;
        else {
          try {
            const chats = JSON.parse(chatsRAW);
            const batchData = JSON.parse(batchRAW)[0];
            batchData.products.forEach((product, round) => {
              product.category = products.filter(
                p => p.url === product.url
              )[0].category;
              rooms.forEach(room => {
                const ads = chats
                  .filter(a => a.round === round)
                  .filter(a => a.room === room)
                  .filter(a => a.message[0] === "!")
                  .sort((a, b) => a.time - b.time);
                if (ads.length != 0) {
                  const ad = ads[ads.length - 1];
                  csvRow = `Enabled,Expanded text ad,${
                    product.url
                  },, --, --,,"${ad.message.slice(1, 31)}",Kickstarter, --,"${
                    product.name
                  }", --, --, --,No,"${
                    product.category
                  }",Under review,0,0, --,USD, --,0`;
                  console.log(csvRow);
                }
              });
            });
          } catch (err) {
            throw err;
          }
        }
      });
    }
  });
}

function returnAds(batch, callback) {
  //get chats database
  fs.readFile(dir + batch + "/" + "chats.json", (err, chatsRAW) => {
    if (err) throw err;
    else {
      fs.readFile(dir + batch + "/" + "batch.json", (err, batchRAW) => {
        if (err) throw err;
        else {
          try {
            const chats = JSON.parse(chatsRAW);
            const batchData = JSON.parse(batchRAW)[0];
            batchData.products.forEach((product, round) => {
              product.category = products.filter(
                p => p.url === product.url
              )[0].category;
              rooms.forEach(room => {
                const ads = chats
                  .filter(a => a.round === round)
                  .filter(a => a.room === room)
                  .filter(a => a.message[0] === "!")
                  .sort((a, b) => a.time - b.time);
                if (ads.length != 0) {
                  const fullAd = ads[ads.length - 1];
                  const ad = {
                    batch: fullAd.batch,
                    roundTask: product.category,
                    round: fullAd.round,
                    room: fullAd.room,
                    text: fullAd.message.slice(1, 31)
                  };
                  if (typeof callback == "function") {
                    return callback(ad);
                  } else return ad;
                }
              });
            });
          } catch (err) {
            throw err;
          }
        }
      });
    }
  });
}

//Goes through stored data and checks for bonuses. Bonuses any remaining work.
function retroactiveBonus() {
  const batchFolders = fs
    .readdirSync(dir)
    .filter(f => fs.statSync(dir + f).isDirectory());
  batchFolders
    .filter(f => fs.readdirSync(dir + f).includes("users.json"))
    .forEach(f => {
      fs.readFile(dir + f + "/" + "users.json", (err, usersJSON) => {
        if (err) {
          return console.log(err);
        } else {
          try {
            const allUsers = JSON.parse(usersJSON);
            allUsers.forEach(u => {
              if (u.bonus == "6.996.99") u.bonus = "6.99";
              if (u.bonus == "2.002.00") u.bonus = "2.00";
            });
            mturk.payBonuses(allUsers, paidUsers => {
              allUsers
                .filter(u => paidUsers.map(p => p.id).includes(u.id))
                .forEach(u => (u.bonus = 0));
              fs.writeFile(
                dir + f + "/" + "users.json",
                JSON.stringify(allUsers, null, 2),
                err => {
                  if (err) {
                    return console.log(err);
                  } else {
                    /* console.log("saved",f); */
                  }
                }
              );
            });
          } catch (err) {
            console.log("File ending error at:", f);
          }
        }
      });
    });
}

// Add qualification to all users
function retroactiveQualification(qualification) {
  const batchFolders = fs
    .readdirSync(dir)
    .filter(f => fs.statSync(dir + f).isDirectory());
  batchFolders
    .filter(f => fs.readdirSync(dir + f).includes("users.json"))
    .forEach(f => {
      fs.readFile(dir + f + "/" + "users.json", (err, usersJSON) => {
        if (err) {
          return console.log(err);
        } else {
          const allUsers = JSON.parse(usersJSON);
          mturk.assignQualificationToUsers(allUsers, qualification);
        }
      });
    });
}

//Goes through stored data and adds rooms from chats if they are not propperly stored.
function retroactivelyFixRooms() {
  const batchFolders = fs
    .readdirSync(dir)
    .filter(f => fs.statSync(dir + f).isDirectory());
  batchFolders
    .filter(
      f =>
        fs.readdirSync(dir + f).includes("users.json") &&
        fs.readdirSync(dir + f).includes("chats.json")
    )
    .forEach(f => {
      fs.readFile(dir + f + "/" + "users.json", (err, usersJSON) => {
        if (err) {
          return console.log(err);
        } else {
          const users = JSON.parse(usersJSON);
          try {
            if (users[0].rooms.length == 0) {
              fs.readFile(dir + f + "/" + "chats.json", (err, chatJSON) => {
                if (err) {
                  return console.log(err);
                } else {
                  const chats = JSON.parse(chatJSON);
                  const orderedChats = chats.sort((a, b) => a.time - b.time);
                  users.forEach(u => {
                    u.rooms = [];
                    let roomsObj = {};
                    orderedChats
                      .filter(c => c.userID == u.id)
                      .forEach(c => {
                        roomsObj[c.round] = c.room;
                      });
                    try {
                      u.results.format.forEach((f, i) => {
                        const room = roomsObj[i];
                        if (room != null) {
                          u.rooms.push(room);
                        }
                      });
                    } catch (err) {}
                  });
                  fs.writeFile(
                    dir + f + "/" + "users.json",
                    JSON.stringify(users, null, 2),
                    err => {
                      if (err) {
                        return console.log(err);
                      } else {
                        console.log("saved", f);
                      }
                    }
                  );
                }
              });
            }
          } catch (err) {}
        }
      });
    });
}

//Renders a full db by name.
function saveBatchArchive(dbName, batch) {
  const batchDir = dir + batch;
  if (!fs.existsSync(batchDir)) {
    fs.mkdirSync(batchDir);
  }
  db[dbName].find({}, (err, data) => {
    fs.writeFile(
      batchDir + "/" + dbName + ".json",
      JSON.stringify(
        data.filter(u => u.batch == batch || u.batchID == batch),
        null,
        2
      ),
      function(err) {
        if (err) {
          return console.log(err);
        }
        console.log("Batch", batch, dbName, "saved!");
      }
    );
  });
}

function useLatestBatch(callback) {
  db.batch.find({}, (err, data) => {
    const lastBatch = data
      .map(b => b.batchID)
      .sort()
      .pop();
    if (typeof callback == "function") {
      callback(lastBatch);
      return lastBatch;
    }
  });
  return console.log("None");
}

function useEachBatchDB(callback) {
  db.batch.find({}, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const batches = data.map(b => b.batchID).sort();
      if (typeof callback == "function") {
        return batches.map(callback);
      }
    }
  });
}

function saveDBArchives() {
  useEachBatchDB(batch => {
    ["users", "chats", "batch"].forEach(db => {
      saveBatchArchive(db, batch);
    });
  });
}

function downloadData(serverFolder, callback) {
  let pemFile = "~/.ssh/sh-batch.pem";
  if (serverURL.includes("mark") || serverURL.includes("bang")) {
    pemFile = "~/.ssh/sh-server.pem";
  }
  const names = ["users", "chats", "batch"];
  names.forEach(name => {
    const source = `ubuntu@${serverURL}:${serverFolder}/${dbLocation}/${name}`;
    const command = ["scp", "-i", pemFile, source, dbLocation];
    console.log(`Running: ${command}`);
    exec(command.join(" "), (err, stdout, stderr) => {
      if (err) console.log(err);
      else {
        console.log("Downloaded data from", serverURL);
        if (typeof callback == "function") {
          setTimeout(callback(stdout));
        }
      }
    });
  });
}

function manipulationCheck(batch) {
  fs.readFile(dir + batch + "/" + "users.json", (err, usersJSON) => {
    if (err) {
      return console.log(err);
    } else {
      try {
        const users = JSON.parse(usersJSON);
        let results = {
          batch: batch,
          condition: users[0].results.condition,
          format: users[0].results.format,
          empty: users.filter(
            user => user.results.manipulationCheck.length === 0
          ).length,
          correct: users.filter(
            user =>
              user.results.manipulationCheck["1"] === user.results.manipulation
          ).length,
          total: users.length
        };

        if (
          results.format.length === 4 &&
          results.condition === "treatment" &&
          results.total >= 9
        ) {
          console.log(results);
        }
        return results;
      } catch (err) {
        console.log("File ending error in batch", batch, JSON.parse(usersJSON));
      }
    }
  });
}

function manipulationFix(batch) {
  fs.readFile(dir + batch + "/" + "users.json", (err, usersJSON) => {
    if (err) {
      return console.log(err);
    } else {
      try {
        const users = JSON.parse(usersJSON);
        let newUsers = users.map(u => {
          if (u.results.manipulationCheck === "") {
            u.results.manipulationCheck = { "1": null };
          }
          console.log(u.results.manipulationCheck);
          return u;
        });

        fs.writeFile(
          dir + batch + "/" + "users.json",
          JSON.stringify(newUsers, null, 2),
          err => {
            if (err) {
              return console.log(err);
            } else {
              /* console.log("saved",f); */
            }
          }
        );
      } catch (err) {
        console.log("File ending error in batch", batch, JSON.parse(usersJSON));
      }
    }
  });
}

function useCompleteBatches(callback) {
  const batchFolders = fs
    .readdirSync(dir)
    .filter(f => fs.statSync(dir + f).isDirectory());
  return batchFolders
    .filter(
      f =>
        fs.readdirSync(dir + f).includes("users.json") &&
        fs.readdirSync(dir + f).includes("chats.json")
    )
    .filter(f => {
      fs.readFile(dir + f + "/" + "batch.json", (err, batchJSON) => {
        if (err) {
          console.log(err);
          return false;
        } else {
          const batch = JSON.parse(batchJSON)[0];
          if (batch) {
            if (batch.batchComplete === true) {
              if (typeof callback == "function") {
                callback(batch.batchID);
              }
              return true;
            }
          }
        }
      });
    });
}

function importCSVdata(file, callback) {
  var csvParser = require("csv-parse");
  const filePath = `${dbLocation}/${file}`;
  fs.readFile(
    filePath,
    {
      encoding: "utf-8"
    },
    function(err, csvData) {
      if (err) {
        console.log(err);
      }
      csvParser(
        csvData,
        {
          delimiter: ","
        },
        function(err, data) {
          if (err) {
            console.log(err);
          } else {
            if (typeof callback == "function") {
              callback(data);
              return data;
            }
          }
        }
      );
    }
  );
}

{
  questions: {
    1;
  }
}

function matchAd(data, ad) {
  data
    .filter(row => row[7] === ad.text)
    .forEach(row => {
      const clicks = 1 + Number(row[17].replace(",", ""));
      const impressions = Number(row[18].replace(",", ""));
      const result = {
        text: ad.text,
        room: ad.room,
        round: ad.round,
        batch: ad.batch,
        performance: clicks / impressions,
        roundTask: ad.roundTask
      };
      console.log(
        `${result.batch}, ${result.round}, ${result.room}, ${
          result.roundTask
        }, ${result.performance}`
      );
      // console.log(result);
    });
}

const adBatches = [
  1553010760733,
  1553019661611,
  1553021461648,
  1553100662161,
  1553169662360,
  1553170862049,
  1553172662087,
  1553174461586,
  1553175061606,
  1553176861652,
  1553177461720,
  1553179862174,
  1553180462276,
  1553181661900,
  1553196062079,
  1553198462284,
  1553199661488,
  1553200861903,
  1553201461913
];
// 1553194261766 an apparent faild batch

// adBatches.forEach(returnAds(parseAdsCSV));

// console.log(`batch, round, room, roundTask, performance`);
// importCSVdata("ads.csv", adsData => {
//   adBatches.forEach(batch => {
//     returnAds(batch, ad => {
//       matchAd(adsData, ad);
//     });
//   });
// });

//Main steps for processing data:
//1. Download with this or with a direct download via SCP
// downloadData("status");

//2. Save archives into batch folders (this can be done locally or remotely)
saveDBArchives();

//3. Perform manipulation fix on any batches that worked out
// useCompleteBatches(manipulationFix);
