/** AddBatch.js
 *  front-end
 * 
 *  admin only layout for adding  a batch
 * 
 *  called by:
 *    1. Router.js    
 */

import React, {PureComponent} from 'react';
import {Card, CardBody, Col, Row, Container, Button, ButtonToolbar} from 'reactstrap';
import {connect} from "react-redux";
import {addBatch} from "Actions/admin";
import {loadTemplateList} from "Actions/templates";
import {bindActionCreators} from "redux";
import {Field, reduxForm} from "redux-form";
import {renderField, renderTextArea} from 'Components/form/Text'
import renderSelectField from 'Components/form/Select'


class AddBatch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isReady: false,
      options: [],
    }
  }

  componentWillMount(){
    this.props.loadTemplateList({full:true})
      .then(() => {
        let options = this.props.templateList.map(x => {return {value: x._id, label: x.name}})
        this.setState({isReady: true, options: options})
      })
  }

  handleSubmit(form) {
    let batch = Object.assign(this.props.templateList.find(x => x._id === form.template));
    batch.note = form.note;
    batch.maskType = form.maskType;
    batch.withAvatar = form.withAvatar;
    batch.withRoster = form.withRoster;
    this.props.addBatch(batch)
  }

  render() {
    const {invalid, handleSubmit} = this.props;

    return (
      <Container>
        <Card>
          {this.state.isReady && <CardBody>
            <div className='card__title'>
              <h5 className='bold-text'>Add batch</h5>
            </div>
            <form className='form form--horizontal' style={{paddingBottom: '5vh'}} onSubmit={handleSubmit(this.handleSubmit.bind(this))}>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Select template:</label>
                <div className='form__form-group-field'>
                  <Field
                    name='template'
                    component={renderSelectField}
                    options={this.state.options}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Masked?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='maskType'
                    component={renderSelectField}
                    options={[{value: 'masked', label: 'Masked'}, {value: 'unmasked', label: 'Unmasked'}]}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>With avatars?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='withAvatar'
                    component={renderSelectField}
                    options={[{value: true, label: 'With Avatars'}, {value: false, label: 'Without Avatars'}]}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>With team roster in final survey?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='withRoster'
                    component={renderSelectField}
                    options={[{value: true, label: 'With roster'}, {value: false, label: 'Without roster'}]}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Note</label>
                <div className='form__form-group-field'>
                  <Field
                    name='note'
                    component={renderTextArea}
                    type='text'
                    options={[{value: true, label: 'With roster'}, {value: false, label: 'Without roster'}]}
                  />
                </div>
              </div>
              <ButtonToolbar className='mx-auto form__button-toolbar'>
                <Button type="submit" disabled={invalid} color='primary' size='sm' >Add batch</Button>
              </ButtonToolbar>
            </form>
          </CardBody>}
        </Card>
      </Container>
    )
  }
}

const validate = (values, props) => {
  const errors = {};
  if (!values.template) {
    errors.template = 'required'
  }
  if (!values.maskType) {
    errors.maskType = 'required'
  }
  if (values.withAvatar == null) {
    errors.withAvatar = 'required'
  }
  if (values.withRoster == null) {
    errors.withRoster = 'required'
  }

  return errors
};

AddBatch = reduxForm({
  form: 'SurveyForm',
  enableReinitialize: true,
  touchOnChange: true,
  validate,
})(AddBatch);
function mapStateToProps(state) {
  return {
    templateList: state.template.templateList
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    addBatch,
    loadTemplateList
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AddBatch);
