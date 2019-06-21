require('dotenv').config({path: './.env'});
export const runningLive = process.env.MTURK_MODE === "prod";
import * as AWS from "aws-sdk";
AWS.config.accessKeyId = process.env.AWS_ID;
AWS.config.secretAccessKey = process.env.AWS_KEY;
AWS.config.region = "us-east-1";
AWS.config.sslEnabled = true;
let endpoint = runningLive ? "https://mturk-requester.us-east-1.amazonaws.com" : "https://mturk-requester-sandbox.us-east-1.amazonaws.com";
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
    QualificationTypeId: runningLive ? process.env.PROD_HAS_BANGED_QUAL : process.env.TEST_HAS_BANGED_QUAL,
    Comparator: "DoesNotExist",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  joinedBang: {
    //MEW: useful to filter people who are scheduled to do our HIT.
    QualificationTypeId: runningLive ? process.env.PROD_WILL_BANG_QUAL : process.env.TEST_WILL_BANG_QUAL,
    Comparator: "DoesNotExist",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  willBang: {
    //MEW: useful to filter people who are scheduled to do our HIT.
    QualificationTypeId: runningLive ? process.env.PROD_WILL_BANG_QUAL : process.env.TEST_WILL_BANG_QUAL,
    Comparator: "Exists",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  }
};

const scheduleQuals = runningLive ? [quals.onlyUSA, quals.hitsAccepted(100), quals.joinedBang] : [];
const mainQuals = runningLive ? [quals.onlyUSA, quals.hitsAccepted(100), quals.completedBang, quals.willBang] : []

export const clearRoom = function (room, io) {
  io.of('/').in(room).clients((error, socketIds) => {
    if (error) throw error;
    socketIds.forEach(socketId => io.sockets.sockets[socketId].leave(room));
  });
}

export const chooseOne = <T>(list: T[]): T => {
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
    let bonusPrice = (hourlyWage * (((batch.roundMinutes + batch.surveyMinutes) * batch.numRounds) / 60)).toFixed(2);
    let bg = process.env.MTURK_FRAME === 'ON' ? (isMain ? 'Main task. ' : 'Test task. ') : 'Recruit task. ';
    let HITTitle = batch.HITTitle ? batch.HITTitle : bg + "Write online ads - bonus up to $" + hourlyWage + " / hour (";
    let description =
      "Work in groups to write ads for new products. This task will take approximately " +
      Math.round((batch.roundMinutes + batch.surveyMinutes) * batch.numRounds ) +
      " minutes. There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $" +
      bonusPrice +
      ".";
    let keywords = "ads, writing, copy editing, advertising";
    let maxAssignments = isMain ? batch.teamSize * batch.teamSize * 4 : 100;
    let html = fs.readFileSync('./server/services/HITContent.html').toString();
    let hitContent = html
      .replace(/\$\{([\s]*[^;\s\{]+[\s]*)\}/g, function(_, match) {return `\$\{map.${match.trim()}\}`;})
      .replace(/(\$\{(?!map\.)[^}]+\})/g, "");

    let makeHITParams = {
      Title: HITTitle,
      Description: description,
      AssignmentDurationInSeconds: duration,
      LifetimeInSeconds: duration,
      Reward: String(rewardPrice),
      AutoApprovalDelayInSeconds: 5,
      Keywords: keywords,
      MaxAssignments: maxAssignments,
      QualificationRequirements: isMain ? mainQuals : scheduleQuals,
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

export const getAccountBalance = () => {
  return new Promise((resolve, reject) => {
    mturk.getAccountBalance((err, data) => {
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

const teamChecker = roundTeams => {
  let collaborators = {};
  roundTeams.forEach(teams => {
    Object.entries(teams).forEach(([teamName, team]: [string, string[]]) => {
      team.forEach((person: string) => {
        let others = team.filter(member => member != person);
        if (person in collaborators) {
          others.forEach(member => {
            if (collaborators[person].includes(member)) {
              return false;
            }
          });
        } else {
          collaborators[person] = [];
        } // make sure there's a array for that person
        collaborators[person].push(others); // add in collaborators form that team
      });
    });
  });
  return true;
};

export const createTeams = (teamSize: number, numRounds: number, people: string[]) => {
  //MEW: helper to convert sets without a type change because we need them.
  function set(array: any[]) {
    const setArray = [];
    array.forEach(element => {
      if (!setArray.includes(element)) {
        setArray.push(element);
      }
    });
    return setArray;
  }
  let realPeople = people.slice(0, teamSize ** 2);
  if (people.length != teamSize ** 2) throw "Wrong number of people.";
  if (teamSize > numRounds + 1)
    throw "Team size is too large for number of rounds.";
  const teamNames = letters.slice(0, teamSize);

  let roundTeams = [];
  let collaborators = {};
  realPeople.forEach(person => {
    collaborators[person] = [person];
  });

  while (roundTeams.length < numRounds) {
    let unUsedPeople = realPeople.slice();
    let teams = {};

    while (unUsedPeople.length) {
      let team = [unUsedPeople.pop()]; // Add first person to team
      while (team.length < teamSize) {
        let teamCollaborators = set(
          team
            .map(member => collaborators[member])
            .reduce((a, b) => a.concat(b))
        ); //find all prior collaborators
        let remainingOptions = unUsedPeople.filter(
          person => !teamCollaborators.includes(person)
        ); //find all remaining options
        if (!remainingOptions.length) {
          return createTeams(teamSize, numRounds, realPeople);
        } // deal with random selection overlap
        let newCollaborator = chooseOne(remainingOptions);
        unUsedPeople = unUsedPeople.filter(person => person != newCollaborator); //update unused people

        team.push(newCollaborator); // add new collaborator into the team
      }

      team.forEach(member => {
        collaborators[member] = set(collaborators[member].concat(team));
      }); //Add collaborators from new team
      teams[teamNames[Object.keys(teams).length]] = team; //Add new team
    }
    roundTeams.push(teams);
  }

  if (!teamChecker(roundTeams)) throw "Valid teams were not created";

  let roundGen = [];
  for (let i in roundTeams) {
    const round = roundTeams[i];

    let newRound = {teams: []}
    for (let j in round) {
      const team = round[j];
      newRound.teams.push({users: team.map(x => x.charCodeAt(0) - 65)})
    }
    roundGen.push(newRound)
  }

  return roundGen;
};