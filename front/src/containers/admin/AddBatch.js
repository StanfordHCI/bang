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
  componentWillMount(){
    // we load singleTeam templates and multiTeam templates and put the into state for further usage
    this.props.loadTemplateList({teamFormat: 'single'})
      .then(() => {this.setState({singleTeamTemplateOptions: this.props.templateList.map(x => {return {value: x._id, label: x.name, template: x}})});
      });
    this.props.loadTemplateList({teamFormat: 'multi'})
      .then(() => {this.setState({multiTeamTemplateOptions : this.props.templateList.map(x => {return {value: x._id, label: x.name, template: x}})});
      })
      .then(() => this.props.loadTemplateList({full:true}));

    // we do the same thing with batches
    this.props.loadBatchList({rememberTeamOrder: true, teamFormat: 'single'})
      .then(() => {this.setState({singleTeamBatchOptions: this.props.batchList.map(x => {return {value: x._id, label: `${x.templateName}(${x.note}) ${x.createdAt}`, batch: x}})});
      });
    this.props.loadBatchList({rememberTeamOrder: true, teamFormat: 'multi'})
      .then(() => {this.setState({isReady: true,
        multiTeamBatchOptions : this.props.batchList.map(x => {return {value: x._id, label: `${x.templateName}(${x.note}) ${x.createdAt}`, batch: x}})});
      })
    // this.props.loadBatchList({remembered: true}).then(() => {
    //         let batchOptions = [{value: false, label: "Don't load"}];
    //         batchOptions = batchOptions.concat(this.props.batchList.map(x => {return {value: x._id, label: `${x.templateName}(${x.note}) ${x.createdAt}`}}));
    //         this.setState({isReady: true, batchOptions: batchOptions})
    //       })
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.teamFormat !== prevProps.teamFormat) {
      if (this.props.teamFormat === "single") {
        this.setState({ options: this.state.singleTeamTemplateOptions,
          batchOptions: [{value: false, label: "Don't load"}].concat(this.state.singleTeamBatchOptions) });
      } else {
        this.setState({ options: this.state.multiTeamTemplateOptions,
          batchOptions: [{value: false, label: "Don't load"}].concat(this.state.multiTeamBatchOptions)});
      }
    }

    if (this.props.loadTeamOrder !== prevProps.loadTeamOrder) {
      if (this.props.loadTeamOrder === false) {
        this.props.teamFormat === 'single' ?
        this.setState({options: this.state.singleTeamTemplateOptions}) :
        this.setState({options: this.state.multiTeamTemplateOptions});
      } else {
        const batchId = this.props.loadTeamOrder;
        const batch = this.state.batchOptions.filter(x => x.batch && x.batch._id === batchId)[0].batch;
        let newTemplateOptions = this.props.teamFormat === 'single' ? this.state.singleTeamTemplateOptions : this.state.multiTeamTemplateOptions;
        newTemplateOptions = newTemplateOptions.filter(x => {
          return x.template && x.template.numRounds === batch.numRounds && x.template.teamSize === batch.teamSize});
        this.setState({options: newTemplateOptions});
      }
    }

    if (this.props.template !== prevProps.template) {
      // on template change, filters loadTeamOrder options(numRounds and teamSize of selected template and batch should be equal)
      const templateId = this.props.template;
      const templateList = this.props.templateList;
      const template = templateList.filter(x => x._id === templateId)[0];
      let newBatchOptions = this.props.teamFormat === 'single' ? this.state.singleTeamBatchOptions : this.state.multiTeamBatchOptions;
      newBatchOptions = newBatchOptions.filter(x => x.batch && x.batch.numRounds === template.numRounds && x.batch.teamSize === template.teamSize);
      newBatchOptions = [{value: false, label: "Don't load"}].concat(newBatchOptions);
      this.setState({batchOptions: newBatchOptions});
    }
  }

  handleSubmit(form) {
    let batch = Object.assign(this.props.templateList.find(x => x._id === form.template));
    batch.note = form.note;
    batch.maskType = form.maskType;
    batch.withAvatar = form.withAvatar;
    batch.withRoster = form.withRoster;
    batch.withAutoStop = form.withAutoStop;
    batch.teamFormat = form.teamFormat;
    batch.rememberTeamOrder = form.rememberTeamOrder;
    batch.loadTeamOrder = form.loadTeamOrder;
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
                <label className='form__form-group-label'>Select template:</label>
                <div className='form__form-group-field'>
                  <Field
                    name='template'
                    component={renderSelectField}
                    options={this.state.options}
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
                <label className='form__form-group-label'>With team roster in final survey?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='withRoster'
                    component={renderSelectField}
                    options={[{value: true, label: 'With roster'}, {value: false, label: 'Without roster'}]}
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
                <label className='form__form-group-label'>Load team order?</label>
                <div className='form__form-group-field'>
                  <Field
                    name='loadTeamOrder'
                    component={renderSelectField}
                    options={this.state.batchOptions}
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
                    options={[{value: true, label: 'With roster'}, {value: false, label: 'Without roster'}]}
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
    loadTeamOrder: selector(state, 'loadTeamOrder'),
    template: selector(state, 'template')
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
