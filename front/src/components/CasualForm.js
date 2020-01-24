import React from "react";
import {change, Field, formValueSelector, SubmissionError, reduxForm} from "redux-form";
import {Button, ButtonToolbar, Col, Container, Row} from "reactstrap";
import renderRadioPanel from "Components/form/RadioPanel";
import renderRadioButton from "Components/form/RadioButton";
import {renderField} from "Components/form/Text";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Form, FormGroup, Label, Input, FormText} from 'reactstrap';

const renderRadioButtonField = (props) => {
    return (
        <FormGroup check inline>
            <Label check>
                <Input {...props.input} name={props.input.name} type="radio"/>{' '}
                {props.option.label}
            </Label>
        </FormGroup>
    )
};

const renderCheckBoxField = (props) => {
    return (
        <FormGroup check inline>
            <Label check>
                <Input {...props.input} type="checkbox"/>{' '}
                {props.option.label}
            </Label>
        </FormGroup>
    )
}

const renderTextField = (props) => {
    return (
        <Row form>
            <Col ms={2}>
            </Col>
            <Col md={4}>
                <FormGroup>
                    <Input {...props.input} type="text"/>
                    {props.meta.touched && props.meta.error && <span style={{color: 'red'}}>{props.meta.error}</span>}
                </FormGroup>
            </Col>
            <Col ms={2}>
            </Col>
        </Row>
    )
}

const required = value => value ? undefined : 'Required'

class CasualForm extends React.Component {

    constructor() {
        super();
        this.state = {
            disabled: false,
        };
        this.submit = this.submit.bind(this);
    }

    submit(data) {
        const {onSubmit, questions} = this.props;
        const _questions = questions.filter(q => q.type === 4);
        const __questions = data.questions.filter(q => Array.isArray(q.result));
        if (_questions.length !== __questions.length) {
            throw new SubmissionError({
                _error: 'At least one checkbox must be selected'
            })
        }
        if (questions.length !== data.questions.length) {
            throw new SubmissionError({
                _error: 'All questions is required'
            })
        }
        data.questions.map(question => {
            if (Array.isArray(question.result)) {
                let result = [];
                question.result.forEach((x, index) => {
                    if (x) {
                        result.push(index);
                    }
                });
                if (result.length === 0) {
                    throw new SubmissionError({
                        _error: 'At least one checkbox must be selected'
                    })
                }
                delete question.result;
                question.result_array = result;
            }
        });
        onSubmit(data);
        this.setState({disabled: true});
    }

    render() {
        const {questions, error} = this.props;
        const {disabled} = this.state;
        return (
            <Form onSubmit={this.props.handleSubmit(this.submit)}>
                {!disabled ?
                    <React.Fragment>
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
                                        return <FormGroup>
                                            <Label>{question.text}</Label>
                                            {
                                                <Field
                                                    name={`questions.${index}.result`}
                                                    component={renderTextField}
                                                    validate={[required]}
                                                />
                                            }
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
                        <FormGroup>
                            {error && <strong style={{color: 'red'}}>{error}</strong>}
                        </FormGroup>
                        <Button color='primary' size='sm' type='submit' disabled={disabled}
                        >Submit</Button>
                    </React.Fragment> : <Label>Thank you</Label>
                }
            </Form>
        )
    }
}


CasualForm = reduxForm({
    form: 'CasualForm',
})(CasualForm);

export default CasualForm;