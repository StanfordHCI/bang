/** Notify.js
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
import {notifyUsers} from "Actions/admin";
import {bindActionCreators} from "redux";


class Notify extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      note: '',
      notifyLimit: 0,
      notifyPass: 200
    }
  }

  handleSubmitMessage = () => {
    this.props.notifyUsers({start: false, message: this.state.note})
  }

  handleSubmitStart = () => {
    this.props.notifyUsers({start: true, limit: this.state.notifyLimit, pass: this.state.notifyPass})
  }

  handleNoteChange = (e) => {
    this.setState({note: e.target.value})
  }

  handleLimitChange = (e) => {
    this.setState({notifyLimit: e.target.value})
  }

  handlePassChange = (e) => {
    this.setState({notifyPass: e.target.value})
  }

  render() {
    return (
      <Container>
        <Card>
          <CardBody>
            <div className='card__title'>
              <h5 className='bold-text'>You can send custom message to all willbang users</h5>
            </div>
            <div className='form'>
              <div className='form__form-group-input-wrap' style={{marginTop: '10px'}}>
                <textarea placeholder="add note..." rows="5" value={this.state.note} onChange={this.handleNoteChange}/>
              </div>
            </div>
            <ButtonToolbar className='mx-auto form__button-toolbar'>
              <Button onClick={this.handleSubmitMessage} disabled={!this.state.note} color='primary' size='sm' type='button' >Submit</Button>
            </ButtonToolbar>
            <div className='form'>
              <label className='form__form-group-label'>Notify to join (with login link):</label>
              <div className='form__form-group-input-wrap' style={{marginTop: '10px'}}>
                <label className='form__form-group-label'>how many:</label>
                <input type="number" value={this.state.notifyLimit} onChange={this.handleLimitChange}/>
                <label className='form__form-group-label'>how many to skip:</label>
                <input type="number" value={this.state.notifyPass} onChange={this.handlePassChange}/>
              </div>
            </div>
            <ButtonToolbar className='mx-auto form__button-toolbar'>
              <Button onClick={this.handleSubmitStart} color='danger' size='sm' type='button' >Notify people to join batch</Button>
            </ButtonToolbar>
          </CardBody>
        </Card>
      </Container>
    )
  }
}

function mapStateToProps(state) {
  return {

  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    notifyUsers
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Notify);
