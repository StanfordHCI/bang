/** store.js
 *  redux state manager
 * 
 *  code to apply redux to app
 *
 *  called by:
 *    1. src/index.js
 *    
 */

import {combineReducers, createStore, applyMiddleware, compose} from 'redux';
import {reducer as reduxFormReducer} from 'redux-form';
import appReducer from '../reducers/appReducer';
import batchReducer from '../reducers/batchReducer';
import adminReducer from '../reducers/adminReducer';
import unsubscribeReducer from '../reducers/unsubscribeReducer';
import thunk from 'redux-thunk'
import {whoami} from "../actions/app";

const reducer = combineReducers({
  form: reduxFormReducer, // mounted under "form",
  batch: batchReducer,
  admin: adminReducer,
  app: appReducer,
  unsubscribeStatus: unsubscribeReducer,
});

const composeEnhancers =
  typeof window === 'object' &&
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({}) : compose;

const middleware = [thunk];
const store = createStore(reducer, composeEnhancers(
  applyMiddleware(...middleware),
));

store.dispatch(whoami())

export default store;
