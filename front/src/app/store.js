import {combineReducers, createStore, applyMiddleware, compose} from 'redux';
import {reducer as reduxFormReducer} from 'redux-form';
import {

  appReducer,
} from '../reducers/index';
import thunk from 'redux-thunk'
import {whoami} from "../actions/app";

const reducer = combineReducers({
  form: reduxFormReducer, // mounted under "form",

  app: appReducer,
});

const composeEnhancers =
  typeof window === 'object' &&
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({}) : compose;

const middleware = [thunk];
const store = createStore(reducer, composeEnhancers(
  applyMiddleware(...middleware),
));
//setTimeout(() => store.dispatch(whoami()), 3000)
store.dispatch(whoami())

export default store;
