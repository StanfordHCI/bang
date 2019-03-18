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
import escapeStringRegexp from 'escape-string-regexp'
import Autosuggest from 'react-autosuggest';


const MAX_LENGTH = 240;

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

class Batch extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      chat: [],
      message: '',
      members: [],
      timeLeft: 0,
      timerActive: false,
      surveyDone: false,
      isReady: false,
      currentTeam: [],
      teamAnimals: {},
      autoNames: []
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
    if (!this.state.isReady && nextProps.chat && nextProps.chat.members && nextProps.chat.members.length) {
      let teamAnimals = {}
      let currentTeam = nextProps.chat.members.map(x => {
        let result = {}, animalIndex;
        const nick = x._id.toString() === nextProps.user._id.toString() ? x.realNick : x.fakeNick;
        if (!nick) return ''
        if (nick) for (let i = 0; i < nick.length; i++) {
          if (nick[i] === nick[i].toUpperCase()) {
            animalIndex = i;
            break;
          }
        }
        let animal = nick.slice(animalIndex, nick.length)
        teamAnimals[animal] = nick;
        return nick
      })
      this.setState({isReady: true, currentTeam: currentTeam, teamAnimals: teamAnimals})
    }
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

  setAutocompltete = (names) => {
    if (names && names.length) {
      this.setState({autoNames: names})
    } else {
      this.setState({autoNames: []})
    }
  }

  handleSubmit = (e) => {
    const {sendMessage, user, chat, batch} = this.props;
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
      const currentTeam = this.state.currentTeam;
      const teamAnimals = this.state.teamAnimals;

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
      newMessage = newMessage.replace(new RegExp(user.realNick, "ig"), user.fakeNick)
      this.setState({message: ''});
      sendMessage({
        message: newMessage,
        nickname: batch.status === 'active' ? user.fakeNick : user.realNick,
        chat: chat._id
      })
    }
    if (e.keyCode === 32) {
      this.setState({message: newMessage});
    }
  }

  handleType = (event) => {
    const message = event.target.value;
    let newMessage = message;
    const index = message.lastIndexOf(' ');
    let currentTerm;
    if (index > - 1) {
      currentTerm = message.slice(index, message.length);
    } else {
      currentTerm = message;
    }
    let wordlength = currentTerm.length;
    const currentTeam = this.state.currentTeam;
    const teamAnimals = this.state.teamAnimals;

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

    this.setState({message: newMessage})
  }

  renderChat() {
    const {sendMessage, user, chat, batch} = this.props;
    const inputProps = {
      placeholder: 'type here...',
      value: this.state.message,
      onChange: this.handleType,
      onKeyDown: this.handleSubmit,
      disabled: batch.status === 'waiting',
      className: 'chat__field-input'
    };

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
                  if (batch.status === 'active') checkedMessage = checkedMessage.replace(new RegExp(user.fakeNick, "ig"), user.realNick)
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
            {/*<input
              disabled={batch.status === 'waiting'}
              className='chat__field-input'
              value={this.state.message}
              type='text'
              onChange={this.handleType}
              onKeyDown={this.handleSubmit}
            />*/}
            <Autosuggest
              style={{width: '100%'}}
              suggestions={this.state.autoNames}
              renderSuggestion={sug => (<div>{sug}</div>)}
              inputProps={inputProps}
              onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
              onSuggestionsClearRequested={this.onSuggestionsClearRequested}
              getSuggestionValue={sug => sug}
            />
          </div>
          {this.state.message.length > MAX_LENGTH &&
          <p className='chat__error'>Message is too long (max length: {MAX_LENGTH} symbols)</p>}
        </div>
      </div>
    )
  }

  onSuggestionsFetchRequested = ({ value }) => {
    console.log(1, this.state.autoNames)
  };

  onSuggestionsClearRequested = () => {
    console.log(2)
    this.setState({
      autoNames: []
    });
  };

  renderWaitingStage() {
    return (<div>
      <h5 className='bold-text'></h5>
      {this.renderChat()}
    </div>)
  }

  renderMidSurvey() {
    return (
      <div>
        <h5 className='bold-text'>Round survey</h5>
        {!this.state.surveyDone && <MidSurveyForm
          initialValues={{questions: this.props.batch.midQuestions.map(x => {return {result: ''}})}}
          questions={this.props.batch.midQuestions}
          onSubmit={this.submitSurvey}
        />}
        {this.state.surveyDone && <h5 className='bold-text'>Done!</h5>}
      </div>)
  }

  renderPostSurvey() {
    return (
      <div>
        <h5 className='bold-text'>Final survey</h5>
        <PostSurveyForm
          batch={this.props.batch}
          onSubmit={this.submitSurvey}
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
      data.mainQuestion.partners = data.mainQuestion.partners.map(x => x.value)
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
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Current batch status: {batch.status}</h5>
                </div>
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