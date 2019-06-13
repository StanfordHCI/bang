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
    nickname: {type: String, required: true},
    joinDate: {type: Date, required: true}
  }],
  roundSurvey: [{type: String, required: true}],
  rounds: [{
    startTime: Date,
    endTime: Date,
    status: { type: String, enum: ['completed', 'active', 'waiting'], default: 'waiting' },
    teams: [{
      users: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        nickname: {type: String, required: true},
      }],
      chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true},
    }],
    number: Number,
  }],
  templateName: {type: String, required: true},
  preChat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat'},
  currentRound: {type: Number, required: true, default: 0},
  startTime: Date,
  teamSize: {type: Number, required: true},
  roundMinutes: {type: Number, required: true},
  surveyMinutes: {type: Number, required: true},
  experimentRound1: {type: Number, },
  experimentRound2: {type: Number, },
  numRounds: {type: Number, required: true},
  tasks: [{
    message: {type: String, required: true},
    steps: [{
      time: {type: Number, required: true},
      message: {type: String, required: true}
    }],
  }],
  midQuestions: [String],
  HITId: {type: String, },
  HITTitle: String,
  maskType: {type: String, required: true, $enum: ['masked', 'unmasked']},
  note: {type: String, },
  roundGen: [{teams: [{users: [Number]}]}]
}, options);
export const Batch = mongoose.model('Batch', BatchSchema);
