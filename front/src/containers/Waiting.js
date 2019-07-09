/** Waiting.js
 *  front-end
 * 
 *  display waiting room info to worker
 *  
 *  renders:  
 *    1. when worker is waiting
 * 
 *  called by:
 *    1. Router.js
 */


import React from 'react';
import {Card, CardBody, Col, Row, Container, Button} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {socket} from 'Actions/app'
import {joinBatch, refreshActiveUsers} from 'Actions/batches'

class Waiting extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeCounter: 0,
      limit: 999,
      batchReady: false,
      isReady: false,
      ignore: true,
      title: ''
    };
    this.refresher = this.refresher.bind(this)
    socket.on('clients-active', this.refresher)
  }

  componentDidMount() {
    refreshActiveUsers()
  }

  refresher(data) {
    this.setState({activeCounter: data.activeCounter, batchReady: data.batchReady, limit: data.limit, isReady: true});
  }

  render() {
    const {user, joinBatch} = this.props;
    const limit = this.state.limit;

    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Waiting room</h5>
                </div>
                {this.state.batchReady && <div>
                  <p>Hello! Thanks for accepting our task.</p>
                  <p>The task will only begin once {limit} users accept the task.</p>
                  <p>With "Join Batch" button, you will be redirected to a chatroom that ensures that other MTurkers are present and not away from keyboard. You will only remain in the chatroom until everyone has clicked the button to join the batch.</p>
                  <p>After everyone joins the batch, the task will initiate! IMPORTANT: If you intend to complete the task, please do not leave because it will mean other MTurkers will have to wait longer for the task.</p>
                  <p>Provided you stay for the whole task, we will bonus to a rate of approximately $12 per hour. If there are never enough people, we will automatically submit and accept for the base rate.</p>
                  <Button className="btn btn-primary" onClick={() => joinBatch()}>Join Batch</Button>
                </div>}
                {!this.state.batchReady && <div>
                  <p>We don't have an experiment right now. Join us later please. We will notify you.</p>
                </div>}
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
    user: state.app.user,
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    joinBatch,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Waiting);