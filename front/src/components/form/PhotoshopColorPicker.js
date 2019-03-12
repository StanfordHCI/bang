import React, {PureComponent} from 'react';
import {PhotoshopPicker} from 'react-color';
import {Popover} from 'reactstrap';

export default class PhotoshopColorPicker extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      displayColorPicker: false,
      color: '#70bbfd',
      rgb: {r: 112, g: 187, b: 253, a: 1},
      value: '',
      oldValue: null
    };
    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleAccept = this.handleAccept.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }
  
  handleClick(e) {
    e.preventDefault();
    this.setState({displayColorPicker: !this.state.displayColorPicker})
  };
  
  handleAccept(e) {
    e.preventDefault();
    this.setState({displayColorPicker: false, oldValue: this.state.value});
    this.props.onChange(this.state.value);
  };
  
  handleCancel(e) {
    e.preventDefault();
    const color = this.state.oldValue ? this.state.oldValue.hex : {r: 112, g: 187, b: 253, a: 1};
    const rgb = this.state.oldValue ? this.state.oldValue.rgb : '#70bbfd';
    this.setState({displayColorPicker: false, value: this.state.oldValue, color: color, rgb: rgb});
  };
  
  handleChange(color) {
    this.setState({color: color.hex, rgb: color.rgb, value: color});
  };
  
  render() {
    return (
      <div className='color-picker'>
        <div className='color-picker__button' onClick={this.handleClick} id={this.props.name}>
          <p className='color-picker__color'>{this.state.color}</p>
          <div className='color-picker__color-view' style={{backgroundColor: this.state.color}}/>
        </div>
        <Popover isOpen={this.state.displayColorPicker} target={this.props.name} placement='bottom'>
          <PhotoshopPicker color={this.state.rgb} onAccept={this.handleAccept} onCancel={this.handleCancel}
                           onChange={this.handleChange} header='Choose color'/>
        </Popover>
      </div>
    )
  }
}