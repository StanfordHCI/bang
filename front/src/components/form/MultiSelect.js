import React, {PureComponent} from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';

class MultiSelectField extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      value: [],
    };
    
    this.handleChange = this.handleChange.bind(this);
  }
  
  handleChange(value) {
    this.props.onChange(value);
  };
  
  render() {
    const {value, name} = this.props;
    return (
      <Select
        multi
        name={name}
        value={value}
        onChange={this.handleChange}
        options={this.props.options}
        clearable={false}
        className='form__form-group-select'
        closeOnSelect={false}
        removeSelected={false}
        placeholder={this.props.placeholder}
      />
    )
  }
}

const renderMultiSelectField = (props) => (
  <div className='form__form-group-input-wrap'>
    <MultiSelectField
      {...props.input}
      options={props.options}
    />
    {props.meta.touched && props.meta.error && <span className='form__form-group-error'>{props.meta.error}</span>}
  </div>
);

renderMultiSelectField.propTypes = {
  input: PropTypes.object.isRequired,
  meta: PropTypes.object,
  options: PropTypes.array
};

export default renderMultiSelectField;

