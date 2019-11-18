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
		questions: [ { result: { type: String, required: true }, number: Number, teammate: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } } ],
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
		singleTeamQuestion: {
			chosenPartnerName: String,
			actualPartnerName: String,
			result1: String,
			numOptions: Number,
		},
		round: Number,
		isPost: Boolean, //deprecated, used only to show old results
    surveyType: { type: String, enum: ['presurvey', 'midsurvey', 'postsurvey', 'final', 'poll', 'prepresurvey'], required: true }, //should be used instead of isPost
		pollInd: { type: Number, required: false, default: 0 }, // for poll type surveys only
	},
	options
);
export const Survey = mongoose.model('Survey', SurveySchema);
