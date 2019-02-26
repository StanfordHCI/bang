import React from 'react';
import {Route, Switch, Redirect} from 'react-router-dom';
import MainWrapper from './MainWrapper';
import {connect} from "react-redux";
import Batch from '../containers/Batch'
import BatchList from '../containers/admin/BatchList'
import Waiting from '../containers/Waiting'
import NotLogged from '../containers/NotLogged'
import constants from 'Constants'

const MainRouter = (props) => {
  const {user, appReady} = props;
  const data = {
    user: user
  };

  return appReady ? (
    <MainWrapper>
      <main>
        <Switch>
          <Route exact path='/waiting' component={Waiting}/>
          <Route exact path='/batch' component={Batch}/>
          <Route exact path='/batchlist' component={BatchList}/>
          <Route exact path='/not-logged' component={NotLogged}/>
        </Switch>
      </main>
    </MainWrapper>
  ) : null
}

function mapStateToProps(state) {
  return {
    user: state.app.user,
    appReady: state.app.appReady
  };
}

export default connect(mapStateToProps, null, null, {pure: false})(MainRouter);