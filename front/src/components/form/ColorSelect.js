import React, {PureComponent} from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';

class SelectOption extends PureComponent {
  static propTypes = {
    option: PropTypes.object.isRequired,
    className: PropTypes.string,
    isDisabled: PropTypes.bool,
    isFocused: PropTypes.bool,
    isSelected: PropTypes.bool,
    onFocus: PropTypes.func,
    onSelect: PropTypes.func
  };
  
  constructor(props) {
    super(props);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }
  
  handleMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    this.props.onSelect(this.props.option, event);
  }
  
  handleMouseEnter(event) {
    this.props.onFocus(this.props.option, event);
  }
  
  handleMouseMove(event) {
    if (this.props.isFocused) return;
    this.props.onFocus(this.props.option, event);
  }
  
  render() {
    return (
      <div className={this.props.className}
           onMouseDown={this.handleMouseDown}
           onMouseEnter={this.handleMouseEnter}
           onMouseMove={this.handleMouseMove}
           title={this.props.option.title}>
        {this.props.children}
        <span className='form__form-group-select-color'
              style={{backgroundColor: this.props.option.color}}/>
      </div>
    )
  }
}

class SelectValue extends PureComponent {
  static propTypes = {
    value: PropTypes.object
  };
  
  render() {
    return (
      <div className='Select-value' title={this.props.value.title}>
        <p>{this.props.children}</p>
        <span className='form__form-group-select-color'
              style={{backgroundColor: this.props.value.color}}/>
      </div>
    )
  }
}

export default class ColorSelect extends PureComponent {
  
  constructor(props) {
    super(props);
    this.state = {
      value: ''
    };
    this.handleChange = this.handleChange.bind(this);
  }
  
  handleChange = (selectedOption) => {
    this.setState({value: selectedOption});
  };
  
  render() {
    // const {value, name} = this.props;
    
    return (
      <Select
        // name={name}
        value={this.state.value}
        onChange={this.handleChange}
        options={this.props.options}
        clearable={false}
        className='form__form-group-select'
        placeholder={this.props.placeholder}
        optionComponent={SelectOption}
        valueComponent={SelectValue}
      />
    )
  }
}
