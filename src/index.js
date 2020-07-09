import "@babel/polyfill";
import React from 'react';
import ReactDOM from 'react-dom';
import * as themes from './themes';
import './index.css';
import App from './App';
import stringify from 'json-stringify-safe'
import registerServiceWorker from './registerServiceWorker';
import * as ReactoryTypes from './types/reactory';
import * as Globals from './types/global';

const theme = themes.getTheme();
const props = {
  appTheme: theme,
  appTitle: process.env.REACT_APP_TITLE || 'Reactory Web'
};


const rootElement = document.getElementById('root')
if(rootElement.classList.contains('loading')) rootElement.classList.remove('loading')
ReactDOM.render(<App {...props} />, rootElement);
registerServiceWorker();
document.title = process.env.REACT_APP_TITLE || 'Reactory Client';

export default App;