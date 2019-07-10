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

class RadioPanelTab extends BaseComponent {
    constructor(props){
        super(props);
    }

    componentDidMount() {
        this.moveFocus();
      }
      moveFocus() {
        const node = this.myRef.current;
        node.addEventListener('keydown', function(e) {
          const active = document.activeElement;
          if(e.keyCode === 40 && active.nextSibling) {
            active.nextSibling.focus();
          }
          if(e.keyCode === 38 && active.previousSibling) {
            active.previousSibling.focus();
          }
        });
      }

      renderRadioPanel = ({ name, value, disabled, options, onChange, dispatch }) => {
        const [selected, setSelected] = useState(value);
        return (
            <div className="radio-panel">
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
