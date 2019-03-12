import React, {PureComponent} from 'react';
import CheckIcon from 'mdi-react/CheckIcon';
import CloseIcon from 'mdi-react/CloseIcon';
import PropTypes from 'prop-types';

class RadioButtonField extends PureComponent {
  componentDidMount() {
    if (this.props.defaultChecked) {
      this.props.onChange(this.props.radioValue);
    }
  }
  
  onChange = () => {
    this.props.onChange(this.props.radioValue);
  };
  
  render() {
    const disabled = this.props.disabled;
    
    return (
      <label
        className={`radio-btn${disabled ? ' disabled' : ''}${this.props.class ? ` radio-btn--${this.props.class}` : ''}`}>
        <input className='radio-btn__radio' name={this.props.name} type='radio'
               onChange={this.onChange} checked={this.props.value === this.props.radioValue} disabled={disabled}/>
        <span className='radio-btn__radio-custom'/>
        {this.props.class === 'button' ?
          <span className='radio-btn__label-svg'>
              <CheckIcon className='radio-btn__label-check'/>
              <CloseIcon className='radio-btn__label-uncheck'/>
            </span> : ''}
        <span className='radio-btn__label'>{this.props.label}</span>
      </label>
    )
  }
}

const renderRadioButtonField = (props) => (
  <RadioButtonField
    {...props.input}
    label={props.label}
    defaultChecked={props.defaultChecked}
    disabled={props.disabled}
    radioValue={props.radioValue}
    class={props.class}
  />
);

renderRadioButtonField.propTypes = {
  input: PropTypes.object.isRequired,
  label: PropTypes.object,
  defaultChecked: PropTypes.bool,
  disabled: PropTypes.bool,
  radioValue: PropTypes.string,
  class: PropTypes.string
};

export default renderRadioButtonField;