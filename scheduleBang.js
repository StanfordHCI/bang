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

let HITId = "3PCPFX4U405XHZWRW7GXXH3U9U5FQT"

//Make HIT
// mturk.makeHIT(title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, (HIT) => {
//   HITId = HIT.HITId
//   // mturk.listAssignments(HITId,console.log)
//
// })

// mturk.listAssignments(HITId,data => {
//   mturk.notifyWorkers(data.Assignments.map(a => a.WorkerId),"Testing notifications","This notification worked, enjoy your lunch!")
// })

//Expire HITs
// mturk.workOnActiveHITs(H => H.forEach(mturk.expireHIT))

workerIDs= ["A3L1OIVE57IMT2", "A2BNOEYZ3VRW2R", "A7H4PDDRFL6SA", "A8YTY0RDR6AYX", "AOER0SPVGJQAM", "A1B2RJQXDD1YHM", "A3HKMZ9ML9EPUY", "A3ESBL8J4RUANK", "AZACNY1H74YWS", "A2YBZFSUD5OP7W", "A1T83SZBP2DN65", "A31Z5TPD8QKE26", "A3L2UB07EZJAMD", "AC8ETQXPDRR6P", "A30KJAZCNCECX2", "ASXZQW6YTIPAV", "A23YJXEE2AXR3Y", "A3GM78FCDY293T", "A3AFC26CB0AXMI", "A2HGAQ9WOEU9PN", "A35U2XAPA429W7", "A4EJNWLWAUTDU", "A3MHYBS6PHJ5QG", "A258MR1IS96JEP", "A2ZGAH6NOSU2PO", "A1GPZ5REMDQZ0L", "A5CMNI7B03XL", "A1C7UV2UT2S9T7", "A1GRPIBHW72HDU", "AI4AO0O0WIJF7", "A2FN2WHV7YVDTV"]

mturk.getHITURL(HITId)
  // mturk.notifyWorkers(workerIDs,"Ad writing task launched","We launched a new HIT with a few places avaialble: " + url)
