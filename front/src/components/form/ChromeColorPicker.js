import React, {PureComponent} from 'react';
import {ChromePicker} from 'react-color';
import {Popover} from 'reactstrap';
import PropTypes from 'prop-types';

class ChromeColorPickerField extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      displayColorPicker: false,
      color: '#70bbfd',
      rgb: {r: 112, g: 187, b: 253, a: 1},
      active: false
    };
    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }
  
  handleClick(e) {
    e.preventDefault();
    this.setState({displayColorPicker: !this.state.displayColorPicker, active: !this.state.active})
  };
  
  handleChange(color) {
    this.setState({color: color.hex, rgb: color.rgb});
    this.props.onChange(color)
  };
  
  render() {
    return (
      <div className='color-picker'>
        <div className={`color-picker__button${this.state.active ? ' active' : ''}`} onClick={this.handleClick}
             id={this.props.name}>
          <p className='color-picker__color'>{this.state.color}</p>
          <div className='color-picker__color-view' style={{backgroundColor: this.state.color}}/>
        </div>
        <Popover isOpen={this.state.displayColorPicker} target={this.props.name} placement='bottom'
                 className='color-picker__popover'>
          <ChromePicker color={this.state.rgb}
                        onChange={this.handleChange}/>
        </Popover>
      </div>
    )
  }
}


const renderChromeColorPickerField = (props) => (
  <div className='form__form-group-input-wrap'>
    <ChromeColorPickerField
      {...props.input}
    />
    {props.meta.touched && props.meta.error && <span className='form__form-group-error'>{props.meta.error}</span>}
  </div>
);

renderChromeColorPickerField.propTypes = {
  input: PropTypes.object.isRequired,
  meta: PropTypes.object
};

export default renderChromeColorPickerField;