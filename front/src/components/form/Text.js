/** Text.js
 *  front-end
 * 
 *  helper methods & jsx for displaying a field or text area
 * 
 *  called by:
 *    1. TemplateForm - textarea
 *    2. MidSurveyForm - field (unused)
 *    3. PostSurveyForm - field (unused) 
 */

import React from 'react'
export const renderField = ({input, label, type, meta: { touched, error, warning }, hidden, disabled}) => {
  return hidden ? null : (
    <div className='form__form-group-input-wrap'>
      <input {...input} placeholder={label} type={type} disabled={disabled} step="any"/>
      {touched && error && <span className='form__form-group-error'>{error}</span>}
    </div>
  )
}

export const renderTextArea = ({input, label, type, meta: { touched, error, warning }, disabled}) => {
  return <div className='form__form-group-input-wrap'>
    <textarea {...input} placeholder={label} disabled={disabled} rows="5"/>
    {touched && error && <span className='form__form-group-error'>{error}</span>}
  </div>
}