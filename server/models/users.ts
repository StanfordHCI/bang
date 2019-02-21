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
  token:  { type: String, required: true },
  mturkid:  { type: String, required: true },
  assignmentId:  { type: String, required: true },
  turkSubmitTo:  { type: String, required: true },
  connected:  { type: Boolean, required: true, default: true },
  lastConnect: Date,
  lastDisconnect: Date,
  //status: { type: String, enum: ['waiting', 'active'], default: 'waiting',required: true },
  batch: {type: mongoose.Schema.Types.ObjectId, ref: 'Batch'},
}, options);

export const User = mongoose.model('User', UserSchema);
