import React from 'react';
import {Col, Button, ButtonToolbar, Row, Container} from 'reactstrap';
import {connect} from 'react-redux'
import {Field, FieldArray, reduxForm, formValueSelector, change} from 'redux-form'
import {bindActionCreators} from "redux";
import {renderField} from 'Components/form/Text'

const renderSteps = ({fields, meta: {touched, error, warning}, numRounds}) => {
  return (<div>
    {
      fields.map((step, index) => {
        return (
          <Row>
            <Col>
              <div key={index} className='form__form-group'>
                <label className='form__form-group-label'>step time:</label>
                <div className='form__form-group-field'>
                  <Field
                    name={`${step}.time`}
                    component={renderField}
                    type='number'
                  />
                </div>
                <label className='form__form-group-label'>step message:</label>
                <div className='form__form-group-field'>
                  <Field
                    name={`${step}.message`}
                    component={renderField}
                    type='text'
                  />
                </div>
              </div>
            </Col>
            <Col>
              <div className='centered-and-flexed'>
                <Button type="button" size="sm"
                        onClick={() => fields.splice(index, 1)}>Delete step</Button>
              </div>
            </Col>
          </Row>)
      })}
    {fields.length < 5 && <Row className="centered-and-flexed" noGutters>
      <Button type="button" size="sm" onClick={() => fields.push({})}>
        <i className="fa fa-plus"/>Add step
      </Button>
    </Row>}
  </div>)
}


const renderTasks = ({fields, meta: {touched, error, warning}, numRounds}) => {
  let tasks = [];
  for (let i = 0; i < numRounds; i++) {
    tasks.push(
      <div key={i} className='form__form-group'>
        <label className='form__form-group-label'>task:</label>
        <div className='form__form-group-field'>
          <Field
            name={`tasks[${i}].message`}
            component={renderField}
            type='text'
          />
        </div>
        <FieldArray
          name={`tasks[${i}].steps`}
          component={renderSteps}
          rerenderOnEveryChange
        />
      </div>
    )
  }

  return (<div style={{marginTop: '20px'}}>
    {tasks}
  </div>)
};

class TemplateForm extends React.Component {

  constructor() {
    super();
    this.state = {};
  }

  render() {
    const {invalid, numRounds} = this.props;

    return (<div>
        <form className='form form--horizontal' style={{paddingBottom: '5vh'}} onSubmit={this.props.handleSubmit}>
        <Container>
          <Row>
            <Col><div className='form__panel'>
            <div className='form__panel-body'>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Name:</label>
                <div className='form__form-group-field'>
                  <Field
                    name='name'
                    component={renderField}
                    type='text'
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Team size:</label>
                <div className='form__form-group-field'>
                  <Field
                    name='teamSize'
                    component={renderField}
                    type='number'
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Round minutes:</label>
                <div className='form__form-group-field'>
                  <Field
                    name='roundMinutes'
                    component={renderField}
                    type='number'
                  />
                </div>
              </div>
            </div>
            <div className='form__form-group'>
              <label className='form__form-group-label'>Number of rounds:</label>
              <div className='form__form-group-field'>
                <Field
                  name='numRounds'
                  component={renderField}
                  type='number'
                />
              </div>
            </div>
            <FieldArray
              name="teams"
              component={renderTasks}
              rerenderOnEveryChange
              numRounds={numRounds}
            />
          </div></Col>
          </Row>
          <Row>
            <Col>
              <ButtonToolbar className='mx-auto form__button-toolbar'>
                <Button color='primary' size='sm' type='submit' disabled={invalid}>Submit</Button>
              </ButtonToolbar>
            </Col>
          </Row>
        </Container>
        </form>
      </div>
    )
  }
}

const validate = (values, props) => {
  const errors = {};
  if (!values.name) {
    errors.name = 'required'
  } else if (values.name.length > 25) {
    errors.name = 'must be 25 characters or less'
  }
  if (!values.numRounds) {
    errors.numRounds = 'required'
  } else if (parseInt(values.numRounds) !== 4) { //will be changed later
    errors.numRounds = 'invalid value'
  }
  if (!values.teamSize) {
    errors.teamSize = 'required'
  } else if (parseInt(values.teamSize) !== 2) { //will be changed later
    errors.teamSize = 'invalid value'
  }
  if (!values.roundMinutes) {
    errors.roundMinutes = 'required'

  } else if (values.roundMinutes < 1 || values.roundMinutes > 59) {
    errors.roundMinutes = 'invalid value'
  }

  return errors
};

TemplateForm = reduxForm({
  form: 'TemplateForm',
  enableReinitialize: true,
  validate,
})(TemplateForm);

const selector = formValueSelector('TemplateForm');

function mapStateToProps(state) {
  return {
    numRounds: selector(state, 'numRounds'),
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TemplateForm);