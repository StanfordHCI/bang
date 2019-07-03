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
    }
  }

  handleSubmit = () => {
    this.props.notifyUsers(this.state.note)
  }

  handleNoteChange = (e) => {
    this.setState({note: e.target.value})
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
              <Button onClick={this.handleSubmit} disabled={!this.state.note} color='primary' size='sm' type='button' >Submit</Button>
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
