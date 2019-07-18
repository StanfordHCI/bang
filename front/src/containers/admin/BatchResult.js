/** batchresult.js
 *  front-end
 * 
 *  admin view of a batch's results
 *  
 *  renders:  
 *    1. when admin is looking at batch
 * 
 *  called by:
 *    1. router.js
 */

import React from 'react';
import { Card, CardBody, Col, Row, Container, Table } from 'reactstrap';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { loadBatchResult } from 'Actions/admin';
import Select from 'react-select';
import Chat from '../Chat';
import moment from 'moment';
import PostSurveyForm from '../PostSurveyForm';
import MidSurveyForm from '../MidSurveyForm';

class BatchResult extends React.Component {
	state = {
		user: '',
		round: '',
		userOptions: [],
		roundOptions: [],
		chat: {},
		members: [],
		survey: {},
		finalSurvey: null,
		isReady: false,
		downloadLink: ''
	};

	componentWillMount() {
		this.props.loadBatchResult(this.props.match.params.id).then(() => {
			const batch = this.props.batch;
			let userOptions = batch.users.map((x) => {
				return { value: x.user._id, label: x.nickname + ' (' + x.user.mturkId + ')' };
			});
			let roundOptions = batch.rounds.map((x, index) => {
				return { value: index + 1, label: index + 1 };
			});
			const blob = new Blob([ JSON.stringify(batch) ], { type: 'application/json' });
			this.setState({
				isReady: true,
				userOptions: userOptions,
				roundOptions: roundOptions,
				downloadLink: URL.createObjectURL(blob)
			});
		});
	}

	handleChangeUser = (e) => {
		const user = e.value;
		let chat = {},
			members = [],
			survey = {};
		if (!!this.state.round && user) {
			const batch = this.props.batch;
			const team =
				batch.rounds[this.state.round - 1].teams[
					batch.rounds[this.state.round - 1].teams.findIndex((x) => x.users.some((y) => y.user === user))
				];
			chat = team.chat;
			console.log(team.users);
			survey = team.users.find((x) => x.user === user).survey;
			members = team.users.map((user) => {
				let newUser = JSON.parse(JSON.stringify(user));
				newUser.nickname =
					user.nickname + ' | ' + this.state.userOptions.find((x) => x.value === user.user).label;
				return newUser;
			});
		}
		this.setState({
			user: user,
			chat: chat,
			members: members,
			survey: survey,
			finalSurvey: this.props.batch.users.find((x) => x.user._id === user).survey
		});
	};

	handleChangeRound = (e) => {
		const round = e.value;
		let chat = {},
			members = [],
			survey = {};
		if (!!this.state.user && round) {
			const batch = this.props.batch;
			const team =
				batch.rounds[round - 1].teams[
					batch.rounds[round - 1].teams.findIndex((x) => x.users.some((y) => y.user === this.state.user))
				];
			chat = team.chat;
			members = team.users.map((user) => {
				let newUser = JSON.parse(JSON.stringify(user));
				newUser.nickname =
					user.nickname + ' | ' + this.state.userOptions.find((x) => x.value === user.user).label;
				return newUser;
			});
			survey = team.users.find((x) => x.user === this.state.user).survey;
		}
		this.setState({ round: round, chat: chat, members: members, survey: survey });
	};

	render() {
		const { batch, defaultMidQuestions } = this.props;

		return (
			<Container style={{ maxWidth: '100%' }}>
				<Row>
					<Col md={12} lg={12} xl={12}>
						<Card>
							{this.state.isReady && (
								<CardBody>
									<div className="card__title">
										<h5 className="bold-text">Status: {batch.status}</h5>
										{batch.status === 'active' && (
											<h5 className="bold-text">Round: {batch.rounds.length}</h5>
										)}
									</div>
									<Row style={{ marginBottom: '20px' }}>
										<p className="row-p">
											Created: {moment(batch.createdAt).format('YYYY.DD.MM-HH:mm:ss')}
										</p>
										<p className="row-p">
											Started:{' '}
											{batch.status !== 'waiting' ? (
												moment(batch.startTime).format('YYYY.DD.MM-HH:mm:ss')
											) : (
												'not started'
											)}
										</p>
										<p className="row-p">Template: {batch.templateName}</p>
										<p className="row-p">Team size: {batch.teamSize}</p>
										<p className="row-p">Rounds: {batch.numRounds}</p>
										<p className="row-p">
											Experiment rounds: {batch.experimentRound1} and {batch.experimentRound2}
										</p>
									</Row>
									<Row style={{ marginBottom: '20px' }}>
										<p className="row-p">Note: {batch.note}</p>
									</Row>
									<Row style={{ marginBottom: '20px' }}>
										<a href={this.state.downloadLink} download="batch.json">
											download all data
										</a>
									</Row>

									<div className="form">
										<Select
											value={this.state.user}
											onChange={(e) => this.handleChangeUser(e)}
											options={this.state.userOptions}
											clearable={false}
											multi={false}
											className="form__form-group-select"
											placeholder="Select user..."
										/>
										<Select
											value={this.state.round}
											onChange={(e) => this.handleChangeRound(e)}
											options={this.state.roundOptions}
											clearable={false}
											multi={false}
											className="form__form-group-select"
											placeholder="Select round..."
										/>
										{this.state.user &&
										this.state.round && (
											<Chat chat={this.state.chat} members={this.state.members} />
										)}
										{this.state.survey &&
										this.state.survey.questions && (
											<Row>
												<MidSurveyForm
													initialValues={{ questions: this.state.survey.questions }}
													questions={
														batch.tasks[this.state.round - 1].survey || defaultMidQuestions
													}
													readOnly
												/>
											</Row>
										)}
										{this.state.user &&
										this.state.finalSurvey && (
											<div>
												<p>Final survey:</p>
												<p>
													Experiment rounds (USER'S RESPONSE):{' '}
													{this.state.finalSurvey.mainQuestion.expRound1} and{' '}
													{this.state.finalSurvey.mainQuestion.expRound2}{' '}
												</p>
												<p>Choosen partners:</p>
												{this.state.finalSurvey.mainQuestion.partners.map((user) => {
													return (
														<p className="row-p">
															{this.state.userOptions.find((x) => x.value === user).label}
														</p>
													);
												})}
												<p>Why did you like these partners?</p>
												<p>{this.state.finalSurvey.mainQuestion.expRound3}</p>
												<p> Rational for manipulation check:</p>
												<p>{this.state.finalSurvey.mainQuestion.partners2}</p>
											</div>
										)}
									</div>
								</CardBody>
							)}
						</Card>
					</Col>
				</Row>
			</Container>
		);
	}
}

function mapStateToProps(state) {
	let defaultMidQuestions = !state.admin.batch
		? []
		: state.admin.batch.midQuestions.map((q) => {
				let question = {};
				question.type = 'select';
				question.question = q;
				question.selectOptions = [
					{ value: 1, label: 'Strongly Disagree' },
					{ value: 2, label: 'Disagree' },
					{ value: 3, label: 'Neutral' },
					{ value: 4, label: 'Agree' },
					{ value: 5, label: 'Strongly Agree' }
				];
				return question;
			});

	return {
		batch: state.admin.batch,
		defaultMidQuestions: defaultMidQuestions
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(
		{
			loadBatchResult
		},
		dispatch
	);
}

export default connect(mapStateToProps, mapDispatchToProps)(BatchResult);
