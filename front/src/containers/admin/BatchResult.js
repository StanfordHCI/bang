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
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {loadBatchResult} from 'Actions/admin'
import Select from "react-select";
import Chat from '../Chat'
import moment from "moment";
import PostSurveyForm from "../PostSurveyForm";
import RoundSurveyForm from "../RoundSurveyForm";

class BatchResult extends React.Component {
  state = {
    user: '',
    round: '',
    userOptions: [],
    roundOptions: [],
    chat: {},
    members: [],
    preSurvey: {},
    midSurvey: {},
    finalSurvey: null,
    isReady: false,
    downloadLink: ''
  }

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
    let chat = {}, members = [], preSurvey = {}, midSurvey = {};
    if (!!this.state.round && user) {
      const batch = this.props.batch;
      const team = batch.rounds[this.state.round - 1].teams[batch.rounds[this.state.round - 1].teams
        .findIndex(x => x.users.some(y => y.user === user))]
      chat = team.chat;
      preSurvey = team.users.find(x => x.user === user).preSurvey;
      midSurvey = team.users.find(x => x.user === user).midSurvey;
      members = team.users.map(user=> {
        let newUser = JSON.parse(JSON.stringify(user))
        newUser.nickname = user.nickname + ' | ' + this.state.userOptions.find(x => x.value === user.user).label
        return newUser;
      });
    }
    this.setState({user: user, chat: chat, members: members, midSurvey: midSurvey, preSurvey: preSurvey,
      finalSurvey: this.props.batch.users.find(x => x.user._id === user).survey});
  }

  handleChangeRound = (e) => {
    const round = e.value;
    let chat = {}, members = [], preSurvey = {}, midSurvey = {};
    if (!!this.state.user && round) {
      const batch = this.props.batch;
      const team = batch.rounds[round - 1].teams[batch.rounds[round - 1].teams
        .findIndex(x => x.users.some(y => y.user === this.state.user))]
      chat = team.chat;
      members = team.users.map(user=> {
        let newUser = JSON.parse(JSON.stringify(user))
        newUser.nickname = user.nickname + ' | ' + this.state.userOptions.find(x => x.value === user.user).label
        return newUser;
      });
      preSurvey = team.users.find(x => x.user === this.state.user).preSurvey;
      midSurvey = team.users.find(x => x.user === this.state.user).midSurvey;
    }
    this.setState({round: round, chat: chat, members: members, preSurvey: preSurvey, midSurvey: midSurvey})
  }

	render() {
		const { batch, defaultMidQuestions } = this.props;
    return (
      <Container style={{maxWidth: '100%'}}>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Status: {batch.status}</h5>
                  {batch.status === 'active' && <h5 className='bold-text'>Round: {batch.rounds.length}</h5>}
                </div>
                <Row style={{marginBottom: '20px'}} >
                  <p className="row-p">Created: {moment(batch.createdAt).format('YYYY.DD.MM-HH:mm:ss')}</p>
                  <p className="row-p">Started: {batch.status !== 'waiting' ? moment(batch.startTime).format('YYYY.DD.MM-HH:mm:ss') : 'not started'}</p>
                  <p className="row-p">Template: {batch.templateName}</p>
                  <p className="row-p">Team size: {batch.teamSize}</p>
                  <p className="row-p">Rounds: {batch.numRounds}</p>
                  <p className="row-p">Experiment rounds: {batch.expRounds.map(x => x + ' ')}</p>
                </Row>
                <Row style={{marginBottom: '20px'}}>
                  <p className="row-p">Note: {batch.note}</p>
                </Row>
                <Row style={{marginBottom: '20px'}}>
                  <a href={this.state.downloadLink} download="batch.json">download all data</a>
                </Row>

                <Col className='form' style={{display: 'flex', flexDirection: 'column'}}>
                  <Select
                    value={this.state.user}
                    onChange={(e) => this.handleChangeUser(e)}
                    options={this.state.userOptions}
                    clearable={false}
                    multi={false}
                    className='form__form-group-select'
                    placeholder="Select user..."
                  />
                  <Select
                    value={this.state.round}
                    onChange={(e) => this.handleChangeRound(e)}
                    options={this.state.roundOptions}
                    clearable={false}
                    multi={false}
                    className='form__form-group-select'
                    placeholder="Select round..."
                  />
                  {this.state.user && this.state.round && <Row>
                    <Chat
                      chat={this.state.chat}
                      members={this.state.members}
                    />
                  </Row>}
                  {this.state.preSurvey && this.state.preSurvey.questions && <Row>
                    <p>pre-survey result:</p>
                    <RoundSurveyForm
                      initialValues={{questions: this.state.preSurvey.questions}}
                      questions={batch.tasks[this.state.round - 1].preSurvey}
                      readOnly
                    />
                  </Row>}
                  {this.state.midSurvey && this.state.midSurvey.questions && <Row>
                    <p>mid-survey result:</p>
                    <RoundSurveyForm
                      initialValues={{questions: this.state.midSurvey.questions}}
                      questions={batch.tasks[this.state.round - 1].survey || defaultMidQuestions}
                      readOnly
                    />
                  </Row>}
                  {this.state.user && this.state.finalSurvey &&
                  <Row> {this.state.finalSurvey.mainQuestion.partners.length &&
                    <div>
                      <p>Final survey:</p>
                      <p>Experiment rounds (USER RESPONSE): {this.state.finalSurvey.mainQuestion.expRound1} and {this.state.finalSurvey.mainQuestion.expRound2} </p>
                      <p>Choosen partners:</p>
                      {this.state.finalSurvey.mainQuestion.partners.map(user => {
                        return (<p className="row-p">{this.state.userOptions.find(x => x.value === user).label}</p>)
                      })}
                    </div>}
                    {this.state.finalSurvey.singleTeamQuestion &&
                      <div>
                        <p>Actual Partner Name(single team question): </p>
                        <p>{this.state.finalSurvey.singleTeamQuestion.actualPartnerName}</p>
                        <p>Chosen Partner Name(single team question): </p>
                        <p>{this.state.finalSurvey.singleTeamQuestion.chosenPartnerName}</p>
                      </div>
                    }

                  </Row>}
                </Col>
              </CardBody>}
            </Card>
          </Col>
        </Row>
      </Container>
    )
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
