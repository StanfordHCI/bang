import {User} from '../models/users'
import {Chat} from '../models/chats'

export const init = async function (data, socket, io, activeCounter) {
  try {
    let user;
    let token = data.token || '';
    user = await User.findOne({token: token}).populate('batch').populate('currentChat').lean().exec();
    if (!user) {
      console.log(data)
      if (!data.mturkId || !data.assignmentId || !data.hitId || !data.turkSubmitTo) {
        console.log('wrong credentials')
        return;
      }
      //user can be without token/with wrong token, but in our db
      user = await User.findOne({mturkId: data.mturkId}).populate('batch').populate('currentChat').lean().exec();
      if (!user) { //if not in db - create new
        user = await User.create({
          token: data.mturkId,
          mturkId: data.mturkId,
          assignmentId: data.assignmentId,
          turkSubmitTo: data.turkSubmitTo,
          status: 'waiting',
        })
      }
    }

    socket.mturkId = user.mturkId;
    socket.token = user.token;
    socket.assignmentId = user.assignmentId;
    socket.turkSubmitTo = user.turkSubmitTo;
    socket.userId = user._id;
    socket.join('waitroom');
    socket.emit('init-res', user);
    await User.findByIdAndUpdate(user._id, { $set: { connected : true, lastConnect: new Date(), socketId: socket.id, } })

    io.to('waitroom').emit('clients-active', activeCounter);
    if (activeCounter >= parseInt(process.env.TEAM_SIZE) ** 2) { //show join-to-batch button
      io.emit('can-join', true)
    }
  } catch (e) {
    console.log(e)
  }
}

export const disconnect = async function (reason, socket, io, activeCounter) {
  console.log('disconnect', reason)
  try {
    const user = await User.findByIdAndUpdate(socket.userId, { $set: { connected : false, lastDisconnect: new Date(), socketId: ''}})
      .populate('batch').lean().exec();
    io.to('waitroom').emit('clients-active', activeCounter);
    if (activeCounter < parseInt(process.env.TEAM_SIZE) ** 2) { //hide join-to-batch button
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
