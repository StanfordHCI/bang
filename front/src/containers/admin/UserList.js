/** UserList.js
 *  front-end
 * 
 *  admin only layout for viewing all users
 * 
 *  called by:
 *    1. Router.js
 *
 *   this.props.userList contains all the users while
 *   this.state.userList contains only the filtered ones
 */

 import React from 'react';
import {Card, CardBody, Col, Row, Container, Button, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {loadUserList, addUser, deleteUser, clearUsers, payBonus} from 'Actions/admin'
import Pagination from 'Components/Pagination';

const pageSize = 10;

class UserList extends React.Component {

  constructor(props) {
    super(props);
  }

  state = {
    isReady: false,
    page: 1,
    pageOfItems: [],
    userList: [],
    searchValue: '',
  }

  componentWillMount() {
    this.props.loadUserList()
      .then(() => {
        this.setState({isReady: true, userList: this.props.userList})
      })
  }

  onChangePage = (page) => {
    if (page) {
      const from = (parseInt(page) - 1) * pageSize;
      const to = from + pageSize;
      this.setState({page: page, pageOfItems: this.state.userList.filter((x, index) => from <= index && index < to)});
    }
  }

  handleSearchChange = s => {
    this.setState({searchValue: s.target.value})
    const lowerCasesdList = this.props.userList;
    lowerCasesdList.forEach((x, ind) => lowerCasesdList[ind].mturkId = lowerCasesdList[ind].mturkId.toLowerCase())
    let userList = lowerCasesdList.filter(x => x.mturkId.toLowerCase().indexOf(s.target.value.toLowerCase()) > -1);
    this.setState({userList: userList});
    this.onChangePage(1);
  }

  componentWillUnmount() {
    this.props.clearUsers()
  }

  render() {
    const {willbangLength} = this.props;
    const userList = this.state.userList;
    return (
      <Container style={{maxWidth: '100%'}}>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <Row>
                    <h5 className='bold-text'>User list ({willbangLength} real willbang users)</h5>
                  </Row>
                  <Row>
                    <Button className="btn btn-primary" onClick={() => this.props.addUser()}>Add User</Button>
                  </Row>
                  <Row>
                    <input
                        value={this.state.searchValue}
                        placeholder="Find user.."
                        onChange={this.handleSearchChange}
                    />
                  </Row>
                </div>
                <Table className='table table--bordered table--head-accent'>
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>mturk id</th>
                    <th>login link</th>
                    <th>status</th>
                    <th>connected</th>
                    <th>total bonuses</th>
                    <th>pay 1$</th>
                    <th>delete</th>
                  </tr>
                  </thead>
                  <tbody>
                  {this.state.pageOfItems.map((user, index) => {
                    return <tr key={user._id}>
                      <td>{(this.state.page - 1) * pageSize + index + 1}</td>
                      <td>{user.mturkId}</td>
                      <td>{user.loginLink}</td>
                      <td>{user.systemStatus}</td>
                      <td>{user.connected ? 'yes' : 'no'}</td>
                      <td>{user.totalBonuses}$</td>
                      <td>
                        <Button className="btn btn-danger"
                                style={{padding: '2px 10px', marginBottom: '0px'}}
                                onClick={() => this.props.payBonus(user._id)}
                                disabled={!user.isTest}>
                          1$
                        </Button>
                      </td>
                      <td>
                        <Button className="btn btn-danger"
                                disabled={!user.isTest}
                                style={{padding: '2px 10px', marginBottom: '0px'}}
                                onClick={() => this.props.deleteUser(user._id)}>
                          delete
                        </Button>
                      </td>
                    </tr>
                  })}
                  </tbody>
                </Table>
                <Pagination items={userList} pageSize={pageSize} onChangePage={this.onChangePage}/>
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
    userList: state.admin.userList,
    willbangLength: state.admin.willbangLength
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadUserList,
    addUser,
    deleteUser,
    clearUsers,
    payBonus,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UserList);