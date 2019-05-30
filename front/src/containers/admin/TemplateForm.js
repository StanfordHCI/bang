import React from 'react';
import {Col, Button, ButtonToolbar, Row, Container} from 'reactstrap';
import {connect} from 'react-redux'
import {Field, FieldArray, reduxForm, formValueSelector, change} from 'redux-form'
import {bindActionCreators} from "redux";
import {renderField, renderTextArea} from 'Components/form/Text'
import renderSelectField from 'Components/form/Select'
import {generateComb} from '../../app/utils'

const userOptions = (teamSize) => {
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
}

const renderSteps = ({fields, meta: {touched, error, warning}, numRounds}) => {
  return (<div style={{width: '100%'}}>
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
                    component={renderTextArea}
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
        <div className='form__form-group-field' style={{marginBottom: '25px'}}>
          <Field
            name={`tasks[${i}].message`}
            component={renderTextArea}
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



class TemplateForm extends React.Component {

  constructor() {
    super();
    this.state = {};
  }

  handleGenerate(){
    const {numRounds, teamSize, dispatch} = this.props;
    generateRounds(parseInt(numRounds), parseInt(teamSize), dispatch)
  }

  render() {
    const {invalid, numRounds, teamSize, roundGen, dispatch} = this.props;

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
              name="tasks"
              component={renderTasks}
              rerenderOnEveryChange
              numRounds={numRounds}
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
  } else if (parseInt(values.numRounds) < 4) {
    errors.numRounds = 'invalid value'
  }
  if (!values.teamSize) {
    errors.teamSize = 'required'
  } else if (parseInt(values.teamSize) < 2) {
    errors.teamSize = 'invalid value'
  }
  if (!values.roundMinutes) {
    errors.roundMinutes = 'required'

  } else if (values.roundMinutes < 1 || values.roundMinutes > 59) {
    errors.roundMinutes = 'invalid value'
  }
  errors.tasks = [];
  values.tasks && values.tasks.forEach((task, i) => {
    errors.tasks[i] = {steps: []}; let timeSum = 0
    if (!task.message) {
      errors.tasks[i].message = 'required';
    } else  if (!task.steps || !task.steps.length) {
      errors.tasks[i].message = 'add steps please';
    }

    task.steps && task.steps.forEach((step, j) => {
      errors.tasks[i].steps[j] = {};
      if (!step.message) {
        errors.tasks[i].steps[j].message = 'required';
      }
      if (!step.time) {
        errors.tasks[i].steps[j].time = 'required';
      } else {
        const time = parseFloat(step.time);
        timeSum = timeSum + time;
        if (time <= 0 || time >= 1) {
          errors.tasks[i].steps[j].time = 'invalid';
        } else {
          if (j === task.steps.length - 1 && timeSum !== 1) {
            errors.tasks[i].steps[j].time = 'time sum must be 1.0';
          }
        }
      }
    })
  })


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
    teamSize: selector(state, 'teamSize'),
    roundGen: selector(state, 'roundGen'),
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TemplateForm);