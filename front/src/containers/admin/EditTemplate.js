/** EditTemplate.js
 *  code scrap 
 */

import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Badge, Row, Container, Button, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import {connect} from "react-redux";
import {addTemplate, updateTemplate} from "Actions/admin";
import {bindActionCreators} from "redux";
import TemplateForm from './TemplateForm'
import moment from 'moment'

class EditTemplate extends PureComponent {
  constructor(props) {
    super(props);
    state: {
      isReady: false
    }
  }

  componentDidMount = async () => {
    await this.props.loadTemplate(this.props.match.params.id);
    this.setState({isReady: true})
  }

  render() {
    return (
      <Container>
        {this.state.isReady && <Card>
          <CardBody>
            <div className='card__title'>
              <h5 className='bold-text'>Edit template</h5>
            </div>
            <TemplateForm
              isEdit
              onSubmit={this.props.updateTemplate}
              initialValues={this.props.template}
            />
          </CardBody>
        </Card>}
      </Container>
    )
  }
}

function mapStateToProps(state) {
  return {
    template: state.admin.template
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    addTemplate,
    updateTemplate
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(EditTemplate);
