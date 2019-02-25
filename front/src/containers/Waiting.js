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

class Waiting extends React.Component {

  constructor(props) {
    super(props);
    let adr = ''//process.env.API_HOST.substr(1, process.env.API_HOST.length - 2);
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
                  <h5 className='bold-text'>Waiting room</h5>
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

export default connect(mapStateToProps, mapDispatchToProps)(Waiting);