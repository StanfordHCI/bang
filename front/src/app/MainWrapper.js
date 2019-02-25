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
          {this.props.children}
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

    loading: state.app.loading
  }
}, mapDispatchToProps)(MainWrapper);