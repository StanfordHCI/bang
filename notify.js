var mturk = require('./mturkTools');

notification_type = process.argv[3]
HITId = process.argv[4];
switch (notification_type) {
    case "startRun":
        mturk.listAssignments(HITId, data => {
            let subject = "We launched our new HIT! Join now, there are limited spaces!";
            let URL = mturk.getHITURL(HITId);
            let message = "You’re invited to join our newly launched HIT on Mturk; there are limited spaces! The HIT title includes \"Write online ads - bonus up to $10.5 / hour.\" You can find the HIT by searching the previous title or clicking this link" + URL;
            mturk.notifyWorkers(data.Assignments.map(a => a.WorkerId), subject, message)
        });
        break;
    case "weCrashed":
        mturk.listAssignments(HITId, data => {
            let subject = "Our system crashed. You will be compensated for your time.";
            let message = "You will be bonused for the time you spent on our task. Thank you for your time.";            
            mturk.notifyWorkers(data.Assignments.map(a => a.WorkerId), subject, message);
        });
        break;
    }