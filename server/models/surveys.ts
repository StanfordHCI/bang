const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;
let  SurveySchema = new Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  batch: {type: mongoose.Schema.Types.ObjectId, ref: 'Batch'},
  questions: [{result: {type: String, required: true}}],
  mainQuestion: {
    expRound1: {result: {type: Number}},
    expRound2: {result: {type: Number}},
    partners: [String]
  },
  round: Number,
  isPost: Boolean
}, options);
export const Survey = mongoose.model('Survey', SurveySchema);
