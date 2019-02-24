import {User} from '../models/users'
import {Chat} from '../models/chats'

export const auth = async function (data, socket, io) {
  try {
    let user;
    if (data.token) {
      user = await User.findOne({token: data.token}).populate({path: 'batch'}).lean().exec();
    } else {
      if (!data.mturkId || !data.assignmentId || data.hitId || !data.turkSubmitTo) {
        return;
      }
      user = await User.create({
        token: data.mturkId,
        mturkid: data.mturkId,
        assignmentId: data.assignmentId,
        turkSubmitTo: data.turkSubmitTo,
        status: 'waiting',
      }).lean().exec()
    }
    socket.mturkId = user.mturkId;
    socket.token = user.token;
    socket.assignmentId = user.assignmentId;
    socket.turkSubmitTo = user.turkSubmitTo;
    socket.userId = user._id;
    socket.join('waitroom');
    socket.emit('init', user);
    await User.findByIdAndUpdate(user._id, { $set: { connected : true, lastConnect: new Date(), socketId: socket.id, } })

    const activeUsers = io.sockets.clients();
    if (activeUsers.length >= parseInt(process.env.TEAM_SIZE) ** 2) { //show join-to-batch button
      io.emit('can-join', true)
    }
  } catch (e) {
    console.log(e)
  }
}

export const disconnect = async function (socket, io) {
  try {
    const user = await User.findByIdAndUpdate(socket.userId, { $set: { connected : false, lastDisconnect: new Date(), socketId: ''}})
      .populate('batch').lean().exec();
    const activeUsers = io.sockets.clients();
    if (activeUsers.length < parseInt(process.env.TEAM_SIZE) ** 2) { //hide join-to-batch button
      io.emit('cant-join', true)
    }
    if (user.batch.status === 'active ') {
      console.log('stop batch')
    }
  } catch (e) {
    console.log(e)
  }
}

export const sendMessage = async function (data, socket, io) {
  try {
    const newMessage = {
      user: socket.userId,
      nickname: data.nickname,
      message: data.message,
      time: new Date()
    }
    await Chat.findByIdAndUpdate(data.chat, { $addToSet: { messages: newMessage} })
    io.to(data.chat).emit('receive-message', newMessage);
  } catch (e) {
    console.log(e)
  }
}
