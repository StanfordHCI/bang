/** Chat.js
 *  front-end
 * 
 *  display chat log without input option
 *  
 *  renders:  
 *    1. when admin is looking at batch results
 * 
 *  called by:
 *    1. BatchResult.js
 */

import React from 'react';
import { Card, CardBody, Col, Row, Container, Table } from 'reactstrap';
import { connect } from "react-redux";
import { findDOMNode } from 'react-dom'
import { bindActionCreators } from "redux";
import moment from 'moment'
import Linkify from 'react-linkify';
import defaultImage from '../img/av.png'

const MAX_LENGTH = 240;
const botId = '100000000000000000000001'

const componentDecorator = (href, text, key) => (
  <a href={href} key={key} target="_blank">
    {text}
  </a>
);

class Chat extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      message: '',
    };
    this.refresher = this.refresher.bind(this)
  }

  componentDidUpdate() {
    this.scrollDown();
  }

  refresher(data) {
    let chat = this.state.chat;
    chat.push(data);
    this.setState({ chat: chat });
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

    const members = this.props.members;
    const chat = this.props.chat;

    return (
      <Container>
        <Row style={{ margin: '20px 0px' }}>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {chat && members && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Chat</h5>
                </div>
                <div className='chat' style={{ height: '300px' }}>
                  <div className='chat__contact-list'>
                    <div className='chat__contacts'>
                      <Table className='table table--bordered table--head-accent'>
                        <thead>
                          <tr>
                            <th>members (fake | real (mturkId))</th>
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
                  <div className='chat__dialog' style={{ marginLeft: 10 }}>
                    <div className="chat__scroll" ref="chatScroll" style={{ height: '100%' }}>
                      <div className='chat__dialog-messages-wrap'>
                        <div className='chat__dialog-messages'>
                          {chat.messages.map((message, index) => {
                            let messageClass = 'chat__bubble';
                            let messageContent = message.message;

                            // specially format bot messages
                            if (message.user.toString() === botId) {
                              messageClass = 'chat__bubble chat_bot'
                              messageContent = (<Linkify componentDecorator={componentDecorator}>{message.message}</Linkify>);
                            }

                            return (
                              <div className={messageClass} key={index + 1}>
                                <div className='chat__bubble-message-wrap'>
                                  <p className='chat__bubble-contact-name'>{message.nickname}</p>
                                  <p className='chat__bubble-message'>{messageContent}</p>
                                  <p className='chat__bubble-date'>{moment(message.time).format('LTS')}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>}
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