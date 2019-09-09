/** postsurveyform.js
 *  front-end
 * 
 *  final survey that asks who duplicate partners were and when 
 *  
 *  renders:  
 *    1. at batch-end for worker
 *    2. when viewing final results for admin
 * 
 *  called by:
 *    1. Batch.js (for worker view)
 *    2. BatchResult.js (for admin results view)
 *    
 */

import React from 'react';
import { Col, Button, ButtonToolbar, Row, Container } from 'reactstrap';
import { connect } from 'react-redux';
import { Field, FieldArray, reduxForm, formValueSelector, change } from 'redux-form';
import { bindActionCreators } from 'redux';
import { renderField } from 'Components/form/Text';
import renderSelectField from 'Components/form/Select';
import renderMultiSelectField from 'Components/form/MultiSelect';
import {shuffle} from "../utils";

class PostSurveyForm extends React.Component {
	constructor() {
		super();
		this.state = {
			qOptions: [
				{ value: 1, label: '1' },
				{ value: 2, label: '2' },
				{ value: 3, label: '3' },
				{ value: 4, label: '4' }
			],
			uOptions: [],
			roster: [],
			sOptions: [],
			firstNick: 'test',
			roundsForSurvey: [0, 1],
		};
	}

	componentDidMount() {
		const batch = this.props.batch;
		const singleTeam = batch.teamFormat === 'single';
		let singleTeamInfo, surveyRounds, expRound1ActiveUsers;
		if (singleTeam) {
      singleTeamInfo = this.generateSingleTeamInfo();
      surveyRounds = singleTeamInfo.roundsForSurvey.map(x => x).sort((a, b) => a - b);
      expRound1ActiveUsers = [];
    }
		let qOptions = [], uOptions = [];
		for (let i = 0; i < batch.numRounds; i++) {
			qOptions[i] = { value: i + 1, label: (i + 1).toString() };
		}
		batch.rounds.forEach((round, index) => {
			let roundRoster = '';
			const roundPrefix = index < 10 ? '0' + index : index; //to solve problem with same option values (same users with different nicks)
			const userId = this.props.user._id.toString();
			const team = round.teams.find((x) => x.users.some((y) => y.user.toString() === userId));
			team.users.forEach((user) => {
				const batchUser = batch.users.find(x => x.user.toString() === user.user.toString());
				if ((user.user.toString() !== userId && !(!batchUser.isActive && batchUser.kickedAfterRound <= index + 1)) ||
					(singleTeam && index === surveyRounds[1] && expRound1ActiveUsers.indexOf(batchUser) > -1)) { // for correct rosters of surveyRounds
					uOptions.push({
						value: roundPrefix + user.user,
						label: user.nickname + ' (round ' + (index + 1) + ')'
					});
					if (singleTeam && index === surveyRounds[0]) {
						// There are two surveyRounds(rounds on which the singleTeamQuestion is based)
						// we add all users who haven't been kicked after min(SurveyRound[0], surveyRound[1]) to max(SurveyRound[0], surveyRound[1])
						expRound1ActiveUsers.push(batchUser)
					}
          roundRoster = roundRoster + (batch.maskType === 'unmasked' ? batch.users.find(x => x.user === user.user).nickname : user.nickname) + ' ';
				}
			});
			if (singleTeam) {
        for (let i = 0; i <= index; ++i) { // in order to make the order of different rounds different from each other
          roundRoster = shuffle(roundRoster.split(' ')).join(' ');
        }
      }
			let roster = this.state.roster;
			roster[index] = roundRoster;
			this.setState({roster: roster})
		});
		const actualPartnerName = singleTeam ? singleTeamInfo.actualPartnerName : 'test';
		const sOptions = singleTeam ? this.nicksFromRoster(this.state.roster, singleTeamInfo.roundsForSurvey[1]).map((x, ind, arr) =>
    {return {value: `${x} ${actualPartnerName} ${arr.length}`, label: x}}) : [{value: 'test', label: 'test'}];
		this.setState({ qOptions: qOptions, uOptions: uOptions, sOptions: sOptions, });
		if (singleTeam) {
		  this.setState({firstNick: singleTeamInfo.expPersonRound1Nick, roundsForSurvey: singleTeamInfo.roundsForSurvey })
    }
	}

	// picks 2 random non-experimental rounds.
	// takes 1 person from first round
	// takes all persons from second round
	// generates options from the second one
	// returns {expPersonRound1: ... , sOptions: ... , actualPartnerName: ...}
	generateSingleTeamInfo() {
		const batch = this.props.batch;
		if (batch.teamFormat !== 'single') {
		  return null;
    }
		const userId = this.props.user._id.toString();
		const [expRounds, worstRounds] = [batch.expRounds.map(x => x - 1), batch.worstRounds.map(x => x - 1)];
		const numRounds = batch.numRounds;
		const allRounds = Array.from(Array(numRounds).keys());
		const nonExpRounds = allRounds.filter(x => expRounds.indexOf(x) < 0 && worstRounds.indexOf(x) < 0);
		const shuffledNonExpRounds = shuffle(nonExpRounds);
		let roundsForSurvey = [];
		roundsForSurvey.push(shuffledNonExpRounds[0], shuffledNonExpRounds[1]);
		const expPersonRound1 = batch.rounds[roundsForSurvey[0]].teams[0].users.find(x => x.user.toString() !== userId &&
			!batch.users.find(y => y.user.toString() === x.user.toString()).kickedAfterRound); // finds a person in round N which wasn't kicked at all
		let actualPartnerName;
		try {
			actualPartnerName = batch.rounds[roundsForSurvey[1]].teams[0].users.find(x => x.user === expPersonRound1.user).nickname;
		}
		catch (e) {
			console.log(e);
			return {};
		}
		return {expPersonRound1Nick: expPersonRound1.nickname, roundsForSurvey: roundsForSurvey, actualPartnerName: actualPartnerName}
	}

	nicksFromRoster = (roster, num) => {
		const roundRoster = roster[num];
		return roundRoster.split(' ').filter(x => x !== '');
	};
	render() {
		const { invalid, batch, user } = this.props;
		let surveysTotal = 0;
		batch.tasks.map(task => {surveysTotal += task.hasMidSurvey + task.hasPreSurvey});

		return (
			<div>
				<form className="form" style={{ paddingBottom: '5vh' }} onSubmit={this.props.handleSubmit}>
					<Container>
						<Row>
							<Col>
								<div className="form__panel">
									<div className="form__form-group">
										{batch.withRoster && <div>
											<p>Team Rosters</p>
											{this.state.roster.map((round, index) => {
												return (<p>Round {index + 1}: {this.state.roster[index]}</p>)
											})}
										</div>}
										<label className="form__form-group-label">
											<p>Surveys completed: {batch.surveyCounter}/{surveysTotal}</p>
											<br/>
										</label>
										{batch.teamFormat !== 'single' &&
										<div>
											<label className="form__form-group-label">
												<p>You actually worked with the same team in some of the previous rounds, though their names may have appeared different.</p>
												<p>
													In which rounds do you think that you worked with the same people?
												</p>
											</label>
											<div className="form__form-group-field">
												<Field
													name="mainQuestion.expRound1"
													component={renderSelectField}
													type="text"
													options={this.state.qOptions}
												/>
												<Field
													name="mainQuestion.expRound2"
													component={renderSelectField}
													type="text"
													options={this.state.qOptions}
												/>
											</div>
										</div>}
									</div>
									{batch.teamFormat !== 'single' &&
										<div>
											<div className="form__form-group">
												<label className="form__form-group-label">
													<p>Why do you think it was these rounds?</p>
												</label>
												<div className="form__form-group-field">
													<Field name="mainQuestion.expRound3" component={renderField} type="text" />
												</div>
											</div>

											<div className="form__form-group" style={{marginBottom: '50px'}}>
												<label className="form__form-group-label">
													What partners do you prefer to work with in the future?
												</label>
												<div className="form__form-group-field">
													<Field
														name={'mainQuestion.partners'}
														component={renderMultiSelectField}
														options={this.state.uOptions}
													/>
												</div>
											</div>

											<div className="form__form-group">
												<label className="form__form-group-label">
													Why do you prefer these partners?
												</label>
												<div className="form__form-group-field">
													<Field name={'mainQuestion.partners2'} component={renderField} />
												</div>
											</div>
										</div>}
									{batch.teamFormat === 'single' &&
									<div className="form__form-group">
										<label className="form__form-group-label">
											We didn't tell you this, but in rounds {this.state.roundsForSurvey[0] + 1} and {this.state.roundsForSurvey[1] + 1} you worked with the same people.
											Their names appeared differently between these two rounds.
											In team {this.state.roundsForSurvey[0] + 1}, one partner's name was {this.state.firstNick}. What was their name in round {this.state.roundsForSurvey[1] + 1}?
										</label>
										<div className="form__form-group">
											<Row>
												<Col>
													<label className="form__form-group-label">
														Name in round {this.state.roundsForSurvey[0] + 1}:
													</label>
												</Col>
												<Col>
													<label className="form__form-group-label">
														Name in round {this.state.roundsForSurvey[1] + 1}:
													</label>
												</Col>
											</Row>
											<Row>
												<Col>
													<div>
														<label className="form__form-group-label">
															{this.state.firstNick}
														</label>
													</div>
												</Col>
												<Col>
													<div className="form__form-group-field">
														<Field
															name={'singleTeamQuestion.result'}
															component={renderSelectField}
															options={this.state.sOptions}
														/>
													</div>
												</Col>
											</Row>
										</div>
										<div className="form__form-group">
											<label className="form__form-group-label">
												Why did you choose that?
											</label>
											<div className="form__form-group-field">
												<Field name="singleTeamQuestion.result1" component={renderField} type="text" />
											</div>
										</div>
									</div>
									}
								</div>
							</Col>
						</Row>
						<Row style={{ marginTop: '100px' }}>
							<Col>
								<ButtonToolbar className="mx-auto form__button-toolbar">
									<Button color="primary" size="sm" type="submit" disabled={invalid}>
										Submit
									</Button>
								</ButtonToolbar>
							</Col>
						</Row>
					</Container>
				</form>
			</div>
		);
	}
}

const validate = (values, props) => {
	const errors = { mainQuestion: {}, singleTeamQuestion: {} };
	if (!values.mainQuestion) {
		errors.mainQuestion.expRound1 = 'required';
		errors.mainQuestion.expRound2 = 'required';
		errors.mainQuestion.expRound3 = 'required';
		errors.mainQuestion.partners = 'required';
		errors.mainQuestion.partners2 = 'required';
	} else {
		if (
			(props.batch.teamSize > 1 && !values.mainQuestion.partners) ||
			!values.mainQuestion.partners ||
			!values.mainQuestion.partners.length
		) {
			errors.mainQuestion.partners = 'required';
		}
		if (!values.mainQuestion.expRound1) {
			errors.mainQuestion.expRound1 = 'required';
		}
		if (!values.mainQuestion.expRound2) {
			errors.mainQuestion.expRound2 = 'required';
		}
		if (!values.mainQuestion.expRound3) {
			errors.mainQuestion.expRound3 = 'required';
		}
		if (values.mainQuestion.expRound2 === values.mainQuestion.expRound1) {
			errors.mainQuestion.expRound2 = 'invalid';
		}
	}
	if (!values.singleTeamQuestion) {
		errors.singleTeamQuestion.result = 'required'
	}
	return errors;
};

PostSurveyForm = reduxForm({
	form: 'PostSurveyForm',
	enableReinitialize: true,
	destroyOnUnmount: true,
	touchOnChange: true,
	validate
})(PostSurveyForm);

const selector = formValueSelector('PostSurveyForm');

function mapStateToProps(state) {
	return {
		user: state.app.user
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(PostSurveyForm);
