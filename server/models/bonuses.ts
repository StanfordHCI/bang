const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;
let  BonusSchema = new Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  batch: {type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true},
  amount: {type: Number, required: true},
  assignment: {type: String, required: true}
}, options);
export const Bonus = mongoose.model('Bonus', BonusSchema);
