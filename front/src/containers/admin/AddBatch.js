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
import {addBatch, loadTemplateList} from "Actions/admin";
import {bindActionCreators} from "redux";
import BatchForm from './BatchForm'
import moment from 'moment'
import Select from 'react-select';
import {Field} from "redux-form";

class BatchInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      template: '',
      isReady: false,
      options: [],
      note: '',
      maskType: ''
    }
  }

  componentWillMount(){
    this.props.loadTemplateList({full:true})
      .then(() => {
        let options = this.props.templateList.map(x => {return {value: x._id, label: x.name}})
        //options.unshift({value: '', label: '...'})
        this.setState({isReady: true, options: options})
      })
  }

  handleSubmit = () => {
    let batch = Object.assign(this.props.templateList.find(x => x._id === this.state.template));
    batch.note = this.state.note;
    batch.maskType = this.state.maskType;
    this.props.addBatch(batch)
  }

  handleTemplateChange = (e) => {
    this.setState({template: e.value})
  }

  handleMaskTypeChange = (e) => {
    this.setState({maskType: e.value})
  }

  handleNoteChange = (e) => {
    this.setState({note: e.target.value})
  }

  render() {
    return (
      <Container>
        <Card>
          {this.state.isReady && <CardBody>
            <div className='card__title'>
              <h5 className='bold-text'>Add batch</h5>
            </div>
            <div className='form'>
              <Select
                value={this.state.template}
                onChange={this.handleTemplateChange}
                options={this.state.options}
                clearable={false}
                multi={false}
                className='form__form-group-select'
                placeholder="select template"
              />
              <div className='form__form-group-input-wrap' style={{marginTop: '10px'}}>
                <Select
                  value={this.state.maskType}
                  onChange={this.handleMaskTypeChange}
                  options={[{value: 'masked', label: 'masked'}, {value: 'unmasked', label: 'unmasked'}]}
                  clearable={false}
                  multi={false}
                  className='form__form-group-select'
                  placeholder="select type"
                />
              </div>
              <div className='form__form-group-input-wrap' style={{marginTop: '10px'}}>
                <textarea placeholder="add note..." rows="5" value={this.state.note} onChange={this.handleNoteChange}/>
              </div>
            </div>
            <ButtonToolbar className='mx-auto form__button-toolbar'>
              <Button onClick={this.handleSubmit} disabled={!this.state.template} color='primary' size='sm' type='button' >Add batch</Button>
            </ButtonToolbar>
          </CardBody>}
        </Card>
      </Container>
    )
  }
}

function mapStateToProps(state) {
  return {
    templateList: state.admin.templateList
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    addBatch,
    loadTemplateList
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(BatchInfo);
