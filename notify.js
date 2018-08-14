var mturk = require('./mturkTools');

notification_type = process.argv[3]
HITId = process.argv[4];
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
    }