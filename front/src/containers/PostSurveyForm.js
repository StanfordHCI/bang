/** postsurveyform.js
 *  front-end
 * 
 *  final survey that asks who duplicate partners were and when 
 *  
 *  renders:  
 *    1. at batch-end for worker
 *    2. when viewing final results for admin
 * 
 *  called by:
 *    1. Batch.js (for worker view)
 *    2. BatchResult.js (for admin results view)
 *    
 */

import React from 'react';
import {Col, Button, ButtonToolbar, Row, Container} from 'reactstrap';
import {connect} from 'react-redux'
import {Field, FieldArray, reduxForm, formValueSelector, change} from 'redux-form'
import {bindActionCreators} from "redux";
import {renderField} from 'Components/form/Text'
import renderSelectField from 'Components/form/Select'
import renderMultiSelectField from 'Components/form/MultiSelect'

class PostSurveyForm extends React.Component {

  constructor() {
    super();
    this.state = {
      qOptions: [
        {value: 1, label: '1'},
        {value: 2, label: '2'},
        {value: 3, label: '3'},
        {value: 4, label: '4'},
      ],
      uOptions: []
    };
  }

  componentDidMount() {
    let qOptions = [], uOptions= [];
    for (let i = 0; i < this.props.batch.numRounds; i++) {
      qOptions[i] = {value: i + 1, label: (i + 1).toString()}
    }
    this.props.batch.rounds.forEach((round, index) => {
      const userId = this.props.user._id.toString();
      const team = round.teams.find(x => x.users.some(y => y.user.toString() === userId  ))
      team.users.forEach(user => {
        if (user.user.toString() !== userId) {
          uOptions.push({value: user.user, label: user.nickname + ' (round ' + (index + 1) + ')'})
        }
      })
    })

    this.setState({qOptions: qOptions, uOptions: uOptions})
  }

  render() {
    const {invalid, batch, user} = this.props;



    return (<div>
        <form className='form' style={{paddingBottom: '5vh'}} onSubmit={this.props.handleSubmit}>
          <Container>
            <Row>
              <Col>
                <div className='form__panel'>
                  <div className='form__form-group'>
                    <label className='form__form-group-label'>
                      <p>You met with the same partner in two of the previous four rounds.</p>
                      <p>How do you think, in what two rounds you worked with the same people?</p>
                    </label>
                    <div className='form__form-group-field'>
                      <Field
                        name='mainQuestion.expRound1'
                        component={renderSelectField}
                        type='text'
                        options={this.state.qOptions}
                      />
                      <Field
                        name='mainQuestion.expRound2'
                        component={renderSelectField}
                        type='text'
                        options={this.state.qOptions}
                      />
                    </div>
                  </div>
                  <div className='form__form-group'>
                    <label className='form__form-group-label'>What partners do you prefer to work with in the future?</label>
                    <div className='form__form-group-field'>
                      <Field
                        name={'mainQuestion.partners'}
                        component={renderMultiSelectField}
                        options={this.state.uOptions}
                      />
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
            <Row style={{marginTop: '100px'}}>
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
  const errors = {mainQuestion: {}};
  if (!values.mainQuestion) {
    errors.mainQuestion.expRound1 = 'required';
    errors.mainQuestion.expRound2 = 'required';
    errors.mainQuestion.partners = 'required';
  } else {
    if (props.batch.teamSize > 1 && !values.mainQuestion.partners || !values.mainQuestion.partners.length) {
      errors.mainQuestion.partners = 'required';
    }
    if (!values.mainQuestion.expRound1) {
      errors.mainQuestion.expRound1 = 'required';
    }
    if (!values.mainQuestion.expRound2) {
      errors.mainQuestion.expRound2 = 'required';
    }
    if (values.mainQuestion.expRound2 === values.mainQuestion.expRound1) {
      errors.mainQuestion.expRound2 = 'invalid';
    }
  }

  return errors
};

PostSurveyForm = reduxForm({
  form: 'PostSurveyForm',
  enableReinitialize: true,
  destroyOnUnmount: true,
  touchOnChange: true,
  validate,
})(PostSurveyForm);

const selector = formValueSelector('PostSurveyForm');

function mapStateToProps(state) {
  return {
    user: state.app.user
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(PostSurveyForm);