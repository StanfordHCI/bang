const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;
let  SurveyTemplateSchema = new Schema({
  name: {type: String, required: true},
  questions: [{
    question: {type: String, required: true},
    type: {type: String, required: true},
    options: [{option: {type: String, required: true}}],
    selectOptions: [{value: {type: String, required: true}, label: {type: String, required: true}}]
  }]
}, options);
export const SurveyTemplate = mongoose.model('SurveyTemplate', SurveyTemplateSchema);
