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
import {addBatch, loadBatchList} from "Actions/admin";
import {loadTemplateList} from "Actions/templates";
import {bindActionCreators} from "redux";
import {Field, reduxForm, formValueSelector} from "redux-form";
import {renderField, renderTextArea} from 'Components/form/Text'
import renderSelectField from 'Components/form/Select'
import SurveyForm from "./SurveyForm";


class AddBatch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isReady: false,
      options: [],
    }
  }

  async componentWillMount(){
    await Promise.all([
      this.props.loadTemplateList({full:true}),
      this.props.loadBatchList({remembered: true})
    ])
    let batchOptions = this.props.batchList.map(x => {return {value: x._id, label: `${x.templateName}(${x.note}) ${x.createdAt}`}});
    batchOptions.unshift({value: false, label: "Don't load"})
    this.setState({
      singleTeamTemplateOptions: this.props.templateList.filter(x => x.teamFormat === 'single')
        .map(x => {return {value: x._id, label: x.name}}),
      multiTeamTemplateOptions: this.props.templateList.filter(x => x.teamFormat !== 'single')
        .map(x => {return {value: x._id, label: x.name}}),
      batchOptions: batchOptions,
      isReady: true
    })
  }

  handleSubmit(form) {
    let batch = Object.assign(this.props.templateList.find(x => x._id === form.template));
    // batch parameters
    batch.note = form.note;
    batch.maskType = form.maskType;
    batch.withAvatar = form.withAvatar;
    batch.withRoster = form.teamFormat === 'single' ? true : form.withRoster;
    batch.withAutoStop = form.withAutoStop;
    batch.teamFormat = form.teamFormat;
    batch.rememberTeamOrder = form.rememberTeamOrder;
    batch.loadTeamOrder = form.loadTeamOrder;
    batch.bestRoundFunction = form.bestRoundFunction;
    batch.randomizeExpRound = form.randomizeExpRound;
    batch.reconveneWorstRound = form.reconveneWorstRound;
    batch.dynamicTeamSize = form.dynamicTeamSize;
    batch.dynamicOptions = form.dynamicOptions;
    // filter parameters
    batch.gender = form.gender;
    batch.salary = form.salary;
    batch.userRace = form.userRace;
    batch.bornAfterYear = form.bornAfterYear;
    batch.bornBeforeYear = form.bornBeforeYear;
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
              <h5>Filter users by:</h5>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Gender</label>
                <div className='form__form-group-field'>
                  <Field
                      name='gender'
                      component={renderSelectField}
                      options={[{value: false, label: 'do not filter'}].concat([{value: 'male', label: 'male'}, {value: 'female', label: 'female'}])}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Born after year:</label>
                <div className='form__form-group-field'>
                  <Field
                      name='bornAfterYear'
                      component={renderField}
                      type='number'
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Born before year:</label>
                <div className='form__form-group-field'>
                  <Field
                      name='bornBeforeYear'
                      component={renderField}
                      type='number'
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Race</label>
                <div className='form__form-group-field'>
                  <Field
                      name='userRace'
                      component={renderSelectField}
                      options={[{value: false, label: 'do not filter'}].concat(['American Indian or Alaska Native', 'Asian', 'Black or African American',
                        'Native Hawaiian or Other Pacific Islander', 'White', 'Other'].map(x => {return {value: x, label: x}}))}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Salary</label>
                <div className='form__form-group-field'>
                  <Field
                      name='salary'
                      component={renderSelectField}
                      options={[{value: false, label: 'do not filter'}].concat(['Less than $20,000', '$20,000 to $34,999', '$35,000 to $49,999', '$50,000 to $74,999',
                        '$75,000 to $99,999', 'Over $100,000'].map(x => {return {value: x, label: x}}))}
                  />
                </div>
              </div>
              <h5>Batch parameters</h5>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Single-team or Multi-team?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='teamFormat'
                    component={renderSelectField}
                    options={[{value: 'single', label: 'Single-team'}, {value: 'multi', label: 'Multi-team'}]}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Best Team Function (only for ST)</label>
                <div className='form__form-group-field'>
                  <Field
                      name='bestRoundFunction'
                      component={renderSelectField}
                      options={[{value: 'highest', label: 'Highest score'}, {value: 'lowest', label: 'Lowest score'},
                        {value: 'average', label: 'Closest to average'}, {value: 'random', label: 'Random'},
                        {value: 'do not reconvene', label: 'Don\'t reconvene anything!'}]}
                      disabled={this.props.teamFormat !== 'single'}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Reconvene worst? (only for ST) </label>
                <div className='form__form-group-field'>
                  <Field
                    name='reconveneWorstRound'
                    component={renderSelectField}
                    options={[{value: true, label: 'Reconvene'}, {value: false, label: 'Don\'t Reconvene'}]}
                    disabled={this.props.teamFormat !== 'single' && this.props.bestRoundFunction}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Randomize last 2 rounds? (only for ST) </label>
                <div className='form__form-group-field'>
                  <Field
                    name='randomizeExpRound'
                    component={renderSelectField}
                    options={[{value: true, label: 'Randomize'}, {value: false, label: 'Don\'t Randomize'}]}
                    disabled={this.props.teamFormat !== 'single'}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Select template:</label>
                <div className='form__form-group-field'>
                  <Field
                    name='template'
                    component={renderSelectField}
                    options={this.props.teamFormat === 'single' ? this.state.singleTeamTemplateOptions : this.state.multiTeamTemplateOptions}
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
                <label className='form__form-group-label'>Team roster in final survey (only for MT)?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='withRoster'
                    component={renderSelectField}
                    options={[{value: true, label: 'With roster'}, {value: false, label: 'Without roster'}]}
                    disabled={this.props.teamFormat === 'single'}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>With auto-stop?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='withAutoStop'
                    component={renderSelectField}
                    options={[{value: true, label: 'With auto-stop'}, {value: false, label: 'Without auto-stop'}]}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Remember team order?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='rememberTeamOrder'
                    component={renderSelectField}
                    options={[{value: true, label: 'Remember'}, {value: false, label: "Don't remember"}]}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Dynamic team size (only for ST)?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='dynamicTeamSize'
                    component={renderSelectField}
                    options={[{label: 'Regular (n for all rounds)', value: false}, {label: 'Dynamic (50% - 1 50% - n)', value: true}]}
                    disabled={this.props.teamFormat !== 'single'}
                  />
                </div>
              </div>
              <div className='form__form-group'>
                <label className='form__form-group-label'>Dynamic options: Team or Individual First?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='dynamicOptions'
                    component={renderSelectField}
                    options={[{label: 'Team First', value: true}, {label: 'Individual First', value: false}]}
                    disabled={this.props.teamFormat !== 'single'}
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
  if (values.withAutoStop == null) {
    errors.withAutoStop = 'required'
  }
  if (values.rememberTeamOrder == null) {
    errors.rememberTeamOrder = 'required'
  }
  if (values.loadTeamOrder == null) {
    errors.loadTeamOrder = 'required'
  }
  if (values.teamFormat == null) {
    errors.teamFormat = 'required'
  }
  if (values.teamFormat === 'single' && values.bestRoundFunction == null) {
    errors.bestRoundFunction = 'required'
  }
  if (values.teamFormat === 'single' && values.randomizeExpRound == null) {
    errors.randomizeExpRound = 'required'
  }
  if (values.teamFormat === 'single' && values.reconveneWorstRound == null) {
    errors.reconveneWorstRound = 'required'
  }
  if (values.teamFormat === 'single' && values.dynamicTeamSize == null) {
    errors.dynamicTeamSize = 'required'
  }
  if (values.dynamicTeamSize == true && values.dynamicOptions == null){
    errors.dynamicOptions = 'required'
  }
  if (values.teamFormat === 'single' && values.reconveneWorstRound && values.template &&
    props.templateList.filter(x => x._id === values.template) &&
    props.templateList.filter(x => x._id === values.template)[0].numRounds < 6) {
    errors.template = 'numRounds must be >= 6'
  }
  return errors
};

AddBatch = reduxForm({
  form: 'SurveyForm',
  enableReinitialize: true,
  touchOnChange: true,
  validate,
})(AddBatch);

const selector = formValueSelector('SurveyForm');

function mapStateToProps(state) {
  return {
    templateList: state.template.templateList,
    batchList: state.admin.batchList,
    teamFormat: selector(state, 'teamFormat'),
    bestRoundFunction: selector(state, 'bestRoundFunction'),
    initialValues: {
      teamFormat: 'single',
      maskType: 'masked',
      withAvatar: true,
      withRoster: true,
      withAutoStop: true,
      rememberTeamOrder: false,
      loadTeamOrder: false,
      bestRoundFunction: 'do not reconvene',
      reconveneWorstRound: false,
      randomizeExpRound: false,
      dynamicTeamSize: false,
      dynamicOptions: null,
      gender: false,
      salary: false,
      userRace: false,
    }
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    addBatch,
    loadBatchList,
    loadTemplateList,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AddBatch);
