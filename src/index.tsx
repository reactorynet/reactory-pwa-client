// import "@babel/polyfill";
import React from 'react';
import ReactDOM from 'react-dom';
import * as themes from './themes';
import './index.css';
import { ReactoryHOC } from './App';

import registerServiceWorker from './registerServiceWorker';

const theme = themes.getTheme();
const props = {
  appTheme: theme,
  appTitle: process.env.REACT_APP_TITLE || 'Reactory Web'
};


if (process.env.NODE_ENV !== 'production') {
  window.reactory = {
    api: null,
    logging: {
      log: true,
      debug: true,
      error: true,
      warn: true,
      info: true,
    }
  }
} else {
  window.reactory = {
    api: null,
    logging: {
      log: false,
      debug: false,
      error: false,
      warn: false,
      info: false,
    }
  }
}


const rootElement = document.getElementById('root')
if(rootElement.classList.contains('loading')) rootElement.classList.remove('loading')
ReactDOM.render(<ReactoryHOC {...props} />, rootElement);
registerServiceWorker();
document.title = process.env.REACT_APP_TITLE || 'Reactory Client';

export default ReactoryHOC;