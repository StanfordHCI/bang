/** UserList.js
 *  front-end
 * 
 *  admin only layout for viewing all users
 * 
 *  called by:
 *    1. Router.js    
 */

 import React from 'react';
import {Card, CardBody, Col, Row, Container, Button, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {loadUserList, addUser, deleteUser, clearUsers} from 'Actions/admin'
import Pagination from 'Components/Pagination';

const pageSize = 10;

class UserList extends React.Component {

  constructor(props) {
    super(props);
  }

  state = {
    isReady: false,
    page: 1,
    pageOfItems: []
  }

  componentWillMount() {
    this.props.loadUserList()
      .then(() => {
        this.setState({isReady: true, })
      })
  }

  onChangePage = (page) => {
    if (page) {
      const from = (parseInt(page) - 1) * pageSize;
      const to = from + pageSize;
      this.setState({page: page, pageOfItems: this.props.userList.filter((x, index) => from <= index && index < to)});
    }
  }

  componentWillUnmount() {
    this.props.clearUsers()
  }

  render() {
    const {userList} = this.props;

    return (
      <Container style={{maxWidth: '100%'}}>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              {this.state.isReady && <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>User list</h5>
                  <Button className="btn btn-primary" onClick={() => this.props.addUser()}>Add User</Button>
                </div>
                <Table className='table table--bordered table--head-accent'>
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>mturk id</th>
                    <th>login link</th>
                    <th>status</th>
                    <th>connected</th>
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
    userList: state.admin.userList
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadUserList,
    addUser,
    deleteUser,
    clearUsers
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UserList);