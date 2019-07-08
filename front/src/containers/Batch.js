/** batch.js
 *  front-end
 * 
 *  worker view of a current batch
 *  
 *  major functions:
 *  - fuzzyMatched = user pairing alg
 *  - autocomplete methods
 *  - methods to render each of the workflow pages (chat, midsurvey, postsurvey)
 * 
 *  chat messages will automatically linkify
 *  
 *  renders:  
 *    1. when admin is looking at batch
 * 
 *  called by:
 *    1. router.js
 */

import React from 'react';
import { Card, CardBody, Col, Row, Container, Table } from 'reactstrap';
import { connect } from "react-redux";
import { findDOMNode } from 'react-dom'
import { bindActionCreators } from "redux";
import moment from 'moment'
import { loadBatch, sendMessage, submitSurvey } from 'Actions/batches'
import MidSurveyForm from './MidSurveyForm'
import PostSurveyForm from './PostSurveyForm'
import { history } from "../app/history";
import escapeStringRegexp from 'escape-string-regexp'
import ReactHtmlParser from "react-html-parser";
import { Avatar } from '@material-ui/core';
import { animalMap, adjMap } from '../constants/nicknames';
import Bot from '../img/Bot.svg';

const MAX_LENGTH = 240;
const botId = '100000000000000000000001'

const fuzzyMatched = (comparer, comparitor, matchCount) => {
  let isMatched = false;
  let a = comparer.trim().toLowerCase();
  let b = comparitor.trim().toLowerCase();

  if (a.length === 0) return false;
  if (b.length === 0) return false;
  let matrix = [];

  // increment along the first column of each row
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  let j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1
          )
        ); // deletion
      }
    }
  }

  let fuzzyDistance = matrix[b.length][a.length];
  let cLength = Math.max(a.length, b.length);
  let score = 1.0 - fuzzyDistance / cLength;
  if (score > matchCount) isMatched = true;

  return isMatched;
}

const replaceNicksInTask = (message, users, currentUser) => {
  users.forEach((user, index) => {
    const newNick = currentUser._id.toString() === user._id.toString() ? currentUser.realNick : user.fakeNick
    message = message.replace(new RegExp('team_user_' + (index + 1), "ig"), newNick)
  })
  return message;
}

const formatTimer = time => (Math.floor(parseInt(time) / 60)) + ':' + (parseInt(time) % 60 < 10 ? '0' : '') + (parseInt(time) % 60)

const componentDecorator = (href, text, key) => (
  <a href={href} key={key} target="_blank">
    {text}
  </a>
);

class Batch extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      chat: [],
      message: '',
      members: [],
      timeLeft: 0,
      surveyDone: false,
      isReady: false,
      timerIsReady: false,
      autoNames: []
    };
  }

  componentWillMount() {
    this.props.loadBatch();
    window.addEventListener("beforeunload", (ev) => {
      return ev.returnValue = `Are you sure you want to leave?`;
    });
  }

  componentWillUnmount() {
    clearInterval(this.roundTimer);
    window.removeEventListener("beforeunload", (ev) => {
      return ev.returnValue = `Are you sure you want to leave?`;
    });
  }

  componentWillReceiveProps(nextProps, nextState) {
    if (!this.state.isReady && nextProps.chat && nextProps.batch) { //init here because loadBatch is not promise
      if (nextProps.batch.finalSurveyDone) {
        history.push('batch-end')
        return;
      }
      this.setState({ isReady: true, surveyDone: nextProps.batch.surveyDone })
    }
    if (!this.state.timerIsReady && nextProps.batch && nextProps.currentRound && nextProps.batch.status !== 'waiting') {
      this.roundTimer = setInterval(() => this.timer(), 1000);
      this.setState({ timerIsReady: true })
    }
    /*if (this.props.batch && this.props.batch.status === 'active' && nextProps.batch.status === 'completed') {
      clearInterval(this.roundTimer);
    }*/
    if (this.props.currentRound && this.props.currentRound.status === 'active' && nextProps.currentRound.status === 'survey') {
      this.setState({ surveyDone: false })
    }
    setTimeout(() => this.scrollDown(), 1)
  }

  timer() {
    const { batch, currentRound } = this.props;
    if (batch && currentRound) {
      if (batch.status === 'active') {
        let endMoment = currentRound.status === 'active' ? batch.roundMinutes : batch.roundMinutes + batch.surveyMinutes
        let timeLeft = moment(currentRound.startTime).add(endMoment, 'minute');
        timeLeft = timeLeft.diff(moment(), 'seconds');
        if (timeLeft < 0) timeLeft = 0;
        this.setState({ timeLeft: timeLeft })
      } else if (batch.status === 'completed') {
        let timeLeft = moment(currentRound.endTime).add(4, 'minute');
        timeLeft = timeLeft.diff(moment(), 'seconds');
        if (timeLeft < 0) timeLeft = 0;
        this.setState({ timeLeft: timeLeft })
      }
    }
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

  setAutocompltete = (names) => {
    if (names && names.length) {
      this.setState({ autoNames: names })
    } else {
      this.setState({ autoNames: [] })
    }
  }

  // called for every keydown
  handleSubmit = (e) => {
    const { sendMessage, user, chat, batch, currentTeam, teamAnimals } = this.props;
    if (batch.status === 'waiting') {
      if (e.keyCode === 13) {
        sendMessage({
          message: this.state.message,
          nickname: user.realNick,
          chat: chat._id
        })
        this.setState({ message: '' });
      }
      return;
    }
    if (!this.state.message || this.state.message.length > MAX_LENGTH) return;

    let newMessage = this.state.message;

    if (e.keyCode === 13 || e.keyCode === 32) {
      const message = this.state.message;
      const index = message.lastIndexOf(' ');
      let currentTerm;
      if (index > - 1) {
        currentTerm = message.slice(index, message.length);
      } else {
        currentTerm = message;
      }

      let fuzzyMatches = [];

      // Match if users only type animal name
      for (let name in teamAnimals) {
        if (fuzzyMatched(name, currentTerm, 0.8)) {
          fuzzyMatches.push(teamAnimals[name]);
        }
      }

      // Quick typists catch
      if (fuzzyMatches[0] === undefined) {
        fuzzyMatches = currentTeam.filter(
          member => currentTerm.indexOf(member) >= 0
        );
      }

      // Run spell check only if animal name not detected
      if (fuzzyMatches[0] === undefined) {
        for (let i = 0; i < currentTeam.length; i++) {
          if (fuzzyMatched(currentTeam[i], currentTerm, 0.7)) {
            fuzzyMatches.push(currentTeam[i]);
          }
        }
      }

      // if there is only 1 possible match, correct the user
      if (fuzzyMatches.length === 1 && fuzzyMatches[0] !== undefined) {
        let current_text = this.state.message.split(" ");
        current_text.splice(-1, 1);
        let joined_text = current_text.join(" ");

        if (current_text[0] === undefined) {
          newMessage = fuzzyMatches[0];
        } else {
          newMessage = joined_text + " " + fuzzyMatches[0];
        }
      }
    }



    if (e.keyCode === 13) {
      if (batch.maskType === 'masked') newMessage = newMessage.replace(new RegExp(user.realNick, "ig"), user.fakeNick)
      this.setState({ message: '', autoNames: [] });
      sendMessage({
        message: newMessage,
        nickname: batch.status === 'active' && batch.maskType === 'masked' ? user.fakeNick : user.realNick,
        chat: chat._id
      })
    }
    if (e.keyCode === 32) {
      this.setState({ message: newMessage, autoNames: [] });
    }
  }

  // used for chat message onchange
  handleType = (event) => {
    const { currentTeam, teamAnimals, batch } = this.props;
    if (batch.status === 'waiting') {
      this.setState({ message: event.target.value })
      return;
    }
    const message = event.target.value;
    let newMessage = message;
    const index = message.lastIndexOf(' ')
    let currentTerm;
    if (index > - 1) {
      currentTerm = message.slice(index + 1, message.length);
    } else {
      currentTerm = message;
    }
    let wordlength = currentTerm.length;

    if (wordlength < 2) {
      this.setAutocompltete("");
    } else if (wordlength <= 5) {
      let matcher = new RegExp("^" + escapeStringRegexp(currentTerm), "i");
      let matches = currentTeam.filter(x => matcher.test(x))
      if (matches[0]) {
        this.setAutocompltete(matches);
      } else {
        let matches = [];
        for (let name in teamAnimals) {
          if (matcher.test(name)) {
            matches.push(teamAnimals[name])
          }
        }
        this.setAutocompltete(matches);
      }
    } else if (5 < wordlength) {
      let matcher = new RegExp(".*" + escapeStringRegexp(currentTerm), "i");
      let matches = currentTeam.filter(x => matcher.test(x))
      if (matches.length === 1 && matches[0] && event.target.value.length >= this.state.message.length) {
        //do not autocomplete if client backspace-d)
        let current_text = this.state.message.split(" ");
        current_text.splice(-1, 1);
        let joined_text = current_text.join(" ");
        if (current_text[0] === undefined) {
          newMessage = matches[0];
        } else {
          newMessage = joined_text + " " + matches[0];
        }
      }
    }

    this.setState({ message: newMessage })
  }


  handleChooseName = (name) => {
    const index = this.state.message.lastIndexOf(' ')
    let newMessage;
    if (index > - 1) {
      newMessage = this.state.message.slice(0, index + 1) + name;
    } else {
      newMessage = name;
    }
    this.setState({ message: newMessage, autoNames: [] })
  }

  renderChat() {
    const {sendMessage, user, chat, batch, currentRound} = this.props;
    const inputProps = {
      placeholder: 'type here...',
      value: this.state.message,
      onChange: this.handleType,
      onKeyDown: this.handleSubmit,
      className: 'chat__field-input'
    };



    return (
      <div className='chat'>
        <div className='chat__contact-list'>
          <div className='chat__contacts'>
            <Table className='table table--bordered table--head-accent'>
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
                      onClick={() => this.setState({ message: this.state.message + ' ' + (batch.maskType === 'masked' ? member.fakeNick : member.realNick) })}>
                      <td>
                        <div className='chat__bubble-contact-name'>
                          {batch.maskType === 'masked' ? member.fakeNick : member.realNick}
                        </div>
                      </td>
                    </tr>
                })}
              </tbody>
            </Table>
          </div>
        </div>
        <div className='chat__dialog' style={{ marginLeft: 10 }}>
          <div className="chat__scroll" ref="chatScroll">
            <div className='chat__dialog-messages-wrap'>
              <div className='chat__dialog-messages'>
                {chat.messages.map((message, index) => {
                  let messageClass = message.user === user._id ? 'chat__bubble chat__bubble--active' : 'chat__bubble';
                  let messageContent = message.message;

                  // specially format bot messages
                  if (message.user.toString() === botId) {
                    messageClass = 'chat__bubble chat_bot'
                    messageContent = replaceNicksInTask(messageContent, chat.members, user)
                    messageContent = (ReactHtmlParser(messageContent));
                  }

                  let isSelf = message.user.toString() === user._id.toString();

                  return (
                    <div className={messageClass} key={index + 1}>
                      <div className="chat__avatar mr-2">
                        {(message.user.toString() === botId) ?
                          <Avatar
                            size={{ width: "auto" }}
                            src={Bot}
                          />
                          : 
                          <Avatar
                            style={{
                              border: "3px solid" + adjMap.get(isSelf ? user.realAdj : message.adj)
                            }}
                            imgProps={{ style: { padding: "5px", background: "white" } }}
                            size={{ width: "auto" }}
                            src={animalMap.get(isSelf ? user.realAnimal : message.animal)}
                          >
                            <span className="small">
                              {isSelf ? user.realNick : message.nickname + ".jpg"}
                            </span>
                          </Avatar>
                        }
                      </div>
                      <div className="chat__bubble-message-wrap">
                        <p className="chat__bubble-contact-name">
                          {isSelf ? user.realNick : message.nickname}
                        </p>
                        <p className="chat__bubble-message">{messageContent}</p>
                        <p className="chat__bubble-date">{moment(message.time).format("LTS")}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className='chat__text-field' style={{ flexDirection: 'column' }}>
            <input
              className='chat__field-input'
              value={this.state.message}
              type='text'
              onChange={this.handleType}
              onKeyDown={this.handleSubmit}
            />
            {this.state.autoNames.length > 0 &&
              <div className="autocompl">
                {this.state.autoNames.map(item => {

                  return (<div onClick={() => this.handleChooseName(item)}
                    className="autocompl-row">{item}
                  </div>)
                })}
              </div>
            }
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
    const task = this.props.batch.tasks[this.props.batch.currentRound - 1]

    return (
      <div>
        {!this.state.surveyDone && <MidSurveyForm
          initialValues={{ questions: task.survey.map(x => { return { result: '' } }) }}
          questions={task.survey}
          onSubmit={this.submitSurvey}
          members={this.props.chat.members}
        />}
        {this.state.surveyDone && <div>
          <p>Thanks for completing the survey for this round!</p>
          <p style={{ marginBottom: '0px' }}>There are {this.props.batch.numRounds - this.props.batch.currentRound} more round(s) remaining, but we are waiting for your teammates to complete the surveys. Hang tight!</p>
        </div>}
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
      data.mainQuestion.partners = data.mainQuestion.partners.map(x => {
        return x.value.substring(2) //cut prefix
      })
    }
    this.props.submitSurvey(data)
    this.setState({ surveyDone: true })
    if (batch.status === 'completed') {
      history.push('batch-end')
    }
  }

  renderRound() {
    return (
      <div>
        {this.renderChat()}
      </div>)
  }

  renderActiveStage() {
    const batch = this.props.batch;
    const round = batch.rounds[batch.currentRound - 1];

    return round ? (<div>
      <h5 className='bold-text'>Round {batch.currentRound + (round.status === 'survey' ? ' survey' : '')}</h5>
      <h5 className='bold-text'>Time left: {formatTimer(this.state.timeLeft)}</h5>
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
      <h5 className='bold-text'>Experiment completed. This is final survey.</h5>
      <h5 className='bold-text'>Time left: {formatTimer(this.state.timeLeft)}</h5>
      {<div>
        <PostSurveyForm
          batch={this.props.batch}
          onSubmit={this.submitSurvey}
        />}
      </div>}
    </div>)
  }


  render() {
    const { batch } = this.props;

    return batch ? (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                {batch.status === 'waiting' && this.renderWaitingStage()}
                {batch.status === 'active' && this.renderActiveStage()}
                {batch.status === 'completed' && this.renderCompletedStage()}
              </CardBody>}
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
  let chat = state.batch.chat;
  if (batch && batch.status === 'waiting') {
    chat.members = chat.members.filter(x => x._id.toString() === state.app.user._id.toString())
    chat.messages = chat.messages.filter(x => x.user.toString() === state.app.user._id.toString() || x.user.toString() === '100000000000000000000001')
  }
  if (batch && batch.status === 'active' && batch.maskType === 'masked' && !!state.app.user.fakeNick && typeof (state.app.user.fakeNick) === 'string') {
    chat.messages.forEach(message => {
      let checkedMessage = message.message || '';
      checkedMessage = checkedMessage.replace(new RegExp(state.app.user.fakeNick, "ig"), state.app.user.realNick);
      message.message = checkedMessage;
      return message;
    })
  }

  return {
    user: state.app.user,
    batch: batch,
    chat: chat,
    currentRound: round,
    currentTeam: state.batch.currentTeam,
    teamAnimals: state.batch.teamAnimals
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