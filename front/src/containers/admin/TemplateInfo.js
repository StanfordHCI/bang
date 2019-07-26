/** TemplateInfo.js
 *  front-end
 * 
 *  admin only layout for editing a template
 *  note: the actual file called edittemplate is a code scrap
 * 
 *  called by:
 *    1. Router.js    
 */

import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Badge, Row, Container, Button, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import {connect} from "react-redux";
import {loadTemplate, updateTemplate} from "Actions/templates";
import {loadSurveyList} from "Actions/surveys";
import {bindActionCreators} from "redux";
import TemplateForm from './TemplateForm'
import moment from 'moment'

class TemplateInfo extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isReady: false
    };
  }

  componentWillMount(){
    Promise.all([
      this.props.loadTemplate(this.props.match.params.id),
      this.props.loadSurveyList({full: true})
    ])
      .then(()=> {
        this.setState({isReady: true})
      })
  };

  render() {
    const {template, updateTemplate} = this.props;

    return (
      <Container style={{maxWidth: '100%'}}>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Template Info</h5>
                </div>
                <TemplateForm initialValues={template} onSubmit={updateTemplate}/>
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
    template: state.template.template,

  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadTemplate,
    updateTemplate,
    loadSurveyList
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TemplateInfo);
