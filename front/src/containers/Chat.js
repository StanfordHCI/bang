import React from 'react';
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {findDOMNode} from 'react-dom'
import {bindActionCreators} from "redux";
import openSocket from 'socket.io-client';
import moment from 'moment'
import defaultImage from '../img/av.png'
let socket;

const MAX_LENGTH = 240;

class Chat extends React.Component {

  constructor(props) {
    super(props);
    let adr = process.env.API_HOST.substr(1, process.env.API_HOST.length - 2);
    socket = openSocket(adr);
    this.state = {
      chat: [],
      message: '',
      members: []
    };
    this.refresher = this.refresher.bind(this)
  }

  componentWillMount() {

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

  render() {

    const members = this.state.members;

    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Chat</h5>
                </div>
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
                        {members.map((member) => {
                          return <tr key={member._id}>
                            <td>
                              <div className='chat__bubble-contact-name'>
                                {member.nickname}
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
                          {this.state.chat.map((message, index) => {
                            let messageClass = message.user._id === this.props.currentUser._id ? 'chat__bubble chat__bubble--active' : 'chat__bubble';
                            return (
                              <div className={messageClass} key={index + 1}>
                                <img
                                  className='chat__bubble-avatar'
                                  src={defaultImage}
                                  alt='avatar'
                                />
                                <div className='chat__bubble-message-wrap'>
                                  <p className='chat__bubble-contact-name'>{message.user.nickname}</p>
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
                            //sendPoolMessage(this.props.match.params.id, this.state.message)
                          }
                        }}/>
                    </div>
                    {this.state.message.length > MAX_LENGTH &&
                    <p className='chat__error'>Message is too long (max length: {MAX_LENGTH} symbols)</p>}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }
}


function mapStateToProps(state) {
  return {
    currentUser: state.app.user,
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({

  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Chat);