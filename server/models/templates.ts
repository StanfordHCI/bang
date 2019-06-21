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
  tasks: [{
    message: {type: String, required: true},
    steps: [{
      time: {type: Number, required: true},
      message: {type: String, required: true}
    }],
    survey: [{
      question: {type: String, required: true},
      type: {type: String, required: true},
      options: [{option: {type: String, required: true}}]
    }]
  }],
}, options);
export const Template = mongoose.model('Template', TemplateSchema);
