/** Waiting.js
 *  front-end
 *
 *  display waiting room info to worker
 *
 *  renders:
 *    1. when worker is waiting
 *
 *  called by:
 *    1. Router.js
 */


import React from 'react';
import {Card, CardBody, Col, Row, Container, Button, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {loadLogs} from 'Actions/admin'

class Logs extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      logs: "",
      errorLogs: "",
      showLogs: false,
      showErrorLogs: false,
    };
  }


  componentDidMount() {
    this.props.loadLogs();
  }

  handleLogsButton = () => {
    this.setState({showLogs: !this.state.showLogs});
  }

  handleErrorLogsButton = () => {
    this.setState({showErrorLogs: !this.state.showErrorLogs});
  }

  render() {
    const topPadding = {
      marginTop: '36px',
    };
      let logs = this.props.logs;
      let errorLogs = this.props.errorLogs
    if (!logs || (logs && !logs.length)) {
      logs = []
    }
    if (!errorLogs || (errorLogs && !errorLogs.length)) {
      errorLogs = []
    }

    return (
      <div>

      <Table className='table table--bordered table--head-accent table-hover'>

        <thead>
          <tr>
            <th>#</th>
            <th>Log</th>
          </tr>
        </thead>
        <tbody>
            <h5>Logs</h5>
            <button onClick={this.handleLogsButton}>{this.state.showLogs ? "Hide logs" : "Expand logs"}</button>

            {this.state.showLogs && logs.map((x, ind) => <tr><td>{ind}</td><td>{x}</td></tr>)}
            <h5>Error Logs</h5>
            <button onClick={this.handleErrorLogsButton}>{this.state.showErrorLogs ? "Hide error logs" : "Expand error logs"}</button>

            {this.state.showErrorLogs && errorLogs.map((x, ind) => <tr><td>{ind}</td><td>{x}</td></tr>)}
        </tbody>
      </Table>
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    logs: state.admin.logs,
    errorLogs: state.admin.errorLogs,
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadLogs,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Logs);