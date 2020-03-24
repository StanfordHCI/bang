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
import {Card, CardBody, Col, Row, Container, Button} from 'reactstrap';
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
    let logs = <div></div>
    let errorLogs = <div></div>
    try {
      logs = this.props.logs.map(x =>
        <p>{x}</p>)
      errorLogs = this.props.errorLogs.map(x =>
      <p>{x}</p>)
    } catch (e) {

    }
    if (!logs || (logs && !logs.length)) {
      logs = <div></div>
    }
    if (!errorLogs || (errorLogs && !errorLogs.length)) {
      errorLogs = <div></div>
    }

    return (
      <div>
        <h5>Logs</h5>
        <button onClick={this.handleLogsButton}>{this.state.showLogs ? "Hide" : "Expand"}</button>
        {this.state.showLogs && <Col>

          <div>{logs}</div>
        </Col>}
        <h5>Error Logs</h5>
        <button onClick={this.handleErrorLogsButton}>{this.state.showErrorLogs ? "Hide" : "Expand"}</button>
        {this.state.showErrorLogs && <Col>

          <p>{errorLogs}</p>
        </Col>}
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