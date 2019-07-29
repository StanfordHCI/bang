/** app.js
 *  front-end
 * 
 *  wrapper for app
 *  
 *  renders:  
 *    1. throughout
 * 
 *  called by:
 *    1. src/index.js
 *    
 */

import React, {Component} from 'react';
import { hot } from 'react-hot-loader'
import '../scss/app.scss';
import MainRouter from './Router';
import 'bootstrap/scss/bootstrap.scss'

class App extends Component {
  render() {
    return (
      <MainRouter/>
    )
  }
}

export default hot(module)(App)
