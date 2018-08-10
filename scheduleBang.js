var http = require('http'),
    mturk = require('./mturkTools'),
    fs = require('fs');

//Reference HIT file
let questionHTML = fs.readFileSync('./question.html').toString()

//Set HIT Params
const title = "Join our task tomorrow at 9AM for up to 2 hours"
const description = "Earn $10.50 per hour for up to 2 hours."
const assignmentDuration = 20
const lifetime = 10*60 //could be updated to countdowm based on future time planning
const reward = 0.01
const autoApprovalDelay = 1
const keywords = "ad writing, qualification, future task"
const maxAssignments = 200
const taskURL = questionHTML

let HITId = ""

//Make HIT
mturk.makeHIT(title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, (HIT) => {
  HITId = (HIT.HITId
  // mturk.expireHIT(HITId)
})

//Expire HITs
// mturk.workOnActiveHITs(H => H.forEach(mturk.expireHIT))
