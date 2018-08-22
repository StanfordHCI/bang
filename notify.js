const mturk = require('./mturkTools');
const fs = require('fs');
const Datastore = require('nedb');

notification_type = process.argv[2]
HITId = process.argv[3];
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
    mturk.listUsersWithQualification(mturk.quals.willBang, (data) => {
      console.log(data.Qualifications.map(a => a.WorkerId))
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
  case "repaypeople":
    let bonusworkersStorage = "./txt/bonusworkers.txt";
    let repayworkersHITstorage = "./txt/currentrepayHIT.txt"
    let bonusworkersArray = fs.readFileSync(bonusworkersStorage).toString().split("\n");

    // Find a current repay HIT
    let repayHITs = [];
    mturk.workOnActiveHITs((activeHITs) => {  
      activeHITs.forEach(HITId => {
        mturk.returnHIT(HITId, data => {
          if (data.HIT.Title == "Hit to repay workers") {
            console.log("YOYO")
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
  case "createrepayHITs":
    let title = "Hit to repay workers";
    let description = "Only complete this hit if you have been expressly advised to and have been given a completion code already."
    let assignmentDuration = 60;
    let lifetime = 10000;
    let autoApprovalDelay = 4320;
    let keywords = "repay";
    let maxAssignments = 100;
    let taskURL = fs.readFileSync('./repayworkers.html').toString();

    mturk.makeHIT('noQuals', title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, (HIT) => {
      const HITId = HIT.HITId;
    })
    break;
  case "killrepayHITs":
    mturk.workOnActiveHITs((activeHITs) => {  
        activeHITs.forEach(HITId => {
          mturk.returnHIT(HITId, data => {
            mturk.expireHIT(HITId)
          })
        })
      })  
    break;
}
