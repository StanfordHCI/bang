const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;
let  BatchSchema = new Schema({
  status: { type: String, enum: ['completed', 'active', 'waiting'], default: 'waiting' },
  users: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  }],
  rounds: [{
    startTime: Date,
    endTime: Date,
    teams: [{
      users: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        nickname: {type: String, required: true}
      }],
      chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true},
    }],
    number: Number,
  }],
  currentChat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true},
  currentRound: {type: Number, required: true},
  startTime: Date,
  teamSize: {type: Number, required: true},
  starterSurveyOn: {type: Boolean, required: true},
  midSurveyOn: {type: Boolean, required: true},
  blacklistOn: {type: Boolean, required: true},
  qFifteenOn: {type: Boolean, required: true},
  qSixteenOn: {type: Boolean, required: true},
  teamfeedbackOn:{type: Boolean, required: true},
  psychologicalSafetyOn: {type: Boolean, required: true},
  checkinOn: {type: Boolean, required: true},
  condition: { type: String, enum: ['control', 'treatment'], default: 'control',required: true },
  format: [{type: Number, required: true}],
  experimentRound: {type: Number, required: true},
  numRounds: {type: Number, required: true},
  tasks: [{
    name: {type: String, required: true},
    steps: [{
      time: {type: Number, required: true},
      message: {type: String, required: true}
    }],
    url: {type: String, required: true},
  }],
  taskJSON: {},
}, options);
export const Batch = mongoose.model('Batch', BatchSchema);
