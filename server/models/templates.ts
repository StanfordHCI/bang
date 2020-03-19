const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;
let  TemplateSchema = new Schema({
  name: {type: String, required: true},
  teamSize: {type: Number, required: true},
  roundMinutes: {type: Number, required: true},
  surveyMinutes: {type: Number, required: true},
  numRounds: {type: Number, required: true},
  HITTitle: String,
  numExpRounds: {type: Number, required: true},
  tasks: [{
    hasPreSurvey: {type: Boolean, required: true, default: false},
    hasMidSurvey: {type: Boolean, required: true, default: false},
    hasPinnedContent: {type: Boolean, required: true, default: false},
    preSurvey: [{
      question: {type: String, required: true},
      type: {type: String, required: true},
      options: [{option: {type: String, required: true}}],
      selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}],
      randomOrder: {type: Boolean, default: false},
      to: {type: Number},
      from: {type: Number},
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
      selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}],
      randomOrder: {type: Boolean, default: false},
      to: {type: Number},
      from: {type: Number},
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
      type: {type: String, $enum: ['foreperson', 'casual']},
      // options: [{option: {type: String,}}],
      // selectOptions: [{value: {type: String}, label: {type: String,}}],
      questions: [{text:{type: String}, type: {type: String, enum: ['primary', 'text', 'single', 'checkbox']}, options:[{option: {type: String}}],
        selectOptions: [{value: {type: String}, label: {type: String,}}]}],
      threshold: {type: Number, required: false},
      step: { type: Number, required: true },
    }],
  }],
  teamFormat: {type: String, required: true},
  hasPostSurvey: {type: Boolean, required: true, default: false},
  hasPreSurvey: {type: Boolean, required: true, default: false},
  postSurvey: [{
    question: {type: String, required: true},
    type: {type: String, required: true},
    options: [{option: {type: String, required: true}}],
    selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}],
    randomOrder: {type: Boolean, default: false},
    to: {type: Number},
    from: {type: Number},
  }],
  preSurvey: [{
    question: {type: String, required: true},
    type: {type: String, required: true},
    options: [{option: {type: String, required: true}}],
    selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}],
    randomOrder: {type: Boolean, default: false},
    to: {type: Number},
    from: {type: Number},
  }],
  cases: [{
    versions: [{
      parts: [{
        text: { type: String, required: true },
        time: { type: Number, required: true },
      }]
    }]
  }],
}, options);
export const Template = mongoose.model('Template', TemplateSchema);
