/** TemlateList.js
 *  front-end
 *
 *  admin only layout for viewing all surveys
 *
 *  called by:
 *    1. Router.js
 */

import React from 'react';
import {Card, CardBody, Col, Row, Container, Button, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {loadSurveyList, cloneSurvey, deleteSurvey} from 'Actions/surveys'
import {history} from 'App/history';

class SurveyList extends React.Component {

  constructor(props) {
    super(props);

  }

  componentWillMount() {
    this.props.loadSurveyList();
  }

  render() {
    const {surveyList} = this.props;

    return (
      <Container style={{maxWidth: '100%'}}>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Survey list</h5>
                  <Button className="btn btn-primary" onClick={() => history.push('/surveys-add')}>Add Survey</Button>
                </div>
                <Table className='table table--bordered table--head-accent table-hover'>
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>name</th>
                    <th>clone</th>
                    <th>delete</th>
                  </tr>
                  </thead>
                  <tbody>
                  {surveyList.map((survey, index) => {
                    return <tr key={survey._id}>
                      <td onClick={() => history.push('/surveys/' + survey._id)}>{index + 1}</td>
                      <td onClick={() => history.push('/surveys/' + survey._id)}>{survey.name}</td>
                      <td>
                        <Button className="btn btn-primary"
                                style={{padding: '2px 10px', marginBottom: '0px'}}
                                onClick={() => this.props.cloneSurvey(survey._id)}>
                          clone
                        </Button>
                      </td>
                      <td>
                        <Button className="btn btn-danger"
                                style={{padding: '2px 10px', marginBottom: '0px'}}
                                onClick={() => this.props.deleteSurvey(survey._id)}>
                          delete
                        </Button>
                      </td>
                    </tr>
                  })}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }
}


function mapStateToProps(state) {
  return {
    surveyList: state.survey.surveyList
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadSurveyList,
    cloneSurvey,
    deleteSurvey
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SurveyList);