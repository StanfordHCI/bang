const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;

let UserSchema = new Schema({
  socketId:  { type: String},
  token:  { type: String, required: true, unique: true },
  systemStatus: { type: String, required: true, enum: ['willbang', 'hasbanged'], default: 'willbang'},
  mturkId:  { type: String, required: true, unique: true },
  assignmentId:  { type: String, required: true },
  turkSubmitTo:  { type: String, required: true },
  connected:  { type: Boolean, required: true, default: true },
  realNick: String,
  fakeNick: String,
  currentChat: {type: mongoose.Schema.Types.ObjectId, ref: 'Chat'},
  lastConnect: Date,
  lastCheckTime: Date,
  lastDisconnect: Date,
  //status: { type: String, enum: ['waiting', 'active'], default: 'waiting',required: true },
  batch: {type: mongoose.Schema.Types.ObjectId, ref: 'Batch'},
}, options);

export const User = mongoose.model('User', UserSchema);
