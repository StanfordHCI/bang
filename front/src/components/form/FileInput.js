import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

class FileInputField extends PureComponent {
  render() {
    return (
      <div className='form__form-group-file'>
        <label htmlFor={this.props.name}>Choose the file</label>
        <span>{this.props.value.name}</span>
        <input
          type='file'
          name={this.props.name}
          id={this.props.name}
          onChange={
            (e) => {
              e.preventDefault();
              // convert files to an array
              const files = [...e.target.files];
              this.props.onChange({file: files[0], name: files[0].name});
            }
          }
        />
      </div>
    )
  }
}

const renderFileInputField = (props) => (
  <div className='form__form-group-input-wrap'>
    <FileInputField
      {...props.input}
    />
    {props.meta.touched && props.meta.error && <span className='form__form-group-error'>{props.meta.error}</span>}
  </div>
);

renderFileInputField.propTypes = {
  input: PropTypes.object.isRequired,
  meta: PropTypes.object,
};

export default renderFileInputField;
