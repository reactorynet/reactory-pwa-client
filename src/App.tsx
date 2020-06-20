import React, { Component, LegacyRef } from 'react';
import PropTypes from 'prop-types';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect,
  BrowserRouter,
} from 'react-router-dom';
import { isNil, isArray } from 'lodash';
import { Provider } from 'react-redux';
import configureStore from './models/redux';
import { ApolloClient, InMemoryCache } from 'apollo-client-preset';
import { ApolloProvider, Query, Mutation, Subscription } from 'react-apollo';
import { createHttpLink } from 'apollo-link-http';
import { WebSocketLink } from "apollo-link-ws";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { createUploadLink } from 'apollo-upload-client';
import { setContext } from 'apollo-link-context';
import { ThemeProvider, Theme } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme } from '@material-ui/core/styles';
import queryString from './query-string';
import './App.css';
import Header from '@reactory/client-core/components/shared/DefaultHeader';
import {
  componentRegistery
} from './components';

import ReactoryApi, { ApiProvider, ReactoryApiEventNames } from './api'
import { fetch } from "whatwg-fetch";
import { deepEquals } from './components/reactory/form/utils';
import ReactoryApolloClient from './api/ReactoryApolloClient';
import { Typography, Icon } from '@material-ui/core';

const packageInfo = require('../package.json');

const {
  REACT_APP_CLIENT_KEY,
  REACT_APP_CLIENT_PASSWORD,
  REACT_APP_API_ENDPOINT
} = process.env;

if (localStorage) {
  localStorage.setItem('REACT_APP_CLIENT_KEY', REACT_APP_CLIENT_KEY);
  localStorage.setItem('REACT_APP_CLIENT_PASSWORD', REACT_APP_CLIENT_PASSWORD);
  localStorage.setItem('REACT_APP_API_ENDPOINT', REACT_APP_API_ENDPOINT);
}

const setTheme = (theme) => {
  localStorage.setItem('theme', theme)
};

const getTheme = () => {
  return localStorage.getItem('theme')
}

const api = new ReactoryApi({
  clientId: `${localStorage.getItem('REACT_APP_CLIENT_KEY')}`,
  clientSecret: `${localStorage.getItem('REACT_APP_CLIENT_PASSWORD')}`,
  $version: packageInfo.version,
});

//register built-in components
componentRegistery.forEach((componentDef) => {
  const { nameSpace, name, version, component } = componentDef
  api.registerComponent(nameSpace, name, version, component);
});

const store = configureStore();
api.reduxStore = store;

export interface NewNotification {
  id: string,
  title: string,
  type: string
}

export interface AppState {
  user: any,
  drawerOpen: boolean,
  auth_valid: boolean,
  auth_validated: boolean,
  theme: any,
  routes: any[],
  validationError: any,
  offline: boolean,
  currentRoute: any
}

class App extends Component<any, AppState> {

  componentRefs: any
  router: any
  statusInterval: any = null;
  static propTypes: { appTitle: PropTypes.Validator<string>; appTheme: PropTypes.Requireable<object>; };
  static defaultProps: { appTitle: string; appTheme: {}; };

  constructor(props, context) {
    super(props, context);

   

    this.state = {
      drawerOpen: false,
      auth_valid: false,
      auth_validated: false,
      theme: props.appTheme,
      user: api.getUser(),
      routes: [],
      validationError: null,
      offline: false,
      currentRoute: null,
    };

    this.onLogout = this.onLogout.bind(this);
    this.onLogin = this.onLogin.bind(this);
    this.onApiStatusUpdate = this.onApiStatusUpdate.bind(this);
    this.onRouteChanged = this.onRouteChanged.bind(this);
    this.configureRouting = this.configureRouting.bind(this);
    api.on(ReactoryApiEventNames.onLogout, this.onLogout)
    api.on(ReactoryApiEventNames.onLogin, this.onLogin)
    api.on(ReactoryApiEventNames.onApiStatusUpdate, this.onApiStatusUpdate);
    api.on(ReactoryApiEventNames.onRouteChanged, this.onRouteChanged);
    this.componentRefs = api.getComponents([
      'core.Loading@1.0.0',
      'core.Login@1.0.0',
      'core.FullScreenModal@1.0.0',
      'core.NotificationComponent@1.0.0',
      'core.NotFound',
    ]);
  }
  
  

  onRouteChanged(path, state) {
    api.log(`onRouteChange Handler`, [path, state], 'debug');
    this.setState({ currentRoute: path }, this.configureRouting);
  }

  onLogin() {
    const loggedInUser = api.getUser();
    this.setState({ user: loggedInUser });
  }

  onLogout() {
    this.setState({ user: api.getUser() });
  }

  onApiStatusUpdate(status) {
    api.log('App.onApiStatusUpdate(status)', [status], status.offline === true ? 'error' : 'debug');
    let isOffline = status.offline === true;
    let self = this;

    if(isOffline === true && self.state.offline === false) {
      self.setState({ 
        offline: true
      }, () => {
        if(status.offline === true && isOffline === true && self.statusInterval === null) {
          self.statusInterval = setInterval(api.status, 3000);;
        }          
      })
      
    } else {
      
      if(status.offline !== true && self.statusInterval) {
        clearInterval(self.statusInterval);
      }
      
      let user = api.getUser();            
      delete user.when;
      let _user = this.state.user;
      delete _user.when;
      
      if (deepEquals(user, _user) === false || status.offline !== self.state.offline) {                                  
        this.setState({ user, offline: status.offline ===true });
      } 

    }
  }

  configureRouting() {
    const { auth_validated, user } = this.state;
    const { NotFound } = this.componentRefs;
    const routes = [];
    let loginRouteDef = null;
    let homeRouteDef = null;
    const that = this;

    api.log('Configuring Routing', [auth_validated, user], 'debug');

    api.getRoutes().forEach((routeDef) => {
      const routeProps = {
        key: routeDef.id,
        componentFqn: routeDef.componentFqn,
        path: routeDef.path,
        exact: routeDef.exact === true,
        render: (props) => {
          api.log(`Rendering Route ${routeDef.path}`, [routeDef], 'debug');
          const componentArgs = {
            $route: props.match
          };

          if (isArray(routeDef.args)) {
            routeDef.args.forEach((arg) => {
              componentArgs[arg.key] = arg.value[arg.key];
            })
          }

          const ApiComponent = api.getComponent(routeDef.componentFqn)

          if (routeDef.public === true) {
            if (ApiComponent) return (<ApiComponent {...componentArgs} />)
            else return (<NotFound message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`} waitingFor={routeDef.componentFqn} args={componentArgs} wait={500} ></NotFound>)
          }

          const hasRolesForRoute = api.hasRole(routeDef.roles, api.getUser().roles) === true;          

          if (auth_validated === true && hasRolesForRoute === true) {
            if (ApiComponent) return (<ApiComponent {...componentArgs} />)
            else return (<NotFound message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`}  waitingFor={routeDef.componentFqn} args={componentArgs} wait={500}></NotFound>)
          }

          if (api.isAnon() === true && auth_validated && routeDef.path !== "/login") {
            if(localStorage) {            
              localStorage.setItem('$reactory.last.attempted.route$', `${window.location.pathname}`)
            }
            return <Redirect to={{ pathname: '/login', state: { from: routeDef.path } }} />
          }

          if(api.isAnon() === false && hasRolesForRoute === false) {
            return <NotFound message="You don't have sufficient permissions to access this route" />
          }
          
          return (<p> ... </p>);
        }
      }

      routes.push(<Route {...routeProps} />)
    });

    //this.setState({ routes });
    return routes
  }

  componentDidMount() {
    const that = this;

    const query = queryString.parse(window.location.search)
    if (query.auth_token) { 
      localStorage.setItem('auth_token', query.auth_token);
      api.client = ReactoryApolloClient().client;
    }
    api.queryObject = query;
    api.queryString = window.location.search;
    api.objectToQueryString = queryString.stringify;

    if (window && !window.reactory) {
      window.reactory = {
        api,
      };
    }

    if (this.state.auth_validated === false) {
      api.status({ emitLogin: true }).then((user) => {
        that.setState({ auth_validated: true, user }, that.configureRouting)
      }).catch((validationError) => {
        that.setState({ auth_validated: false, validationError })
      });
    }

    window.addEventListener('resize', () => {
      const {
        innerHeight,
        outerHeight,
        innerWidth,
        outerWidth,
      } = window;

      let view = 'landscape';
      let size = 'lg';
      if (window.innerHeight > window.innerWidth) {
        view = 'portrait';
      }

      if (innerWidth >= 2560) size = 'lg',
        api.log('Window resize', [innerHeight, innerWidth, outerHeight, outerWidth, size, view]);
        api.emit('onWindowResize', { innerHeight, innerWidth, outerHeight, outerWidth, view, size });
    });

    if(localStorage) {
      let lastRoute: string | null = localStorage.getItem('$reactory.last.attempted.route$');
      if(lastRoute !== null ) {
        lastRoute = lastRoute.trim();        
        localStorage.removeItem('$reactory.last.attempted.route$');
        location.assign(lastRoute);
      }
    }
  }

  render() {
    const { auth_validated, user, offline } = this.state;
    const { Loading, FullScreenModal, NotificationComponent } = this.componentRefs;

    let themeOptions = api.getTheme();
    if (isNil(themeOptions)) themeOptions = { ...this.props.appTheme };
    if (Object.keys(themeOptions).length === 0) themeOptions = { ...this.props.appTheme };

    let muiTheme: Theme & any = createMuiTheme(themeOptions);

    if (themeOptions.provider && typeof themeOptions.type === 'string') {
      if (themeOptions.provider[themeOptions.type]) {
        //using new mechanism.
        switch (themeOptions.type) {
          case 'material':
          default: {
            muiTheme = createMuiTheme(themeOptions);
          }
        }
      }
    }
    
    const Globals = (props, context) => {              
      let globalForms =  api.getGlobalComponents();
      return (
      <React.Fragment>
        { globalForms.map((GLOBALFORM, gidx) => <GLOBALFORM key={gidx}></GLOBALFORM>) }
      </React.Fragment>
      )
    };

    api.muiTheme = muiTheme;

    let modal = null;

    if (offline === true && auth_validated === true) {
      modal = (
        <FullScreenModal open={true} title={'Server is offline, stand by'}>          
          <Typography style={{ margin: 'auto', fontSize: '20px', padding: '8px' }} variant="body1"><Icon>report_problem</Icon>We apologise for the inconvenience, but it seems like the reactory server available yet. This notification will close automatically when the server is available again.</Typography>
        </FullScreenModal>
      )
    }

    const routes = this.configureRouting();
  
    return (
      <Router ref={this.router}>
        <React.Fragment>
          <CssBaseline />
          <Provider store={store}>
            <ApolloProvider client={api.client}>
              <ApiProvider api={api} history={this.props.history}>
                <ThemeProvider theme={muiTheme}>
                  <MuiPickersUtilsProvider utils={MomentUtils}>
                    <React.Fragment>                      
                      <Globals />
                      <Header title={muiTheme && muiTheme.content && auth_validated ? muiTheme.content.appTitle : 'Starting'} />
                      <NotificationComponent></NotificationComponent>                                            
                      { auth_validated === true && routes.length > 0 ? routes : <Loading message="Configuring Application. Please wait" icon="security" spinIcon={false} />}  
                      { modal }                                                                
                    </React.Fragment>
                  </MuiPickersUtilsProvider>
                </ThemeProvider>
              </ApiProvider>
            </ApolloProvider>
          </Provider>
        </React.Fragment>
      </Router>
    );
  }
}

App.propTypes = {
  appTitle: PropTypes.string.isRequired,
  appTheme: PropTypes.object
};



App.defaultProps = {
  appTitle: "Reactory",
  appTheme: {}
};

export default App;

