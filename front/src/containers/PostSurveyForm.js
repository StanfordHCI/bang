import React from 'react';
import {Col, Button, ButtonToolbar, Row, Container} from 'reactstrap';
import {connect} from 'react-redux'
import {Field, FieldArray, reduxForm, formValueSelector, change} from 'redux-form'
import {bindActionCreators} from "redux";
import {renderField} from 'Components/form/Text'
import renderSelectField from 'Components/form/Select'
import renderMultiSelectField from 'Components/form/MultiSelect'

const qOptions = [
  {value: 1, label: '1'},
  {value: 2, label: '2'},
  {value: 3, label: '3'},
  {value: 4, label: '4'},
]

const uOptions = [
  {value: 1, label: 'Partner from round 1'},
  {value: 2, label: 'Partner from round 2'},
  {value: 3, label: 'Partner from round 3'},
  {value: 4, label: 'Partner from round 4'},
]

const renderQuestions = ({fields, meta: {touched, error, warning}, questions}) => {
  let tasks = [];
  for (let i = 0; i < questions.length; i++) {
    tasks.push(
      <div key={i} className='form__form-group'>
        <label className='form__form-group-label'>{questions[i]}</label>
        <div className='form__form-group-field'>
          <Field
            name={`questions[${i}].result`}
            component={renderSelectField}
            type='text'
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

class PostSurveyForm extends React.Component {

  constructor() {
    super();
    this.state = {};
  }

  render() {
    const {invalid, batch} = this.props;

    return (<div>
        <form className='form form--horizontal' style={{paddingBottom: '5vh'}} onSubmit={this.props.handleSubmit}>
          <Container>
            <Row>
              <Col>
                <div className='form__panel'>
                  <div className='form__form-group'>
                    <label className='form__form-group-label'>You met with the same partner in two of the previous four rounds.
                      How do you think, in what two rounds you worked with the same person?</label>
                    <div className='form__form-group-field'>
                      <Field
                        name='mainQuestion.expRound1'
                        component={renderSelectField}
                        type='text'
                        options={qOptions}
                      />
                      <Field
                        name='mainQuestion.expRound2'
                        component={renderSelectField}
                        type='text'
                        options={qOptions}
                      />
                    </div>
                  </div>
                  <div className='form__form-group'>
                    <label className='form__form-group-label'>What partners do you prefer to work with in the future?</label>
                    <div className='form__form-group-field'>
                      <Field
                        name='mainQuestion.partners'
                        component={renderMultiSelectField}
                        options={uOptions}
                      />
                    </div>
                  </div>
                </div>
              </Col>
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
  const errors = {questions: []};

  return errors
};

PostSurveyForm = reduxForm({
  form: 'PostSurveyForm',
  enableReinitialize: true,
  destroyOnUnmount: true,
  validate,
})(PostSurveyForm);

const selector = formValueSelector('PostSurveyForm');

function mapStateToProps(state) {
  return {

  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(PostSurveyForm);