/** RadioButton.js
 *  front-end
 * 
 *  helper methods & jsx for displaying a single radio button
 * 
 *  called by:
 *    1. unused    
 */

import React, { PureComponent } from 'react';
import CheckIcon from 'mdi-react/CheckIcon';
import CloseIcon from 'mdi-react/CloseIcon';
import PropTypes from 'prop-types';

const styles = {
  padding: '3%',
  margin: '0% 5px 0% 5px'
}

class RadioButtonField extends PureComponent {
  componentDidMount() {
    if (this.props.defaultChecked) {
      this.props.onChange(this.props.radioValue);
    }
  }

  onChange = () => {
    this.props.onChange(this.props.value);
  };

  render() {
    const disabled = this.props.disabled;
    return (
      <label style={styles}
        className={`radio-btn${disabled ? ' disabled' : ''}${this.props.class ? ` radio-btn--${this.props.class}` : ''}`}>
        <input className='radio-btn__radio' name={this.props.name} type='radio'
          onChange={this.onChange} checked={this.props.value == this.props.radioValue} disabled={disabled} />
        <span className='radio-btn__radio-custom' />
        {this.props.class === 'button' ?
            <span className='radio-btn__label-svg'>
              <CheckIcon className='radio-btn__label-check' />
              <CloseIcon className='radio-btn__label-uncheck' />
            </span> : ''}
        <span className='radio-btn__label'>{this.props.label}</span>
      </label>
    )
  }
}

const RenderRadioButtonField = (props) => {
  return <RadioButtonField
  {...props.input}
  label={props.label}
  value={props.value}
  defaultChecked={props.defaultChecked}
  disabled={props.disabled}
  class={props.class}
  radioValue={props.radioValue}
  onChange={props.onChange}/>
}

RenderRadioButtonField.propTypes = {
  label: PropTypes.string,
  value: PropTypes.number,
  defaultChecked: PropTypes.bool,
  disabled: PropTypes.bool,
  class: PropTypes.string
};

export default RenderRadioButtonField;