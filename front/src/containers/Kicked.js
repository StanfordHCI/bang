/** notlogged.js
 *  front-end
 *
 *  error message if user was kicked
 *
 *  renders:
 *    1. If user was inactive and got kicked
 *
 *  called by:
 *    1. router.js
 */

import React from 'react';
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";

class Kicked extends React.PureComponent {
    render() {
        return (
            <Container>
                <Row>
                    <Col md={12} lg={12} xl={12}>
                        <Card>
                            <CardBody>
                                <div className='card__title'>
                                    <h5 className='bold-text'>This task requires workers to be active in every
                                        round to work.</h5>
                                    <p>Because you were not active in the last round your session has been stopped.</p>
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

export default connect(mapStateToProps, mapDispatchToProps)(Kicked);