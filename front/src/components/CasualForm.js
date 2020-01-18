import React from "react";
import {change, Field, formValueSelector, reduxForm} from "redux-form";
import {Button, ButtonToolbar, Col, Container, Row} from "reactstrap";
import renderRadioPanel from "Components/form/RadioPanel";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Form, FormGroup, Label, Input, FormText} from 'reactstrap';

const renderRadioButtonField1 = (props) => {
    return <Label check>
        <Input type="radio" name="radio1"/>
        {props.label}
    </Label>
};

const renderOptionsQuestion = ({options, index}) => {
    return (
                <Field
                    name='result'
                    component={renderRadioPanel}
                    options={options}
                />
        )


};

class CasualForm extends React.Component {

    constructor() {
        super();
        this.state = {};
    }

    render() {
        const {questions} = this.props;
        return (
            <form className='form form--horizontal'
                  onSubmit={this.props.handleSubmit}>
                <Container>
                    <Row>
                        <p style={{color: 'black'}}>Questions</p>
                        {
                            questions.map(question => (
                                question.type === 2 &&
                                <Row>
                                    <Col className='form__form-group'>
                                        <label className='form__form-group-label'
                                               style={{maxWidth: '50px', textAlign: 'center'}}><p style={{
                                            color: 'grey',
                                            textAlign: 'center',
                                            lineHeight: '180%'
                                        }}>{question.text}</p></label>
                                            <Field
                                                name={`${question}.options`}
                                                component={renderOptionsQuestion}
                                                rerenderOnEveryChange
                                                withPoints={false}
                                                options={question.selectOptions}
                                            />
                                    </Col>
                                </Row>
                            ))
                        }
                    </Row>
                    <Row>
                        <Col>
                            <ButtonToolbar className='mx-auto form__button-toolbar'>
                                <Button color='primary' size='sm' type='submit'
                                >Submit</Button>
                            </ButtonToolbar>
                        </Col>
                    </Row>
                </Container>
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
    form: 'TemplateForm',
    enableReinitialize: true,
    touchOnChange: true,
    validate,
})(CasualForm);

const selector = formValueSelector('CasualForm');

function mapStateToProps(state) {
    return {}
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(CasualForm);