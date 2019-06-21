/** App.test.js
 *  code scraps
 * 
 *  legacy wrapper to check if app renders without crashing
 *    
 */

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
  ReactDOM.unmountComponentAtNode(div);
});
