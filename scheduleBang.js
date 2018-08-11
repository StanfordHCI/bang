var http = require('http'),
    mturk = require('./mturkTools'),
    fs = require('fs');

//Reference HIT file
let questionHTML = fs.readFileSync('./question.html').toString()



// Determine the lifetime of HIT
const runtimeString = process.argv.length > 2 ? process.argv[2] : "" //if we specify a flag
const actual_runTIME = new Date(runtimeString || "August 11 2018 14:15");
const expireHITTime = new Date(actual_runTIME.getTime() - 30*60000); //get time 30 minutes before actualruntime
const timeDiff = Math.abs(expireHITTime.getTime() - Date.now()); 
const lifetime = timeDiff / 1000 / 60 //calculate lifetime based on when runTime was
const Datastore = require('nedb');
    var db = {};
    db.ourHITs = new Datastore({ filename:'.data/ourHITs', autoload: true, timestampData: true});
    
//Set HIT Params
const title = `Join our task tomorrow at ${actual_runTIME.getHours()}:${actual_runTIME.getMinutes()} for up to 2 hours`
console.log("My title is", title)
const description = "Earn $10.50 per hour for up to 2 hours."
const assignmentDuration = 20
const reward = 0.01
const autoApprovalDelay = 1
const keywords = "ad writing, qualification, future task"
const maxAssignments = 200
const taskURL = questionHTML

let HITId = "3PCPFX4U405XHZWRW7GXXH3U9U5FQT"

//Make HIT
mturk.makeHIT(title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, db, (HIT, db) => {
  HITId = HIT.HITId;
  db.ourHITs.insert({'currentHIT': HITId}, (err, HITAdded) => {
    if(err) console.log("There's a problem adding HIT to the DB: ", err);
    else if(HITAdded) console.log("HIT added to the DB: ", HITId);
  });
  mturk.listAssignments(HITId,console.log)
})





