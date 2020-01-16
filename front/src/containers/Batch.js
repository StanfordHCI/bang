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
import {Card, CardBody, Col, Container, Row, Table} from 'reactstrap';
import {connect} from "react-redux";
import {findDOMNode} from 'react-dom'
import {bindActionCreators} from "redux";
import moment from 'moment'
import {loadBatch, sendMessage, submitSurvey, vote} from 'Actions/batches'
import {listener} from 'Actions/app'
import RoundSurveyForm from './RoundSurveyForm'
import PostSurveyForm from './PostSurveyForm'
import {history} from "../app/history";
import escapeStringRegexp from 'escape-string-regexp'
import ReactHtmlParser from "react-html-parser";
import {Avatar} from '@material-ui/core';
import {newWindow, pairInArray, parseNick} from '../utils'
import {adjMap, animalMap, genderMap} from '../constants/nicknames';
import Bot from '../img/Bot.svg';
import Notification from 'react-web-notification';
import Vote from '../components/Vote';
import showdown from 'showdown';
const MAX_LENGTH = 240;
const botId = '100000000000000000000001';

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

const replaceNicksInTask = (message, users, currentUser, unmasked) => {
  users.forEach((user, index) => {
    const newNick = currentUser._id.toString() === user._id.toString() ? currentUser.realNick : (unmasked ? user.realNick : user.fakeNick)
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
      autoNames: [],
      ignore: true,
      isStartNotifySent: false,
      closeBlockReady: false,
      currentRound: 0,
      voteDisabled: [],
    };
    this.onVoteDisable = this.onVoteDisable.bind(this)
  }

  onVoteDisable = (ind) => {
    const { voteDisabled } = this.state;
    voteDisabled[ind] = true;
    this.setState({ voteDisabled });
  };


  componentWillMount() {
    this.props.loadBatch();
  }

  componentWillUnmount() {
    clearInterval(this.roundTimer);
    window.removeEventListener("beforeunload", listener);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // Notifications
    if (this.state.timeLeft === 0 && prevState.timeLeft) {
      console.log('alert!')
      this.setState({
        isStartNotifySent: true,
        notifyTitle: 'Bang!',
        notifyOptions: {
          body: 'Bang: new step of experiment has started!', // new round or survey is appearing on the screen
          lang: 'en',
          dir: 'ltr',
        }
      });
    }
    if (this.state.timeLeft === 30 && prevState.timeLeft === 31) {
      console.log('30 sec alert');
      this.setState({
        isStartNotifySent: true,
        notifyTitle: 'Bang!',
        notifyOptions: {
          body: 'Bang: new step is starting soon!', // new round or survey will appear in 30 secs on the screen
          lang: 'en',
          dir: 'ltr',
        }
      });
    }
    let currentTask;
    let roundHasCasualPoll;
    if (this.props.batch) {
      currentTask = this.props.batch.tasks[this.props.batch.currentRound - 1];
      if (currentTask) {
        roundHasCasualPoll = currentTask.polls && currentTask.polls.length && currentTask.polls.some(x => x.type === 'casual')
      }
    }
    const {currentRound} = this.props;
    // Foreperson poll notifications

    if (currentRound && currentRound.status === 'active' && roundHasCasualPoll && currentTask.polls
        .some((x, ind) => this.state.voteDisabled[ind] !== true && x.type === 'casual')) {
      if (this.state.timeLeft === 300 && prevState.timeLeft === 301 && roundHasCasualPoll) {
        console.log('poll 1st alert')
        this.setState({
          isStartNotifySent: true,
          notifyTitle: 'Bang!',
          notifyOptions: {
            body: 'remember, you must all agree, or else your jury will be hung!  ' +
                'You should do your best to achieve consensus and avoid a hung jury.' +
                ' What are ways that you could compromise?',
            lang: 'en',
            dir: 'ltr',
          }
        });
      }
      if (this.state.timeLeft === 150 && prevState.timeLeft === 151 && roundHasCasualPoll) {
        console.log('poll 2nd alert')
        this.setState({
          isStartNotifySent: true,
          notifyTitle: 'Bang!',
          notifyOptions: {
            body: 'Time is running out! Remember that you must all be in agreement, or else you will have a hung jury!',
            lang: 'en',
            dir: 'ltr',
          }
        });
      }
      if (this.state.timeLeft === 10 && prevState.timeLeft === 11 && roundHasCasualPoll) {
        console.log('poll last alert');
        this.setState({
          isStartNotifySent: true,
          notifyTitle: 'Bang!',
          notifyOptions: {
            body: 'Hung jury! You were not able to agree in time, so your jury was hung.\n',
            lang: 'en',
            dir: 'ltr',
          }
        });
      }
    }
}

  componentWillReceiveProps(nextProps, nextState) {
    if (!this.state.closeBlockReady && nextProps.batch &&  nextProps.batch.status === 'active') {
      window.addEventListener("beforeunload", listener);
      this.setState({closeBlockReady: true})
    }

    if (!this.state.isStartNotifySent && nextProps.batch && nextProps.batch.status === 'active') {
      this.setState({
        isStartNotifySent: true,
        notifyTitle: 'Bang: started!',
        notifyOptions: {
          body: 'Bang: started!',
          lang: 'en',
          dir: 'ltr',
        }
      });
    }

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
    if (this.props.currentRound && this.props.currentRound.status !== nextProps.currentRound.status) {
      this.setState({ surveyDone: false })
    }
    setTimeout(() => this.scrollDown(), 1)
  }

  timer() {
    const { batch, currentRound } = this.props;
    if (batch && currentRound) {
      if (batch.status === 'active') {
        const task = batch.tasks[batch.currentRound - 1];
        let endMoment = 0;
        if (batch.currentRound - 1 === 0 && batch.hasPreSurvey) { // prepreSurvey
          endMoment += batch.surveyMinutes
        }
        if (currentRound.status.toLowerCase().includes('readingperiod')) {
          const num = parseInt(currentRound.status.replace(/^\D+/g, ""));
          endMoment += task.readingPeriods.slice(0, num + 1).map(x => x.time).reduce((a, b) => parseFloat(a) + parseFloat(b));
        } else {
          if (task.readingPeriods && task.readingPeriods.length && currentRound.status !== 'prepresurvey') {
            endMoment += task.readingPeriods.map(x => x.time).reduce((a, b) => parseFloat(a) + parseFloat(b));
          }
        }
        switch (currentRound.status) {
          case 'presurvey':
            endMoment += batch.surveyMinutes;
            break;
          case 'active':
            endMoment += task.hasPreSurvey ? batch.roundMinutes + batch.surveyMinutes : batch.roundMinutes;
            break;
          case 'midsurvey':
            endMoment += task.hasPreSurvey ? batch.roundMinutes + batch.surveyMinutes * 2 : batch.roundMinutes + batch.surveyMinutes;
            break;
          case 'postsurvey':
            endMoment += batch.roundMinutes + batch.surveyMinutes + batch.surveyMinutes * (task.hasPreSurvey + task.hasMidSurvey);
            break;
        }
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
        realNickname: user.realNick,
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
    const {sendMessage, user, chat, batch, currentRound, vote} = this.props;
    let pinnedContent = [];
    try {
      pinnedContent = batch.tasks[currentRound.number - 1].pinnedContent;
    } catch (e) {
      pinnedContent = [];
    }
    let polls;
    try {
      polls = batch.tasks[currentRound.number - 1].polls;
      if (!polls.length) {
        polls = null;
      } else {
        const poll = polls[batch.activePoll];
        if (poll) {
          polls = [poll]; // we display only the active poll, others will be displayed some other time
        } else {
          polls = [];
        }
      }
    } catch (e) {
      polls = null;
    }
    const inputProps = {
      placeholder: 'type here...',
      value: this.state.message,
      onChange: this.handleType,
      onKeyDown: this.handleSubmit,
      className: 'chat__field-input'
    };

    const nicks = chat.members.map((member) => {
      let nick = '';
      if (member._id.toString() === user._id.toString()) {
        nick = member.realNick + ' (you)';
      } else {
        nick = batch.maskType === 'masked' ? member.fakeNick : member.realNick;
      }
      return batch.status ==='active' && !member.isActive ? '' : nick;
    });
    const actualTeamSize = chat.members.length;

    const nicksOptions = nicks.filter(x => x !== '').map(x => {return {value: x, label: x}});
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
                {nicks.map((nick) => {
                  return (<tr>
                    <td>
                      <div className='chat__bubble-contact-name'>
                        {nick}
                      </div>
                    </td>
                  </tr>)
                })}
              </tbody>
            </Table>
          </div>
        </div>
        <div className='chat__dialog' style={{ marginLeft: 10 }}>
          {pinnedContent && !!pinnedContent.length && <div className='chat__dialog-pinned-message'>
            <div className='chat__dialog-pinned-resources'>
              <p style={{color: 'black'}}>Pinned resources</p>
            </div>
            {pinnedContent.map(message => {
              return (
              <div>
                <button className='chat__dialog-pinned-resource' onClick={() => {newWindow(message.link)}}>{message.text}</button>
                <br/>
              </div>)
            })}
          </div>}
          {polls && polls.map((poll, ind) => {
            let options = [];
            const lockCap = actualTeamSize * poll.threshold;
            try {
              options = poll.type === 'foreperson' ? nicksOptions : poll.selectOptions;
            } catch (e) {
              options = [];
            }
            let warning = null;
            const timeLeft = this.state.timeLeft;
            if (timeLeft < 120 && poll.type === 'casual') {
              warning = 'casual';
            }
            return ((actualTeamSize > 1 || // do not show foreperson polls if person is alone in chat
                batch.teamSize === 1 || // unless we are testing
                poll.type !== 'foreperson') && <div className='chat__dialog-pinned-message'>
              <Vote
                  options={options}
                  vote={vote}
                  user={user}
                  batch={batch}
                  lockCap={lockCap} // Vote is disabled if one of options has >=lockCap votes
                  poll={poll}
                  onDisable={this.onVoteDisable}
                  pollInd={batch.activePoll}
                  warning={warning}
                  actualTeamSize={actualTeamSize}
              />
            </div>)})}
          <div className="chat__scroll" ref="chatScroll">
            <div className='chat__dialog-messages-wrap'>
              <div className='chat__dialog-messages'>
                {chat.messages.map((message, index) => {
                  let messageClass = message.user === user._id ? 'chat__bubble chat__bubble--active' : 'chat__bubble';
                  let messageContent = message.message;
                  let parsedMessageNickname = parseNick(message.nickname);
                  let messageAdjective = parsedMessageNickname[0];
                  let parsedRealnickname = parseNick(user.realNick);
                  let realAdjective = parsedRealnickname[0];
                  let realAnimal = parsedRealnickname[1];
                  let userGender;
                  let roundNumber;
                  try {
                    roundNumber = currentRound.number;
                  } catch (e) {

                  }
                  let unmaskingType;
                  try {
                    unmaskingType = batch.tasks[roundNumber - 2].selectiveMasking ? 'likes' :
                        (batch.tasks[roundNumber - 3].selectiveMasking ? 'dislikes' : false);
                  } catch (e) {
                    unmaskingType = false
                  }
                  let unmaskedPairs;
                  if (unmaskingType === 'likes') {
                    unmaskedPairs = batch.unmaskedPairs.likes;
                  }
                  if (unmaskingType === 'dislikes') {
                    unmaskedPairs = batch.unmaskedPairs.dislikes
                  }
                  if (!unmaskingType) {
                    unmaskedPairs = [];
                  }
                  const currentPair = [user._id.toString(), message.user.toString()];
                  let unmasked;
                  try {
                    unmasked = pairInArray(unmaskedPairs, currentPair);
                  } catch (e) {

                    unmasked = false
                  }
                  let messageAnimal = !unmasked ? parsedMessageNickname[1] : parseNick(message.realNickname)[1];
                  try {
                    userGender = batch.users.find(x => x.user.toString() === message.user.toString()).gender;
                  } catch (err) {
                  }
                  // specially format bot messages
                  if (message.user.toString() === botId) {
                    messageClass = 'chat__bubble chat_bot'
                    messageContent = replaceNicksInTask(messageContent, chat.members, user, batch.maskType === 'unmasked')
                    messageContent = (ReactHtmlParser(messageContent));
                  }

                  let isSelf = message.user.toString() === user._id.toString();

                  return (
                    <div className={messageClass} key={index + 1}>
                      {(batch.withAvatar) && <div className="chat__avatar mr-2">
                        {(message.user.toString() === botId) ?
                          <Avatar
                            size={{ width: "auto" }}
                            src={Bot}
                          />
                          : 
                          <Avatar
                            style={{
                              border: "3px solid" + adjMap.get(isSelf ? realAdjective : messageAdjective)
                            }}
                            imgProps={{ style: { padding: "5px", background: "white" } }}
                            size={{ width: "auto" }}
                            src={userGender ? genderMap.get(userGender) : animalMap.get(isSelf ? realAnimal : messageAnimal)}
                          />
                            /* <span className="small">
                              {isSelf ? user.realNick : message.nickname + ".jpg"}
                            </span> */
                          /* </Avatar> */
                        }
                      </div>}
                      <div className="chat__bubble-message-wrap">
                        <p className="chat__bubble-contact-name">
                          {isSelf ? user.realNick : (!unmasked ? message.nickname : message.realNickname)}
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
    const {limit, activeCounter} = this.props;

    return (<div>
      <h5 className='bold-text'></h5>
      <p>We are currently waiting on <b>{limit - activeCounter > 0 ? limit - activeCounter : 0} </b>
        more MTurk users to accept the task.</p>
      {this.renderChat()}
    </div>)
  }

  getNumTask(batch) {
    let numTask = batch.currentRound - 1; // standard flow
    if (batch.teamFormat === 'single') {
      if (batch.worstRounds && batch.worstRounds.length && Math.max.apply(null, batch.worstRounds) === batch.currentRound) {
        // if it is the reconvene of worst round, we take survey from task[numRounds - 2]
        numTask = batch.numRounds - 2;
      } else {
        if (batch.expRounds && batch.expRounds.length && Math.max.apply(null, batch.expRounds) === batch.currentRound) {
          // if it is the reconvene of best round, we take survey from task[numRounds - 1]
          numTask = batch.numRounds - 1;
        }
      }
    }
    return numTask;
  }

  renderMidSurvey() {
    const user = this.props.user;
    const batch = this.props.batch;
    const numTask = this.getNumTask(batch);
    const task = batch.tasks[numTask];
    const round = batch.rounds[batch.currentRound - 1]
    const team = round.teams.find((x) => x.users.some((y) => y.user.toString() === this.props.user._id));
    const selectiveMasking = task.selectiveMasking; // bool
    return (
      <div>
        {!this.state.surveyDone && <RoundSurveyForm
          initialValues={{ questions: task.survey.map(x => { return { result: '' } }) }}
          questions={task.survey}
          onSubmit={this.submitSurvey}
          members={this.props.chat.members}
          surveyType="mid"
          team={team}
          selectiveMasking={selectiveMasking}
          user={user}
        />}
        {this.state.surveyDone && <div>
          <p>Thanks for completing the survey for this round!</p>
          <p style={{ marginBottom: '0px' }}>There are {this.props.batch.numRounds - this.props.batch.currentRound} more round(s) <b>and one final-survey</b> (after the last round) remaining, but we are waiting for your teammates to complete the surveys. Remember, if you leave early, you will not be paid. Please hang tight!</p>
        </div>}
      </div>)
  }

  renderPostSurvey() {
    const batch = this.props.batch;
    const numTask = this.getNumTask(batch);
    const task = batch.tasks[numTask];
    const round = batch.rounds[batch.currentRound - 1];
    const team = round.teams.find((x) => x.users.some((y) => y.user.toString() === this.props.user._id));

    return (
        <div>
          {!this.state.surveyDone && <RoundSurveyForm
              initialValues={{ questions: batch.postSurvey.map(x => { return { result: '' } }) }}
              questions={batch.postSurvey}
              onSubmit={this.submitSurvey}
              members={this.props.chat.members}
              surveyType="post"
              team={team}
          />}
          {this.state.surveyDone && <div>
            <p>Thanks for completing the survey for this round!</p>
            <p style={{ marginBottom: '0px' }}>There are {this.props.batch.numRounds - this.props.batch.currentRound} more round(s) and one final-survey (after the last round) remaining, but we are waiting for your teammates to complete the surveys. Remember, if you leave early, you will not be paid. Please hang tight!</p>
          </div>}
        </div>)
  }

  renderPrePreSurvey() {
    const batch = this.props.batch;
    const numTask = this.getNumTask(batch);
    const task = batch.tasks[numTask];
    const round = batch.rounds[batch.currentRound - 1];
    const team = round.teams.find((x) => x.users.some((y) => y.user.toString() === this.props.user._id));

    return (
        <div>
          {!this.state.surveyDone && <RoundSurveyForm
              initialValues={{ questions: batch.preSurvey.map(x => { return { result: '' } }) }}
              questions={batch.preSurvey}
              onSubmit={this.submitSurvey}
              members={this.props.chat.members}
              surveyType="prepre"
              team={team}
          />}
          {this.state.surveyDone && <div>
            <p>Thanks for completing the survey for this round!</p>
            <p style={{ marginBottom: '0px' }}>There are {this.props.batch.numRounds - this.props.batch.currentRound} more round(s) and one final-survey (after the last round) remaining, but we are waiting for your teammates to complete the surveys. Remember, if you leave early, you will not be paid. Please hang tight!</p>
          </div>}
        </div>)
  }

  renderPreSurvey() {
    const batch = this.props.batch;
    const numTask = this.getNumTask(batch);
    const task = batch.tasks[numTask];

    return (
      <div>
        {!this.state.surveyDone && <RoundSurveyForm
          initialValues={{ questions: task.preSurvey.map(x => { return { result: '' } }) }}
          questions={task.preSurvey}
          onSubmit={this.submitSurvey}
          members={this.props.chat.members}
          surveyType="pre"
        />}
        {this.state.surveyDone && <div>
          <p>Thanks for completing pre-survey for this round!</p>
          <p style={{ marginBottom: '0px' }}>There are {this.props.batch.numRounds - this.props.batch.currentRound + 1} more round(s) remaining, but we are waiting for your teammates to complete pre-surveys. Hang tight!</p>
        </div>}
      </div>)
  }

  submitSurvey = (form) => {
    const batch = this.props.batch;
    let data = form;
    data.batch = batch._id;
    if (batch.status === 'active') {
      data.round = batch.currentRound;
      data.surveyType = batch.rounds[batch.currentRound - 1].status;
    } else if (batch.status === 'completed') {
      data.isPost = true;
      data.surveyType = 'final';
      if (batch.teamFormat !== 'single') {
        data.mainQuestion.partners = data.mainQuestion.partners.map(x => {
          return x.value.substring(2) //cut prefix
        });
        data.singleTeamQuestion = null;
      } else {
        data.mainQuestion = null;
        const processedResult = data.singleTeamQuestion.result.split(' ');
        [data.singleTeamQuestion.actualPartnerName, data.singleTeamQuestion.chosenPartnerName, data.singleTeamQuestion.numOptions] =
            [processedResult[1], processedResult[0], processedResult[2]];
      }

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
    let surveyLabel = '';
    if (round) {
      surveyLabel += `Round ${batch.currentRound} `;
      if (round.status === 'presurvey') surveyLabel += '(before-task survey)';
      if (round.status === 'prepresurvey') surveyLabel += '(before-batch survey)';
      if (round.status === 'midsurvey') surveyLabel += '(after-task survey)';
      if (round.status === 'postsurvey') surveyLabel += '(post-batch survey)';
      if (round.status.toLowerCase().includes('readingperiod')) surveyLabel += `(reading period ${parseInt(round.status.replace(/^\D+/g, "")) + 1})`
    }
    return round ? (<div>
      <h5 className='bold-text'>{surveyLabel}</h5>
      <h5 className='bold-text'>Time left: {formatTimer(this.state.timeLeft)}</h5>
      {round.status === 'prepresurvey' && this.renderPrePreSurvey()}
      {round.status.toLowerCase().includes('readingperiod') && this.renderReadingPeriod(round.status.replace(/^\D+/g, ""))}
      {round.status === 'presurvey' && this.renderPreSurvey()}
      {round.status === 'active' && this.renderRound()}
      {round.status === 'midsurvey' && this.renderMidSurvey()}
      {round.status === 'postsurvey' && this.renderPostSurvey()}
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
      <div>
        <PostSurveyForm
          batch={this.props.batch}
          onSubmit={this.submitSurvey}
        />
      </div>
    </div>)
  }

  handlePermissionGranted(){
    this.setState({
      ignore: false
    });
  }
  handlePermissionDenied(){
    this.setState({
      ignore: true
    });
  }
  handleNotSupported(){
    this.setState({
      ignore: true
    });
  }

  render() {
    const { batch } = this.props;

    return batch ? (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <Notification
                  ignore={this.state.ignore && this.state.title !== ''}
                  notSupported={this.handleNotSupported.bind(this)}
                  onPermissionGranted={this.handlePermissionGranted.bind(this)}
                  onPermissionDenied={this.handlePermissionDenied.bind(this)}
                  timeout={5000}
                  title={this.state.notifyTitle}
                  options={this.state.notifyOptions}
                />
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

  renderReadingPeriod(ind) {
    const {sendMessage, user, chat, batch, currentRound} = this.props;
    const task = batch.tasks[batch.currentRound - 1];

    const inputProps = {
      placeholder: 'type here...',
      value: this.state.message,
      onChange: this.handleType,
      onKeyDown: this.handleSubmit,
      className: 'chat__field-input'
    };
    let md;
    // if (batch.cases && batch.cases.length && batch.roundPairs && batch.roundPairs.length) {
    //   const currentPair = batch.roundPairs.find(x => x.pair.some(y => Number(y.roundNumber) === batch.currentRound - 1))
    //   const currentCaseNumber = currentPair.caseNumber;
    //   const currentVersionNumber = currentPair.pair.find(x => Number(x.roundNumber) === batch.currentRound - 1).versionNumber;
    //   const currentPartNumber = ind;
    //   md = batch.cases[currentCaseNumber].versions[currentVersionNumber].parts[currentPartNumber];
    //   console.log(currentCaseNumber, currentVersionNumber, currentPartNumber, md)
    // }
    if (!md || md.text === '') {
      md = {};
      md.text = task.readingPeriods[ind].message;
    }
    console.log('md', md);
    const converter = new showdown.Converter();
    let html = converter.makeHtml(md.text);
    console.log('html', html)
    html = html.split('>').join(' style=\'color:black\'>') // changes all the colors in html to black, color in showdown lib is bugged probably
    return (
        <div className='chat'>
          <div className='chat__readingPeriod' style={{ marginLeft: 10 }}>
            {task.readingPeriods && task.readingPeriods.length &&
            <div className='chat__dialog-pinned-message' style={{maxHeight: '90%', color: 'black'}}>
              <div className='chat__dialog-pinned-resources'>
                <p style={{color: 'black'}}>helperBot</p>
              </div>
              {task.readingPeriods && task.readingPeriods.length &&
              <div
                  // style={{overflow: 'auto'}}
                  dangerouslySetInnerHTML={{__html: html }}/>}
            </div>}
          </div>
        </div>
    )
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
  let limit = 999;
  if (batch) {
    // for both, make it look like the batch will start at size**2 users
    // = limit is different than when batch is actually ready
    limit = batch.teamSize ** 2;
  }
  // for single teams, make it seem like we're accumultaing more people for every person that joins
  let disp_activecounter = 0;
  if (batch) {
    disp_activecounter = (batch.teamFormat === 'single') ? batch.teamSize * batch.users.length : batch.users.length;
  } 
  return {
    limit: limit,
    activeCounter: batch ? disp_activecounter : 0, 
    user: state.app.user,
    batch: batch,
    chat: chat,
    currentRound: round,
    currentTeam: state.batch.currentTeam,
    teamAnimals: state.batch.teamAnimals,
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadBatch,
    sendMessage,
    submitSurvey,
    vote,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Batch);