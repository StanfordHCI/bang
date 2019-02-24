import {User} from '../models/users'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'
import {clearRoom, makeName} from './utils'

export const joinBatch = async function (data, socket, io) {
  try {
    let batch = await Batch.findById(data.batch).lean().exec();
    if (batch.users.length < batch.teamSize ** 2) { //join to batch
      const nickname = makeName();
      await Promise.all([
        Batch.findByIdAndUpdate(data.batch, { $addToSet: { users: {user: data.user}} }),
        User.findByIdAndUpdate(data.user, { $set: { batch: data.batch, currentNickname: nickname, currentChat: batch.preChat} })
      ])
      socket.join(batch.preChat) //chat room
      socket.join(batch._id) //common room, not chat
      socket.emit('joined', {chat: batch.preChat, nickname: nickname});
    }
    if (batch.users.length === batch.teamSize ** 2 - 1) { //start batch
      clearRoom('waitroom', io);
      clearRoom(batch.preChat, io);
      await startBatch(batch, socket, io)
    }

  } catch (e) {
    console.log(e)
  }
}


const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const generateTeamUser = (user) => {
  const nickname = makeName();
  return {user: user._id, nickname: nickname, socketId: user.socketId}
}

const startBatch = async function (batch, socket, io) {
  try {
    const users = await User.find({batch: batch._id, connected: true}).lean().exec();
    if (users.length != batch.teamSize ** 2) {
      console.log('wrong users length') // do something?
    }
    io.to(batch._id).emit('start-batch', true);
    batch = await Batch.findByIdAndUpdate(batch._id, {$set: {status: 'active', startTime: new Date()}})
    const teamSize = batch.teamSize;
    let rounds = [];

    for (let i = 0; i < batch.numRounds; i++) {
      let roundObject = {startTime: new Date(), number: i + 1, teams: []};
      let teams = [], emptyChats = [];
      for (let j = 0; j < teamSize; j++) { //simple gen for tests
        const teamUsers = users.splice(j * teamSize, (j+1) * teamSize -1).map(x => generateTeamUser(x));
        teams.push({users: teamUsers});
        emptyChats.push({batch: batch._id, messages: []})
      }
      const chats = await Chat.insertMany(emptyChats).lean().exec();
      let prsHelper = [];
      teams.forEach((team, index) => {
        team.chat = chats[index]._id;
        team.users.forEach(user => {
          prsHelper.push(User.findByIdAndUpdate(user._id, {$set: {currentNickname: user.nickname, currentChat: team.chat}}));
          const userSocket = io.sockets.connected[user.socketId];
          userSocket.join(team.chat);
          delete user.socketId;
          return user;
        })
        return team;
      })
      roundObject.teams = teams;
      rounds.push(roundObject);
      prsHelper.push(Batch.findByIdAndUpdate(batch._id, {$set: {rounds: rounds, currentRound: roundObject.number}}));
      await Promise.all(prsHelper);
      io.to(batch._id).emit('start-round', roundObject);
      //tasks logic
      //...
      await timeout(batch.roundMinutes * 1000);
      io.to(batch._id).emit('end-round', roundObject.number);
      chats.forEach(chat => {
        clearRoom(chat._id, io)
      })
      //survey logic
      //.....
      await timeout(batch.roundMinutes * 333);

    }

  } catch (e) {
    console.log(e)
  }
}
