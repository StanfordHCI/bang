import React from 'react';
import {Route, Switch, Redirect} from 'react-router-dom';
import MainWrapper from './MainWrapper';
import {connect} from "react-redux";
import Main from '../containers/Main'
import constants from 'Constants'

const isAdminRoute = (path) => {
  return path.indexOf('-admin') > -1 || path.indexOf('userprofile') > -1
}

const PrivateRoute = ({data, component: Component, ...rest}) => (
  <Route {...rest}
         render={props => {
           if (!data.user) {
             return <Redirect to={{pathname: "/log_in", state: {from: props.location}}}/>;
           }
           const path = props.location.pathname;
           if (isAdminRoute(path) && data.user.type !== constants.ADMIN) {
             return <Redirect to={{pathname: "/not-found", state: {from: props.location}}}/>;
           }
           return <Component {...props} key={props.location.pathname}/>;
         }}
  />
);

const MainRouter = (props) => {
  const {user, appReady} = props;
  const data = {
    user: user
  };
  return appReady ? (
    <MainWrapper>
      <main>
        <Switch>
          <Route exact path='/' component={Main}/>
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