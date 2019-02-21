import {User} from '../models/users'
import {Chat} from '../models/chats'
import {Batch} from '../models/batches'

export const joinBatch = async function (data, socket, io) {
  try {
    let batch = await Batch.findById(data.batch).lean().exec();
    if (batch.users.length < batch.teamSize ** 2) { //join to batch
      await Promise.all([
        Batch.findByIdAndUpdate(data.batch, { $addToSet: { users: {user: data.user}} }),
        User.findByIdAndUpdate(data.user, { $set: { batch: data.batch} })
      ])
      socket.join(batch.currentChat)
    }
    if (batch.users.length === batch.teamSize ** 2 - 1) { //start batch

    }


  } catch (e) {
    console.log(e)
  }
}


