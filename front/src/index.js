import React from 'react';
import App from './app/App';
import {render} from 'react-dom'
import {Provider} from 'react-redux'
import {Router} from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import store from './app/store';
import ScrollToTop from './app/ScrollToTop';
import {config as i18nextConfig} from './translations/index';
import {history} from './app/history'

i18next.init(i18nextConfig);

render(
  <Provider store={store}>
    <Router history={history}>
      <I18nextProvider i18n={i18next}>
        <ScrollToTop>
          <App/>
        </ScrollToTop>
      </I18nextProvider>
    </Router>
  </Provider>,
  document.getElementById('root')
);
