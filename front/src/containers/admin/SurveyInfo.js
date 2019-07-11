/** SurveyInfo.js
 *  front-end
 *
 *  admin only layout for editing a survey
 *  note: the actual file called editsurvey is a code scrap
 *
 *  called by:
 *    1. Router.js
 */

import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Badge, Row, Container, Button, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import {connect} from "react-redux";
import {loadSurvey, updateSurvey} from "Actions/surveys";
import {loadSurveyList} from "Actions/surveys";
import {bindActionCreators} from "redux";
import SurveyForm from './SurveyForm'
import moment from 'moment'

class SurveyInfo extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isReady: false
    };
  }

  componentWillMount(){
    Promise.all([
      this.props.loadSurvey(this.props.match.params.id),
    ])
      .then(()=>{
        this.setState({isReady: true})
      })
  };

  render() {
    const {survey, updateSurvey} = this.props;

    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Survey Info</h5>
                </div>
                <SurveyForm initialValues={survey} onSubmit={updateSurvey}/>
              </CardBody>}
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }
}

function mapStateToProps(state) {
  return {
    survey: state.survey.survey
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadSurvey,
    updateSurvey,
    loadSurveyList
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SurveyInfo);
