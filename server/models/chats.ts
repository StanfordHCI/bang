const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;

let ChatSchema = new Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  messages: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    nickname: { type: String, required: true},
    message: { type: String, required: true},
    time: { type: Date, required: true},
  }],
  status: String
}, options);
export const Chat = mongoose.model('Chat', ChatSchema);
