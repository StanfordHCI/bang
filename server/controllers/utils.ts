import {Survey} from "../models/surveys";
import * as AWS from "aws-sdk";
import {Batch} from "../models/batches";
import {User} from "../models/users";
import {Chat} from "../models/chats";

require('dotenv').config({path: './.env'});
export const runningLive = process.env.MTURK_MODE === "prod";
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
  notHasBanged: {
    QualificationTypeId: runningLive ? process.env.PROD_HAS_BANGED_QUAL : process.env.TEST_HAS_BANGED_QUAL,
    Comparator: "DoesNotExist",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  notJoinedBang: {
    QualificationTypeId: runningLive ? process.env.PROD_WILL_BANG_QUAL : process.env.TEST_WILL_BANG_QUAL,
    Comparator: "DoesNotExist",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  },
  canJoinFrameBang: {
    QualificationTypeId: runningLive ? process.env.PROD_WILL_BANG_QUAL : process.env.TEST_WILL_BANG_QUAL,
    Comparator: "Exists",
    ActionsGuarded: "DiscoverPreviewAndAccept"
  }
};

const scheduleQuals = runningLive ? [quals.onlyUSA, quals.hitsAccepted(100), quals.notJoinedBang, quals.notHasBanged] : [];
const mainQuals = runningLive ? [quals.onlyUSA, quals.hitsAccepted(100), quals.canJoinFrameBang, quals.notHasBanged] : []

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
export const randomAnimal = "Squirrel Rhino Horse Pig Panda Monkey Lion Orangutan Gorilla Hippo Rabbit Wolf Goat Giraffe Donkey Cow Bear Bison".split(
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
    let bonusPrice = (hourlyWage * getBatchTime(batch)).toFixed(2);
    let bg = 'Recruit task. ';
    let HITTitle = batch.HITTitle ? batch.HITTitle : bg + "Write online ads - bonus up to $" + hourlyWage + " / hour (";
    const batchTime = Math.round((batch.roundMinutes + batch.surveyMinutes) * batch.numRounds );
    let description =
      "Work in groups to write ads for new products. This task will take approximately " + batchTime + " minute(s). " +
      "There will be a compensated waiting period, and if you complete the entire task you will receive a bonus of $" + bonusPrice + ".";
    let keywords = "ads, writing, copy editing, advertising";
    let maxAssignments = isMain ? batch.teamSize * batch.teamSize * 4 : 100;
    let html = fs.readFileSync('./server/services/HITContent.html').toString();
    let hitContent = html
      .replace('ad_writing_task', batch.HITTitle)
      .replace('40-50', batchTime.toString())
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

export const listAssignmentsForHIT = (params) => {
  return new Promise((resolve, reject) => {
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

export let createOneTeam: (teamSize: number, numRounds: number, people: any[]) => void;
createOneTeam = (teamSize: number, numRounds: number, people: any[]) => {
  const rounds = [];
  while (rounds.length < numRounds) {
    const round = {
      teams: null
    }
    const teams = [{
      users: null
    }]; // There will be only one team
    teams[0].users = Array.from(Array(teamSize).keys());
    round.teams = teams;
    rounds.push(round)
  }
  return rounds;
};

export const createDynamicTeams = (teamSize: number, numRounds: number, dynamicOptions: boolean) => {
  /*
  * Returns array of {roundPairs, roundGen}
  * e.g.:
  * {roundPairs: [[1,6], [2,3], [4,5]], roundGen: {<some roundGen with 50% - n, 50% - 1 teamSize structure>}}
  * first round in pair is always with 1 user in a team*/
  const availableNumbers = Array.from(Array(numRounds).keys());
  const roundPairs = consecutivePairs(availableNumbers);
  console.log("Round pairs: " + roundPairs)
  let roundGen = Array(numRounds);
  roundPairs.forEach(pair => {

    pair.forEach((roundNum, indInPair) => {
      const round = {
        teams: [],
      }
      if(dynamicOptions){ // put the team first
        if (indInPair === 0) { // first round in pair -- n users in one team
          let teams = [{users: []}];
          // make 1 team with n users in it
          teams[0].users = Array.from(Array(teamSize).keys());
          round.teams = teams;
        }
        if (indInPair === 1) { // second round in pair -- 1 user in n teams
          let teams = [];
          // make n teams with 1 user in each
          Array.from(Array(teamSize).keys()).forEach(user => teams.push({users: [user]}));
          round.teams = teams
        }
      }else{ // put the individual first
        if (indInPair === 0) { // first round in pair -- 1 user in n teams
          let teams = [];
          // make n teams with 1 user in each
          Array.from(Array(teamSize).keys()).forEach(user => teams.push({users: [user]}));
          round.teams = teams
        }
        if (indInPair === 1) { // second round in pair -- n users in one team
          let teams = [{users: []}];
          // make 1 team with n users in it
          teams[0].users = Array.from(Array(teamSize).keys());
          round.teams = teams;
        }
      }
      roundGen[roundNum] = round
    })
  })
  console.log('generated rounds: ', JSON.stringify(roundGen))
  return {roundGen: roundGen, roundPairs: roundPairs};
}

export const getBatchTime = (batch) => {
  let result = 0;
  batch.tasks.forEach(task => {
    result = result + batch.roundMinutes;
    if (task.hasPreSurvey) result = result + batch.surveyMinutes;
    if (task.hasMidSurvey) result = result + batch.surveyMinutes;
  })
  return result / 60;
}

export const listHITs = (params) => {
  return new Promise((resolve, reject) => {
    mturk.listHITs(params,
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

export const listWorkersWithQualificationType = (params) => {
  return new Promise((resolve, reject) => {
    mturk.listWorkersWithQualificationType(params,
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

// the standard one-liner doesn't work properly;
const findMaxIndex = (points) => {
  let maxPoints = -1;
  let maxIndex = 0;
  for (let i = 0; i < points.length; i++) {
    if (points[i] && points[i] > maxPoints) {
      maxPoints = points[i];
      maxIndex = i;
    }
  }
  return maxIndex;
};

const findMinIndex = points => { // not counting zeros
  if (!points.length) {
    return 0;
  }
  let minPoints = 0;
  let i = 0;
  while (!minPoints && i < points.length) {
    minPoints = points[i++];
  }
  let minIndex = 0;
  for (let i = 0; i < points.length; i++) {
    if (points[i] && points[i] <= minPoints) {
      minPoints = points[i];
      minIndex = i;
    }
  }
  return minIndex;
};

const findClosestIndex = (points, medianArray) => {
  // finding i which gives minimal abs(points[i] - medianArray[i])
  if (points.length && medianArray.length) {
    let results = [];
    points.forEach((val, ind, arr) => {
      if (arr.length - 1 !== ind) {
        results = results.concat(Math.abs(val - medianArray[ind]).toFixed(2));
      }
    });
    results = results.map(x => x !== 0 ? x : 0.001); // findMinIndex doesn't count zeros
    return findMinIndex(results)
  }
};

const findFarthestIndex = (points, medianArray) => {
  // finding i which gives minimal abs(points[i] - medianArray[i])
  if (points.length && medianArray.length) {
    let results = [];
    points.forEach((val, ind, arr) => {
      if (arr.length - 1 !== ind) {
        results = results.concat(Math.abs(val - medianArray[ind]).toFixed(2));
      }
    });
    return findMaxIndex(results)
  }
};


/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max, excluded) {
  try {
    min = Math.ceil(min);
    max = Math.floor(max);
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    return excluded.indexOf(result) === -1 ? result : getRandomInt(min, max, excluded);
  }
  catch (e) {
    return min;
  }
}

// Returns the index of round in which the team has the best results
// Used only in single-team batches
// If an error occurs, returns 0, so the teams will be like in the round 1,
// happens only if no one has completed any midSurveys at all
export const bestRound = async (batch) => {
  const updBatch = await Batch.findById(batch._id);
  const bestRoundFunction = batch.bestRoundFunction;
  // const currentRound = (batch.expRounds.length ? Math.max(batch.expRounds) : batch.numRounds);
  const currentRound = updBatch.currentRound + 1;
  const points = Array(currentRound); // storage for round scores
  let medianScores = [];
  // for (let i = 0; i < numRounds; ++i) {
  for (let i = 0; i < currentRound - 1; ++i) {
    if (updBatch.worstRounds.indexOf(i + 1) > -1) {
      points[i] = 0;
      continue;
    }
    if (updBatch.expRounds.indexOf(i + 1) > -1) {
      points[i] = 0;
      continue;
    }
    const surveys = await Survey.find({ batch: batch._id, round: i + 1, surveyType: 'midsurvey' });
    const surveysCount = surveys.length;
    const answerTypes = batch.tasks[i].survey ? batch.tasks[i].survey.map(surv => surv.type) : [];
    let medianScore = 0;
    if (batch.tasks[i].survey) {
      batch.tasks[i].survey.forEach((surv) => {
        if (surv.type === 'select') {
          medianScore += surv.selectOptions.map(option => parseInt(option.value) + 1).reduce((a, b) => a + b) / surv.selectOptions.length;
        }
      });
    }
    medianScores = medianScores.concat(medianScore);
    // user's score is a sum of all select answer's values in ALL midSurveys of a round
    let score = 0;
    let averageScore = 0;
    try {
      if (surveys) {
        const questions = surveys.map(surv => surv.questions);
        const questionResults = questions.map(x => x.map((q, index) => {return answerTypes[index] === 'select' &&
        parseInt(q.result) + 1 ? parseInt(q.result) + 1 : 0})).reduce((a, b) => a.concat(b));
        score = questionResults.reduce((a, b) => {
          return parseInt(a) + parseInt(b);
        });
        averageScore = parseFloat((score / surveysCount).toFixed(2));
      }
    }
    catch (e) {
      score = 0;
      averageScore = 0;
    }
    if (!averageScore) {
        averageScore = 0;
    }
    // points[i] = score;
      points[i] = averageScore;
  }
  const excludedRounds = updBatch.expRounds.concat(updBatch.worstRounds);
  if (updBatch.randomizeExpRound) {
    excludedRounds.push(updBatch.numRounds - 1);
  }
  const result = roundFromFunction(bestRoundFunction, {points: points, medianScores: medianScores,
    currentRound: currentRound, excludedRounds: excludedRounds});
  return {bestRoundIndex: result, scores: points, expRounds: [currentRound, result + 1], medianScores: medianScores,
    currentRound: currentRound, excludedRounds: excludedRounds};
};

export const worstRound = async batch => {
  const bestRoundFunction = batch.bestRoundFunction;
  const bestRoundResults = await bestRound(batch);
  const currentRound = bestRoundResults.currentRound;
  let func = '';
  switch (bestRoundFunction) {
    case 'highest':
      func = 'lowest';
      break;
    case 'lowest':
      func = 'highest';
      break;
    case 'average':
      func = 'anti-average';
      break;
    case 'random':
      func = 'random';
      break;
    default:
      func = 'lowest';
  }
  const result = roundFromFunction(func, {points: bestRoundResults.scores, medianScores: bestRoundResults.medianScores,
  currentRound: currentRound, excludedRounds: bestRoundResults.excludedRounds});
  return {worstRoundIndex: result, worstRounds: [currentRound, result + 1]};
}
export const calculateMoneyForBatch = batch => {
  const teamFormat = batch.teamFormat;
  const batchCapacity = teamFormat === 'single' ? batch.teamSize : batch.teamSize ** 2;
  return batchCapacity * 12 * getBatchTime(batch);
}

const roundFromFunction = (func, data) => { // if data.points[i] === 0 or undefined, it can't win
  let result = 0;
  let points = data.points;
  const medianScores = data.medianScores;
  const currentRound = data.currentRound;
  const excluded = data.excludedRounds || [];
  excluded.forEach(x => points[x - 1] = 0);
  if (func === 'highest') {
    result = findMaxIndex(points)
  }
  if (func === 'lowest') {
    result = findMinIndex(points);
  }
  if (func === 'average') {
    result = findClosestIndex(points, medianScores)
  }
  if (func === 'random') {
    result = getRandomInt(0, currentRound - 2, excluded);
  }
  if (func === 'anti-average') {
    result = findFarthestIndex(points, medianScores);
  }
  return result;
}

// Returns the pairs of IDs of the users in batch that should be unmasked in the numRound and sets them in batch
// numRound: currentRound
// surveyRound: round in which selective masking questions were asked

function itemInArray(array, item) {
  for (var i = 0; i < array.length; i++) {
    // This if statement depends on the format of your array
    if (array[i][0] == item[0] && array[i][1] == item[1]) {
      return true;   // Found it
    }
  }
  return false;   // Not found
}

export const addUnmaskedPairs = async (batch, numRound, surveyRound) => {
  const isLike = x => Number(x) === 4;
  const isDislike = x => Number(x) === 0;
  const onlyMutual = (x) => {
    // Returns array of pairs of (z, y), for every z and y that are (z, y) in x && (y, z) in x
    let result = []
    x.forEach((y, ind) => {
      for (let i = ind + 1; i < x.length; ++i) { // check every element for every element, if they are (x, y) and (y, x)
        if (i === ind) continue;
        if (y[0].toString() === x[i][1].toString() && y[1].toString() === x[i][0].toString()) {
          if (!itemInArray(result, y)) {
            result.push(y);
          }
        }
      }
    })
    return result
  }
  if(!surveyRound) {
    console.log('no surveyRound')
  }
  const surveys = await Survey.find({batch: batch._id, round: surveyRound + 1, surveyType: 'midsurvey'});
  let likes = [];
  let dislikes = [];
  surveys.forEach(x => {
    const fromUser = x.user;
    x.questions.forEach(y => {
      const result = y.result.split(' ');
      if (result[1]) { // true if result has format "int userId". True only for attractiveness questions
        const toUser = result[1];
        const attraction = result[0];
        if (isLike(attraction)) {
          likes.push([fromUser, toUser]);
        }
        if (isDislike(attraction)) {
          dislikes.push([fromUser, toUser]);
        }
      }
    })
  })
  likes = onlyMutual(likes)
  dislikes = onlyMutual(dislikes)
  await Batch.findByIdAndUpdate(batch._id, { unmaskedPairs: {
      likes: likes,
      dislikes: dislikes
    }});
}

//Given an array of available numbers, return an array of consecutive pairs
function consecutivePairs(availableNumbers: Number[] ) {
  let pairs = [];
  while( availableNumbers.length ){
    pairs.push([
      availableNumbers.splice(0, 1)[0],
      availableNumbers.splice(0, 1)[0]
    ]);
  }
  return pairs;
}

// Given an array of available numbers, return an array of random pairs
function randomPairs( availableNumbers: Number[] ) {
  let pairs = [];
  while( availableNumbers.length ) {
    pairs.push([
      pluckRandomElement( availableNumbers ),
      pluckRandomElement( availableNumbers )
    ]);
  }
  return pairs;
}

// Return a random element and remove it from the array
function pluckRandomElement( array ) {
  var i = randomInt( array.length );
  return array.splice( i, 1 )[0];
}

// Return a random integer 0 <= n < limit
function randomInt( limit ) {
  return Math.floor( Math.random() * limit );
}
export class SpecificQuestionHandler {
  private questions: any[];
  constructor() {
    // this.questions = [{text: '', options: [], dbField: ''}]
    this.questions = [];
  }
  addQuestion(text, options, dbField) {
    this.questions.push({text: text.toLowerCase(), options: options, dbField: dbField});
    return this;
  }
  resolveQuestion(text, selectedOption) {
    const question = this.questions.find(x => x.text.toLowerCase() === text.toLowerCase())
    if (!question) {
      return
    }
    let selectedOptionNum;
    if (!question.options || !question.options.length) {
      selectedOptionNum = selectedOption; // for questions without enum choices
    } else {
      selectedOptionNum = question.options[Number(selectedOption)]
    }
    console.log('resolve results: ', selectedOptionNum)
    if (!selectedOptionNum) { // if there is not such number of chosen options we select the last possible option
      selectedOptionNum =  question.options.slice(-1)[0]
    }
    return {selectedOptionNum: selectedOptionNum, dbField: question.dbField};
  }
  questionIndex(question) {
    return this.questions.map(x => x.text.toLowerCase()).indexOf(question.toLowerCase());
  }
  getQuestions() {
    return this.questions;
  }
}
