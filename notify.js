var mturk = require('./mturkTools');
const Datastore = require('nedb')

notification_type = process.argv[2]
HITId = process.argv[3];
switch (notification_type) {
    case "weCrashed":
        mturk.listAssignments(HITId, data => {
            let subject = "Our system crashed. You will be compensated for your time.";
            let message = "You will be bonused for the time you spent on our task. Thank you for your time.";            
            mturk.notifyWorkers(data.Assignments.map(a => a.WorkerId), subject, message);
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
    // THIS KILLS ALL STANFORD HCI HITS - MUST CHANGE
    case "expireBangs":
        mturk.workOnActiveHITs(H => H.forEach(mturk.expireHIT))
    }