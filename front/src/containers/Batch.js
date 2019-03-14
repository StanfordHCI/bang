import React from 'react';
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {findDOMNode} from 'react-dom'
import {bindActionCreators} from "redux";
import moment from 'moment'
import {loadBatch, sendMessage, submitSurvey} from 'Actions/batches'
import MidSurveyForm from './MidSurveyForm'
import PostSurveyForm from './PostSurveyForm'
import {history} from "../app/history";


const MAX_LENGTH = 240;

class Batch extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      chat: [],
      message: '',
      members: [],
      timeLeft: 0,
      timerActive: false,
      surveyDone: false
    };
    this.refresher = this.refresher.bind(this)
  }

  componentWillMount() {
    this.props.loadBatch()
  }

  componentDidUpdate() {
    this.scrollDown();
  }

  componentWillReceiveProps(nextProps, nextState) {
    if (!this.state.timerActive && nextProps.currentRound && nextProps.currentRound.status === 'active') {
      this.setState({timerActive: true})
      this.roundTimer = setInterval(() => this.timer(nextProps.currentRound), 1000);
    }
    if (this.state.timerActive && this.props.currentRound && this.props.currentRound.status === 'active' && nextProps.currentRound.status === 'survey') {
      this.setState({timerActive: false, surveyDone: false})
      clearInterval(this.roundTimer)
    }
  }

  timer(round) {
    this.setState({timeLeft: moment(round.startTime).add(this.props.batch.roundMinutes, 'minute').diff(moment(), 'seconds')})
  }

  refresher(data) {
    let chat = this.state.chat;
    chat.push(data);
    this.setState({chat: chat});
  }

  scrollDown() {
    let chatScroll = this.refs.chatScroll;
    if (chatScroll) {
      const scrollHeight = chatScroll.scrollHeight;
      const height = chatScroll.clientHeight;
      const maxScrollTop = scrollHeight - height;
      findDOMNode(chatScroll).scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  }

  renderChat() {
    const {sendMessage, user, chat, batch} = this.props;

    return (
      <div className='chat'>
        <div className='chat__contact-list'>
          <div className='chat__contacts'>
            {batch.status === 'active' && <Table className='table table--bordered table--head-accent'>
              <thead>
              <tr>
                <th>members</th>
              </tr>
              </thead>
              <tbody>
              {chat.members.map((member) => {
                return (member._id.toString() === user._id.toString()) ?
                  <tr key={member._id}>
                    <td>
                      <div className='chat__bubble-contact-name'>
                        {member.realNick + ' (you)'}
                      </div>
                    </td>
                  </tr> :
                  <tr key={member._id}
                      onClick={() => this.setState({message: this.state.message + ' ' + member.fakeNick})}>
                    <td>
                      <div className='chat__bubble-contact-name'>
                        {member.fakeNick}
                      </div>
                    </td>
                  </tr>
              })}
              </tbody>
            </Table>}
            {batch.status === 'waiting' && <Table className='table table--bordered table--head-accent'>
              <thead>
              <tr>
                <th>members</th>
              </tr>
              </thead>
              <tbody>
              <tr key={user._id}>
                <td>
                  <div className='chat__bubble-contact-name'>
                    {user.realNick + ' (you)'}
                  </div>
                </td>
              </tr>
              </tbody>
            </Table>}
          </div>
        </div>
        <div className='chat__dialog' style={{marginLeft: 10}}>
          <div className="chat__scroll" ref="chatScroll">
            <div className='chat__dialog-messages-wrap'>
              <div className='chat__dialog-messages'>
                {chat.messages.map((message, index) => {
                  let checkedMessage = message.message || '';
                  checkedMessage = checkedMessage.replace(new RegExp(user.fakeNick, "ig"), user.realNick)
                  let messageClass = message.user === user._id ? 'chat__bubble chat__bubble--active' : 'chat__bubble';
                  return (
                    <div className={messageClass} key={index + 1}>
                      <div className='chat__bubble-message-wrap'>
                        <p
                          className='chat__bubble-contact-name'>{message.user.toString() === user._id.toString() ? user.realNick : message.nickname}</p>
                        <p className='chat__bubble-message'>{checkedMessage}</p>
                        <p className='chat__bubble-date'>{moment(message.time).format('LTS')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className='chat__text-field'>
            <input
              disabled={batch.status === 'waiting'}
              className='chat__field-input'
              value={this.state.message}
              type='text'
              onChange={e => {
                this.setState({message: e.target.value})
              }}
              onKeyDown={(e) => {
                if (e.keyCode === 13 && this.state.message && this.state.message.length <= MAX_LENGTH) {
                  this.setState({message: ''});
                  sendMessage({
                    message: this.state.message.replace(new RegExp(user.realNick, "ig"), user.fakeNick),
                    nickname: batch.status === 'active' ? user.fakeNick : user.realNick,
                    chat: chat._id
                  })
                }
              }}/>
          </div>
          {this.state.message.length > MAX_LENGTH &&
          <p className='chat__error'>Message is too long (max length: {MAX_LENGTH} symbols)</p>}
        </div>
      </div>
    )
  }

  renderWaitingStage() {
    return (<div>
      <h5 className='bold-text'></h5>
      {this.renderChat()}
    </div>)
  }

  renderMidSurvey() {
    return (
      <div>
        <h5 className='bold-text'>Past round survey.</h5>
        {!this.state.surveyDone && <MidSurveyForm
          questions={this.props.batch.midQuestions}
          initialValues={{questions: this.props.batch.midQuestions.map(x => '')}}
          onSubmit={(form) => this.props.submitSurvey(form)}
        />}
        {this.state.surveyDone && <h5 className='bold-text'>Done!.</h5>}
      </div>)
  }

  renderPostSurvey() {
    return (
      <div>
        <h5 className='bold-text'>Final survey.</h5>
        <PostSurveyForm
          batch={this.props.batch}
          onSubmit={(form) => this.props.submitSurvey(form)}
        />}
      </div>)
  }

  submitSurvey = (form) => {
    const batch = this.props.batch;
    let data = form;
    data.batch = batch._id;
    if (batch.status === 'active') {
      data.round = batch.currentRound
    } else if (batch.status === 'completed') {
      data.isPost = true;
    }
    this.props.submitSurvey(data)
    this.setState({surveyDone: true})
    if (batch.status === 'completed') {
      history.push('batch-end')
    }
  }

  renderRound() {
    return (
      <div>
        <h5 className='bold-text'>Time left: {this.state.timeLeft}</h5>
        {this.renderChat()}
      </div>)
  }

  renderActiveStage() {
    const batch = this.props.batch;
    const round = batch.rounds[batch.currentRound - 1];

    return round ? (<div>
      <h5 className='bold-text'>Round {batch.currentRound}</h5>
      {round.status === 'active' && this.renderRound()}
      {round.status === 'survey' && this.renderMidSurvey()}
    </div>) : (
      <div>
        <h5 className='bold-text'>Wait for round start</h5>
      </div>
    )
  }

  renderCompletedStage() {
    return (<div>
      <h5 className='bold-text'>Experiment completed.</h5>
      {this.renderPostSurvey()}
    </div>)
  }


  render() {
    const {batch} = this.props;

    return batch ? (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Current batch status: {batch.status}</h5>
                </div>
                {batch.status === 'waiting' && this.renderWaitingStage()}
                {batch.status === 'active' && this.renderActiveStage()}
                {batch.status === 'completed' && this.renderCompletedStage()}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    ) : null
  }
}


function mapStateToProps(state) {
  const batch = state.batch.batch;
  const round = batch && batch.rounds ? batch.rounds[batch.currentRound - 1] : null;
  console.log(batch)

  return {
    user: state.app.user,
    batch: batch,
    chat: state.batch.chat,
    currentRound: round
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadBatch,
    sendMessage,
    submitSurvey
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Batch);