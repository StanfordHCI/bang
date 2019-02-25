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
  socketId:  { type: String, unique: true},
  token:  { type: String, required: true, unique: true },
  mturkId:  { type: String, required: true, unique: true },
  assignmentId:  { type: String, required: true },
  turkSubmitTo:  { type: String, required: true },
  connected:  { type: Boolean, required: true, default: true },
  currentNickname: String,
  lastConnect: Date,
  lastDisconnect: Date,
  //status: { type: String, enum: ['waiting', 'active'], default: 'waiting',required: true },
  batch: {type: mongoose.Schema.Types.ObjectId, ref: 'Batch'},
}, options);

export const User = mongoose.model('User', UserSchema);
