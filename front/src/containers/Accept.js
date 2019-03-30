import React from 'react';
import {Card, CardBody, Col, Row, Container, Button} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {joinBang} from 'Actions/app'

class Accept extends React.PureComponent {
  handleSubmit = () => {

  }

  render() {
    const {joinBang, user} = this.props;

    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <p className='bold-text'>We are planning to run an ad writing task on during the following timeslots.
                    The task takes approximately 40-50 minutes and if you stay for the whole task, we bonus to a rate of approximately $10.50 per hour.
                    If you submit this HIT, you may be notified when we launch the task and may receive future notifications about our HITs until
                    you have completed that task. Space is limited and submitting this HIT does not guarantee you will be able to participate.</p>
                  <div id="Submit">
                    <form
                      id="submitForm"
                      method="POST"
                      action="https://www.mturk.com/mturk/externalSubmit/"
                    >
                      <input type='hidden' value={user.assignmentId} name='assignmentId' id='assignmentId'/>
                      <input type='hidden' value='WorkerNotification' name='submitCode' id='submitCode'/>
                      <Button
                        className="btn btn-primary"
                        onClick={() => joinBang()}
                        type="submit"
                        id="submitButton"
                      >
                        Join Bang
                      </Button>
                    </form>
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
    user: state.app.user
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    joinBang
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Accept);