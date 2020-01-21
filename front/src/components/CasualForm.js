import React from "react";
import {change, Field, formValueSelector, reduxForm} from "redux-form";
import {Button, ButtonToolbar, Col, Container, Row} from "reactstrap";
import renderRadioPanel from "Components/form/RadioPanel";
import renderRadioButton from "Components/form/RadioButton";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Form, FormGroup, Label, Input, FormText} from 'reactstrap';
import {renderTextArea} from 'Components/form/Text';

const renderRadioButtonField = (props) => {
    return (
        <FormGroup check>
            <Label check>
                <Input {...props.input} name={props.input.name} type="radio"/>{' '}
                {props.option.label}
            </Label>
        </FormGroup>
    )
};

const renderCheckBoxField = (props) => {
    return (
        <FormGroup check>
            <Label check>
                <Input {...props.input} type="checkbox"/>{' '}
                {props.option.label}
            </Label>
        </FormGroup>
    )
}

class CasualForm extends React.Component {

    constructor() {
        super();
        this.state = {};
    }

    render() {
        const {questions} = this.props;
        return (
            <form onSubmit={this.props.handleSubmit}>
                <FormGroup>
                    <p style={{color: 'black'}}>Questions</p>
                    {
                        questions.map((question, index) => {
                            if (question.type === 2) {
                                return <FormGroup tag="fieldset">
                                    <Label>{question.text}</Label>
                                    <FormGroup check>
                                        {
                                            question.selectOptions.map(option => (
                                                <Field
                                                    name={`questions.${index}.result`}
                                                    component={renderRadioButtonField}
                                                    type="radio"
                                                    option={option}
                                                    value={option.value}
                                                />
                                            ))
                                        }
                                    </FormGroup>
                                </FormGroup>
                            }
                            if (question.type === 3) {
                                return <FormGroup tag="fieldset">
                                    <Label>{question.text}</Label>
                                    <FormGroup check>
                                        {
                                            <Field
                                                name={`questions.${index}.result`}
                                                component="input"
                                                type="text"
                                            />
                                        }
                                    </FormGroup>
                                </FormGroup>
                            }
                            if (question.type === 4) {
                                return <FormGroup tag="fieldset">
                                    <Label>{question.text}</Label>
                                    <FormGroup check>
                                        {
                                            question.selectOptions.map((option, optionIndex) => (
                                                <Field
                                                    name={`questions.${index}.result.${optionIndex}`}
                                                    component={renderCheckBoxField}
                                                    option={option}
                                                    value={option.value}
                                                />
                                            ))
                                        }
                                    </FormGroup>
                                </FormGroup>
                            }
                        })
                    }
                </FormGroup>
                <Button color='primary' size='sm' type='submit'
                >Submit</Button>
            </form>
        )
    }
}

const validate = (values, props) => {
    const errors = {};
    if (!values.name) {
        errors.name = 'required'
    } else if (values.name.length > 25) {
        errors.name = 'must be 25 characters or less'
    }

    return errors
};

CasualForm = reduxForm({
    form: 'CasualForm',
    validate,
})(CasualForm);


export default CasualForm;