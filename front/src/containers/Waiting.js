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

  componentWillMount() {

  }

  refresher(data) {
    this.setState({activeCounter: data});
  }

  render() {
    const {user, limit, joinBatch} = this.props;
    console.log(limit)

    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Waiting room</h5>
                </div>
                <h5 className='bold-text' style={{marginBottom: '20px'}}>Active clients count: {this.state.activeCounter} of {limit}</h5>
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