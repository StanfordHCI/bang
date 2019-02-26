import React from 'react';
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {findDOMNode} from 'react-dom'
import {bindActionCreators} from "redux";
import moment from 'moment'
import {loadBatch, sendMessage} from 'Actions/batches'

const MAX_LENGTH = 240;

class Batch extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      chat: [],
      message: '',
      members: []
    };
    this.refresher = this.refresher.bind(this)
  }

  componentWillMount() {
    this.props.loadBatch()
  }

  componentDidUpdate() {
    this.scrollDown();
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
    const {sendMessage, user,chat} = this.props;

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
                return <tr key={member._id}>
                  <td>
                    <div className='chat__bubble-contact-name'>
                      {member.currentNickname}
                    </div>
                  </td>
                </tr>
              })}
              </tbody>
            </Table>
          </div>
        </div>
        <div className='chat__dialog' style={{marginLeft: 10}}>
          <div className="chat__scroll" ref="chatScroll">
            <div className='chat__dialog-messages-wrap'>
              <div className='chat__dialog-messages'>
                {chat.messages.map((message, index) => {
                  let messageClass = message.user === user._id ? 'chat__bubble chat__bubble--active' : 'chat__bubble';
                  return (
                    <div className={messageClass} key={index + 1}>
                      <div className='chat__bubble-message-wrap'>
                        <p className='chat__bubble-contact-name'>{message.nickname}</p>
                        <p className='chat__bubble-message'>{message.message}</p>
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
              className='chat__field-input'
              value={this.state.message}
              type='text'
              onChange={e => {
                this.setState({message: e.target.value})
              }}
              onKeyDown={(e) => {
                if (e.keyCode === 13 && this.state.message && this.state.message.length <= MAX_LENGTH) {
                  this.setState({message: ''});
                  sendMessage({message: this.state.message, nickname: user.currentNickname, chat: chat._id})
                }
              }}/>
          </div>
          {this.state.message.length > MAX_LENGTH &&
          <p className='chat__error'>Message is too long (max length: {MAX_LENGTH} symbols)</p>}
        </div>
      </div>
    )
  }

  renderWaitingStage(){
    return (<div>
      <h5 className='bold-text'></h5>
      {this.renderChat()}
    </div>)
  }

  renderSurvey() {
    return (<div>
      <h5 className='bold-text'>Place for survey logic.</h5>
    </div>)
  }

  renderActiveStage() {
    const batch = this.props.batch;
    const round = batch.rounds[batch.currentRound - 1];
    console.log(round)

    return round ? (<div>
      <h5 className='bold-text'>Round {batch.currentRound}</h5>
      {round.status === 'active' && this.renderChat()}
      {round.status === 'survey' && this.renderSurvey()}
    </div>) : (
      <div>
        <h5 className='bold-text'>Wait for round start</h5>
      </div>
    )
  }

  renderCompletedStage() {
    return (<div>
      <h5 className='bold-text'>Experiment completed.</h5>
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
  return {
    user: state.app.user,
    batch: state.batch.batch,
    chat: state.batch.chat
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadBatch,
    sendMessage
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Batch);