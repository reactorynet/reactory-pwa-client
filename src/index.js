import React from 'react';
import ReactDOM from 'react-dom';
import * as themes from './themes';
import qs from './query-string';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

const theme = themes.getTheme();
const props = {
  appTheme: theme,
  appTitle: theme.content.appTitle || 'Reactory Web'
};

const rootElement = document.getElementById('root')
if(rootElement.classList.contains('loading')) rootElement.classList.remove('loading')
ReactDOM.render(<App {...props} />, rootElement);
registerServiceWorker();

document.title = props.appTitle;
