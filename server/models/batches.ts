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
    joinDate: {type: Date, required: true},
    isActive: {type: Boolean, default: true, required: true},
    kickedAfterRound: Number,
    gender: {type: String, required: false, $enum: ['male', 'female', 'prefer not to say']}
  }],
  roundSurvey: [{type: String, required: true}],
  rounds: [{
    startTime: Date,
    endTime: Date,
    status: { type: String, enum: ['completed', 'active', 'presurvey', 'midsurvey', 'prepresurvey'], default: 'presurvey' },
    teams: [{
      users: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        nickname: {type: String, required: true},
      }],
      chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true},
    }],
    number: Number,
    score: {type: Number, default: 0},
  }],
  templateName: {type: String, required: true},
  preChat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat'},
  currentRound: {type: Number, required: true, default: 0},
  startTime: Date,
  teamSize: {type: Number, required: true},
  roundMinutes: {type: Number, required: true},
  surveyMinutes: {type: Number, required: true},
  expRounds: [],
  numRounds: {type: Number, required: true},
  tasks: [{
    hasPreSurvey: {type: Boolean, required: true, default: false},
    hasMidSurvey: {type: Boolean, required: true, default: false},
    preSurvey: [{
      question: {type: String, required: true},
      type: {type: String, required: true},
      options: [{option: {type: String, required: true}}],
      selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}]
    }],
    message: {type: String, required: true},
    steps: [{
      time: {type: Number, required: true},
      message: {type: String, required: true}
    }],
    survey: [{
      question: {type: String, required: true},
      type: {type: String, required: true},
      options: [{option: {type: String, required: true}}],
      selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}]
    }],
    pinnedContent: [{
      text: {type: String, required: true},
      link: {type: String},
    }],
    readingPeriods: [{
      time: {type: Number, required: true},
      message: {type: String, required: true},
    }],
    selectiveMasking: {type: Boolean, default: false},
    polls: [{
      text: {type: String},
      type: {type: String, $enum: ['foreperson', 'casual'], required: true},
      options: [{option: {type: String,}}],
      selectOptions: [{value: {type: String}, label: {type: String,}}],
      threshold: {type: Number, required: false},
      questionType: {type: String, $enum: ['single', 'multiple']}, // foreperson polls are always counted as single
    }],
  }],
  midQuestions: [String],
  HITId: {type: String, },
  HITTitle: String,
  maskType: {type: String, required: true, $enum: ['masked', 'unmasked']},
  note: {type: String, },
  roundGen: [{teams: [{users: [Number]}]}],
  withAvatar: {type: Boolean, default: false, required: true},
  withRoster: {type: Boolean, default: false, required: true},
  withAutoStop: {type: Boolean, default: true, required: true},
  rememberTeamOrder: {type: Boolean, default: false, required: true},
  teamFormat: {type: String, required: true},
  bestRoundFunction: {type: String, $enum: ['highest', 'lowest', 'average', 'random']},
  randomizeExpRound: {type: Boolean, default: false},
  worstRounds: [], // [worst round, reconvening of worst round]; (Math.max.apply(null, worstRounds) === number of reconvening round) MUST BE TRUE
  reconveneWorstRound: {type: Boolean, default: false},
  hasPostSurvey: {type: Boolean, default: false},
  hasPreSurvey: {type: Boolean, default: false},
  postSurvey: [{
    question: {type: String, required: true},
    type: {type: String, required: true},
    options: [{option: {type: String, required: true}}],
    selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}]
  }],
  preSurvey: [{
    question: {type: String, required: true},
    type: {type: String, required: true},
    options: [{option: {type: String, required: true}}],
    selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}]
  }],
  unmaskedPairs: [[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}, {type: mongoose.Schema.Types.ObjectId, ref: 'User'}]],
}, options);
export const Batch = mongoose.model('Batch', BatchSchema);
