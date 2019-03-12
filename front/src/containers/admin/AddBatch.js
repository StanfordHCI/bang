import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Badge, Row, Container, Button, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import {connect} from "react-redux";
import {addBatch, loadTemplatesList} from "Actions/admin";
import {bindActionCreators} from "redux";
import BatchForm from './BatchForm'
import moment from 'moment'

class BatchInfo extends PureComponent {
  constructor(props) {
    super(props);
  }

  componentWillMount(){
    this.props.loadTemplatesList();
  }

  handleSubmit(form) {
    this.props.addBatch(form)
  }

  render() {
    return (
      <Container>
        <Card>
          <CardBody>
            <div className='card__title'>
              <h5 className='bold-text'>Add batch</h5>
            </div>
            <TemplateForm
              isAdd
              onSubmit={this.props.addBatch}
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
    addBatch,
    loadTemplatesList
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(BatchInfo);
