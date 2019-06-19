/** notlogged.js
 *  front-end
 * 
 *  error message if user has invalid bang-token 
 *  
 *  renders:  
 *    1. if we directly go to server without correct bang-token
 * 
 *  called by:
 *    1. router.js
 */

import React from 'react';
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";

class NotLogged extends React.PureComponent {
  render() {
    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Not logged in as a valid user. Wrong credentials.</h5>
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

  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({

  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(NotLogged);