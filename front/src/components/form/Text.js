import React from 'react'
export const renderField = ({input, label, type, meta: { touched, error, warning }, hidden, disabled}) => {
  return hidden ? null : (
    <div className='form__form-group-input-wrap'>
      <input {...input} placeholder={label} type={type} disabled={disabled}/>
      {touched && error && <span className='form__form-group-error'>{error}</span>}
    </div>
  )
}

export const renderTextArea = ({input, label, type, meta: { touched, error, warning }, disabled}) => {
  return <div className='form__form-group-input-wrap'>
    <textarea {...input} placeholder={label} type="textarea" disabled={disabled} rows="5"/>
    {touched && error && <span className='form__form-group-error'>{error}</span>}
  </div>
}