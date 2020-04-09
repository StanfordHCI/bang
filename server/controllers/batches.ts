import { activeCheck } from "./users";

require("dotenv").config({ path: "./.env" });
import { User } from "../models/users";
import { Chat } from "../models/chats";
import { Batch } from "../models/batches";
import { Bonus } from "../models/bonuses";
import { Survey } from "../models/surveys";
import {
  clearRoom,
  expireHIT,
  assignQual,
  payBonus,
  chooseOne,
  runningLive,
  notifyWorkers,
  getBatchTime,
  bestRound,
  worstRound,
  addUnmaskedPairs,
  SpecificQuestionHandler,
  hourlyWage,
} from "./utils";
import { errorHandler } from "../services/common";
import { io } from "../index";
const logger = require("../services/logger");
const botId = "100000000000000000000001";
const randomAnimal = "Squirrel Rhino Horse Pig Panda Monkey Lion Orangutan Gorilla Hippo Rabbit Wolf Goat Giraffe Donkey Cow Bear Bison".split(
  " "
);
const randomAdjective = "new small young little likely nice cultured snappy spry conventional".split(
  " "
);
const BEST = "best";
const WORST = "worst";
const STANDARD = "standard";

export const joinBatch = async function(data, socket, io) {
  try {
    let batches = await Batch.find({ status: "waiting" })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    if (!batches || !batches.length) {
      logger.error(module, "There is no waiting batch");
      socket.emit(
        "send-error",
        "We are full now, sorry. Join us later please."
      );
      return;
    }
    let batch = batches[0];
    const totalBatchUsers =
      batch.teamFormat === "single" ? batch.teamSize : batch.teamSize ** 2;
    if (
      socket.systemStatus === "willbang" &&
      batch.users.length < totalBatchUsers &&
      !batch.users.some((x) => x.user.toString() === socket.userId.toString())
    ) {
      //join to batch
      let nickname;
      let adjective;
      let animal;
      while (!nickname) {
        animal = chooseOne(randomAnimal);
        adjective = chooseOne(randomAdjective);
        nickname = adjective + animal;
        batch.users.forEach((user) => {
          if (user.nickname === nickname) {
            nickname = false;
          }
        });
      }

      let user;
      const prs = await Promise.all([
        Batch.findByIdAndUpdate(
          batch._id,
          {
            $addToSet: {
              users: {
                user: socket.userId,
                nickname: nickname,
                joinDate: new Date(),
              },
            },
          },
          { new: true }
        ),
        User.findByIdAndUpdate(
          socket.userId,
          {
            $set: {
              batch: batch._id,
              realNick: nickname,
              currentChat: batch.preChat,
            },
          },
          { new: true }
        )
          .lean()
          .exec(),
      ]);
      user = prs[1];
      batch = prs[0];
      socket.join(user.currentChat.toString()); //chat room
      socket.join(batch._id.toString()); //common room, not chat
      socket.emit("joined-batch", { user: user });
      io.to(batch._id.toString()).emit("refresh-batch", true);
      await activeCheck(io);
    } else {
      let reason;
      if (socket.systemStatus !== "willbang") {
        reason = "wrong system status";
      } else if (batch.users.length >= totalBatchUsers) {
        reason = "experiment is full";
      } else {
        reason = "already joined";
      }
      logger.error(
        module,
        "User " + socket.mturkId + " cannot join to batch. Reason: " + reason
      );
      socket.emit("send-error", "You cannot join. Reason: " + reason);
      return;
    }
    let batchReady = false;
    if (batch.teamFormat === "single") {
      batchReady =
        batch.users.length >= batch.teamSize && batch.status === "waiting";
    } else {
      batchReady =
        batch.users.length >= batch.teamSize ** 2 && batch.status === "waiting";
    }
    if (batchReady) {
      //start batch
      clearRoom(batch.preChat, io);
      await startBatch(batch, socket, io);
    }
  } catch (e) {
    errorHandler(e, "join batch error");
  }
};

export const loadBatch = async function(data, socket, io) {
  let chat, userInfo;
  try {
    const batch = await Batch.findById(data.batch)
      .lean()
      .exec();
    if (batch.status === "waiting") {
      const prs = await Promise.all([
        Chat.findById(batch.preChat)
          .lean()
          .exec(),
        User.findById(socket.userId)
          .select("realNick currentChat")
          .lean()
          .exec(),
      ]);
      chat = prs[0];
      chat.members = [prs[1]];
      userInfo = chat.members.find(
        (x) => x._id.toString() === socket.userId.toString()
      );
      socket.join(batch.preChat.toString());
    } else if (batch.status === "active") {
      const round = batch.rounds[batch.currentRound - 1];
      if (round) {
        let chatId;
        round.teams.forEach((team) => {
          team.users.forEach((user) => {
            if (user.user.toString() === socket.userId.toString()) {
              chatId = team.chat;
            }
          });
        });
        const prs = await Promise.all([
          Chat.findById(chatId)
            .lean()
            .exec(),
          User.find({ currentChat: chatId })
            .select("realNick fakeNick currentChat")
            .lean()
            .exec(),
          Survey.findOne({
            user: socket.userId,
            batch: data.batch,
            round: batch.currentRound,
            surveyType: round.status,
          })
            .select("_id")
            .lean()
            .exec(),
        ]);
        chat = prs[0];
        chat.members = prs[1];
        chat.members.forEach((member) => {
          const batchUser = batch.users.find(
            (x) => x.user.toString() === member._id.toString()
          );
          if (batchUser) {
            member.isActive = batchUser.isActive;
          }
          return member;
        });
        if (prs[2]) batch.surveyDone = true;
        userInfo = chat.members.find(
          (x) => x._id.toString() === socket.userId.toString()
        );
        socket.join(chatId.toString());
      } else {
        chat = {};
        chat.members = [];
        chat.messages = [];
      }
    } else if (batch.status === "completed") {
      const [finalSurveyCheck, surveyCounter] = await Promise.all([
        Survey.findOne({
          user: socket.userId,
          batch: data.batch,
          surveyType: "final",
        })
          .select("_id")
          .lean()
          .exec(),
        Survey.count({
          user: socket.userId,
          batch: data.batch,
          surveyType: { $in: ["presurvey", "midsurvey"] },
        }),
      ]);
      batch.surveyCounter = surveyCounter;
      if (finalSurveyCheck) batch.finalSurveyDone = true;
    }

    socket.emit("loaded-batch", {
      batch: batch,
      chat: chat,
      userInfo: userInfo,
    });
  } catch (e) {
    errorHandler(e, "load batch error, user: " + socket.userId);
  }
};

const startBatch = async function(batch, socket, io) {
  try {
    await timeout(3000);
    const users = await User.find({ batch: batch._id })
      .lean()
      .exec();
    const expectedUsersLength =
      batch.teamFormat === "single"
        ? parseInt(batch.teamSize)
        : parseInt(batch.teamSize) ** 2;
    if (users.length !== expectedUsersLength) {
      logger.error(
        module,
        "wrong users length - " + users.length + "; batch will be finished"
      );
      await Batch.findByIdAndUpdate(batch._id, {
        $set: { status: "completed" },
      })
        .lean()
        .exec();
      await User.updateMany(
        { batch: batch._id },
        {
          $set: {
            batch: null,
            realNick: null,
            currentChat: null,
            fakeNick: null,
          },
        }
      );
      return;
    }

    if (process.env.MTURK_MODE !== "off") {
      const prsHelper = [];
      for (const user of users) {
        prsHelper.push(
          assignQual(
            user.mturkId,
            runningLive
              ? process.env.PROD_HAS_BANGED_QUAL
              : process.env.TEST_HAS_BANGED_QUAL
          )
        );
      }
      await Promise.all(prsHelper);
    }

    const startBatchInfo = { status: "active", startTime: new Date() };
    batch = await Batch.findByIdAndUpdate(batch._id, { $set: startBatchInfo })
      .lean()
      .exec();
    await activeCheck(io);
    logger.info(module, "Main experiment start: " + batch._id);
    io.to(batch._id.toString()).emit("start-batch", startBatchInfo);
    const teamSize = batch.teamSize,
      numRounds = batch.numRounds;
    let rounds = [];
    let oldNicks = users.map((user) => user.realNick);

    let kickedUsers = [];
    for (let i = 0; i < numRounds; i++) {
      await roundRun(
        batch,
        users,
        rounds,
        i,
        oldNicks,
        teamSize,
        io,
        kickedUsers
      );
    }
    const postBatchInfo = { status: "completed" };
    batch = await Batch.findByIdAndUpdate(batch._id, { $set: postBatchInfo })
      .lean()
      .exec();
    io.to(batch._id.toString()).emit("refresh-batch", true);
    logger.info(module, batch._id + " : end active stage");
    //last survey
    await timeout(240000);

    await User.updateMany(
      { batch: batch._id },
      {
        $set: {
          batch: null,
          realNick: null,
          currentChat: null,
          fakeNick: null,
          systemStatus: "hasbanged",
        },
      }
    );
    logger.info(module, "Main experiment end: " + batch._id);
    clearRoom(batch._id, io);
  } catch (e) {
    errorHandler(e, "batch main run error");
    logger.info(module, "batch finished: " + batch._id);
    await Promise.all([
      notifyWorkers(
        [process.env.MTURK_NOTIFY_ID],
        "Batch main run error. Batch was finished. Check logs please.",
        "Bang"
      ),
      Batch.findByIdAndUpdate(batch._id, { $set: { status: "completed" } })
        .lean()
        .exec(),
      User.updateMany(
        { batch: batch._id },
        {
          $set: {
            batch: null,
            realNick: null,
            currentChat: null,
            fakeNick: null,
            systemStatus: "hasbanged",
          },
        }
      ),
    ]);
  }
};

export const receiveSurvey = async function(data, socket, io) {
  try {
    let newSurvey = {
      ...data,
      user: socket.userId,
    };
    if (newSurvey.surveyType === "final") {
      const check = await Survey.findOne({
        batch: newSurvey.batch,
        user: newSurvey.user,
        surveyType: "final",
      });
      if (check) {
        logger.info(module, "Blocked survey, survey exists");
        return;
      }
    }
    const [batch, user] = await Promise.all([
      Batch.findById(newSurvey.batch)
        .select(
          "_id roundMinutes numRounds surveyMinutes tasks teamFormat preSurvey " +
            "currentRound rounds"
        )
        .lean()
        .exec(),
      User.findById(newSurvey.user)
        .select("_id systemStatus mturkId")
        .lean()
        .exec(),
    ]);
    console.log(
      "teams: ",
      JSON.stringify(batch.rounds[batch.currentRound - 1].teams),
      socket.userId.toString()
    );
    const teammates = batch.rounds[batch.currentRound - 1].teams
      .find((x) =>
        x.users.some((y) => y.user._id.toString() === socket.userId.toString())
      )
      .users.filter((x) => x.user._id.toString() !== socket.userId.toString());
    newSurvey.teamPartners = {};
    teammates.forEach((x, ind) => {
      newSurvey.teamPartners[`team_partner_${ind + 1}`] = x.user._id;
    });
    await Survey.create(newSurvey);
    if (process.env.MTURK_MODE !== "off" && newSurvey.surveyType === "final") {
      if (!batch) {
        logger.info(module, "Blocked survey, survey/user does not have batch");
        return;
      }
      let bonusPrice = hourlyWage * getBatchTime(batch);
      if (bonusPrice > 15) {
        logger.info(module, "Bonus was changed for batch " + newSurvey.batch);
        await notifyWorkers(
          [process.env.MTURK_NOTIFY_ID],
          "Bonus was changed from " +
            bonusPrice +
            "$ to 15$ for user " +
            user.mturkId,
          "Bang"
        );
        bonusPrice = 15;
      }
      const bonus = await payBonus(
        socket.mturkId,
        socket.assignmentId,
        bonusPrice.toFixed(2)
      );
      if (bonus) {
        const newBonus = {
          batch: newSurvey.batch,
          user: socket.userId,
          amount: bonusPrice,
          assignment: socket.assignmentId,
        };
        await Bonus.create(newBonus);
        logger.info("module", "Bonus sent to " + socket.mturkId);
      }
    }
    const questionHandler = new SpecificQuestionHandler();
    questionHandler
      .addQuestion(
        "What is the highest degree or level of school you have completed?",
        [
          "Less than High School",
          "High school or equivalent",
          "Some college",
          "Undergraduate degree",
          "Graduate degree",
          "Doctorate",
        ],
        "degree"
      )
      .addQuestion(
        "What is your gender?",
        ["male", "female", "prefer not to say"],
        "gender"
      )
      .addQuestion("Which year were you born?", [], "yearBorn")
      .addQuestion(
        "How much total combined money did all members of your household earn last year?",
        [
          "Less than $20,000",
          "$20,000 to $34,999",
          "$35,000 to $49,999",
          "$50,000 to $74,999",
          "$75,000 to $99,999",
          "Over $100,000",
        ],
        "houseHoldEarnings"
      )
      .addQuestion(
        "Are you of Hispanic, Latino, or of Spanish origin?",
        ["Yes", "No"],
        "hispanicLatinoSpanish"
      )
      .addQuestion(
        "How would you describe yourself?",
        [
          "American Indian or Alaska Native",
          "Asian",
          "Black or African American",
          "Native Hawaiian or Other Pacific Islander",
          "White",
          "Other",
        ],
        "race"
      )
      .addQuestion(
        "What is your marital status?",
        [
          "Single",
          "Married",
          "Live with Partner",
          "Separated",
          "Divorced",
          "Widowed",
        ],
        "maritalStatus"
      )
      .addQuestion(
        "What is your occupation? If you are retired, please describe your main occupation when you were " +
          "working.",
        [],
        "occupation"
      )
      .addQuestion(
        "How long have you worked in this occupation? (If you are retired, how long did you work in this" +
          " occupation?)",
        [],
        "occupationTime"
      )
      .addQuestion(
        "Have you ever served on a jury before?",
        ["Yes", "No"],
        "juryExperience"
      )
      .addQuestion("If yes, how many times?", [], "juryHowManyTimes")
      .addQuestion(
        "Was it a civil or criminal case?",
        ["Civil", "Criminal"],
        "civilCriminal"
      )
      .addQuestion(
        "Did the jur(ies) reach a verdict?",
        ["Yes", "No"],
        "verdictReached"
      )
      .addQuestion(
        "Would you say religion provides no guidance in your day-to-day living, some guidance, quite a" +
          " bit of guidance, or a great deal of guidance in your day-to-day life?",
        [
          "No guidance",
          "Some guidance",
          "Quite a bit of guidance",
          "A great deal of guidance",
        ],
        "religionGuidance"
      )
      .addQuestion(
        "We hear a lot of talk these days about liberals and conservatives. Here is a seven-point scale " +
          "on which the political views that people might hold are arranged from extremely liberal to extremely conservative. " +
          "Where would you place YOURSELF on this scale?",
        [
          "Extremely Liberal",
          "Liberal",
          "Slightly Liberal",
          "Moderate; Middle of the Road",
          "Slightly Conservative",
          "Conservative",
          "Extremely Conservative",
        ],
        "politicalView"
      );
    const specificQuestion = (x, questionText) =>
      x.question.toLowerCase() === questionText.toLowerCase();
    const genderQuestion = (x) => specificQuestion(x, "what is your gender?");
    if (
      newSurvey.surveyType === "presurvey" ||
      newSurvey.surveyType === "prepresurvey"
    ) {
      let gender;
      let index;
      try {
        index = batch.tasks[0].preSurvey.findIndex((x) => genderQuestion(x));
      } catch (e) {
        index = -1;
      }
      const genderFromInd = (ind, survey) => {
        let gender;
        if (ind !== -1) {
          switch (survey.questions[ind].result) {
            case "0":
              gender = "male";
              break;
            case "1":
              gender = "female";
              break;
            case "2":
              gender = "prefer not to say";
              break;
            default:
              gender = "prefer not to say";
              break;
          }
          return gender;
        }
      };
      if (index !== -1) {
        // Looking for gender survey in task presurveys
        gender = genderFromInd(index, newSurvey);
      } else {
        if (newSurvey.surveyType === "prepresurvey") {
          // looking for gender survey in batch presurvey
          const ind = batch.preSurvey.findIndex((x) => genderQuestion(x));
          gender = genderFromInd(ind, newSurvey);
        }
      }
      if (gender) {
        await User.findByIdAndUpdate(newSurvey.user, { gender: gender });
        await Batch.updateOne(
          { _id: batch._id, "users.user": newSurvey.user },
          { $set: { "users.$.gender": gender } }
        );
        io.to(batch._id.toString()).emit("refresh-batch", true);
      }
      // resolving other specific questions with handler:
      const psHelper = [];
      if (newSurvey.surveyType === "prepresurvey") {
        // looking for gender survey in batch presurvey
        batch.preSurvey.forEach((q, ind) => {
          const qIndex = questionHandler.questionIndex(q.question);
          console.log("qIndex: ", qIndex, "q.question: ", q.question);
          if (qIndex > -1) {
            const question = questionHandler.getQuestions()[qIndex].text;
            const resolved = questionHandler.resolveQuestion(
              question,
              newSurvey.questions[ind].result
            );
            console.log("resolved: ", resolved);
            psHelper.push(
              User.findByIdAndUpdate(newSurvey.user, {
                [resolved.dbField]: resolved.selectedOptionNum,
              })
            );
          }
        });
        await Promise.all(psHelper);
      }
    }
  } catch (e) {
    console.log("receive survey error");
    errorHandler(e, "receive survey error");
  }
};

export const timeout = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const payStartBonus = async (users, batch) => {
  let bangPrs = [];
  users.forEach((user) => {
    bangPrs.push(payBonus(user.mturkId, user.testAssignmentId, 1.0));
    bangPrs.push(
      Bonus.create({
        batch: batch._id,
        user: user._id,
        amount: 1.0,
        assignment: user.testAssignmentId,
      })
    );
  });
  await Promise.all(bangPrs);
};

const generateTeams = (roundGen, users, roundNumber, oldNicks) => {
  let teams = roundGen[roundNumber - 1].teams.map((team, index) => {
    let teamAnimals = [],
      teamUsers = [];
    team.users.forEach((user) => {
      let partner = users[user].realNick.slice();
      for (let i = 0; i < partner.length; i++) {
        if (partner[i] === partner[i].toUpperCase()) {
          index = i;
          break;
        }
      }
      teamAnimals.push(partner.slice(0, index));
    });
    let animals = randomAnimal
      .slice()
      .filter((x) => !teamAnimals.some((y) => y === x));
    let adjectives = randomAdjective.slice();
    for (let i = 0; i < team.users.length; i++) {
      let nickname, animal, adj;
      animals = animals.filter((x) => !teamAnimals.some((y) => y === x));
      while (true) {
        animal = chooseOne(animals);
        adj = chooseOne(adjectives);
        nickname = adj + animal;
        if (!oldNicks.some((x) => x === nickname)) {
          oldNicks.push(nickname);
          teamAnimals.push(animal);
          teamUsers.push({
            user: users[team.users[i]]._id,
            nickname: nickname,
            adjective: adj,
            animal: animal,
          });
          break;
        }
      }
    }
    return { users: teamUsers };
  });
  return teams;
};
// if exp is round:
// [3]
// [4]
// that round is unmasked with either 1 / 2's chat history
const roundRun = async (
  batch,
  users,
  rounds,
  i,
  oldNicks,
  teamSize,
  io,
  kickedUsers
) => {
  const teamFormat = batch.teamFormat;
  // for singleTeamed batches
  const reconveneBestCondition = batch.randomizeExpRound
    ? teamFormat === "single" && batch.expRounds[0] === i + 1
    : batch.numRounds === i + 1 && teamFormat === "single"; // if randomize, then check if it's the exp round, else, check if it's the last round
  const reconveneWorstCondition =
    teamFormat === "single" && batch.worstRounds.length
      ? batch.worstRounds[0] === i + 1
      : false;
  if (reconveneBestCondition && reconveneWorstCondition) {
    console.log("reconvene logic error: running worst round");
  }
  console.log(
    "reconvene best: ",
    reconveneBestCondition,
    "reconvene worst: ",
    reconveneWorstCondition
  );

  let roundType;
  if (
    (!reconveneWorstCondition && !reconveneBestCondition) ||
    batch.bestRoundFunction === "do not reconvene"
  ) {
    roundType = STANDARD;
  } else if (reconveneWorstCondition) {
    roundType = WORST;
  } else if (reconveneBestCondition) {
    roundType = BEST;
  }

  let task;

  if (roundType === WORST) {
    // worst round: we take one-before-last task
    task = batch.tasks[batch.tasks.length - 2];
  } else {
    task = batch.tasks[i];
  }

  let roundObject = {
    startTime: new Date(),
    number: i + 1,
    teams: [],
    status: task.hasPreSurvey ? "presurvey" : "active",
    endTime: null,
    unmaskedUsers: [],
  };
  let emptyChats = [];
  let chats;
  let teams;
  let prsHelper = [];
  switch (roundType) {
    case STANDARD:
      // if it is not the best or worst reconvening round of single-teamed batch
      // standard flow
      teams = generateTeams(batch.roundGen, users, i + 1, oldNicks);
      for (let j = 0; j < teamSize; j++) {
        emptyChats.push(makeNewChat([], batch, i, task));
      }
      chats = await Chat.insertMany(emptyChats);
      break;
    case BEST:
      // if batch is single-teamed and this is unmasked best exp round, we do not generate teams, but get them from the best round
      // also we do not generate chats and fake nicks
      const bestRoundResult = await bestRound(batch);
      const bestRoundIndex = bestRoundResult.bestRoundIndex;
      if (bestRoundIndex !== undefined) {
        // for setting scores field in DB
        const scores = bestRoundResult.scores;
        rounds.forEach((round, ind) => {
          rounds[ind].score = scores[ind] !== undefined ? scores[ind] : 0;
        });
        // setting expRounds = [bestRoundIndex, lastRoundIndex]
        prsHelper.push(
          Batch.updateOne(
            { _id: batch._id },
            { $set: { expRounds: bestRoundResult.expRounds } }
          )
        );
        const batchData = await Batch.findById(batch._id);
        const bestRound = batchData.rounds[bestRoundIndex];
        teams = bestRound.teams; // only one team
        const chatId = bestRound.teams[0].chat;
        const oldChat = await Chat.findById(chatId)
          .lean()
          .exec();
        const messages = oldChat.messages;
        const newChat = makeNewChat(messages, batch, i, task);
        const chat = await Chat.create(newChat);
        chats = [chat];
      } else {
        throw Error("Calculation of best round error");
      }
      break;

    case WORST:
      const worstRoundResult = await worstRound(batch);
      const worstRoundIndex = worstRoundResult.worstRoundIndex;
      if (worstRoundIndex !== undefined) {
        prsHelper.push(
          Batch.updateOne(
            { _id: batch._id },
            { $set: { worstRounds: worstRoundResult.worstRounds } }
          )
        );
        const batchData = await Batch.findById(batch._id);
        const worstRound = batchData.rounds[worstRoundIndex];
        teams = worstRound.teams;
        const chatId = worstRound.teams[0].chat;
        const oldChat = await Chat.findById(chatId)
          .lean()
          .exec();
        const messages = oldChat.messages;
        const newChat = makeNewChat(messages, batch, i, task);
        const chat = await Chat.create(newChat);
        chats = [chat];
      }
      break;
  }

  if (teams.length !== chats.length) {
    // happens when we are running batches with dynamic team size
    // we just generate empty chats like in standard flow
    chats = [];
    for (let j = 0; j < teamSize; j++) {
      emptyChats.push(makeNewChat([], batch, i, task));
    }
    chats = await Chat.insertMany(emptyChats);
  }

  teams.forEach((team, index) => {
    team.chat = chats[index]._id;
    team.users.forEach((user) => {
      prsHelper.push(
        User.findByIdAndUpdate(user.user, {
          $set: { fakeNick: user.nickname, currentChat: team.chat },
        })
      );
      return user;
    });
    return team;
  });
  await Promise.all(prsHelper);
  roundObject.teams = teams;
  rounds.push(roundObject);
  batch = await Batch.findByIdAndUpdate(batch._id, {
    $set: { rounds: rounds, currentRound: roundObject.number },
  })
    .lean()
    .exec();
  logger.info(module, batch._id + " : Begin round " + roundObject.number);
  io.to(batch._id.toString()).emit("refresh-batch", true);

  if (batch.hasPreSurvey && i === 0) {
    logger.info(module, batch._id + " : Begin pre-pre-survey");
    roundObject.status = "prepresurvey";
    batch = await Batch.findByIdAndUpdate(batch._id, {
      $set: { rounds: rounds },
    });
    io.to(batch._id.toString()).emit("prepre-survey", { rounds: rounds });
    await timeout(batch.surveyMinutes * 60000);
    roundObject.status = "active";
    const startTaskInfo = { rounds: rounds };
    batch = await Batch.findByIdAndUpdate(batch._id, { $set: startTaskInfo })
      .lean()
      .exec();
    io.to(batch._id.toString()).emit("start-task", startTaskInfo);
  }

  if (task.readingPeriods && task.readingPeriods.length) {
    try {
      for (let j = 0; j < task.readingPeriods.length; ++j) {
        const period = task.readingPeriods[j];
        const ind = j;
        logger.info(
          module,
          batch._id +
            ` : Begin reading period ${ind + 1} for round ${roundObject.number}`
        );
        roundObject.status = `readingPeriod${ind}`;
        const info = { rounds: rounds };
        batch = await Batch.findByIdAndUpdate(batch._id, { $set: info })
          .lean()
          .exec();
        io.to(batch._id.toString()).emit("reading-period", info);
        await timeout(period.time * 60000);
      }
    } catch (e) {
      console.log("RP error", e);
    }
  }

  if (task.hasPreSurvey) {
    logger.info(
      module,
      batch._id + " : Begin pre-survey for round " + roundObject.number
    );
    roundObject.status = "presurvey";
    batch = await Batch.findByIdAndUpdate(batch._id, {
      $set: { rounds: rounds },
    });
    io.to(batch._id.toString()).emit("pre-survey", { rounds: rounds });
    await timeout(batch.surveyMinutes * 60000);
  }
  roundObject.status = "active";
  const startTaskInfo = { rounds: rounds };
  batch = await Batch.findByIdAndUpdate(batch._id, { $set: startTaskInfo })
    .lean()
    .exec();
  io.to(batch._id.toString()).emit("start-task", startTaskInfo);
  await Batch.updateOne({ _id: batch._id }, { $set: { activePoll: null } });
  logger.info(
    module,
    batch._id + " : Begin task for round " + roundObject.number
  );
  io.to(batch._id.toString()).emit("refresh-batch", true);
  let stepsSumTime = 0;
  let polls = task.polls;
  if (!polls) {
    polls = [];
  }
  for (let j = 0; j < task.steps.length; j++) {
    const step = task.steps[j];
    let time = j === 0 ? step.time : step.time - task.steps[j - 1].time;
    await timeout(batch.roundMinutes * time * 60000);
    const pollInd = polls.findIndex((x) => Number(x.step) === j);
    if (pollInd > -1) {
      await Batch.updateOne(
        { _id: batch._id },
        { $set: { activePoll: pollInd } }
      );
      io.to(batch._id.toString()).emit("refresh-batch", true);
    }
    const stepMessage = {
      user: botId,
      nickname: "helperBot",
      message: "Step " + (j + 1) + ": " + step.message,
      time: new Date(),
    };
    let ps = [];
    teams.forEach((team) => {
      ps.push(
        Chat.findByIdAndUpdate(team.chat, {
          $addToSet: { messages: stepMessage },
        })
      );
      io.to(team.chat).emit("receive-message", stepMessage);
    });
    await Promise.all(ps);
    stepsSumTime = stepsSumTime + step.time;
  }

  // timeout for the time that is not in stepsTime
  await timeout(
    batch.roundMinutes * (1 - task.steps[task.steps.length - 1].time) * 60000
  );

  if (task.hasMidSurvey) {
    roundObject.status = "midsurvey";
    const midRoundInfo = { rounds: rounds };
    batch = await Batch.findByIdAndUpdate(batch._id, { $set: midRoundInfo })
      .lean()
      .exec();
    logger.info(
      module,
      batch._id + " : Begin survey for round " + roundObject.number
    );
    io.to(batch._id.toString()).emit("mid-survey", midRoundInfo);
    chats.forEach((chat) => {
      clearRoom(chat._id, io);
    });
    await timeout(batch.surveyMinutes * 60000);
  }
  if (batch.tasks[roundObject.number - 1].selectiveMasking) {
    try {
      await addUnmaskedPairs(
        batch,
        roundObject.number,
        batch.tasks.findIndex(
          (x, ind) => x.selectiveMasking && ind >= roundObject.number - 1
        )
      );
    } catch (e) {}
  }

  if (batch.hasPostSurvey && i === batch.numRounds - 1) {
    roundObject.status = "postsurvey";
    const postRoundInfo = { rounds: rounds };
    batch = await Batch.findByIdAndUpdate(batch._id, { $set: postRoundInfo })
      .lean()
      .exec();
    logger.info(
      module,
      batch._id + " : Begin post-survey for round " + roundObject.number
    );
    io.to(batch._id.toString()).emit("post-survey", postRoundInfo);
    await timeout(batch.surveyMinutes * 60000);
  }
  const [filledChats, roundSurveys] = await Promise.all([
    Chat.find({ _id: { $in: chats.map((x) => x._id) } })
      .lean()
      .exec(),
    Survey.find({
      batch: batch._id,
      round: i + 1,
      surveyType: { $in: ["presurvey", "midsurvey"] },
    })
      .select("user")
      .lean()
      .exec(),
  ]);
  for (const team of roundObject.teams) {
    for (const user of team.users) {
      const chat = filledChats.find(
        (x) => x._id.toString() === team.chat.toString()
      );
      const userSurveys = roundSurveys.filter(
        (x) => x.user.toString() === user.user.toString()
      );
      user.isActive = chat.messages.some(
        (x) => x.user.toString() === user.user.toString()
      );
      const userInDB = await User.findById(user.user);
      if (userInDB.batch === null) {
        continue;
      }
      if (
        batch &&
        !user.isActive &&
        !kickedUsers.some((id) => id === user.user.toString()) &&
        userInDB.batch.toString() === batch._id.toString()
      ) {
        await kickUser(user.user, batch._id, i + 1);
        kickedUsers.push(user.user.toString());
      }
    }
  }

  roundObject.endTime = new Date();
  roundObject.status = "completed";
  const endRoundInfo = { rounds: rounds };
  batch = await Batch.findByIdAndUpdate(batch._id, { $set: endRoundInfo })
    .lean()
    .exec();
  logger.info(module, batch._id + " : End round " + roundObject.number);
  io.to(batch._id.toString()).emit("end-round", endRoundInfo);
};

const kickUser = async (userId, batchId, kickedAfterRound) => {
  await Batch.findOneAndUpdate(
    { _id: batchId, "users.user": userId },
    {
      $set: {
        "users.$.isActive": false,
        "users.$.kickedAfterRound": kickedAfterRound,
      },
    }
  );
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        batch: null,
        realNick: null,
        currentChat: null,
        fakeNick: null,
        systemStatus: "hasbanged",
      },
    },
    { new: true }
  )
    .lean()
    .exec();
  io.to(user.socketId).emit("kick-afk", true);
  logger.info(
    module,
    batchId + " : user kicked for being AFK. Mturk ID: " + user.mturkId
  );
};

const makeNewChat = (messages, batch, i, task) => {
  return {
    batch: batch._id,
    messages: messages.concat({
      user: botId,
      nickname: "helperBot",
      time: new Date(),
      message: "Task: " + (task ? task.message : "empty"),
    }),
    pinnedContent: batch.tasks[i].pinnedContent || [],
  };
};
