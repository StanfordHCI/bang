import chalk from "chalk";

// Setting up DB
import Datastore = require("nedb");
export const db = {
  users: new Datastore({
    filename: ".data/users",
    autoload: true,
    timestampData: true,
  }),
  chats: new Datastore({
    filename: ".data/chats",
    autoload: true,
    timestampData: true,
  }),
  batch: new Datastore({
    filename: ".data/batch",
    autoload: true,
    timestampData: true,
  }),
  time: new Datastore({
    filename: ".data/time",
    autoload: true,
    timestampData: true,
  }),
  ourHITs: new Datastore({
    filename: ".data/ourHITs",
    autoload: true,
    timestampData: true,
  }),
  willBang: new Datastore({
    filename: ".data/willBang",
    autoload: true,
    timestampData: true,
  }),
  repay: new Datastore({
    filename: ".data/repay",
    autoload: true,
    timestampData: true,
  })
};

let mturk = require("./mturkTools");

// * storeHIT *
// ------------------------------------------------------------------
// Stores info about current HIT in ourHITs DB.
//
// Takes a HIT ID and batch ID as parameters

const storeHIT = (currentHIT, batchID) => {
  db.ourHITs.insert({ HITId: currentHIT, batch: batchID}, (err, HITAdded) => {
    if (err) console.log("Error adding HIT to the DB:", err);
    else if (HITAdded) console.log("HIT added to the DB:", currentHIT);
  });
};

// * storeUser *
// ------------------------------------------------------------------
// Stores info about a new user in user DB.
//
// Takes user object as a parameter => created in server.ts by makeUser

const storeUser = (newUser) => {
  db.users.insert(newUser, (err, _usersAdded) => {
    if (err) console.log("Error storing user:", err);
    else console.log("Added", newUser.name, "to user DB.");
  });
};

// * storeChat *
// ------------------------------------------------------------------
// Stores info about chat (room, userID, message, etc.) in chat DB.
//
// Takes an object with the above info, user object, and a string message

const storeChat = (dataObj, user, cleanMessage) => {
  db.chats.insert(dataObj, (err, _chatsAdded) => {
    if (err) console.log("Error storing message:", err);
    else {
      console.log(
        "Message in",
        user.room,
        "from",
        user.name + ":",
        cleanMessage
      );
    }
  });
};

// * storeTime *
// ------------------------------------------------------------------
// Stores info about time elapsed corresponding to a specific event
// (e.g. totalTaskTime) in time DB.
//
// Takes in an event and totalTime as a parameter => created in server.ts
// by getSecondsPassed().

const storeTime = (event, totalTime) => {
  db.time.insert( { [event]: totalTime }, (err, timeAdded) => {
    if (err) console.log("Error adding", event, "to DB:", err);
    else if (timeAdded) console.log(event, "added to DB.");
  });
};

// * storeBatch *
// ------------------------------------------------------------------
// Stores info about batch in batch DB. Unique batchID based on time
// and date.
//
// Takes in a dataObj with info to be added as well as a callback
// function with further steps.

const storeBatch = (dataObj, callback) => {
  db.batch.insert(dataObj, function(
    err,
    data
  ) {
    if (err) console.log ("Error adding batch to DB:", err);
    else if (data && typeof callback === "function") callback(data);
  });
};

// * updateUser *
// ------------------------------------------------------------------
// Updates user batch info based on what field needs to be updated
// (e.g. "connected") in users DB.
//
// Takes in user object, field to be updated, new value to be added,
// and batchID.

const updateUser = (user, field, value, batchID) => {
  db.users.update(
    { mturkId: user.mturkId, batch: batchID },
    { $set: { [field]: value } },
    {},
    err => {
      return console.log(
        err
          ? chalk.red("Error recording ") + field + ": " + err
          : "Updated " + field + " for" + user.mturkId + " " + JSON.stringify(value, null, 2)
      );
    }
  );
};

// * updateBatch *
// ------------------------------------------------------------------
// Updates batch completion info in batch DB.
//
// Takes in batchID as a parameter.

const updateBatch = (batchID) => {
  db.batch.update( 
    { batchID: batchID },
    { $set: { batchComplete: true } },
    {},
    err => console.log(err ? "Error updating batch completion" + err
    : "Marked batch", batchID, " completed in DB."));
};

// * cleanHITs *
// ------------------------------------------------------------------
// Expires all current HITs. To be called in the beginning of server.ts
// if cleanHITs is set to true.
//
// No parameters.

const cleanHITs = () => {
  mturk.workOnActiveHITs(activeHITs => {
    db.ourHITs.find({}, (err, HITsInDB) => {
      if (err) {
        console.log("Error loading HITs for expiration:" + err);
      } else {
        HITsInDB.map(h => h.HITId)
          .filter(h => activeHITs.includes(h))
          .forEach(mturk.expireHIT);
      }
    });
  });
};

// * cleanWillBang *
// ------------------------------------------------------------------
// Removes users from willBang DB if they no longer have the willBangQual
// on.
//
// No paramters.

const cleanWillBang = () => {
  db.willBang.find({}, (err, willBangers) => {
    if (err) console.log("Error cleaning willBang DB: ", err);
    else {
      mturk.listUsersWithQualificationRecursively(
        mturk.quals.willBang, function(data) {
          let willBangIds = willBangers.map(u => u.id);
          willBangIds.forEach(willBangID => {
            if (!data.includes(willBangID)) removeUserFromWillBang(willBangID);
          });
        }
      );
    }
  });
};

// * removeRolledOverPeople *
// ------------------------------------------------------------------
// Removes a user entry from willBang DB.
//
// Takes in userID as a parameter.

const removeUserFromWillBang = (user) => {
  db.willBang.remove({ id: user }, { multi: true }, function(
    err,
    numRemoved
  ) {
    if (err) console.log("Error removing from willBang DB:", err);
    else console.log(user + " REMOVED FROM WILLBANG DB (" + numRemoved + ")")
  });
};

// * launchMturkBackgroundTasks *
// ------------------------------------------------------------------
// Looks through all users in users DB and executes series of house-
// keeping activities depending on whether it's runningLive, etc.
//
// Takes in booleans corresponding to state variables
//    - issueBonusesNow
//    - assignQualifications
//    - runningLive
//    - notifyWorkersOn
// as well as a batch ID

const launchMturkBackgroundTasks = (issueBonusesNow, assignQualifications, runningLive, notifyWorkersOn, batchID) => {
  db.users.find({}, (err, usersInDB) => {
    if (err) {
      console.log("DB for MTurk:" + err);
    } else {
      if (issueBonusesNow) {
        mturk.payBonuses(usersInDB, bonusedUsers => {
          bonusedUsers.forEach(u => updateUser(u, "bonus", 0, batchID));
        });
      }
      if (assignQualifications && runningLive) {
        mturk.listUsersWithQualificationRecursively(
          mturk.quals.hasBanged,
          data => {
            console.log("Number of users with qualification hasBanged:", data.length);
          }
        );
      }
      if (notifyWorkersOn && runningLive) {
        mturk.listUsersWithQualificationRecursively(
          mturk.quals.willBang,
          data => {
            console.log("Number of users with qualification willBang:", data.length);
          }
        )
      }
    }
  });
};

// * searchWillBang *
// ------------------------------------------------------------------
// Performs callback on user info retrieved from willBang DB.
//
// Takes in databObj (e.g. timePreference).

const searchWillBang = (dataObj, callback) => {
  db.willBang.find(dataObj, function(
    err,
    data
  ) {
    if (err) console.log("Error searching willBang DB:", err);
    else if (typeof callback === "function") callback(data);
  });
};

module.exports = {
  storeHIT: storeHIT,
  storeUser: storeUser,
  storeChat: storeChat,
  storeTime: storeTime,
  storeBatch: storeBatch,
  updateUser: updateUser,
  updateBatch: updateBatch,
  cleanHITs: cleanHITs,
  cleanWillBang: cleanWillBang,
  launchMturkBackgroundTasks: launchMturkBackgroundTasks,
  removeUserFromWillBang: removeUserFromWillBang,
  searchWillBang: searchWillBang
};
