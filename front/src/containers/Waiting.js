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
import Modal from 'Components/Modal'
// import { getUrlParams } from "../utils";

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

  showFAQ = () => {

  }

  render() {
    const {user, joinBatch} = this.props;
    const limit = this.state.limit;
    const topPadding = {
      marginTop: '36px',
    };
    // const [batchId, genNumber] = [getUrlParams().batchid, getUrlParams().gennumber]
    // if (batchId && genNumber)

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
                  <p>The waiting chat last up to <b>35 minutes</b>. If there are never {limit} users within this time, the waiting period will terminate. </p>

                  <p> <b>IMPORTANT:</b> If you intend to complete the task, please do not leave because it will mean other MTurkers will have to wait longer for the task. If enough people arrive, you'll be bonused $1 for waiting. Provided you stay for the <b>whole task,</b> we will bonus to a rate of approximately <b>$12 per hour</b>. If there are never enough people, we will automatically submit and accept for the base rate.</p>
                  
                  
                  <Button className="btn btn-primary" onClick={() => joinBatch()}>Join Batch</Button>
                  <Modal color='primary' btn='FAQ'
                         content={(<Container className="faq" >
                           <h4>Frequently Asked Questions</h4>
                           <p>Hello! Thanks for coming to our FAQ page. We are always
                             trying to make our tasks better and more clear. We put together this
                             FAQ to answer your questions. Please feel free to email us if your question isn't listed here.
                           </p>
                           <br></br>
                           <h5>Why do we have to wait?</h5>
                           <p>This experiment is a group task, and we need enough people to be online at the same time so that they can collaborate with each other! The reason you’re waiting is because we need to get enough people to collaborate in groups, and then everyone can start at the same time.
                           </p>
                           <h5>What is the purpose of helperBot/Waiting room?</h5>
                           <p>The bot and waiting room lets us know that users are engaged in the task and that we can move forward to the main experiment once enough are ready. </p>
                           <p>We realize that the attention checks from the helperBot can be a little bit annoying, but it’s the best way for us to make sure that you’re ready to go so that the experiment will run smoothly from the get-go. </p>
                           <h5>Will I be paid for waiting?</h5>
                           <p>Yes, you will be paid $1 for waiting if we get enough people. </p>
                           <h5>How much will I be paid for the task?</h5>
                           <p>Provided you stay for the entire task, we will bonus at a rate of $12/hr.</p>
                           <h5>I was waiting. Why did the task cancel?</h5>
                           <p>To prevent excessive waiting, we will cancel the task if we don't get enough users
                             to begin the task. As we stated before, you will be paid $1 for waiting. </p>

                         </Container>)}
                  />
                </div>}
                {!this.state.batchReady && <div>
                  <p>Hey! Thanks for accepting our task. 

                  We send out an email immediately after our experiments launch. We don't have an experiment right now, which means that the task filled up with other users before you got here. 
                  Join us later please! We will notify you.</p>
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