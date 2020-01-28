/** mainwrapper.js
 *  front-end
 * 
 *  site wrapper, all other pages are wrapped inside
 *  renders snackbar, not clear how message gets mapped
 * 
 *  controls:
 *    - theme
 *  
 *  renders:  
 *    1. throughout
 * 
 *  called by:
 *    1. router.js
 *     
 */

import React, {PureComponent} from 'react';
import {connect} from 'react-redux';
import classNames from 'classnames';
import {Navbar, Container} from 'reactstrap'
import ReactLoader from 'react-loader'
import UiSnackbar from "../components/Snackbar"
import {Link} from 'react-router-dom'
import {bindActionCreators} from "redux";

const loaderOptions = {
  width: '100%',
  height: '100%',
  padding: 'auto',
  position: 'fixed',
  top: '0',
  right: '0',
  background: 'transparent',
  zIndex: 99999,
};

class MainWrapper extends PureComponent {
  render() {
    const {user, appReady, loading} = this.props;

    return (
      <div className={process.env.NODE_ENV === 'production' ? "theme-light" : "theme-dark"}>
        {appReady &&  <div className="wrapper">
          {user && !!user.isAdmin && <Navbar
            color="dark"
            dark expand="xl"
            className="topbar-main fixed-top"
          >
            <Container
              fluid
              className="justify-content-md-start"
            >
              <Link className='topbar__collapse-link' to='/users'>
                users
              </Link>
              <Link className='topbar__collapse-link' to='/batches'>
                batches
              </Link>
              <Link className='topbar__collapse-link' to='/templates'>
                templates
              </Link>
              <Link className='topbar__collapse-link' to='/surveys'>
                surveys
              </Link>
              {/*<Link to={'/cases'} className='topbar__collapse-link'>*/}
              {/*  cases*/}
              {/*</Link>*/}
              <Link className='topbar__collapse-link' to='/waiting'>
                waitroom
              </Link>
              <Link className='topbar__collapse-link' to='/notify'>
                notify
              </Link>
            </Container>
          </Navbar>}
           <div className='container__wrap' style={{paddingTop: user && user.isAdmin ? '60px': '30px'}}>
             {this.props.children}
           </div>
        </div>}
        <UiSnackbar/>
        {loading && <div style={loaderOptions}>
          <ReactLoader loaded={false}/>
        </div>}
      </div>
    )
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({

  }, dispatch);
}

export default connect(state => {
  return {
    appReady: state.app.appReady,
    user: state.app.user,
    loading: state.app.loading
  }
}, mapDispatchToProps)(MainWrapper);