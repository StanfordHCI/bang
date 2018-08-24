const mturk = require('./mturkTools');
const fs = require('fs');
const Datastore = require('nedb');

// What are we doing?
var notification_type = process.argv[2]
var HITId = process.argv[3];

// File paths
var bonusworkersStorage = "./txt/bonusworkers.txt";
var repayworkersHITstorage = "./txt/currentrepayHIT.txt"
var bonusworkersArray = fs.readFileSync(bonusworkersStorage).toString().split("\n");

switch (notification_type) {
  case "weCrashed":
    mturk.listAssignments(HITId, data => {
      let subject = "Our system crashed. You will be compensated for your time.";
      let message = "You will be bonused for the time you spent on our task. Thank you for your time.";
      mturk.notifyWorkers(data.map(a => a.WorkerId), subject, message);
    });
    break;
  case "killTask":
    mturk.expireHIT(HITId);
    break;
  case "listActiveTasks":
    mturk.workOnActiveHITs(console.log)
    break;
  case "listwillBangers":
    mturk.listUsersWithQualificationRecursively(mturk.quals.willBang, (data) => {
      console.log("Number of users with qualification willBang:", data.length)
    });
    break;
  case "HandleQualsforUsersinDB":
    let db = {};
    db.users = new Datastore({ filename:'.data/users', autoload: true, timestampData: true});
    db.users.find({}, (err, usersInDB) => {
      if (err) {console.log("DB for MTurk:" + err)}
      else {
        mturk.unassignQualificationFromUsers(usersInDB, mturk.quals.willBang)
        mturk.assignQualificationToUsers(usersInDB, mturk.quals.hasBanged)
      }
    })
    break;
  case "expireBangs":
    // mturk.workOnActiveHITs(H => H.forEach(mturk.expireHIT)) -- THIS KILLS ALL ACTIVE HITS
    mturk.workOnActiveHITs(activeHITs => {
    db.ourHITs.find({}, (err, HITsInDB) => {
      if (err) {console.log("Err loading HITS for expiration:" + err)} else {
       HITsInDB.map(h => h.HITId).filter(h => activeHITs.includes(h)).forEach(mturk.expireHIT)
      }
      })
    })
    break;
  case "repaypeople": //Check if people from our list has accepted the repay HIT and bonus them
    // Find a current repay HIT
    let repayHITs = [];
    mturk.workOnActiveHITs((activeHITs) => {  
      activeHITs.forEach(HITId => {
        mturk.returnHIT(HITId, data => {
          if (data.HIT.Title == "Hit to repay workers") {
            // Find people in our list of people to repay
            mturk.listAssignments(HITId, data => {
              const repayacceptors = data.filter(a => bonusworkersArray.includes(a.WorkerId))
              .map(a => {
                return {
                  mturkId: a.WorkerId,
                  assignmentId: a.AssignmentId, 
                  bonus: 1,
                  id: null
                }
              })

            // Bonus Them
              mturk.payBonuses(repayacceptors)
            })
          }
        })
      })
    })
    break;
  case "notifypeople": // Tell people on our list they need to accept our repay HIT
    let repayHITnumber = 0
    mturk.workOnActiveHITs((activeHITs) => {  
      activeHITs.forEach(HITId => {
        mturk.returnHIT(HITId, data => {
          if (data.HIT.Title == "Hit to repay workers") {
            console.log("YOYO", HITId)
            mturk.getHITURL(HITId, function(url) {
              let subject = "Accept this HIT to be bonused";
              let message = "We've created a bonus HIT to ensure you are properly bonused for our earlier HIT. Your bonus will be issued within 1 day. Please accept it and submit. " + url
              repayHITnumber += 1
              if (repayHITnumber > 1) {
                console.log("You've got more than 1 repay HIT. Breaking to ensure you don't spam people!")
                return;
              }
              mturk.notifyWorkers(bonusworkersArray, subject, message)
            })
          }
        })
      })
    })  
    break;
  case "createrepayHITs": // Create a new repay HIT
    let title = "Hit to repay workers";
    let description = "Only complete this hit if you have been expressly advised to and have been given a completion code already."
    let assignmentDuration = 60;
    let lifetime = 10000;
    let autoApprovalDelay = 4320;
    let keywords = "repay";
    let maxAssignments = 100;
    let reward = 0.01;
    let taskURL = fs.readFileSync('./repayworkers.html').toString();

    mturk.makeHIT('noQuals', title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, (HIT) => {
      const HITId = HIT.HITId;
    })
    break;
  case "killrepayHITs": // Kill all current repay HITs
    mturk.workOnActiveHITs((activeHITs) => {  
        activeHITs.forEach(HITId => {
          mturk.returnHIT(HITId, data => {
            if (data.HIT.Title == "Hit to repay workers") {
              mturk.expireHIT(HITId)
            }
          })
        })
      })  
    break;
}
