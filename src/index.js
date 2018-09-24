import React from 'react';
import ReactDOM from 'react-dom';
import * as themes from './themes';
import qs from './query-string';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';


let themeName = process.env.REACT_APP_THEME || 'towerstone';
const parsed = qs.parseUrl(document.location.href);
if(parsed.query.theme) themeName = parsed.query.theme;
const theme = themes.getTheme(themeName);
const props = {
  appTheme: theme,
  appTitle: theme.muiTheme.content.appTitle || 'Reactory Web'
};

ReactDOM.render(<App {...props} />, document.getElementById('root'));
registerServiceWorker();

document.title = props.appTitle;
