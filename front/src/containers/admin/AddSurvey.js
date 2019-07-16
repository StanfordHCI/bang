/** AddSurvey.js
 *  front-end
 *
 *  admin only layout for adding a survey
 *
 *  called by:
 *    1. Router.js
 */

import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Badge, Row, Container, Button, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import {connect} from "react-redux";
import {addSurvey} from "Actions/surveys";
import {loadSurveyList} from "Actions/surveys";
import {bindActionCreators} from "redux";
import SurveyForm from './SurveyForm'
import moment from 'moment'

class AddSurvey extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isReady: true
    };
  }

  render() {
    return (
      <Container>
        <Card>
          {this.state.isReady && <CardBody>
            <div className='card__title'>
              <h5 className='bold-text'>Add survey</h5>
            </div>
            <SurveyForm
              isAdd
              initialValues={{tasks: []}}
              onSubmit={this.props.addSurvey}
            />
          </CardBody>}
        </Card>
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
    addSurvey,
    loadSurveyList
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AddSurvey);
