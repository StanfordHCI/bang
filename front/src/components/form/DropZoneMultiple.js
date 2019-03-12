import React, {PureComponent} from 'react';
import Dropzone from 'react-dropzone';
import PropTypes from 'prop-types';

class DropZoneMultipleField extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {};
  }
  
  removeFile(index, e) {
    e.preventDefault();
    this.props.onChange(this.props.value.filter((val, i) => i !== index));
  }
  
  render() {
    const files = this.props.value;
    
    return (
      <div className='dropzone dropzone--multiple'>
        <Dropzone
          className='dropzone__input'
          accept='image/jpeg, image/png'
          name={this.props.name}
          onDrop={(filesToUpload) => {
            this.props.onChange(this.props.value ? this.props.value.concat(filesToUpload) : filesToUpload);
          }}
        >
          {(!files || files.length === 0) &&
          <div className='dropzone__drop-here'><span className='lnr lnr-upload'/> Drop files here to upload</div>}
        </Dropzone>
        {files && Array.isArray(files) &&
        <div className='dropzone__imgs-wrapper'>
          {files.map((file, i) =>
            <div className='dropzone__img' key={i} style={{backgroundImage: 'url(' + file.preview + ')'}}>
              <p className='dropzone__img-name'>{file.name}</p>
              <button className='dropzone__img-delete' onClick={(e) => this.removeFile(i, e)}>
                Remove
              </button>
            </div>)}
        </div>}
      </div>
    )
  }
}

const renderDropZoneMultipleField = (props) => (
  <DropZoneMultipleField
    {...props.input}
  />
);

renderDropZoneMultipleField.propTypes = {
  input: PropTypes.object.isRequired
};

export default renderDropZoneMultipleField;
