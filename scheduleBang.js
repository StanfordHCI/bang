var http = require('http'),
    mturk = require('./mturkTools'),
    fs = require('fs');

//Reference HIT file
let questionHTML = fs.readFileSync('./question.html').toString()



// Determine the lifetime of HIT
const runtimeString = process.argv.length > 2 ? process.argv[2] : "" //if we specify a flag
const actual_runTIME = new Date(runtimeString || "August 14 2018 12:00");
const expireHITTime = new Date(actual_runTIME.getTime() - 30*60000); //get time 30 minutes before actualruntime
const timeDiff = Math.abs(expireHITTime.getTime() - Date.now()); 
const lifetime = timeDiff / 1000 / 60 //calculate lifetime based on when runTime was
const Datastore = require('nedb');
    var db = {};
    db.ourHITs = new Datastore({ filename:'.data/ourHITs', autoload: true, timestampData: true});
    
//Set HIT Params
const title = `Join our task tomorrow at ${actual_runTIME.getHours()}:${actual_runTIME.getMinutes()} for up to 2 hours`
const description = "Earn $10.50 per hour for up to 2 hours."
const assignmentDuration = 20
const reward = 0.01
const autoApprovalDelay = 1
const keywords = "ad writing, qualification, future task"
const maxAssignments = 200
const taskURL = questionHTML

let HITId = "3PCPFX4U405XHZWRW7GXXH3U9U5FQT"

//Make HIT
mturk.makeHIT(title, description, assignmentDuration, lifetime, reward, autoApprovalDelay, keywords, maxAssignments, taskURL, (HIT) => {
  const HITId = HIT.HITId;
  db.ourHITs.insert({'currentHIT': HITId}, (err, HITAdded) => {
    if(err) console.log("There's a problem adding HIT to the DB: ", err);
    else if(HITAdded) console.log("HIT added to the DB: ", HITId);
  });
  mturk.listAssignments(HITId,console.log)
})



//Expire HITs
// mturk.workOnActiveHITs(H => H.forEach(mturk.expireHIT))
// workerIDs= ["A3L1OIVE57IMT2", "A2BNOEYZ3VRW2R", "A7H4PDDRFL6SA", "A8YTY0RDR6AYX", "AOER0SPVGJQAM", "A1B2RJQXDD1YHM", "A3HKMZ9ML9EPUY", "A3ESBL8J4RUANK", "AZACNY1H74YWS", "A2YBZFSUD5OP7W", "A1T83SZBP2DN65", "A31Z5TPD8QKE26", "A3L2UB07EZJAMD", "AC8ETQXPDRR6P", "A30KJAZCNCECX2", "ASXZQW6YTIPAV", "A23YJXEE2AXR3Y", "A3GM78FCDY293T", "A3AFC26CB0AXMI", "A2HGAQ9WOEU9PN", "A35U2XAPA429W7", "A4EJNWLWAUTDU", "A3MHYBS6PHJ5QG", "A258MR1IS96JEP", "A2ZGAH6NOSU2PO", "A1GPZ5REMDQZ0L", "A5CMNI7B03XL", "A1C7UV2UT2S9T7", "A1GRPIBHW72HDU", "AI4AO0O0WIJF7", "A2FN2WHV7YVDTV"]
