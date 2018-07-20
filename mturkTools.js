require('dotenv').config()

const teamSize = process.env.TEAM_SIZE
const roundMinutes = process.env.ROUND_MINUTES

const AWS = require('aws-sdk');
const runningLocal = process.env.RUNNING_LOCAL == "TRUE"
const runningLive = process.env.RUNNING_LIVE == "TRUE"//ONLY CHANGE IN VIM ON SERVER

const qualificationsOn = runningLive

let endpoint = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
let submitTo = 'https://workersandbox.mturk.com'

if (runningLive) {
  endpoint = 'https://mturk-requester.us-east-1.amazonaws.com';
  submitTo = 'https://www.mturk.com'
}

let taskURL = 'https://bang.dmorina.com/';
if (runningLocal) {
  taskURL = 'https://localhost:3000/';
}

AWS.config = {
  "accessKeyId": process.env.AWS_ID ,
  "secretAccessKey": process.env.AWS_KEY,
  "region": "us-east-1",
  "sslEnabled": true
}

let bonusPrice = 0

// This initiates the API
// Find more in the docs here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html
const mturk = new AWS.MTurk({ endpoint: endpoint });

// This will return $10,000.00 in the MTurk Developer Sandbox

const getBalance = () => {
  mturk.getAccountBalance((err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else console.log(data);           // successful response
  });
}

const expireActiveHits = () => {
  mturk.listHITs({}, (err, data) => {
    if (err) console.log(err, err.stack);
    else {
      data.HITs.map((hit) => {
        mturk.updateExpirationForHIT({HITId: hit.HITId,ExpireAt:0}, (err, data) => {
          if (err) { console.log(err, err.stack)
          } else {console.log("Expired HIT:", hit.HITId)}
        });
        // mturk.deleteHIT({HITId: hit.HITId}, (err, data) => {
        //   if (err) { console.log(err, err.stack)
        //   } else {console.log("Deleted HIT:", hit.HITId)}
        // });
      })
    }
  })
}

// creates single HIT
const launchBang = (numRounds = 3) => {
  // HIT Parameters

  const taskDuration = roundMinutes * numRounds * 3 < .5 ? 1 : roundMinutes * numRounds * 3; // how many minutes - this is a Maximum for the task
  const timeActive = 10; // How long a task stays alive in minutes -  repost same task to assure top of list
  const hourlyWage = 10.50; // changes reward of experiment depending on length - change to 6?
  const rewardPrice = .50
  let bonusPrice = (hourlyWage * (((roundMinutes * numRounds) + 10) / 60) - rewardPrice).toFixed(2);
  let usersAcceptedHIT = 0;
  let numAssignments = teamSize * teamSize;
  let QualificationReqs = [
    {
      QualificationTypeId:"00000000000000000071",  // US workers only
      LocaleValues:[{
        Country:"US",
      }],
      Comparator:"In",
      ActionsGuarded:"DiscoverPreviewAndAccept"  // only users within the US can see the HIT
    }];

  if (qualificationsOn) {
    QualificationReqs.push({
      QualificationTypeId: '00000000000000000040 ',  // more than 1000 HITs
      Comparator: 'GreaterThan',
      IntegerValues: [1000],
      RequiredToPreview: true,
    })
  }

  const params = {
    Title: 'Write online ads - bonus up to $'+ hourlyWage + ' / hour',
    Description: 'Work in groups to write ads for new products. This task will take approximately ' + Math.round((roundMinutes * numRounds) + 10)  + ' minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $' + bonusPrice + '.',
    AssignmentDurationInSeconds: 60*taskDuration, // 30 minutes?
    LifetimeInSeconds: 60*(timeActive),  // short lifetime, deletes and reposts often
    Reward: String(rewardPrice),
    AutoApprovalDelayInSeconds: 60*taskDuration,
    Keywords: 'ads, writing, copy editing, advertising',
    MaxAssignments: numAssignments,
    QualificationRequirements: QualificationReqs,
    Question: '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>'+ taskURL + '</ExternalURL><FrameHeight>400</FrameHeight></ExternalQuestion>',
  };

  mturk.createHIT(params,(err, data) => {
    if (err) console.log(err, err.stack);
    else console.log("Posted", data.HIT.MaxAssignments, "assignments:", data.HIT.HITId);
  });

  let delay = 1;
  // only continues to post if not enough people accepted HIT

  setTimeout(() => {
    usersAcceptedHIT = usersAccepted.length;
    if(usersAcceptedHIT < (teamSize * teamSize)) {
      numAssignments = ((teamSize * teamSize) - usersAcceptedHIT);
      mturk.createHIT(params,(err, data) => {
        if (err) console.log(err, err.stack);
        else console.log("HIT expired, and posted", data.HIT.MaxAssignments, "new assignments:", data.HIT.HITId);
      });
      delay++;
    } else {
      clearTimeout();
    }
  }, 1000 * 60 * timeActive * delay)
}

// bonus all users in DB who have leftover bonuses.
const payBonuses = (users) => {
  let successfullyBonusedUsers = []
    users.filter((user) => {
      return user.assignmentId & (user.bonus != 0) & user.mturkId & user.id
    }).forEach((user) => {
      var params = { AssignmentId: user.assignmentId, BonusAmount: String(user.bonus), Reason: "Thanks for participating in our HIT!", WorkerId: user.mturkId, UniqueRequestToken: user.id };
      mturk.sendBonus(params, function(err, data) {
        if (err) {
          console.log( user.id + " bonus not processed: " + err)
        } else {
          successfullyBonusedUsers.push(user)
          console.log(user.id + " bonused: " + data)
        }
      })
    })
  return successfullyBonusedUsers
}

module.exports = {
  expireActiveHits: expireActiveHits,
  getBalance: getBalance,
  launchBang: launchBang,
  payBonuses: payBonuses,
  bonusPrice: bonusPrice,
  submitTo: submitTo
};
