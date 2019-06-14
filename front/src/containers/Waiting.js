import React from 'react';
import {Card, CardBody, Col, Row, Container, Button} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {socket} from 'Actions/app'
import {joinBatch} from 'Actions/batches'

class Waiting extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeCounter: 0
    };
    this.refresher = this.refresher.bind(this)
    socket.on('clients-active', this.refresher)
  }

  componentDidMount() {
  }

  refresher(data) {
    console.log(data)
    this.setState({activeCounter: data});
  }

  render() {
    const {user, limit, joinBatch} = this.props;

    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Waiting room</h5>
                </div>
                <p>Waiting on <b>{limit - this.state.activeCounter > 0 ? limit - this.state.activeCounter : 0} </b>
                  more MTurk users to accept the task.</p>
                <p>Only wait if you can complete the entire task. If you leave early, you will not be paid. Provided you stay for the whole task, we will bonus to a rate of approximately $12 per hour.</p>
                <p>Once enough people have accepted, you will be able to begin the task.</p>
                <p>You will receive a browser notification when we are ready. If there are never enough people we will automatically submit and accept for the base rate.</p>
                {limit <= this.state.activeCounter &&
                  <Button className="btn btn-primary" onClick={() => joinBatch()}>Join Batch</Button>
                }
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
    user: state.app.user,
    limit: state.app.teamSize ** 2
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    joinBatch,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Waiting);