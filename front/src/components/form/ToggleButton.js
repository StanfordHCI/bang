import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

class ToggleButtonField extends PureComponent {
  componentDidMount() {
    this.props.onChange(this.props.defaultChecked);
  }
  
  render() {
    const disabled = this.props.disabled;
    
    return (
      <label className='toggle-btn'>
        <input className='toggle-btn__input'
               type='checkbox' name={this.props.name} onChange={this.props.onChange}
               checked={this.props.value} disabled={disabled}/>
        <label className='toggle-btn__input-label' htmlFor={this.props.name}
               onClick={() => this.props.onChange(!this.props.value)}>Toggle</label>
      </label>
    )
  }
}

const renderToggleButtonField = (props) => (
  <ToggleButtonField
    {...props.input}
    label={props.label}
    defaultChecked={props.defaultChecked}
    disabled={props.disabled}
  />
);

renderToggleButtonField.propTypes = {
  input: PropTypes.object.isRequired,
  label: PropTypes.string,
  defaultChecked: PropTypes.bool,
  disabled: PropTypes.bool
};

export default renderToggleButtonField