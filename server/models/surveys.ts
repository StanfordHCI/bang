const options = {
	timestamps: true,
	toObject: {
		getters: true,
		virtuals: true
	}
};
import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;
let SurveySchema = new Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
		questions: [ { result: { type: String, required: true } } ],
		mainQuestion: {
			//Picking Rounds
			expRound1: Number,
			expRound2: Number,
			//Why these rounds?
			expRound3: String,
			//Partner preferences
			partners: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
			//Why this partner?
			partners2: String
		},
		round: Number,
		isPost: Boolean,
    surveyType: { type: String, enum: ['presurvey', 'midsurvey', 'final'], required: true },
	},
	options
);
export const Survey = mongoose.model('Survey', SurveySchema);
