require('dotenv').config({path: './.env'});
const runningLive = process.env.NODE_ENV === "production";
import * as AWS from "aws-sdk";
AWS.config.accessKeyId = process.env.AWS_ID;
AWS.config.secretAccessKey = process.env.AWS_KEY;
AWS.config.region = "us-east-1";
AWS.config.sslEnabled = true;
let endpoint = runningLive ? "https://mturk-requester-sandbox.us-east-1.amazonaws.com" :
  "https://mturk-requester-sandbox.us-east-1.amazonaws.com"; //should be changed
let submitTo = runningLive ? "https://workersandbox.mturk.com" : "https://workersandbox.mturk.com"; //should be changed
export const mturk = new AWS.MTurk({ endpoint: endpoint });
let fs = require("fs");


const quals = {
  notUSA: {
    QualificationTypeId: "00000000000000000071",
    LocaleValues: [{ Country: "US" }],
    Comparator: "NotIn",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  onlyUSA: {
    QualificationTypeId: "00000000000000000071",
    LocaleValues: [{ Country: "US" }],
    Comparator: "In",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  hitsAccepted: (k: number) => {
    return {
      QualificationTypeId: "00000000000000000040",
      Comparator: "GreaterThan",
      IntegerValues: [k],
      RequiredToPreview: true
    };
  },
  completedBang: {
    //MEW: useful to filter out people who have already done our HIT.
    QualificationTypeId: runningLive
      ? process.env.HAS_BANGED_QUAL
      : process.env.HAS_BANGED_QUAL,
    Comparator: "DoesNotExist",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  joinedBang: {
    //MEW: useful to filter people who are scheduled to do our HIT.
    QualificationTypeId: runningLive
      ? process.env.WILL_BANG_QUAL
      : process.env.WILL_BANG_QUAL,
    Comparator: "DoesNotExist",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  willBang: {
    //MEW: useful to filter people who are scheduled to do our HIT.
    QualificationTypeId: runningLive
      ? process.env.WILL_BANG_QUAL
      : process.env.WILL_BANG_QUAL,
    Comparator: "Exists",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  }
};

const testScheduleQuals = [quals.joinedBang];
const liveScheduleQuals = [quals.onlyUSA, quals.hitsAccepted(100), quals.joinedBang]
const testMainQuals = [quals.completedBang, quals.willBang]
const liveMainQuals = [quals.onlyUSA, quals.hitsAccepted(100), quals.completedBang, quals.willBang]

export const clearRoom = function (room, io) {
  io.of('/').in(room).clients((error, socketIds) => {
    if (error) throw error;
    socketIds.forEach(socketId => io.sockets.sockets[socketId].leave(room));
  });
}

const chooseOne = <T>(list: T[]): T => {
  return list[Math.floor(Math.random() * list.length)];
};

export const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const randomAnimal = "Bison Eagle Pony Moose Deer Duck Rabbit Spider Wolf Lion Snake Shark Bird Bear Fish Horse Badger Marten Otter Lynx".split(
  " "
);
const randomAdjective = "new small young little likely nice cultured snappy spry conventional".split(
  " "
);

const externalHIT = (taskURL, height = 700) =>
  '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd"><ExternalURL>' +
  taskURL +
  "</ExternalURL><FrameHeight>" +
  height +
  "</FrameHeight></ExternalQuestion>";

export const makeName = function(friends_history, teamSize) {
  if (!friends_history) {
    let adjective = chooseOne(randomAdjective);
    let animal = chooseOne(randomAnimal);
    return { username: adjective + animal, parts: [adjective, animal] };
  }
}

export const addHIT = (batch, isMain) => {
  return new Promise((resolve, reject) => {
    let time = Date.now();
    const hourlyWage = 12;
    const rewardPrice = 0.01;
    const duration = isMain ? 36000 : 250;
    let bonusPrice = (hourlyWage * ((batch.roundMinutes * batch.numRounds * 1.5) / 60) - rewardPrice).toFixed(2);
    let bg = process.env.MTURK_FRAME === 'ON' ? (isMain ? 'Main task. ' : 'Test task. ') : 'Recruit task. ';

    let HITTitle = bg + "Write online ads - bonus up to $" + hourlyWage + " / hour (" + time + ")";
    let description =
      "Work in groups to write ads for new products. This task will take approximately " +
      Math.round(batch.roundMinutes * batch.numRounds + 10) +
      " minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $" +
      bonusPrice +
      ".";
    let keywords = "ads, writing, copy editing, advertising";
    let maxAssignments = isMain ? batch.teamSize * batch.teamSize * 4 : 100;
    let hitContent;
    if (process.env.MTURK_FRAME === 'ON') {
      hitContent = externalHIT(isMain ? 'https://bang-dev.deliveryweb.ru' : 'https://bang-dev.deliveryweb.ru/accept');
    } else {
      const html = fs.readFileSync("./old/question.html").toString();
      hitContent = html
        .replace(/\$\{([\s]*[^;\s\{]+[\s]*)\}/g, function(_, match) {return `\$\{map.${match.trim()}\}`;})
        .replace(/(\$\{(?!map\.)[^}]+\})/g, "");
    }

    let makeHITParams = {
      Title: HITTitle,
      Description: description,
      AssignmentDurationInSeconds: duration,
      LifetimeInSeconds: duration,
      Reward: String(rewardPrice),
      AutoApprovalDelayInSeconds: 5,
      Keywords: keywords,
      MaxAssignments: maxAssignments,
      QualificationRequirements: isMain ? testMainQuals : testScheduleQuals,
      Question: hitContent
    };

    mturk.createHIT(makeHITParams, (err, data) => {
      if (err) {reject(err);}
      else {
        resolve(data.HIT)
      }
    });
  })
}

export const notifyWorkers = (WorkerIds, MessageText, Subject) => {
  return new Promise((resolve, reject) => {
    mturk.notifyWorkers(
      { WorkerIds: WorkerIds, MessageText: MessageText, Subject: Subject},
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
}

export const assignQual = (userId, qualId) => {
  return new Promise((resolve, reject) => {
    const assignQualificationParams = {
      QualificationTypeId: qualId,
      WorkerId: userId,
      IntegerValue: 1,
      SendNotification: false
    };
    mturk.associateQualificationWithWorker(assignQualificationParams,
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
};

export const payBonus = (mturkId, assignmentId, amount) => {
  return new Promise((resolve, reject) => {
    const params = {
      AssignmentId: assignmentId,
      BonusAmount: String(amount),
      Reason: "Thanks for participating in our HIT!",
      WorkerId: mturkId,
      UniqueRequestToken: String(Date.now())
    };
    console.log(params)
    mturk.sendBonus(params,
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
};

export const listHITs = () => {
  return new Promise((resolve, reject) => {
    mturk.listHITs({MaxResults: 2},
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
};

export const listAssignmentsForHIT = (id) => {
  return new Promise((resolve, reject) => {
    const params = {
      HITId: id,
      AssignmentStatuses: ['Submitted', 'Approved', 'Rejected',],
      MaxResults: 100,
    };
    mturk.listAssignmentsForHIT(params,
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
};

export const getHIT = (id) => {
  return new Promise((resolve, reject) => {
    const params = {
      HITId: id,
    };
    mturk.getHIT(params,
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
};

export const disassociateQualificationFromWorker = (workerId, qualificationId, reason) => {
  return new Promise((resolve, reject) => {
    const params = {
      QualificationTypeId: qualificationId /* required */, // string
      WorkerId: workerId /* required */, // string
      Reason: reason
    };
    mturk.disassociateQualificationFromWorker(params,
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
};

export const expireHIT = (id) => {
  return new Promise((resolve, reject) => {
    mturk.updateExpirationForHIT({ HITId: id, ExpireAt: new Date("0") },
      function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
};