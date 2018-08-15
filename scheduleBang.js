require('dotenv').config()
var http = require('http'),
    mturk = require('./mturkTools'),
    fs = require('fs');
var colors = require('colors')
const Datastore = require('nedb');
var db = {};
db.ourHITs = new Datastore({ filename:'.data/ourHITs', autoload: true, timestampData: true});

//Environmental settings, set in .env
const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE" //ONLY CHANGE ON SERVER

console.log(runningLive ? "\n RUNNING LIVE ".red.inverse : "\n RUNNING SANDBOXED ".green.inverse);

//Reference HIT file
let questionHTML = fs.readFileSync('./question.html').toString()

// Determine the lifetime of HIT
const runtimeString = process.argv.length > 2 ? process.argv[2] : "" //if we specify a flag
const actual_runTIME = new Date(runtimeString || "August 15 2018 11:00");
const expireHITTime = new Date(actual_runTIME.getTime() - 30*60000); //get time 30 minutes before actualruntime
const timeDiff = Math.abs(expireHITTime.getTime() - Date.now());
const lifetime = timeDiff / 1000 / 60 //calculate lifetime based on when runTime was

//Set HIT Params
const title = `Get notified when our ad writing task launches. The next task will be at ${actual_runTIME.getHours()}:${actual_runTIME.getMinutes()} PST (California time) for up to 2 hours`
const description = "Submit this HIT to be notified when our ad writing task launches. Space is limited in our ad writing task but we will run many iterations of it. If you submit this HIT you will receive notifications about our HITs until you have completed that task."
const assignmentDuration = 20
const reward = 0.01
const autoApprovalDelay = 1
const keywords = "ad writing, qualification, future task"
const maxAssignments = 200
const taskURL = questionHTML

// let HITId = "3PCPFX4U405XHZWRW7GXXH3U9U5FQT"

//Make HIT
mturk.makeHIT(title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, (HIT) => {
  const HITId = HIT.HITId;
  db.ourHITs.insert({'currentHIT': HITId}, (err, HITAdded) => {
    if(err) console.log("There's a problem adding HIT to the DB: ", err);
    else if(HITAdded) console.log("HIT added to the DB: ", HITId);
  });
})

//Expire HITs
// mturk.workOnActiveHITs(H => H.forEach(mturk.expireHIT))
