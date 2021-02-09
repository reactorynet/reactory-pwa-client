import React, { Component, LegacyRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import { ApolloProvider } from '@apollo/client';
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
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { ThemeProvider, Theme } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme, makeStyles } from '@material-ui/core/styles';
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
import { Typography, Icon, Paper } from '@material-ui/core';
import license from './license';
import { ReactoryProvider } from './api/ApiProvider';
import Reactory from '@reactory/client-core/types/reactory';
import { anonUser } from 'api/local';
import { WindowSizeSpec } from 'api/ReactoryApi';

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
  $version: `${packageInfo.version}-${license.version}`,
});

api.init().then();
//register built-in components
componentRegistery.forEach((componentDef) => {
  const { nameSpace, name, version = '1.0.0', component = (<i>*</i>), tags = [], roles = ["*"], wrapWithApi = false, } = componentDef
  api.registerComponent(nameSpace, name, version, component, tags, roles, wrapWithApi);
});

api.$windowSize = api.getSizeSpec();

const store = configureStore();
api.reduxStore = store;
window.reactory = {
  api: api
};

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

const Globals = ({ api }) => {

  const [v, setVersion] = React.useState<number>(0);
  const [plugins_loaded, setPluginsLoaded] = React.useState<any>([])
  const globals = api.getGlobalComponents();

  api.on('onPluginLoaded', (plugin) => {
    setVersion(v + 1);
    setPluginsLoaded([...plugins_loaded, plugin]);
  });

  return (
    <div data-v={`${v}`} data-globals-container="true">
      { globals.map((GLOBALFORM, gidx) => { return (<GLOBALFORM key={gidx} />) })}
    </div>
  );

};

interface ReactoryHOCProps {
  [key: string]: any,
};

const dependcies = [
  'core.Loading@1.0.0',
  'core.Login@1.0.0',
  'core.FullScreenModal@1.0.0',
  'core.NotificationComponent@1.0.0',
  'core.NotFound@1.0.0',
  'reactory.Footer@1.0.0',
];


interface ReactoryRouterProps {
  api: ReactoryApi,
  auth_validated: boolean,
  user: Reactory.IUser
};

const ReactoryRouter = (props: ReactoryRouterProps) => {

  const { auth_validated, user, api } = props;
  const [routes, setRoutes] = React.useState<Reactory.IRouteDefinition[]>([]);
  const NotFound = api.getComponent("core.NotFound");

  const configureRouting = () => {
    let loginRouteDef = null;
    let homeRouteDef = null;

    api.log('Configuring Routing', { auth_validated, user }, 'debug');
    let $routes = [];
    api.getRoutes().forEach((routeDef) => {


      const routeProps: Reactory.IRouteDefinition = {
        key: routeDef.id,
        componentFqn: routeDef.componentFqn,
        path: routeDef.path,
        exact: routeDef.exact === true,
        render: (props) => {
          api.log(`Rendering Route ${routeDef.path}`, { routeDef, props }, 'debug');

          if (routeDef.redirect) {
            return <Redirect to={{ pathname: routeDef.redirect, state: { from: props.location } }} />
          }

          const componentArgs = {
            $route: props.match,
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
          } else {
            const hasRolesForRoute = api.hasRole(routeDef.roles, api.getUser().roles) === true;

            if (auth_validated === true && hasRolesForRoute === true) {
              if (ApiComponent) return (<ApiComponent {...componentArgs} />)
              else return (<NotFound message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`} waitingFor={routeDef.componentFqn} args={componentArgs} wait={500}></NotFound>)
            }

            if (api.isAnon() === true && auth_validated && routeDef.path !== "/login") {
              if (localStorage) {
                localStorage.setItem('$reactory.last.attempted.route$', `${window.location.pathname}`)
              }
              return <Redirect to={{ pathname: '/login', state: { from: routeDef.path } }} />
            }

            if (api.isAnon() === false && hasRolesForRoute === false) {
              //we may waiting 
              return <NotFound message="You don't have sufficient permissions to access this route yet... (we may be fetching your permissions)" link={routeDef.path} wait={500} />
            }

            return (<p> ... </p>);
          }
        }
      }

      $routes.push(routeProps);
    });

    setRoutes($routes);
  }

  useEffect(() => {
    configureRouting();
  }, []);

  return (
    <React.Fragment>
      {routes.map((route) => (<Route {...route} />))}
    </React.Fragment>
  )
}

const AppLoading = () => {
  return (
    <div id="default_loader" className="loader">
      <div className="loader-inner">
        <div className="loader-line-wrap">
          <div className="loader-line"></div>
        </div>
        <div className="loader-line-wrap">
          <div className="loader-line"></div>
        </div>
        <div className="loader-line-wrap">
          <div className="loader-line"></div>
        </div>
        <div className="loader-line-wrap">
          <div className="loader-line"></div>
        </div>
        <div className="loader-line-wrap">
          <div className="loader-line"></div>
        </div>
      </div>
    </div>
  )
}

export const ReactoryHOC = (props: ReactoryHOCProps) => {


  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [auth_validated, setIsValidated] = React.useState<boolean>(false);
  const [user, setUser] = React.useState<any | Reactory.IUser>(null);
  const [error, setError] = React.useState<Error>(null);
  const [apiStatus, setApiStatus] = React.useState<any>(null);
  const [offline, setOfflineStatus] = React.useState<boolean>(false);
  const [theme, setTheme] = React.useState<any>(createMuiTheme(props.appTheme));
  const [statusInterval, setStatusInterval] = React.useState<NodeJS.Timeout>(null);
  const [current_route, setCurrentRoute] = React.useState<string>("/");
  const [version, setVersion] = React.useState(0);
  //const [sizeSpec, setSizeSpec] = React.useState<WindowSizeSpec>(api.getSizeSpec());


  const components: any = api.getComponents(dependcies);
  const { Loading, Login, FullScreenModal, NotificationComponent, NotFound, Footer } = components;




  const onRouteChanged = (path: string) => {
    setCurrentRoute(path)
  }

  const onLogin = () => {
    setUser(api.getUser());
  };

  const onLogout = () => {
    setUser(api.getUser());
  };


  const applyTheme = () => {
    let themeOptions = api.getTheme();
    if (isNil(themeOptions)) themeOptions = { ...props.appTheme };
    if (Object.keys(themeOptions).length === 0) themeOptions = { ...props.appTheme };

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

    api.muiTheme = muiTheme;
    setTheme(muiTheme);
    //setSizeSpec(api.getSizeSpec());

  };

  const onThemeChanged = () => {
    applyTheme();
  };

  const onApiStatusUpdate = (status) => {

    if (!(status === null || status === undefined)) {
      api.log('App.onApiStatusUpdate(status)', { status }, status.offline === true ? 'error' : 'debug');
      let isOffline = status.offline === true;

      if (offline !== isOffline) {
        setOfflineStatus(isOffline);
      }

      if (isOffline === true && !statusInterval) {
        setStatusInterval(setInterval(api.status, 3000))
      } else {

        if (isOffline === false && statusInterval) {
          clearInterval(statusInterval);
          let user = api.utils.lodash.cloneDeep(api.getUser());
          delete user.when;
          let _user = api.utils.lodash.cloneDeep(user);
          delete _user.when;

          if (deepEquals(user, _user) === false || status.offline !== offline) {
            setUser(user)
            setOfflineStatus(status.offline === true);
          }
        }
      }
    } else {
      api.log(`apiStaus returned null value`, { status }, 'warning');
    }
  }


  const onWindowResize = async () => {
    const _size_spec = api.getSizeSpec();
    api.$windowSize = _size_spec;
    api.log('ReactoryHOC Resize', _size_spec);
    api.emit('onWindowResize', _size_spec);
    // setSizeSpec(_size_spec);
  };


  const willUnmount = () => { };
  const willMount = () => {

    window.addEventListener('resize', onWindowResize);
    window.matchMedia("(prefers-color-scheme: dark)").addListener((evt) => {
      if (evt.matches === true) {
        localStorage.setItem('$reactory$theme_mode', 'dark');
        setVersion(version + 1);
      } else {
        localStorage.setItem('$reactory$theme_mode', 'light');
        setVersion(version + 1);
      }
    });

    if (localStorage) {
      let lastRoute: string | null = localStorage.getItem('$reactory.last.attempted.route$');
      if (lastRoute !== null) {
        lastRoute = lastRoute.trim();
        localStorage.removeItem('$reactory.last.attempted.route$');
        location.assign(lastRoute);
      }
    }

    const getApiStatus = () => {
      if (auth_validated === false) {
        api.status({ emitLogin: true }).then((user) => {
          setIsValidated(true);
          setUser(user);
          setOfflineStatus(false);
          setIsReady(true);
          applyTheme();
        }).catch((validationError) => {
          setIsValidated(true);
          setUser(null);
          setOfflineStatus(true);
          setError(validationError);
          setIsReady(false);
        });
      }

    };

    const waitForClient = () => {

      if (api.client === null || api.client === undefined) {
        setTimeout(waitForClient, 777);
      } else {
        getApiStatus();
      }
    }

    api.on(ReactoryApiEventNames.onLogout, onLogout)
    api.on(ReactoryApiEventNames.onLogin, onLogin)
    api.on(ReactoryApiEventNames.onApiStatusUpdate, onApiStatusUpdate);
    api.on(ReactoryApiEventNames.onRouteChanged, onRouteChanged);
    api.on(ReactoryApiEventNames.onThemeChanged, onThemeChanged);

    const query = queryString.parse(window.location.search);
    if (query.auth_token) {
      localStorage.setItem('auth_token', query.auth_token);
      ReactoryApolloClient().then((cli) => {
        api.client = cli.client;
        api.ws_link = cli.ws_link;
        cli.clearCache();
      });
    }

    api.queryObject = query;
    api.queryString = window.location.search;
    api.objectToQueryString = queryString.stringify;

    if (window && !window.reactory) {
      window.reactory = {
        api,
      };
    }

    waitForClient();


    return willUnmount;
  };

  useEffect(willMount, []);

  const useStyles = makeStyles(($muiTheme) => {
    return {

      root_paper: {
        //minHeight: sizeSpec.resolution.height,
        borderRadius: 0,
      },

      selectedMenuLabel: {
        color: $muiTheme.palette.primary.main,
        paddingRight: $muiTheme.spacing(1.5),
        paddingLeft: $muiTheme.spacing(1)
      },
      prepend: {
        color: 'rgb(34, 39, 50)',
        opacity: 0.7,
        paddingLeft: $muiTheme.spacing(1.5),
        paddingRight: $muiTheme.spacing(1)
      },
      selected: {
        color: 'rgb(34, 39, 50)',
        opacity: 1,
        paddingLeft: $muiTheme.spacing(1)
      },
      preffered: {
        fontWeight: 'bold',
        color: $muiTheme.palette.primary.main
      },
      get_started: {
        fontSize: '20px',
        color: 'grey',
        textAlign: 'center',
        marginTop: '30px'
      },
      schema_selector: {
        textAlign: 'right'
      }
    }
  });

  const classes = useStyles();


  if (isReady === false) return <AppLoading />;

  return (
    <Router>
      <React.Fragment>
        <CssBaseline />
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <ApolloProvider client={api.client}>
              <MuiPickersUtilsProvider utils={MomentUtils}>
                <ReactoryProvider api={api}>
                  <Paper elevation={0} className={classes.root_paper} id={'reactory_paper_root'}>
                    {isReady === true && <Globals api={api} />}
                    {isReady === true && <Header title={theme && theme.content && auth_validated ? theme.content.appTitle : 'Starting'} />}
                    {isReady === true && <NotificationComponent />}
                    {isReady === true && <ReactoryRouter api={api} user={user} auth_validated={auth_validated} />}
                    {isReady === true && <Footer />}
                  </Paper>
                </ReactoryProvider>
              </MuiPickersUtilsProvider>
            </ApolloProvider>
          </Provider>
        </ThemeProvider>
      </React.Fragment>
    </Router>

  );
};


export default ReactoryHOC

