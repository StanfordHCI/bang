import React from 'react';
import {Card, CardBody, Col, Row, Container, Button, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {socket} from 'Actions/app'
import {loadBatchList, addBatch, stopBatch} from 'Actions/admin'
import moment from 'moment'
import {history} from 'App/history';

class BatchList extends React.Component {

  constructor(props) {
    super(props);
  }

  componentWillMount() {
    this.props.loadBatchList();
  }

  render() {
    const {batchList} = this.props;

    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>Batch list</h5>
                  <Button className="btn btn-primary" onClick={() => history.push('/batches-add')}>Add Batch</Button>
                </div>
                <Table className='table table--bordered table--head-accent table-hover'>
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>created</th>
                    <th>start time</th>
                    <th>status</th>
                    <th>template</th>
                    <th>note</th>
                    <th>stop</th>
                  </tr>
                  </thead>
                  <tbody>
                  {batchList.map((batch, index) => {
                    return <tr key={batch._id} onClick={() => history.push('/batches/' + batch._id)}>
                      <td>{index}</td>
                      <td>{moment(batch.createdAt).format('YYYY.DD.MM-HH:mm:ss')}</td>
                      <td>{batch.status === 'active' ? moment(batch.startTime).format('YYYY.DD.MM-HH:mm:ss') : 'not started'}</td>
                      <td>{batch.status}</td>
                      <td>{batch.templateName}</td>
                      <td>{batch.note}</td>
                      <td>
                        <Button className="btn btn-primary"
                                style={{padding: '2px 10px', marginBottom: '0px'}}
                                onClick={() => this.props.stopBatch(batch._id)}
                                disabled={batch.status === 'completed'}>
                          stop
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
    batchList: state.admin.batchList
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadBatchList,
    addBatch,
    stopBatch
  }, dispatch);
}

export default
connect(mapStateToProps, mapDispatchToProps)(BatchList);