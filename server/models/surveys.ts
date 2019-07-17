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
    expRound1: Number,
    expRound2: Number,
    expRound3: String,
    partners: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    partners2: String
  },
  round: Number,
  isPost: Boolean
}, options);
export const Survey = mongoose.model('Survey', SurveySchema);
