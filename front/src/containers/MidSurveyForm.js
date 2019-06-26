/** midsurveyform.js
 *  front-end
 * 
 *  team viability questionnaire in middle
 *  
 *  renders:  
 *    1. during worker's mid-surveys (not read-only)
 *    2. when viewing results (as read-only)
 * 
 *  called by:
 *    1. Batch.js
 *    2. BatchResult.js
 */


import React from 'react';
import {Col, Button, ButtonToolbar, Row, Container} from 'reactstrap';
import {connect} from 'react-redux'
import {Field, FieldArray, reduxForm, formValueSelector, change} from 'redux-form'
import {bindActionCreators} from "redux";
import {renderField} from 'Components/form/Text'
import renderSelectField from 'Components/form/Select'

const qOptions = [
  {value: 1, label: 'Strongly Disagree'},
  {value: 2, label: 'Disagree'},
  {value: 3, label: 'Neutral'},
  {value: 4, label: 'Agree'},
  {value: 5, label: 'Strongly Agree'},
]

const renderQuestions = ({fields, meta: {touched, error, warning}, questions, readOnly}) => {
  let tasks = [];
  for (let i = 0; i < questions.length; i++) {
    tasks.push(
      <div key={i} className='form__form-group'>
        <label className='form__form-group-label'>{questions[i]}</label>
        <div className='form__form-group-field' style={{maxWidth: '200px'}}>
          <Field
            name={`questions[${i}].result`}
            component={renderSelectField}
            type='text'
            disabled={readOnly}
            options={qOptions}
          />
        </div>
      </div>
    )
  }

  return (<div style={{marginTop: '20px'}}>
    {tasks}
  </div>)
};

class MidSurveyForm extends React.Component {

  constructor() {
    super();
    this.state = {};
  }

  render() {
    const {invalid, questions, readOnly} = this.props;

    return (<div>
        <form className='form' style={{paddingBottom: '5vh'}} onSubmit={this.props.handleSubmit}>
          <Container>
            <Row>
              <Col>
                <div className='form__panel'>
                  <FieldArray
                    name="questions"
                    component={renderQuestions}
                    rerenderOnEveryChange
                    questions={questions}
                    readOnly={readOnly}
                  />
              </div>
              </Col>
            </Row>
            {!readOnly && <Row>
              <Col>
                <ButtonToolbar className='mx-auto form__button-toolbar'>
                  <Button color='primary' size='sm' type='submit' disabled={invalid}>Submit</Button>
                </ButtonToolbar>
              </Col>
            </Row>}
          </Container>
        </form>
      </div>
    )
  }
}

const validate = (values, props) => {
  console.log(values)
  const errors = {questions: []};
  if (values.questions) for (let i = 0; i < values.questions.length; i++) {
    if (!values.questions[i].result) {
      errors.questions[i] = {result: 'required'}
    }
  }

  return errors
};

MidSurveyForm = reduxForm({
  form: 'SurveyForm',
  enableReinitialize: true,
  destroyOnUnmount: true,
  validate,
})(MidSurveyForm);

const selector = formValueSelector('SurveyForm');

function mapStateToProps(state) {
  return {

  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(MidSurveyForm);