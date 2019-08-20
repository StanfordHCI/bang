/** BatchList.js
 *  front-end
 * 
 *  admin only layout for viewing all batches
 * 
 *  called by:
 *    1. Router.js    
 */

import React from 'react';
import {Card, CardBody, Col, Row, Container, Button, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {loadBatchList, addBatch, stopBatch, clearBatches, switchBatchesVisibility} from 'Actions/admin'
import moment from 'moment'
import {history} from 'App/history';
import Pagination from 'Components/Pagination';

const pageSize = 10;

class BatchList extends React.Component {

  constructor(props) {
    super(props);
  }

  state = {
    isReady: false,
    page: 1,
    pageOfItems: []
  }

  componentWillMount() {
    this.props.loadBatchList()
      .then(() => {
        this.setState({isReady: true, })
      }).then(() => console.log('props: ', this.props))
  }

  componentWillUnmount() {
    this.props.clearBatches()
  }

  onChangePage = (page) => {
    if (page) {
      const from = (parseInt(page) - 1) * pageSize;
      const to = from + pageSize;
      this.setState({page: page, pageOfItems: this.props.batchList.filter((x, index) => from <= index && index < to)});
    }
  }

  render() {
    const {batchList} = this.props;

    return (
      <Container style={{maxWidth: '100%'}}>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <Row style={{marginLeft: '0px', marginBottom: '10px', justifyContent: 'space-between'}}>
                    <h5 className='bold-text' >Batch list</h5>
                    <Button className="btn btn-primary" onClick={() => this.props.switchBatchesVisibility(!this.props.hideEmptyBatches)}>
                      {this.props.hideEmptyBatches ? 'show' : 'hide'} empty batches
                    </Button>
                  </Row>
                  <Button className="btn btn-primary" onClick={() => history.push('/batches-add')}>Add Batch</Button>
                </div>
                <Table className='table table--bordered table--head-accent table-hover'>
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>created</th>
                    <th>start time</th>
                    <th>team format</th>
                    <th>status</th>
                    <th>template</th>
                    <th>note</th>
                    <th>type</th>
                    <th>stop</th>
                  </tr>
                  </thead>
                  <tbody>
                  {this.state.pageOfItems.map((batch, index) => {
                    return <tr key={batch._id}>
                      <td onClick={() => history.push('/batches/' + batch._id)}>{(this.state.page - 1) * pageSize + index + 1}</td>
                      <td onClick={() => history.push('/batches/' + batch._id)}>{moment(batch.createdAt).format('YYYY.DD.MM-HH:mm:ss')}</td>
                      <td onClick={() => history.push('/batches/' + batch._id)}>{!!batch.startTime ? moment(batch.startTime).format('YYYY.DD.MM-HH:mm:ss') : 'not started'}</td>
                      <td onClick={() => history.push('/batches/' + batch._id)}>{batch.teamFormat ? batch.teamFormat : 'multi'}</td>
                      <td onClick={() => history.push('/batches/' + batch._id)}>{batch.status}</td>
                      <td onClick={() => history.push('/batches/' + batch._id)}>{batch.templateName}</td>
                      <td onClick={() => history.push('/batches/' + batch._id)}>{batch.note}</td>
                      <td onClick={() => history.push('/batches/' + batch._id)}>{batch.maskType}</td>
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
                <Pagination items={batchList} pageSize={pageSize} onChangePage={this.onChangePage}/>
              </CardBody>}
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }
}


function mapStateToProps(state) {
  return {
    hideEmptyBatches: state.admin.hideEmptyBatches,
    batchList: state.admin.hideEmptyBatches ? state.admin.batchList.filter(x => (x.status !== 'completed' || (x.status === 'completed' && x.startTime))) : state.admin.batchList
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadBatchList,
    addBatch,
    stopBatch,
    clearBatches,
    switchBatchesVisibility,
  }, dispatch);
}

export default
connect(mapStateToProps, mapDispatchToProps)(BatchList);