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
                  <Button
                    className="btn btn-primary"
                    onClick={() => joinBang()}
                    type="submit"
                    id="submitButton"
                  >
                    Join Bang
                  </Button>
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