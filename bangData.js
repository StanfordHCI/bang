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

// db.users.find({}, (err, data) => {
//   if (err) {console.log(err)} else {
//     console.log(data);
//   }
// })

db.chats.find({batch:1533681023319}, (err, data) => {
  if (err) {console.log(err)} else {
    console.log(data);
  }
})
