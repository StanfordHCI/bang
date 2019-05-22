import React from 'react';
import {Card, CardBody, Col, Row, Container, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {loadBatchResult} from 'Actions/admin'
import Select from "react-select";

const rounds = [{value: 1, label: 1}, {value: 1, label: 1}, {value: 1, label: 1}, {value: 1, label: 1}]

class BatchResult extends React.PureComponent {
  state = {
    user: '',
    round: '',
    options: [],
    isReady: false
  }

  componentWillMount() {
    this.props.loadBatchResult(this.props.match.params.id)
      .then(() => {
        console.log(this.props.batch)
        const options = this.props.batch.users.map(x => {return {value: x.user._id, label: x.nickname + ' (' + x.user.mturkId + ')'}});
        this.setState({isReady: true, options: options})
      })
  }

  handleChangeUser = (e) => {
    this.setState({user: e.value})
  }

  handleChangeRound = (e) => {
    this.setState({round: e.value})
  }


  render() {
    const {batch} = this.props;
    return (
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='form'>
                  <Select
                    value={this.state.user}
                    onChange={(e) => this.handleChangeUser(e)}
                    options={this.state.options}
                    clearable={false}
                    multi={false}
                    className='form__form-group-select'
                    placeholder="Select user..."
                  />
                  <Select
                    value={this.state.round}
                    onChange={(e) => this.handleChangeRound(e)}
                    options={rounds}
                    clearable={false}
                    multi={false}
                    className='form__form-group-select'
                    placeholder="Select round..."
                  />
                </div>
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
    batch: state.admin.batch
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadBatchResult
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(BatchResult);