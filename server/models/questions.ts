const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;
let  QuestionSchema = new Schema({
  questions: [String],
}, options);
export const Question = mongoose.model('Question', QuestionSchema);
