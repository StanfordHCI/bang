import {User} from '../models/users'
import {Chat} from '../models/chats'

export const init = async function (data, socket, io) {
  try {
    let user;
    if (data.token) {
      user = await User.findOne({token: data.token}).populate('batch').populate('currentChat').lean().exec();
      if (!user) {
        console.log('wrong user')
        return;
      }
    } else {
      if (!data.mturkId || !data.assignmentId || !data.hitId || !data.turkSubmitTo) {
        console.log('wrong credentials')
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
    socket.emit('init-res', user);
    await User.findByIdAndUpdate(user._id, { $set: { connected : true, lastConnect: new Date(), socketId: socket.id, } })

    const activeUsers = io.sockets.clients();
    io.to('waitroom').emit('clients', activeUsers);
    if (activeUsers.length >= parseInt(process.env.TEAM_SIZE) ** 2) { //show join-to-batch button
      io.emit('can-join', true)
    }
  } catch (e) {
    console.log(e)
  }
}

export const disconnect = async function (reason, socket, io) {
  console.log('disconnect', reason)
  try {
    const user = await User.findByIdAndUpdate(socket.userId, { $set: { connected : false, lastDisconnect: new Date(), socketId: ''}})
      .populate('batch').lean().exec();
    const activeUsers = io.sockets.clients();
    if (activeUsers.length < parseInt(process.env.TEAM_SIZE) ** 2) { //hide join-to-batch button
      io.emit('cant-join', true)
    }
    if (user && user.batch && user.batch.status === 'active ') {
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
