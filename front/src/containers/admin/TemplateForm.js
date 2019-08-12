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
import renderCheckBoxField from 'Components/form/CheckBox'
import Select from "react-select";

const renderSurvey = ({fields, meta: {touched, error, warning}, task, surveyType}) => {
  return (<div style={{width: '100%', marginTop: '20px', borderBottom: '1px solid grey'}}>
    {
      fields.map((question, index) => {
        let isSelect = false;
        if (surveyType === 'mid' && task && task.survey[index] && task.survey[index].type === 'select' ||
          surveyType === 'pre' && task && task.preSurvey[index] && task.preSurvey[index].type === 'select') {
          isSelect = true;
        }

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
              {isSelect &&
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

const renderTasks = ({fields, meta: {touched, error, warning}, numRounds, cloneTask, surveyTemplatesOptions,
                       taskArray, fillSurvey, deleteSurvey, numExpRounds}) => {
  let tasks = [], options = [];
  for (let i = 0; i < numRounds; i++) {
    options.push({value: i, label: 'task ' + (i + 1)})
  }
  const taskNumber = taskArray && taskArray.length && taskArray.length > numRounds ? taskArray.length : numRounds

  for (let i = 0; i < taskNumber; i++) {
    let taskLabel = 'TASK FOR NON-EXPERIMENT ROUND';
    if (i < numExpRounds) {
      taskLabel = 'TASK FOR EXPERIMENT ROUND ' + (i + 1);
    }
    tasks.push(
      <div key={'task' + i} className='form__form-group' style={{ borderBottom: '3px solid grey'}}>
        <Row style={{width: '80%'}}>
          <Col style={{width: '100%'}}>
            <p>{taskLabel}</p>
          </Col>
          <Col>
            <Select
              onChange={(e) => cloneTask(i, e.value)}
              options={options.filter(x => x.value !== i)}
              clearable={false}
              multi={false}
              className='form__form-group-select'
              placeholder="clone task"
            />
          </Col>
          <Col>
            <p>Has pre-survey?</p>
          </Col>
          <Col>
            <Field
              name={`tasks[${i}].hasPreSurvey`}
              component={renderCheckBoxField}
              onChange={(e) => {deleteSurvey(e, i, 'preSurvey')}}
            />
          </Col>
          <Col>
            <p>Has mid-survey?</p>
          </Col>
          <Col>
            <Field
              name={`tasks[${i}].hasMidSurvey`}
              component={renderCheckBoxField}
              onChange={(e) => {deleteSurvey(e, i, 'survey')}}
            />
          </Col>
        </Row>
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
        {taskArray && taskArray[i] && taskArray[i].hasPreSurvey && <div style={{width: '100%'}}>
          <p>pre - survey</p>
          <Select
            onChange={(e) => fillSurvey(i, e.value, 'preSurvey')}
            options={surveyTemplatesOptions}
            clearable={true}
            multi={false}
            className='form__form-group-select'
            placeholder="select pre-survey"
          />
          <FieldArray
            name={`tasks[${i}].preSurvey`}
            component={renderSurvey}
            surveyType="pre"
            rerenderOnEveryChange
            task={taskArray && taskArray[i]}
          />
        </div>}
        {taskArray && taskArray[i] && taskArray[i].hasMidSurvey && <div style={{width: '100%'}}>
          <p>mid - survey</p>
          <Select
            onChange={(e) => fillSurvey(i, e.value, 'survey')}
            options={surveyTemplatesOptions}
            clearable={true}
            multi={false}
            className='form__form-group-select'
            placeholder="select mid-survey"
          />
          <FieldArray
            name={`tasks[${i}].survey`}
            component={renderSurvey}
            surveyType="mid"
            rerenderOnEveryChange
            task={taskArray && taskArray[i]}
          />
        </div>}
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
    this.state = {

    };
  }

  cloneTask = (from, to) => {
    this.props.dispatch(change('TemplateForm', 'tasks[' + from + ']', this.props.tasks[to]))
  }

  fillSurvey = (taskNumber, surveyIndex, fieldName) => {
    this.props.dispatch(change('TemplateForm', 'tasks[' + taskNumber + '].' + fieldName, this.props.surveyList[surveyIndex].questions))
  }

  numRoundsChange = (e) => {
    const num = parseInt(e.target.value)
    let tasks = this.props.tasks.filter((x, index) => index < num);
    this.props.dispatch(change('TemplateForm', 'tasks', tasks))
  }

  deleteSurvey = (newValue, taskNumber, fieldName) => {
    if (newValue.target) {
      if (!newValue.target.checked) {
        console.log(taskNumber, fieldName)
        this.props.dispatch(change('TemplateForm', 'tasks[' + taskNumber + '].' + fieldName, null))
      }
    }
  }

  dispatchJsonData = (data) => {
    const template = JSON.parse(data.target.result)
    for (let i in template) {
      this.props.dispatch(change('TemplateForm', i, template[i]))
    }
  }

  handleFileUpload = event => {
    const file = event.target.files[0];
    let fileReader = new FileReader();
    fileReader.onloadend = this.dispatchJsonData
    fileReader.readAsText(file);
  }

  render() {
    const {invalid, numRounds, surveyTemplatesOptions, pristine, isAdd, tasks, numExpRounds} = this.props;

    return (<div>
        <form className='form form--horizontal' style={{paddingBottom: '5vh'}} onSubmit={this.props.handleSubmit}>
          <Row>
            <Col><div className='form__panel'>
            <div className='form__panel-body' style={{borderBottom: '3px solid grey'}}>
              <Row style={{paddingBottom: '10px'}}>
                <input type="file" name="json" id="json" onChange={this.handleFileUpload} />
              </Row>
              <Row>
                <Col className='form__form-group'>
                  <label className='form__form-group-label'>Single-Team or Multi-Team?:</label>
                  <div className='form__form-group-field'>
                    <Field
                      name='teamFormat'
                      component={renderSelectField}
                      options={[{value: 'single', label: 'Single-team'}, {value: 'multi', label: 'Multi-team'}]}
                    />
                  </div>
                </Col>
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
              </Row>
              <Row>
                <Col className='form__form-group'>
                  <label className='form__form-group-label'>Experiment rounds:</label>
                  <div className='form__form-group-field'>
                    <Field
                      name='numExpRounds'
                      component={renderField}
                      type='number'
                    />
                  </div>
                </Col>
                <Col className='form__form-group'>
                <label className='form__form-group-label'>HIT Title:</label>
                <div className='form__form-group-field'>
                  <Field
                    name='HITTitle'
                    component={renderField}
                    type='text'
                  />
                </div>
              </Col>
              </Row>
            </div>
            <FieldArray
              name="tasks"
              component={renderTasks}
              rerenderOnEveryChange
              numRounds={numRounds}
              cloneTask={this.cloneTask}
              fillSurvey={this.fillSurvey}
              deleteSurvey={this.deleteSurvey}
              taskArray={tasks}
              numExpRounds={numExpRounds}
              surveyTemplatesOptions={surveyTemplatesOptions}
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
        </form>
      </div>
    )
  }
}

const validate = (values, props) => {
  console.log(values, props)
  const errors = {};
  if (!values.name) {
    errors.name = 'required'
  } else if (values.name.length > 25) {
    errors.name = 'must be 25 characters or less'
  }
  if (!values.numRounds) {
    errors.numRounds = 'required'
  } else if (parseInt(values.numRounds) < 4 || parseInt(values.teamSize) > 1 &&
    (parseInt(values.numRounds) > parseInt(values.teamSize) + parseInt(values.numExpRounds))) {
    errors.numRounds = 'invalid value'
  }
  if (!values.teamSize) {
    errors.teamSize = 'required'
  } else if (parseInt(values.teamSize) < 1 || parseInt(values.teamSize) > 10) {
    errors.teamSize = 'invalid value'
  }
  if (!values.numExpRounds) {
    errors.numExpRounds = 'required'
  } else if (parseInt(values.numExpRounds) < 2 || parseInt(values.numExpRounds) > 10) {
    errors.numExpRounds = 'invalid value'
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
    errors.numRounds = 'number of rounds != number of tasks'
  }

  values.tasks && values.tasks.forEach((task, i) => {
    errors.tasks[i] = {steps: [], survey: [], preSurvey: []};
    if (!task.message) {
      errors.tasks[i].message = 'required';
    } else  if (!task.steps || !task.steps.length) {
      errors.tasks[i].message = 'add steps please';
    } else if (task.hasPreSurvey && (!task.preSurvey || !task.preSurvey.length)) {
      errors.tasks[i].message = 'add pre survey questions please';
    } else if (task.hasMidSurvey && (!task.survey || !task.survey.length)) {
      errors.tasks[i].message = 'add mid survey questions please';
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
    if (task.preSurvey) for (let j = 0; j < task.preSurvey.length; j++){
      const preSurvey = task.preSurvey[j];
      errors.tasks[i].preSurvey[j] = {};
      if (!preSurvey.question) {
        errors.tasks[i].preSurvey[j].question = 'required';
      }
      if (!preSurvey.type) {
        errors.tasks[i].preSurvey[j].type = 'required';
      } else if (preSurvey.type === 'select' && (!preSurvey.options || preSurvey.options.length < 2 )) {
        errors.tasks[i].preSurvey[j].type = 'add options please';
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

  });
  if (values.teamFormat == null) {
    errors.teamFormat = 'required'
  }

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
    numExpRounds: selector(state, 'numExpRounds'),
    roundGen: selector(state, 'roundGen'),
    tasks: selector(state, 'tasks'),
    surveyList: state.survey.surveyList,
    surveyTemplatesOptions: state.survey.surveyList.map((x, index) => {return {value: index, label: x.name}})
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TemplateForm);