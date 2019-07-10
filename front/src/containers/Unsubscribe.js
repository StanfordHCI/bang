/** Unsubscribe.js
 *
 * Allows a worker with 'willbang' status to unsubscribe from our email lists
 *
 * */

import React, { PureComponent, Component } from "react";
import { connect } from "react-redux";
import { Button, Card, CardBody, Container, Col, Row } from "reactstrap";

class Unsubscribe extends Component {
  //PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      parsedUrl: "",
      mTurkId: "",
      error: "",
      isReady: false
    };
    this.handleChange = this.handleChange.bind(this);
  }

  componentWillMount() {
    // Parse from the link if there is no mTurkId in the box 
    // and there is a value in a link
    this.setState({
      isReady: true,
      mTurkId:
        this.state.mTurkId == "" && this.props.match.params.id
          ? this.props.match.params.id
          : this.state.mTurkId
    });
  }

  handleChange(event) {
    this.setState({ mTurkId: event.target.value });
  }

  render() {
    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && (
                <CardBody>
                  <div className="card__title">
                    <h5 className="bold-text">Unsubscribe</h5>
                  </div>
                  <div>
                    Please, contact us if you have <b>already</b> completed the
                    study <b>but</b> still receive emails. You will not be able
                    to unsubscribe through this page.
                    <br />
                    Otherwise, if you were in a <b>waiting room</b> at some
                    point <b>and never got to complete the HIT</b>, you may use
                    this page to unsubscribe.
                    <br />
                    Upon unsubscription, you will still be allowed to complete the HIT.
                    <br />
                    <br />
                  </div>
                  <div>
                    <input
                      style={{ minWidth: "100%" }}
                      autoFocus
                      value={this.state.mTurkId ? this.state.mTurkId : ""}
                      placeholder={"Enter your mTurkId here"}
                      onChange={this.handleChange}
                    />
                    <Button
                      style={{
                        display: "flex",
                        minWidth: "10%",
                        marginTop: "20px"
                      }}
                      onClick={() => alert(`You wanna unsubscribe mTurkId = ${this.state.mTurkId}`)}
                      className="btn btn-primary"
                    >
                      Unsubscribe
                    </Button>
                  </div>
                </CardBody>
              )}
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default connect(
  null,
  null
)(Unsubscribe);
