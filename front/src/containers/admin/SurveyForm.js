/** TemplateForm.js
 *  front-end
 *
 *  admin only layout for adding / editing (validating) a survey
 *
 *  called by:
 *    1. AddTemplate.js
 *    2. EditTemplate.js (empty, code scrap)
 *    3. TemplateInfo.js
 */

import React from 'react';
import {Col, Button, ButtonToolbar, Row, Container} from 'reactstrap';
import {connect} from 'react-redux'
import {Field, FieldArray, reduxForm, formValueSelector, change} from 'redux-form'
import {bindActionCreators} from "redux";
import {renderField, renderTextArea} from 'Components/form/Text'
import renderSelectField from 'Components/form/Select'
import renderMultiSelectField from 'Components/form/MultiSelect'
import {generateComb} from '../../app/utils'
import Select from "react-select";


const renderSurvey = ({fields, meta: {touched, error, warning}, questions}) => {
  return (<div style={{width: '100%', marginTop: '20px', borderBottom: '2px solid grey'}}>
    {
      fields.map((question, index) => {
        return (
          <Row key={index} >
            <Col>
              <div className='form__form-group'>
                <label className='form__form-group-label'>question:</label>
                <div className='form__form-group-field'>
                  <Field
                    name={`${question}.question`}
                    component={renderField}
                    type='text'
                  />
                </div>
                <label className='form__form-group-label'>answer type:</label>
                <div className='form__form-group-field'>
                  <Field
                    name={`${question}.type`}
                    component={renderSelectField}
                    type='text'
                    options={[{value: 'text', label: 'text'}, {value: 'select', label: 'select'}]}
                  />
                </div>
              </div>
              {questions && questions[index] && questions[index].type === 'select' &&
              <FieldArray
                name={`${question}.options`}
                component={renderQuestionOptions}
                rerenderOnEveryChange
              />
              }
            </Col>
            <Col>
              <div className='centered-and-flexed'>
                <Button type="button" size="sm"
                        onClick={() => fields.splice(index, 1)}>delete question</Button>
              </div>
            </Col>
          </Row>)
      })}
    <Row className="centered-and-flexed" noGutters>
      <Button type="button" size="sm" onClick={() => fields.push({})}>
        <i className="fa fa-plus"/>add question
      </Button>
    </Row>
  </div>)
}

const renderQuestionOptions = ({fields, meta: {touched, error, warning}, numRounds}) => {
  return (<div style={{width: '100%'}}>
    {
      fields.map((step, index) => {
        return (
          <Row key={index}>
            <div className='form__form-group' style={{maxWidth: '300px', marginLeft: '50px'}}>
              <label className='form__form-group-label' style={{maxWidth: '50px'}}>option: </label>
              <div className='form__form-group-field'>
                <Field
                  name={`${step}.option`}
                  component={renderField}
                  type='text'
                />
              </div>
            </div>
            <div className='centered-and-flexed'>
              <Button type="button" size="sm"
                      onClick={() => fields.splice(index, 1)}>delete option</Button>
            </div>
          </Row>)
      })}
    <Row className="centered-and-flexed" noGutters>
      <Button type="button" size="sm" onClick={() => fields.push({})}>
        <i className="fa fa-plus"/>add option
      </Button>
    </Row>
  </div>)
}

class SurveyForm extends React.Component {

  constructor() {
    super();
    this.state = {

    };
  }

  dispatchJsonData = (data) => {
    const survey = JSON.parse(data.target.result)
    for (let i in survey) {
      this.props.dispatch(change('SurveyForm', i, survey[i]))
    }
    console.log(survey)
  }

  handleFileUpload = event => {
    const file = event.target.files[0];
    let fileReader = new FileReader();
    fileReader.onloadend = this.dispatchJsonData
    fileReader.readAsText(file);
  }

  render() {
    const {invalid, questions, pristine, isAdd} = this.props;

    return (<div>
        <form className='form form--horizontal' style={{paddingBottom: '5vh'}} onSubmit={this.props.handleSubmit}>
          <Container>
            <Row>
              <Col><div className='form__panel'>
                <div className='form__panel-body' style={{borderBottom: '2px solid grey'}}>
                  <Row style={{paddingBottom: '10px'}}>
                    <input type="file" name="json" id="json" onChange={this.handleFileUpload} />
                  </Row>
                  <Row>
                    <Col className='form__form-group'>
                      <label className='form__form-group-label'>Name:</label>
                      <div className='form__form-group-field'>
                        <Field
                          name='name'
                          component={renderField}
                          type='text'
                        />
                      </div>
                    </Col>
                  </Row>
                </div>
                <FieldArray
                  name="questions"
                  component={renderSurvey}
                  rerenderOnEveryChange
                  questions={questions}
                />
              </div></Col>
            </Row>
            <Row>
              <Col>
                <ButtonToolbar className='mx-auto form__button-toolbar'>
                  <Button color='primary' size='sm' type='submit' disabled={invalid || (!isAdd && pristine)}>Submit</Button>
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

  errors.questions = [];

  if (!values.questions || !values.questions.length) {
    errors.name = 'add questions please';
  } else if (values.questions) for (let j = 0; j < values.questions.length; j++){
    const question = values.questions[j];
    errors.questions[j] = {};
    if (!question.question) {
      errors.questions[j].question = 'required';
    }
    if (!question.type) {
      errors.questions[j].type = 'required';
    } else if (question.type === 'select' && (!question.options || question.options.length < 2 )) {
      errors.questions[j].type = 'add options please';
    }

  }

  return errors
};

SurveyForm = reduxForm({
  form: 'SurveyForm',
  enableReinitialize: true,
  touchOnChange: true,
  validate,
})(SurveyForm);

const selector = formValueSelector('SurveyForm');

function mapStateToProps(state) {
  return {
    questions: selector(state, 'questions'),
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SurveyForm);