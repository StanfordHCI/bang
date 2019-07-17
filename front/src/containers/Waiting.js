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
import {Link} from 'react-router-dom'

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
    const topPadding = {
      marginTop: '36px',
    };

    return (
      <Container style={topPadding}>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Waiting Room</h5>
                </div>
                {this.state.batchReady && <div>
                  <p>Hey there! Thanks for accepting our task.</p>
                  <p> The task has not started yet. After <b>everyone</b> joins the batch, the task will initiate! </p> 
                  
                  <p>
                  Our task requires {limit} users to participate simultaneously and <b>cannot start until all {limit} users have clicked “Join Batch” and are active at once.</b> Once there are {limit}  users in the waiting chat, they are moved into the actual task.</p>
                  <p>The waiting chat last up to <b>20 minutes</b>. If there are never {limit} users within this time, the waiting period will terminate. If the time limit is reached before enough before have arrived, you'll be paid $2 for waiting.</p>

                  <p> <b>IMPORTANT:</b> If you intend to complete the task, please do not leave because it will mean other MTurkers will have to wait longer for the task. If enough people arrive, you'll be bonused $1 for waiting. Provided you stay for the <b>whole task,</b> we will bonus to a rate of approximately <b>$12 per hour</b>. If there are never enough people, we will automatically submit and accept for the base rate.</p>
                  
                  
                  <Button className="btn btn-primary" onClick={() => joinBatch()}>Join Batch</Button>
                  <Button className="btn btn-secondary"> <Link className='noDecoration' target="_blank" to='/faq'> FAQ  </Link></Button>
                </div>}
                {!this.state.batchReady && <div>
                  <p>Hey! Thanks for accepting our task. We don't have an experiment right now, which means that the task filled up before you got here! 
                    </p>
                    <p>Join us later please. We will notify you.</p>
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