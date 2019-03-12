import React, {PureComponent} from 'react';
import DatePicker from 'react-datepicker';
import PropTypes from 'prop-types';

class DateTimePickerField extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      startDate: null
    };
    this.handleChange = this.handleChange.bind(this);
  }
  
  handleChange(date) {
    this.setState({
      startDate: date
    });
    this.props.onChange(date);
  }
  
  render() {
    return (
      <div className='date-picker'>
        <DatePicker
          timeFormat='HH:mm'
          className='form__form-group-datepicker'
          selected={this.state.startDate}
          onChange={this.handleChange}
          showTimeSelect={true}
          dateFormat='LLL'
        />
      </div>
    )
  }
}

export const renderDateTimePickerField = (props) => (
  <DateTimePickerField
    {...props.input}
  />
);

renderDateTimePickerField.propTypes = {
  input: PropTypes.object.isRequired
};

export default renderDateTimePickerField;
