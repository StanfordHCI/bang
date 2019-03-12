import React from 'react';
import {Card, CardBody, Col, Row, Container, Button, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {socket} from 'Actions/app'
import {loadTemplateList} from 'Actions/admin'
import moment from 'moment'
import {history} from 'App/history';

class TemplateList extends React.Component {

  constructor(props) {
    super(props);

  }

  componentWillMount() {
    this.props.loadTemplateList();
  }

  render() {
    const {templateList} = this.props;

    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Template list</h5>
                  <Button className="btn btn-primary" onClick={() => history.push('/templates-add')}>Add Template</Button>
                </div>
                <Table className='table table--bordered table--head-accent'>
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>name</th>
                    <th>created</th>
                  </tr>
                  </thead>
                  <tbody>
                  {templateList.map((template, index) => {
                    return <tr key={template._id}>
                      <td>{index + 1}</td>
                      <td>{template.name}</td>
                      <td>{moment(template.createdAt).format('YYYY.DD.MM-HH:mm:ss')}</td>
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
    templateList: state.admin.templateList
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadTemplateList,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TemplateList);