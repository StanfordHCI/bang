import React, {PureComponent} from 'react';
import DatePicker from 'react-datepicker';
import MinusIcon from 'mdi-react/MinusIcon';
import PropTypes from 'prop-types';

class IntervalDatePickerField extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      startDate: null,
      endDate: null
    };
    this.handleChange = this.handleChange.bind(this);
  }
  
  handleChange({startDate, endDate}) {
    startDate = startDate || this.state.startDate;
    endDate = endDate || this.state.endDate;
    
    if (startDate.isAfter(endDate)) {
      endDate = startDate
    }
    
    this.setState({startDate, endDate});
    this.props.onChange({start: startDate, end: endDate});
  }
  
  handleChangeStart = (startDate) => this.handleChange({startDate});
  
  handleChangeEnd = (endDate) => this.handleChange({endDate});
  
  render() {
    return (
      <div className='date-picker date-picker--interval'>
        <DatePicker
          selected={this.state.startDate}
          selectsStart
          startDate={this.state.startDate}
          endDate={this.state.endDate}
          onChange={this.handleChangeStart}
          dateFormat='LL'
          placeholderText='From'
        />
        <MinusIcon className='date-picker__svg'/>
        <DatePicker
          selected={this.state.endDate}
          selectsEnd
          startDate={this.state.startDate}
          endDate={this.state.endDate}
          onChange={this.handleChangeEnd}
          dateFormat='LL'
          placeholderText='To'
        />
      </div>
    )
  }
}

const renderIntervalDatePickerField = (props) => (
  <IntervalDatePickerField
    {...props.input}
  />
);

renderIntervalDatePickerField.propTypes = {
  input: PropTypes.object.isRequired
};

export default renderIntervalDatePickerField;