const options = {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true
  },
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;

let UserSchema = new Schema({
  socketId:  { type: String},
  token:  { type: String, required: true, unique: true },
  systemStatus: { type: String, required: true, enum: ['willbang', 'hasbanged'], default: 'willbang'},
  mturkId:  { type: String, required: true, unique: true },
  testAssignmentId:  { type: String, required: true },
  mainAssignmentId:  { type: String },
  turkSubmitTo:  { type: String, },
  connected:  { type: Boolean, required: true, default: false },
  realNick: String,
  fakeNick: String,
  currentChat: {type: mongoose.Schema.Types.ObjectId, ref: 'Chat'},
  lastConnect: Date,
  lastCheckTime: Date,
  lastDisconnect: Date,
  isTest: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  //status: { type: String, enum: ['waiting', 'active'], default: 'waiting',required: true },
  batch: {type: mongoose.Schema.Types.ObjectId, ref: 'Batch'},
  // Fields for questions from issue https://github.com/StanfordHCI/bang/issues/457
  degree: {type: String, required: false, $enum: ['Less than High School', 'High school or equivalent', 'Some college',
      'Undergraduate degree', 'Graduate degree', 'Doctorate']},
  gender: {type: String, required: false, $enum: ['male', 'female', 'prefer not to say']},
  yearBorn: {type: Number, required: false},
  householdEarnings: {type: String, required: false, $enum: ['Less than $20,000', '$20,000 to $34,999',
      '$35,000 to $49,999', '$50,000 to $74,999', '$75,000 to $99,999', 'Over $100,000']},
  hispanicLatinoSpanish: {type: String, required: false, $enum: ['Yes', 'No']},
  race: {type: String, required: false, $enum: ['American Indian or Alaska Native', 'Asian', 'Black or African American',
      'Native Hawaiian or Other Pacific Islander', 'White', 'Other']},
  maritalStatus: {type: String, required: false, $enum: ['Single', 'Married', 'Live with Partner', 'Separated',
      'Divorced', 'Widowed']},
  occupation: {type: String, required: false},
  occupationTime: {type: String, required: false,},
  juryExperience: {type: String, required: false, $enum: ['Yes', 'No']},
  juryHowManyTimes: {type: String, required: false},
  civilCriminal: {type: String, required: false, $enum: ['Civil', 'Criminal']},
  verdictReached: {type: String, required: false, $enum: ['Yes', 'No']},
  religionGuidance: {type: String, required: false, $enum: ['No guidance', 'Some guidance', 'Quite a bit of guidance',
      'A great deal of guidance']},
  politicalView: {type: String, required: false, $enum: ['Extremely Liberal', 'Liberal', 'Slightly Liberal',
      'Moderate; Middle of the Road', 'Slightly Conservative', 'Conservative', 'Extremely Conservative']},
}, options);

export const User = mongoose.model('User', UserSchema);
