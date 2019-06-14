import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Badge, Row, Container, Button, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import {connect} from "react-redux";
import {addTemplate} from "Actions/admin";
import {bindActionCreators} from "redux";
import TemplateForm from './TemplateForm'
import moment from 'moment'

class AddTemplate extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Container>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Add template</h5>
                </div>
                <TemplateForm
                  isAdd
                  onSubmit={this.props.addTemplate}
                />
              </CardBody>
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
    addTemplate
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AddTemplate);
