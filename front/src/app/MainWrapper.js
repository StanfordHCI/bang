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
import ReactLoader from 'react-loader'
import UiSnackbar from "../components/Snackbar"
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

    return (
      <div className="theme-dark">
         <div className="wrapper">
           <div className='container__wrap'>
             {this.props.appReady && this.props.children}
           </div>
        </div>
        <UiSnackbar/>
        {this.props.loading && <div style={loaderOptions}>
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
    loading: state.app.loading
  }
}, mapDispatchToProps)(MainWrapper);