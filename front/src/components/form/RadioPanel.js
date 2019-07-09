/** RadioPanel.js
 *  front-end
 * 
 *  helper methods & jsx for displaying a panel of radio buttons
 *  where only one can be selected
 * 
 *  called by:
 *    1. MidSurveyForm.js
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from "redux";
import RenderRadioButtonField from './RadioButton'
import { connect } from 'react-redux'


const styles = {
    display: 'flex',
    flexFlow: 'row',
    justifyContent: 'space-around'
}

const RadioPanel = ({ name, value, disabled, options, onChange, dispatch }) => {

    const [selected, setSelected] = useState(value);

    return (
        <div className="radio-panel" style={styles}>
            {options.map(option =>
                <RenderRadioButtonField
                    key={option.value}
                    label={option.label}
                    value={option.value}
                    defaultChecked={false}
                    disabled={disabled}
                    radioValue={selected}
                    class="radio-button"
                    onChange={(selectedOption) => {
                        setSelected(selectedOption); // for some reason this lags
                        onChange(selectedOption); // so use selectedoption here to be safe                        
                    }} />
            )}
        </div>
    );
}

const renderRadioPanel = (props) => (
    <div className='form__form-group-radio-panel-wrap'>
        <RadioPanel
            {...props.input}
            options={props.options}
            disabled={props.disabled}
        />
        {props.meta.touched && props.meta.error && <span className='form__form-group-error'>{props.meta.error}</span>}
    </div>
);

renderRadioPanel.propTypes = {
    input: PropTypes.object.isRequired,
    options: PropTypes.array
};

function mapStateToProps(state) {
    return {
    }
}


export default connect(mapStateToProps)(renderRadioPanel);
