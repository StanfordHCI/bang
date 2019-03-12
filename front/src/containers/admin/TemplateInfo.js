import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Badge, Row, Container, Button, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import {connect} from "react-redux";
import {loadTemplate, updateTemplate} from "Actions/admin";
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
    ])
      .then(()=>{
        this.setState({isReady: true})
      })
  };

  render() {
    const {template, updateTemplate} = this.props;

    return (
      <Container>
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
    template: state.admin.template
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadTemplate,
    updateTemplate
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TemplateInfo);
