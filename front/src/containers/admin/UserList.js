import React from 'react';
import {Card, CardBody, Col, Row, Container, Button, Table} from 'reactstrap';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import {socket} from 'Actions/app'
import {loadUserList} from 'Actions/admin'
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
      <Container>
        <Row>
          <Col md={12} lg={12} xl={12}>
            <Card>
              <CardBody>
                <div className='card__title'>
                  <h5 className='bold-text'>User list</h5>
                  <Button className="btn btn-primary" onClick={() => history.push('/users-add')}>Add User</Button>
                </div>
                <Table className='table table--bordered table--head-accent'>
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>mturk id</th>
                    <th>created</th>
                    <th>connected</th>
                    <th>last connect time</th>
                  </tr>
                  </thead>
                  <tbody>
                  {userList.map((user, index) => {
                    return <tr key={user._id}>
                      <td>{index + 1}</td>
                      <td>{user.mturkId}</td>
                      <td>{moment(user.createdAt).format('YYYY.DD.MM-HH:mm:ss')}</td>
                      <td>{user.connected ? 'yes' : 'no'}</td>
                      <td>{moment(user.lastConnect).format('YYYY.DD.MM-HH:mm:ss')}</td>
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
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UserList);