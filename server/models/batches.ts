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
    status: { type: String, enum: ['completed', 'active', 'waiting'], default: 'waiting' },
    teams: [{
      users: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        nickname: {type: String, required: true}
      }],
      chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true},
    }],
    number: Number,
  }],
  preChat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat'},
  currentRound: {type: Number, required: true, default: 0},
  startTime: Date,
  teamSize: {type: Number, required: true},
  roundMinutes: {type: Number, required: true},
  starterSurveyOn: {type: Boolean, required: true, default: false},
  midSurveyOn: {type: Boolean, required: true, default: false},
  blacklistOn: {type: Boolean, required: true, default: false},
  qFifteenOn: {type: Boolean, required: true, default: false},
  qSixteenOn: {type: Boolean, required: true, default: false},
  teamfeedbackOn:{type: Boolean, required: true, default: false},
  psychologicalSafetyOn: {type: Boolean, required: true, default: false},
  checkinOn: {type: Boolean, required: true, default: false},
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
