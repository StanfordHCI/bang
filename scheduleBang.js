require("dotenv").config();
var http = require("http"),
  mturk = require("./mturkTools"),
  fs = require("fs");
var colors = require("colors");
const Datastore = require("nedb");

//Environmental settings, set in .env
const runningLocal = process.env.RUNNING_LOCAL == "TRUE";
const runningLive = process.env.RUNNING_LIVE == "TRUE"; //ONLY CHANGE ON SERVER

console.log(
  runningLive
    ? "\n RUNNING LIVE ".red.inverse
    : "\n RUNNING SANDBOXED ".green.inverse
);
var date = new Date(
  Date.now() + 1000 /*sec*/ * 60 /*min*/ * 60 /*hour*/ * 24 /*day*/ * 1
); //Actual HIT 1 day in the future
HITDATE = date.toLocaleString("en-us", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric"
});
console.log("Day of actual HIT", HITDATE);

var generateTemplateString = (function() {
  var cache = {};

  function generateTemplate(template) {
    var fn = cache[template];

    if (!fn) {
      // Replace ${expressions} (etc) with ${map.expressions}.

      var sanitized = template
        .replace(/\$\{([\s]*[^;\s\{]+[\s]*)\}/g, function(_, match) {
          return `\$\{map.${match.trim()}\}`;
        })
        // Afterwards, replace anything that's not ${map.expressions}' (etc) with a blank string.
        .replace(/(\$\{(?!map\.)[^}]+\})/g, "");

      fn = Function("map", `return \`${sanitized}\``);
    }

    return fn;
  }

  return generateTemplate;
})();

// //Reference HIT file
let questionHTML = generateTemplateString(
  fs.readFileSync("./question.html").toString()
);
let recruitingHITstorage = "./txt/currentrecruitingHIT.txt";
questionHTML = questionHTML({ HIT_date: HITDATE });

// Determine the lifetime of HIT
// const runtimeString = process.argv.length > 2 ? process.argv[2] : "" //if we specify a flag
// const actual_runTIME = new Date(runtimeString || "August 15 2018 11:00");
// const expireHITTime = new Date(actual_runTIME.getTime() - 30*60000); //get time 30 minutes before actualruntime
// const timeDiff = Math.abs(expireHITTime.getTime() - Date.now());
const lifetime = 60; //calculate lifetime based on when runTime was

//Set HIT Params
const title = `Get notified when our ad writing task launches. If you stay for the whole task, we bonus at approximately $10.50 per hour.`;
const description =
  "Submit this HIT to be notified when our ad writing task launches. Space is limited.";
const assignmentDuration = 20;
const reward = 0.01;
const autoApprovalDelay = 1;
const keywords = "ad writing, qualification, future task";
const maxAssignments = 200;
const taskURL = questionHTML;

let db = {};
db.willBang = new Datastore({
  filename: ".data/willBang",
  autoload: true,
  timestampData: true
});

//Removes user from db.willBang
// let removeId = ''
// db.willBang.remove({id: removeId}, { multi: true }, function (err, numRemoved) {
//   if(err) console.log(err)
//   else console.log('Removed ' + numRemoved + ' from db.willBang: ' + removeId)
// })
//return;

console.log("Date: " + Date.now());

// Assign willBang to people who have accepted recruiting HIT of last hour
console.log("fs.exists()", fs.existsSync(recruitingHITstorage));
if (fs.existsSync(recruitingHITstorage)) {
  const HITId = fs.readFileSync(recruitingHITstorage).toString();
  console.log("HITID found in database", HITId);
  mturk.listAssignments(HITId, data => {
    const willBangers = data.map(a => a.WorkerId);
    willBangers.forEach(u => mturk.assignQuals(u, mturk.quals.willBang));

    // Store willBangers with timePreference in database
    // Deal with timezones?
    data.forEach(u => {
      let timePreference = "";
      if (u.Answer.includes("morning")) {
        //current this only allows them to choose 1 time preference. Fix?
        timePreference = "morning";
      } else if (u.Answer.includes("midday")) {
        timePreference = "midday";
      } else if (u.Answer.includes("afternoon")) {
        timePreference = "afternoon";
      } else if (u.Answer.includes("evening")) {
        timePreference = "evening";
      } else if (u.Answer.includes("late evening")) {
        timePreference = "late evening";
      }

      db.willBang.insert(
        { id: u.WorkerId, timePreference: timePreference },
        (err, usersAdded) => {
          if (err)
            console.log(
              "There's a problem adding users to the willBang DB: ",
              err
            );
          else if (usersAdded)
            console.log("Users added to the willBang DB: " + u.WorkerId);
        }
      );
    });
  });

  // Expire HIT to ensure no one else accepts
  mturk.expireHIT(HITId);

  // Delete recruitingHITstorage
  fs.unlink(recruitingHITstorage, err => {
    if (err) throw err;
    console.log("recruitingHITstorage was deleted");
  });
} else {
  console.log(
    "No recruitingHITstorage found. Perhaps this is your first time running."
  );
}

// Make new recruiting HIT
mturk.makeHIT(
  "scheduleQuals",
  title,
  description,
  assignmentDuration,
  lifetime,
  reward,
  autoApprovalDelay,
  keywords,
  maxAssignments,
  taskURL,
  HIT => {
    const HITId = HIT.HITId;

    // Write new recruiting HIT id to file for next hour run
    fs.writeFile(recruitingHITstorage, HITId, err => {
      if (err)
        console.log(
          "There's a problem writing HIT to the recruiting file: ",
          err
        );
    });
    console.log("recruitment schedule HIT success");
  }
);
