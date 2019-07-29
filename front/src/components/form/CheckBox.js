/** CheckBox.js
 *  front-end
 * 
 *  helper methods & jsx for displaying CheckBox
 * 
 *  called by:
 *    1. unused    
 */

import React, {PureComponent} from 'react';
import CheckIcon from 'mdi-react/CheckIcon';
import CloseIcon from 'mdi-react/CloseIcon';
import PropTypes from 'prop-types';

class CheckBoxField extends PureComponent {
  componentDidMount() {
    this.props.onChange(this.props.defaultChecked);
  }
  
  render() {
    const disabled = this.props.disabled;
    
    return (
      <label
        className={`checkbox-btn${disabled ? ' disabled' : ''}${this.props.class ? ` checkbox-btn--${this.props.class}` : ''}`}>
        <input className='checkbox-btn__checkbox'
               type='checkbox' name={this.props.name} onChange={this.props.onChange}
               checked={this.props.value} disabled={disabled}/>
        <CheckIcon style={{visibility: 'hidden'}}/>
      </label>
    )
  }
}

const renderCheckBoxField = (props) => (
  <div style={{minWidth: '25px'}} className='form__checkbox-container'>
    <CheckBoxField
      {...props.input}
      label={props.label}
      defaultChecked={props.defaultChecked}
      disabled={props.disabled}
      class={props.class}
      color={props.color}
    />
    {props.meta.touched && props.meta.error && <span className='form__form-group-error'>{props.meta.error}</span>}
  </div>
);

renderCheckBoxField.propTypes = {
  input: PropTypes.object.isRequired,
  label: PropTypes.string,
  defaultChecked: PropTypes.bool,
  disabled: PropTypes.bool,
  class: PropTypes.string,
  color: PropTypes.string
};

export default renderCheckBoxField;
