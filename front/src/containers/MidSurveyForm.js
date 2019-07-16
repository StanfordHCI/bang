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
import renderRadioPanel from 'Components/form/RadioPanel'

const replaceNicksInSurvey = (message, users, currentUser, readOnly) => {
  if (readOnly) return message;
  users.filter(user => currentUser._id.toString() !== user._id.toString()).forEach((user, index) => {
    message = message.replace(new RegExp('team_partner_' + (index + 1), "ig"), user.fakeNick)
  })
  message = message.replace(new RegExp('user_own_name', "ig"), currentUser.realNick)
  return message;
}


const renderQuestions = ({fields, meta: {touched, error, warning}, questions, readOnly, users, currentUser}) => {
  let tasks = [];

  for (let i = 0; i < questions.length; i++) {
    tasks.push(
      <div key={i} className='form__form-group'>
        <label className='form__form-group-label'>{replaceNicksInSurvey(questions[i].question, users, currentUser, readOnly)}</label>
        <div className='form__form-group-field' style={{maxWidth: '700px'}}>
          <Field
            name={`questions[${i}].result`}
            component={questions[i].type ==='select' ? renderRadioPanel : renderField}
            type={questions[i].type}
            disabled={readOnly}
            options={questions[i].type ==='select' ? questions[i].selectOptions.map(x => {return {label: replaceNicksInSurvey(x.label, users, currentUser, readOnly), value: x.value}}) : []}
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
    const {invalid, questions, readOnly, currentUser, members} = this.props;

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
                    users={members}
                    currentUser={currentUser}
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
  const errors = {questions: []};
  if (values.questions) for (let i = 0; i < values.questions.length; i++) {
    if (!values.questions[i].result && values.questions[i].result !== 0) {
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
    currentUser: state.app.user
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(MidSurveyForm);