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
import {renderTextArea} from "../components/form/Text";

const replaceNicksInSurvey = (message, users, currentUser, readOnly, unmasked, surveyType) => {
  if (readOnly || surveyType === 'pre') return message;
  users.filter(user => currentUser._id.toString() !== user._id.toString()).forEach((user, index) => {
    message = message.replace(new RegExp('team_partner_' + (index + 1), "ig"), unmasked ? user.realNick : user.fakeNick)
  })
  message = message.replace(new RegExp('user_own_name', "ig"), currentUser.realNick)
  return message;
}


const renderQuestions = ({fields, meta: {touched, error, warning}, questions, readOnly, users, currentUser, unmasked, surveyType, team}) => {
  let items = [];
  for (let i = 0; i < questions.length; i++) {
    /*let hasVarOfAfkUser = false, selectOptions = [];
    if (questions[i].type ==='select') {
      selectOptions = questions[i].selectOptions;
    }
    users.filter(user => currentUser._id.toString() !== user._id.toString()).forEach((user, index) => {
      if (team.users.some(x => x.user === user._id && !x.isActive)) {
        const customVar = 'team_partner_' + (index + 1);
        hasVarOfAfkUser = questions[i].question.indexOf(customVar) > -1;
        if (questions[i].type ==='select') {
          selectOptions = selectOptions.filter(x => x.label.indexOf(customVar) === -1)
        }
      }
    })*/
    const component = questions[i].type === 'select' ? renderRadioPanel : (questions[i].type === 'text' ? renderField : renderTextArea);
    items.push(
      <div key={i} className='form__form-group'>
        <label className='form__form-group-label'>
            {replaceNicksInSurvey(questions[i].question, users, currentUser, readOnly, unmasked, surveyType)}
          </label>
        <div className='form__form-group-field' style={{maxWidth: '700px'}}>
          {questions[i].type !== 'instruction' && <Field
            name={`questions[${i}].result`}
            component={component}
            type={questions[i].type}
            disabled={readOnly}
            options={questions[i].type ==='select' ? questions[i].selectOptions.map(x => {return {label: replaceNicksInSurvey(x.label, users, currentUser, readOnly, unmasked, surveyType), value: x.value}}) : []}
          />}
          {questions[i].type === 'instruction' && <label>
            {questions[i].question}
          </label>}
        </div>
      </div>
    )
  }

  return (<div style={{marginTop: '20px'}}>
    {items}
  </div>)
};

class RoundSurveyForm extends React.Component {

  constructor() {
    super();
    this.state = {};
  }

  render() {
    const {invalid, questions, readOnly, currentUser, members, batch, surveyType, team, selectiveMasking, user} = this.props;
    let newQuestions = [...questions];
    if (selectiveMasking) {
      console.log(team.users);
      team.users.forEach(x => {
        if (x.user !== user._id) {
          newQuestions.push({
            question: `${x.nickname} is someone I would like to work with again.`,
            type: 'select',
            options: [
                {option: 'Strongly Disagree'},
                {option: 'Disagree', },
                {option: 'Neutral', },
                {option: 'Agree', },
                {option: 'Strongly Agree'},
              ],
            selectOptions: [
                {label: 'Strongly Disagree', value: `0 ${x.user}`},
                {label: 'Disagree', value: `1 ${x.user}`},
                {label: 'Neutral', value: `2 ${x.user}`},
                {label: 'Agree', value: `3 ${x.user}`},
                {label: 'Strongly Agree', value: `4 ${x.user}`},
            ],
          })
          console.log(`pushed to newQuestions. ${newQuestions}`)
        }
      })
    }
    return (<div style={{width: '100%'}}>
      {!readOnly && <p> IMPORTANT: Finishing the survey is <b>required</b> to participate in this experiment.</p>}
      {!readOnly && <p> If you do not finish the survey, <b>you will NOT be paid for this task.</b> </p>}
        <form className='form' style={{paddingBottom: '5vh'}} onSubmit={this.props.handleSubmit}>
          <Container>
            <Row>
              <Col>
                <div className='form__panel'>
                  <FieldArray
                    name="questions"
                    component={renderQuestions}
                    rerenderOnEveryChange
                    questions={newQuestions}
                    readOnly={readOnly}
                    users={members}
                    currentUser={currentUser}
                    unmasked={batch ? batch.maskType === 'unmasked' : 'masked'}
                    surveyType={surveyType}
                    team={team}
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
    if (!values.questions[i]) {
      errors.questions[i] = {result: 'required'}
    } else {
      if (!values.questions[i].result && values.questions[i].result !== 0) {
        errors.questions[i] = {result: 'required'}
      }
    }

  }

  return errors
};

RoundSurveyForm = reduxForm({
  form: 'SurveyForm',
  enableReinitialize: true,
  destroyOnUnmount: true,
  validate,
})(RoundSurveyForm);

const selector = formValueSelector('SurveyForm');

function mapStateToProps(state) {
  return {
    currentUser: state.app.user,
    batch: state.batch.batch
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(RoundSurveyForm);