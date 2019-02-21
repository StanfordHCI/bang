import React, {Component} from 'react';
import { hot } from 'react-hot-loader'
import '../scss/app.scss';
import MainRouter from './Router';

class App extends Component {
  render() {
    return (
      <MainRouter/>
    )
  }
}

export default hot(module)(App)
