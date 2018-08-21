require('dotenv').config()
var http = require('http'),
    mturk = require('./mturkTools'),
    fs = require('fs');
var colors = require('colors')
const Datastore = require('nedb');

//Environmental settings, set in .env
const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE" //ONLY CHANGE ON SERVER

console.log(runningLive ? "\n RUNNING LIVE ".red.inverse : "\n RUNNING SANDBOXED ".green.inverse);

//Reference HIT file
let questionHTML = fs.readFileSync('./question.html').toString()
let recruitingHITstorage = './txt/currentrecruitingHIT.txt'

// Determine the lifetime of HIT
// const runtimeString = process.argv.length > 2 ? process.argv[2] : "" //if we specify a flag
// const actual_runTIME = new Date(runtimeString || "August 15 2018 11:00");
// const expireHITTime = new Date(actual_runTIME.getTime() - 30*60000); //get time 30 minutes before actualruntime
// const timeDiff = Math.abs(expireHITTime.getTime() - Date.now());
const lifetime = 60 //calculate lifetime based on when runTime was

//Set HIT Params
const title = `Get notified when our ad writing task launches. If you stay for the whole task, we bonus to approximately $10.50 per hour.`
const description = "Submit this HIT to be notified when our ad writing task launches. Space is limited in our ad writing task but we will run many iterations of it. We run tasks hourly from 9am to 5pm (Pacific time) for up to 2 hours. If you submit this HIT you will receive notifications about our HITs until you have completed that task."
const assignmentDuration = 20
const reward = 0.01
const autoApprovalDelay = 1
const keywords = "ad writing, qualification, future task"
const maxAssignments = 200
const taskURL = questionHTML

// Assign willBang to people who have accepted recruiting HIT of last hour
console.log("fs.exists()", fs.existsSync(recruitingHITstorage))
if (fs.existsSync(recruitingHITstorage)) {
  let HITId = fs.readFileSync(recruitingHITstorage).toString();
  console.log("HITID found in database", HITId)
  mturk.listAssignments(HITId, data => {
    let willBangers = data.Assignments.map(a => a.WorkerId)
    console.log("willBangers:", willBangers)
    for(i = 0; i < willBangers.length; i++) {
      mturk.assignQuals(willBangers[i], mturk.quals.willBang)
    }
    //console.log("willBangers:", data.Assignments.map(a => a.WorkerId))
    //mturk.assignQualificationToUsers(data.Assignments.map(a => a.WorkerId), mturk.quals.willBang)
  })

  // Expire HIT to ensure no one else accepts
  mturk.expireHIT(HITId);

  // Delete recruitingHITstorage
  fs.unlink(recruitingHITstorage, (err) => {
    if (err) throw err;
    console.log('recruitingHITstorage was deleted');
  });
}
else {
  console.log("No recruitingHITstorage found. Perhaps this is your first time running.")
}

//Make new recruiting HIT
mturk.makeHIT('scheduleQuals', title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, (HIT) => {
  const HITId = HIT.HITId;

  // Write new recruiting HIT id to file for next hour run
  fs.writeFile(recruitingHITstorage, HITId, (err) => {
    if(err) console.log("There's a problem writing HIT to the recruiting file: ", err);
  });
  console.log("recruitment schedule HIT success")
})