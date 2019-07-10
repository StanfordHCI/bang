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
      error: ""
      // isReady: false,
    };
  }

  componentWillMount() {
    // Promise.all([
    //   this.props.loadTemplate(this.props.match.params.id),
    // ])
    //   .then(()=>{
    //     this.setState({isReady: true})
    //   })
  }

  render() {
    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {/* {
            this.state.isReady &&  */}
              <CardBody>
                <div className="card__title">
                  <h5 className="bold-text">Unsubscribe</h5>
                </div>
                <div>
                    Please, contact us if you have already completed the study and still receive the emails. You will not be able to unsubscribe through this page.<br /> 
                    Otherwise, if you were in a waiting room at some point and never got to complete the HIT, you may use this page to unsubscribe.<br />
                    If successful, will allow you to complete the HIT.<br /><br />
                </div>
                <div
                  style={{
                    // justifyContent: "center",
                    // alignItems: "center",
                    // padding: "20px"
                  }}
                >
                  <input
                    style={{ minWidth: "100%" }}
                    placeholder="Your mTurkId"
                  />
                  <Button
                    style={{ display: "flex", minWidth: "10%", marginTop: "20px" }}
                    onClick={() => alert("You clicked on Join Batch")}
                    className="btn btn-primary"
                  >
                    Unsubscribe
                  </Button>
                </div>
              </CardBody>
              {/* div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "20px"
                }} 
              </div>
              {/* } */}
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
