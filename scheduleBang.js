var http = require('http'),
    fs = require('fs');

let questionHTML = fs.readFileSync('./question.html').toString()
let mturk = require('./mturkTools');

const title = "Join our task tomorrow at 9AM for up to 2 hours"
const description = "Earn $10.50 per hour for up to 2 hours."
const assignmentDuration = 20
const lifetime = 10*60 //could be updated to countdowm based on future time planning
const reward = 0.01
const autoApprovalDelay = 1
const keywords = "ad writing, qualification, future task"
const maxAssignments = 200
const taskURL = questionHTML

mturk.makeHIT(title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL)

let hitList = mturk.returnActiveHITs()

wait(hitList,mturk.expireActiveHits)
//
// function wait (v,f) {
//   console.log(v, typeof f);
//   if (typeof v != 'undefined' && typeof f === 'function') f(v)
//   else {setTimeout(() => { wait(v,f) },10)}
// }
