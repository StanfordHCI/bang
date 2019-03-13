require("dotenv").config();
const http = require("http");
const mturk = require("./mturkTools");
const fs = require("fs");
const chalk = require("chalk");
const Datastore = require("nedb");

//Environmental settings, set in .env
const runningLocal = process.env.RUNNING_LOCAL === "TRUE";
const runningLive = process.env.RUNNING_LIVE === "TRUE";

console.log(
  runningLive
    ? chalk.red.inverse("\n RUNNING LIVE ")
    : chalk.green.inverse("\n RUNNING SANDBOXED ")
);

console.log(
  !runningLocal
    ? chalk.red.inverse("\n RUNNING REMOTE ")
    : chalk.green.inverse("\n RUNNING LOCAL ")
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
let recruitingHITstorage = "./.data/currentRecruitingHIT";
questionHTML = questionHTML({ HIT_date: HITDATE });

// Determine the lifetime of HIT
// const runtimeString = process.argv.length > 2 ? process.argv[2] : "" //if we specify a flag
// const actual_runTIME = new Date(runtimeString || "August 15 2018 11:00");
// const expireHITTime = new Date(actual_runTIME.getTime() - 30*60000); //get time 30 minutes before actualruntime
// const timeDiff = Math.abs(expireHITTime.getTime() - Date.now());
const lifetime = 60; //calculate lifetime based on when runTime was

//Set HIT Params
const title = `Get notified when our task launches. If you stay for the whole task, we bonus at approximately $12 per hour.`;
const description = `Submit this HIT to be notified when our task launches. Space is limited.`;
const assignmentDuration = 20;
const reward = 0.1;
const autoApprovalDelay = 1;
const keywords = "qualification, future task, notification";
const maxAssignments = 500;
const taskURL = questionHTML;

const homeDIR = require("os").homedir();
const dbName = ".data/willBang";
const dbLocation = runningLocal ? dbName : `${homeDIR}/${dbName}`;
console.log(`WillBang DB at ${dbLocation}`);
const willBangDB = new Datastore({
  filename: dbLocation,
  autoload: true,
  timestampData: true
});

console.log(`Date: ${Date.now()}`);

const timeOptions = ["morning", "midday", "afternoon", "evening"];

// Assign willBang to people who have accepted recruiting HIT of last hour
console.log("fs.exists()", fs.existsSync(recruitingHITstorage));
if (fs.existsSync(recruitingHITstorage)) {
  const HITId = fs.readFileSync(recruitingHITstorage).toString();
  console.log(`HITID found in database ${HITId}`);
  mturk.listAssignments(HITId, data => {
    const willBangers = data.map(a => a.WorkerId);
    willBangers.forEach(u => mturk.assignQuals(u, mturk.quals.willBang));

    // Store willBangers with timePreference in database
    // Deal with timezones?
    data.forEach(u => {
      const timePreference = timeOptions.filter(t => u.Answer.includes(t));
      willBangDB.insert(
        { id: u.WorkerId, timePreference: timePreference },
        (err, usersAdded) => {
          if (err) {
            console.log(
              `There's a problem adding users to the willBang DB: ${err}`
            );
          } else if (usersAdded) {
            console.log(`${u.WorkerId} added for ${timePreference}`);
          }
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
      if (err) {
        console.log(
          `There's a problem writing HIT to the recruiting file: ${err}`
        );
      }
    });
    console.log(`recruitment schedule HIT success`);
  }
);
