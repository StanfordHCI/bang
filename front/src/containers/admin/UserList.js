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
import {loadUserList, addUser, deleteUser} from 'Actions/admin'
import moment from 'moment'

class UserList extends React.Component {

  constructor(props) {
    super(props);

  }

  componentWillMount() {
    this.props.loadUserList();
  }

  render() {
    const {userList} = this.props;

    return (
      <Container style={{maxWidth: '100%'}}>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
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
                  {userList.map((user, index) => {
                    return <tr key={user._id}>
                      <td>{index + 1}</td>
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
    userList: state.admin.userList
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    loadUserList,
    addUser,
    deleteUser
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UserList);