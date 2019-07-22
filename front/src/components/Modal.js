import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Button, ButtonToolbar, Modal} from 'reactstrap';

export default class ModalComponent extends PureComponent {
  static propTypes = {
    title: PropTypes.string,
    message: PropTypes.string,
    color: PropTypes.string.isRequired,
    colored: PropTypes.bool,
    header: PropTypes.bool,
    btn: PropTypes.string.isRequired
  };
  
  constructor(props) {
    super(props);
    this.state = {
      modal: false
    };
    
    this.toggle = this.toggle.bind(this);
  }
  
  toggle() {
    this.setState({
      modal: !this.state.modal
    });
  }
  
  render() {
    let Icon;
    
    switch (this.props.color) {
      case 'primary':
        Icon = <span className='lnr lnr-pushpin modal__title-icon'/>;
        break;
      case 'success':
        Icon = <span className='lnr lnr-thumbs-up modal__title-icon'/>;
        break;
      case 'warning':
        Icon = <span className='lnr lnr-flag modal__title-icon'/>;
        break;
      case 'danger':
        Icon = <span className='lnr lnr-cross-circle modal__title-icon'/>;
        break;
      default:
        break;
    }
    
    return (
      <div>
        <Button color={this.props.color} onClick={this.toggle}>{this.props.btn}</Button>
        <Modal isOpen={this.state.modal} toggle={this.toggle}
               className={`modal-dialog--${this.props.color} ${this.props.colored ? 'modal-dialog--colored' : ''} ${this.props.header ? 'modal-dialog--header' : ''}`}>

          <div className='modal__body' onClick={this.toggle}>
            {this.props.content}
          </div>
          {/*<ButtonToolbar className='modal__footer'>
            <Button outline={this.props.colored} color={this.props.color} onClick={this.toggle}>close</Button>
          </ButtonToolbar>*/}
        </Modal>
      </div>
    );
  }
}