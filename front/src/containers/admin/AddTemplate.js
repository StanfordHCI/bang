/** AddTemplate.js
 *  front-end
 * 
 *  admin only layout for adding a template
 * 
 *  called by:
 *    1. Router.js    
 */

 import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Badge, Row, Container, Button, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import {connect} from "react-redux";
import {addTemplate} from "Actions/templates";
import {loadSurveyList} from "Actions/surveys";
import {bindActionCreators} from "redux";
import TemplateForm from './TemplateForm'
import moment from 'moment'

class AddTemplate extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isReady: false
    };
  }

  componentWillMount(){
    Promise.all([
      this.props.loadSurveyList({full: true})
    ])
      .then(()=>{
        this.setState({isReady: true})
      })
  };

  render() {
    return (
      <Container style={{maxWidth: '100%'}}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Add template</h5>
                </div>
                <TemplateForm
                  isAdd
                  initialValues={{tasks: []}}
                  onSubmit={this.props.addTemplate}
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
    addTemplate,
    loadSurveyList
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AddTemplate);
