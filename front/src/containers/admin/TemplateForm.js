/** TemplateForm.js
 *  front-end
 * 
 *  admin only layout for adding / editing (validating) a template
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

/*const userOptions = (teamSize) => {
  let result = [];
  for (let i = 0; i < teamSize ** 2; i++) {
    result.push({value: i + 1, label: 'user' + (i + 1)})
  }
  return result;
}

const generateRounds = (numRounds, teamSize, dispatch) => {
  let rounds = [], maxUsers = teamSize ** 2;
  for (let i = 0; i < numRounds; i++) {
    let round = {teams: []};
    let users = [];
    for (let j = 0; j < teamSize; j++) {
      let team = {users: []}
      for (let k = 0; k < teamSize; k++) {
        let user = Math.floor(Math.random() * maxUsers) + 1;
        while (users.some(x => x === user)) {
          user = Math.floor(Math.random() * maxUsers) + 1;
        }
        team.users.push(user);
        users.push(user)
      }
      round.teams[j] = team;
    }
    rounds.push(round)
  }
  dispatch(change('TemplateForm', 'roundGen', rounds))
}*/

const renderSurvey = ({fields, meta: {touched, error, warning}, task}) => {
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
              {task && task.survey[index] && task.survey[index].type === 'select' &&
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

const renderSteps = ({fields, meta: {touched, error, warning}, numRounds}) => {
  return (<div style={{width: '100%', borderBottom: '1px solid grey'}}>
    {
      fields.map((step, index) => {
        return (
          <Row key={index}>
            <Col>
              <div className='form__form-group'>
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
                    type="text"
                    component={renderTextArea}
                  />
                </div>
              </div>
            </Col>
            <Col>
              <div className='centered-and-flexed'>
                <Button type="button" size="sm"
                        onClick={() => fields.splice(index, 1)}>delete step</Button>
              </div>
            </Col>
          </Row>)
      })}
    <Row className="centered-and-flexed" noGutters>
      <Button type="button" size="sm" onClick={() => fields.push({})}>
        <i className="fa fa-plus"/>add step
      </Button>
    </Row>
  </div>)
}

const renderTasks = ({fields, meta: {touched, error, warning}, numRounds, cloneTask, taskArray}) => {
  let tasks = [], options = [];
  for (let i = 0; i < numRounds; i++) {
    options.push({value: i, label: 'task ' + (i + 1)})
  }
  const taskNumber = taskArray && taskArray.length ? taskArray.length : numRounds

  for (let i = 0; i < taskNumber; i++) {
    tasks.push(
      <div key={i} className='form__form-group'>
        <label className='form__form-group-label' style={{margin: '0'}}>
          <p>task {i + 1}</p>
          <div>
            <Select
              onChange={(e) => cloneTask(i, e.value)}
              options={options.filter(x => x.value !== i)}
              clearable={false}
              multi={false}
              className='form__form-group-select'
              placeholder="clone task"
            />
          </div>
        </label>
        <div className='form__form-group-field' style={{marginBottom: '25px'}}>
          <Field
            name={`tasks[${i}].message`}
            component={renderTextArea}
            type="text"
          />
        </div>
        <FieldArray
          name={`tasks[${i}].steps`}
          component={renderSteps}
          rerenderOnEveryChange
        />
        <FieldArray
          name={`tasks[${i}].survey`}
          component={renderSurvey}
          rerenderOnEveryChange
          task={taskArray && taskArray[i]}
        />
      </div>
    )
  }

  return (<div style={{marginTop: '20px'}}>
    {tasks}
  </div>)
};

/*
const renderRounds = ({fields, meta: {touched, error, warning}, numRounds, teamSize}) => {
  let rounds = [];
  for (let i = 0; i < numRounds; i++) {
    rounds.push(
      <div key={i} className='form__form-group'>
        <label className='form__form-group-label'>{'round ' + (i + 1)}</label>
        <FieldArray
          name={`roundGen[${i}].teams`}
          component={renderTeams}
          rerenderOnEveryChange
          numRounds={numRounds}
          teamSize={teamSize}
          round={i}
        />
      </div>
    )
  }

  return (<div style={{marginTop: '20px'}}>
    {rounds}
  </div>)
};

const renderTeams = ({fields, meta: {touched, error, warning}, numRounds, teamSize, round}) => {
  let teams = [];
  for (let i = 0; i < teamSize; i++) {
    teams.push(
      <Col key={i} className='form__form-group' style={{flexDirection: 'column', alignItems: 'flex-end'}}>
        <label className='form__form-group-label'>{'team ' + (i + 1)}</label>
        <FieldArray
          name={`roundGen[${round}].teams[${i}].users`}
          component={renderUsers}
          rerenderOnEveryChange
          numRounds={numRounds}
          teamSize={teamSize}
          round={round}
          team={i}
        />
      </Col>
    )
  }

  return (<Row>
    {teams}
  </Row>)
};

const renderUsers = ({fields, meta: {touched, error, warning}, numRounds, teamSize, round, team}) => {
  let users = [];
  for (let i = 0; i < teamSize; i++) {
    users.push(
      <div key={i} className='form__form-group'>
        <div className='form__form-group-field'>
          <Field
            name={`roundGen[${round}].teams[${team}].users[${i}]`}
            component={renderSelectField}
            type='number'
            options={userOptions(parseInt(teamSize))}
          />
        </div>
      </div>
    )
  }

  return (<div>}>
    {users}
  </div>)
};
*/



class TemplateForm extends React.Component {

  constructor() {
    super();
    this.state = {};
  }

  /*handleGenerate(){
    const {numRounds, teamSize, dispatch} = this.props;
    generateRounds(parseInt(numRounds), parseInt(teamSize), dispatch)
  }*/

  cloneTask = (from, to) => {
    this.props.dispatch(change('TemplateForm', 'tasks[' + from + ']', this.props.tasks[to]))
  }

  numRoundsChange = (e) => {
    const num = parseInt(e.target.value)
    let tasks = this.props.tasks.filter((x, index) => index < num);
    this.props.dispatch(change('TemplateForm', 'tasks', tasks))
    console.log(this.props.tasks)
  }

  render() {
    const {invalid, numRounds, teamSize, roundGen, dispatch, pristine, isAdd, tasks} = this.props;

    return (<div>
        <form className='form form--horizontal' style={{paddingBottom: '5vh'}} onSubmit={this.props.handleSubmit}>
        <Container>
          <Row>
            <Col><div className='form__panel'>
            <div className='form__panel-body' style={{borderBottom: '2px solid grey'}}>
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
                <Col className='form__form-group'>
                  <label className='form__form-group-label'>Team size:</label>
                  <div className='form__form-group-field'>
                    <Field
                      name='teamSize'
                      component={renderField}
                      type='number'
                    />
                  </div>
                </Col>
                <Col className='form__form-group'>
                  <label className='form__form-group-label'>Number of rounds:</label>
                  <div className='form__form-group-field'>
                    <Field
                      name='numRounds'
                      component={renderField}
                      type='number'
                      onChange={this.numRoundsChange}
                    />
                  </div>
                </Col>
              </Row>
              <Row>
                <Col className='form__form-group'>
                  <label className='form__form-group-label'>Round minutes:</label>
                  <div className='form__form-group-field'>
                    <Field
                      name='roundMinutes'
                      component={renderField}
                      type='number'
                    />
                  </div>
                </Col>
                <Col className='form__form-group'>
                  <label className='form__form-group-label'>Survey minutes:</label>
                  <div className='form__form-group-field'>
                    <Field
                      name='surveyMinutes'
                      component={renderField}
                      type='number'
                    />
                  </div>
                </Col>
                <Col className='form__form-group'>
                  <label className='form__form-group-label'>Experiment round 1</label>
                  <div className='form__form-group-field'>
                    <Field
                      name='experimentRound1'
                      component={renderField}
                      type='number'
                    />
                  </div>
                </Col>
                <Col className='form__form-group'>
                  <label className='form__form-group-label'>Experiment round 2</label>
                  <div className='form__form-group-field'>
                    <Field
                      name='experimentRound2'
                      component={renderField}
                      type='number'
                    />
                  </div>
                </Col>
              </Row>
              <div className='form__form-group'>
                <label className='form__form-group-label'>HIT Title:</label>
                <div className='form__form-group-field'>
                  <Field
                    name='HITTitle'
                    component={renderField}
                    type='text'
                  />
                </div>
              </div>
            </div>
            <FieldArray
              name="tasks"
              component={renderTasks}
              rerenderOnEveryChange
              numRounds={numRounds}
              cloneTask={this.cloneTask}
              taskArray={tasks}
            />
              {/*<FieldArray
                name="roundGen"
                component={renderRounds}
                rerenderOnEveryChange
                numRounds={numRounds}
                teamSize={teamSize}
              />*/}
          </div></Col>
          </Row>
          <Row>
            <Col>
              <ButtonToolbar className='mx-auto form__button-toolbar'>
                {/*<Button color='primary' size='sm' type='button' disabled={!numRounds || !teamSize} onClick={() => this.handleGenerate()}>Generate random users</Button>*/}
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
  if (!values.numRounds) {
    errors.numRounds = 'required'
  } else if (parseInt(values.numRounds) < 4 || parseInt(values.teamSize) > 1 && (parseInt(values.numRounds) > parseInt(values.teamSize) + 2)) {
    errors.numRounds = 'invalid value'
  }
  if (!values.teamSize) {
    errors.teamSize = 'required'
  } else if (parseInt(values.teamSize) < 1 || parseInt(values.teamSize) > 10) {
    errors.teamSize = 'invalid value'
  }
  if (!values.experimentRound1) {
    errors.experimentRound1 = 'required'
  } else if (parseInt(values.experimentRound1) < 1 || parseInt(values.experimentRound1) > parseInt(values.numRounds) - 2) {
    errors.experimentRound1 = 'invalid value'
  }
  if (!values.experimentRound2) {
    errors.experimentRound2 = 'required'
  } else if (parseInt(values.experimentRound2) < 1 || parseInt(values.experimentRound2) < parseInt(values.experimentRound1) + 2 ||
    parseInt(values.experimentRound2) > parseInt(values.numRounds)) {
    errors.experimentRound2 = 'invalid value'
  }
  if (!values.maskType) {
    errors.maskType = 'required'
  }
  if (!values.roundMinutes) {
    errors.roundMinutes = 'required'
  } else if (values.roundMinutes < 1 || values.roundMinutes > 59) {
    errors.roundMinutes = 'invalid value'
  }
  if (!values.surveyMinutes) {
    errors.surveyMinutes = 'required'
  } else if (values.surveyMinutes < 1 || values.surveyMinutes > 10) {
    errors.surveyMinutes = 'invalid value'
  }
  errors.tasks = [];

  if (!values.tasks || !values.tasks.length) {
    errors.name = 'add tasks please'
  } else if (values.tasks.length !== parseInt(values.numRounds) ) {
    console.log(values.tasks, values.numRounds)
    errors.numRounds = 'number of rounds != number of tasks'
  }

  values.tasks && values.tasks.forEach((task, i) => {
    errors.tasks[i] = {steps: [], survey: []};
    if (!task.message) {
      errors.tasks[i].message = 'required';
    } else  if (!task.steps || !task.steps.length) {
      errors.tasks[i].message = 'add steps please';
    } else if (!task.survey || !task.survey.length) {
      errors.tasks[i].message = 'add survey please';
    }

    if (task.steps) for (let j = 0; j < task.steps.length; j++) {
      const step = task.steps[j];
      errors.tasks[i].steps[j] = {};
      if (!step.message) {
        errors.tasks[i].steps[j].message = 'required';
      }
      if (!step.time) {
        errors.tasks[i].steps[j].time = 'required';
      } else {
        const time = parseFloat(step.time);
        if (time <= 0 || time >= 1) {
          errors.tasks[i].steps[j].time = 'invalid';
        } else {
          if (j > 0 && parseFloat(task.steps[j - 1].time) > time ) {
            errors.tasks[i].steps[j].time = 'must be > previous step';
          }
        }
      }
    }
    if (task.survey) for (let j = 0; j < task.survey.length; j++){
      const survey = task.survey[j];
      errors.tasks[i].survey[j] = {};
      if (!survey.question) {
        errors.tasks[i].survey[j].question = 'required';
      }
      if (!survey.type) {
        errors.tasks[i].survey[j].type = 'required';
      } else if (survey.type === 'select' && (!survey.options || survey.options.length < 2 )) {
        errors.tasks[i].survey[j].type = 'add options please';
      }

    }

  })

  return errors
};

TemplateForm = reduxForm({
  form: 'TemplateForm',
  enableReinitialize: true,
  touchOnChange: true,
  validate,
})(TemplateForm);

const selector = formValueSelector('TemplateForm');

function mapStateToProps(state) {
  return {
    numRounds: selector(state, 'numRounds'),
    teamSize: selector(state, 'teamSize'),
    roundGen: selector(state, 'roundGen'),
    tasks: selector(state, 'tasks'),
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TemplateForm);