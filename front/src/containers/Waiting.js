import React from 'react';
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {findDOMNode} from 'react-dom'
import {bindActionCreators} from "redux";
import {socket} from 'Actions/app'

const MAX_LENGTH = 240;

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
    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Waiting room</h5>
                </div>
                <h5 className='bold-text'>{this.state.activeCounter} active clients</h5>
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