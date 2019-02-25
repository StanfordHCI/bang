import React from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import Chat from './Chat'

export class Main extends React.Component {
  state = {}
  componentWillMount(){

  }
  render() {
    const {appReady, children, user} = this.props;
    return  (
      <div className='container__wrap'>
        <Chat/>
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    appReady: state.app.appReady,
    user: state.app.user
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({

  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Main);