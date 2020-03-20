import React from "react";
import {Col, Row} from "reactstrap";

export const renderIntegerRank = ({input, label, meta: { touched, error, warning }, hidden, disabled, options, from, to}) => {
  if (Number(input.value) > to || Number(input.value) < from) {
    error = 'invalid'
  }
  return hidden ? null : (
    <div className='radio-panel'>
      {options.map((option, ind) =>
      <div>
        <label className='form__form-group-label'>{option.label}</label>
        <div className='form__form-group-radio-panel-wrap'>
          <input {...input} placeholder={label} type='number' disabled={disabled} step="any"/>
          {touched && error && <span className='form__form-group-error'>{error}</span>}
        </div>
      </div>
      )}
    </div>
  )
}