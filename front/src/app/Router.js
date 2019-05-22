import React from 'react';
import {Route, Switch, Redirect} from 'react-router-dom';
import MainWrapper from './MainWrapper';
import {connect} from "react-redux";
import Batch from '../containers/Batch'
import Waiting from '../containers/Waiting'
import NotLogged from '../containers/NotLogged'
import AddBatch from '../containers/admin/AddBatch'
import BatchInfo from '../containers/admin/BatchInfo'
import BatchList from '../containers/admin/BatchList'
import TemplateInfo from '../containers/admin/TemplateInfo'
import AddTemplate from '../containers/admin/AddTemplate'
import BatchResult from '../containers/admin/BatchResult'
import TemplateList from '../containers/admin/TemplateList'

import HasBanged from '../containers/HasBanged'
import Accept from '../containers/Accept'
import BatchEnd from '../containers/BatchEnd'

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
          <Route exact path='/notbanged' component={Accept}/>
          <Route exact path='/batch' component={Batch}/>
          <Route exact path='/batch-end' component={BatchEnd}/>
          <Route exact path='/batches-add' component={AddBatch}/>
          <Route exact path='/templates-add' component={AddTemplate}/>
          <Route exact path='/batches' component={BatchList}/>
          <Route path='/batches/:id' component={BatchResult}/>
          <Route exact path='/templates' component={TemplateList}/>
          <Route path='/templates/:id' component={TemplateInfo}/>
          <Route exact path='/hasbanged' component={HasBanged}/>
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