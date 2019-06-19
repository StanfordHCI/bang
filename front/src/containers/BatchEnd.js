/** BatchEnd.js
 *  front-end
 *
 *  worker view of end of batch with end message about bonus
 *
 *  major functions:
 *  - fuzzyMatched = user pairing alg
 *  - autocomplete methods
 *  - methods to render each of the workflow pages (chat, midsurvey, postsurvey)
 *
 *  renders:
 *    1. when admin is looking at batch
 *
 *  called by:
 *    1. router.js
 */

import React from 'react';
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";

class BatchEnd extends React.PureComponent {
  render() {
    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <p>Thank you for your work. We will pay you shortly for your work based on $12/hour pay rate.</p>
                <p>If you faced any problems, please contact us on our HIT page.</p>
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

  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({

  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(BatchEnd);