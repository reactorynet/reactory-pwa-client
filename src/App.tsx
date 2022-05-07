import React, { useEffect } from 'react';
import MomentUtils from '@date-io/moment';
import { ApolloClient, ApolloProvider } from '@apollo/client';
import {
  useMatch,
  useParams,
} from 'react-router';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
  useLocation
} from 'react-router-dom';
import { isNil, isArray, isFunction } from 'lodash';
import { Provider } from 'react-redux';
import configureStore from './models/redux';

import { Theme, CssBaseline } from '@mui/material'
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import queryString from './components/utility/query-string';
import './App.css';
import Header from '@reactory/client-core/components/shared/DefaultHeader';
import {
  componentRegistery
} from './components/index';

import ReactoryApi, { ReactoryApiEventNames } from './api'
import { deepEquals } from './components/reactory/form/utils';
import ReactoryApolloClient from './api/ReactoryApolloClient';
import { Typography, Icon, Paper, Box } from '@mui/material';
import license from './license';
import { ReactoryProvider, useReactory } from './api/ApiProvider';
import Reactory from '@reactory/reactory-core';
import { Routing } from '@reactory/reactory-core/src/types';

const packageInfo = {
  version: '1.0.0'
}

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

//@ts-ignore
const reactory: Reactory.Client.IReactoryApi = new ReactoryApi({
  clientId: `${localStorage.getItem('REACT_APP_CLIENT_KEY')}`,
  clientSecret: `${localStorage.getItem('REACT_APP_CLIENT_PASSWORD')}`,
  $version: `${packageInfo.version}-${license.version}`,
});

reactory.init().then();
//register built-in components
componentRegistery.forEach((componentDef) => {
  const { nameSpace, name, version = '1.0.0', component = (<i>*</i>), tags = [], roles = ["*"], wrapWithApi = false, } = componentDef
  reactory.registerComponent(nameSpace, name, version, component, tags, roles, wrapWithApi);
});

reactory.$windowSize = reactory.getSizeSpec();

const store = configureStore(null);
reactory.reduxStore = store;
window.reactory = {
  api: reactory
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
    <div data-v={`${v}`} data-globals-container="true" style={{ height: 0, width: 0, position: "absolute", left: 0, top: 0, display: 'none' }}>
      {globals.map((GLOBALFORM, gidx) => {
        return (<GLOBALFORM key={gidx} />)
      })}
    </div>
  );

};

interface ReactoryHOCProps {
  [key: string]: any,
};

const dependencies = [
  'core.Loading@1.0.0',
  'core.Login@1.0.0',
  'core.FullScreenModal@1.0.0',
  'core.NotificationComponent@1.0.0',
  'core.NotFound@1.0.0',
  'reactory.Footer@1.0.0',
];


interface ReactoryRouterProps {
  reactory: Reactory.Client.IReactoryApi,
  auth_validated: boolean,
  user: Reactory.Models.IUser,
  authenticating: boolean
};

const ReactoryRoute = (routeDef: Reactory.Routing.IReactoryRoute, auth_validated: boolean = false, authenticating: boolean = false) => {

  
}


const ReactoryRouter = (props: ReactoryRouterProps) => {
  
  const navigation = useNavigate();
  const location = useLocation();
    
  const { auth_validated, user, reactory, authenticating = false } = props;
  const [routes, setRoutes] = React.useState<Reactory.Client.IReactoryClientRoute[]>([]);
  const [v, setVersion] = React.useState<number>(0);


  const onLogin = () => {
    configureRouting();
    setVersion(v + 1);
  };


  const onLogout = () => {
    setVersion(v + 1);
  };

  reactory.on(ReactoryApiEventNames.onLogout, onLogout)
  reactory.on(ReactoryApiEventNames.onLogin, onLogin)

  const configureRouting = () => {
    reactory.log('Configuring Routing', { auth_validated, user }, 'debug');
    let $routes = [];

    reactory.getRoutes().forEach((routeDef) => {

      const routeProps: Reactory.Client.IReactoryClientRoute = {
        key: routeDef.key || routeDef.id || reactory.utils.uuid(),
        path: routeDef.path,
        element: (props: any) => {        
          
          //const match = useMatch(routeDef.path);
          //debugger;
          //reactory.log(`Rendering Route ${routeDef.path}`, { routeDef, props: route_props }, 'debug');
          console.debug(`Reactory Router ELEMENT ${routeDef.path}`, {  })
          if (routeDef.redirect) {
            //return <Redirect to={{ pathname: routeDef.redirect, state: { from: route_props.location } }} />
            navigation(routeDef.redirect, { state: { from: location }, replace: true })
          }

          const componentArgs = {
            //$route: match,
          };

          if (isArray(routeDef.args)) {
            routeDef.args.forEach((arg) => {
              componentArgs[arg.key] = arg.value[arg.key];
            })
          }

          const ReactoryComponent = reactory.getComponent<any>(routeDef.componentFqn)
          const NotFound = reactory.getComponent<any>("core.NotFound");

          if (routeDef.public === true) {
            if (ReactoryComponent) return (<ReactoryComponent {...componentArgs} />);
            else return (<NotFound message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`} waitingFor={routeDef.componentFqn} args={componentArgs} wait={500} ></NotFound>)
          } else {

            const hasRolesForRoute = reactory.hasRole(routeDef.roles, reactory.getUser().roles) === true;

            if (reactory.isAnon() === false && hasRolesForRoute === false) {
              return <NotFound message="You don't have sufficient permissions to access this route." link={routeDef.path} wait={500} />
            }

            if (auth_validated === true && hasRolesForRoute === true) {
              if (ReactoryComponent) return (<ReactoryComponent {...componentArgs} />)
              else return (<NotFound message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`} waitingFor={routeDef.componentFqn} args={componentArgs} wait={500}></NotFound>)
            } else {

              const hasRefreshed: boolean = localStorage.getItem('hasRefreshed') === 'true';

              //auth token not validated yet in process of checking
              if (auth_validated === false || authenticating === true) {
                return <Typography style={{ display: 'flex', justifyContent: 'center', padding: '10% 2rem' }} variant='h5'>Please wait while we validate your access token...</Typography>
              } else {


                if (hasRefreshed === true && reactory.isAnon() === true && routeDef.path !== "/login") {
                  localStorage.removeItem('hasRefreshed');
                  //return <Redirect to={{ pathname: '/login', state: { from: routeDef.path } }} />
                  navigation("/login", { state: { from: location }, replace: true })
                }


                if (hasRefreshed === false && reactory.isAnon() === true) {
                  const qs = queryString.parse(location.search);
                  if (qs['auth_token']) delete qs.auth_token;


                  localStorage.setItem('$reactory.onlogin.redirect$', `${location.pathname}?${queryString.stringify(qs)}`);
                  // setTimeout(() => {
                  //   //@ts-ignore
                  //   // window.location.reload(true)
                  //   reactory.status({ emitLogin: true });
                  //   setVersion(v + 1);
                  //   localStorage.setItem('hasRefreshed', 'true');
                  // }, 5000);
                }

              }
            }

            return (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', justifyContent: "center" }}>
                  <Typography variant="h4" style={{ marginTop: '40px' }}>Validating access to route</Typography>
                  <Typography variant="h6" style={{ marginTop: '40px', textAlign: 'center' }}>{routeDef.path}</Typography>
                  <Icon style={{ fontSize: '48px', margin: 'auto', marginTop: '40px', }}>security</Icon>
                </div>
              </div>
            )
          }
        }
      }

      $routes.push(routeProps);
    });

    setRoutes($routes);
    setVersion(v + 1);
  }




  useEffect(() => {
    configureRouting();
  }, []);

  useEffect(() => {
    configureRouting();
  }, [auth_validated, authenticating])




  if (auth_validated === false) {
    return (<span>Validating Authentication</span>)
  }

  return (
    <Routes>
      {routes.map((route: any) => (<Route
        path={route.path}
        caseSensitive={true}
        element={route.element(route)}
        key={route.key}
      />))}
      <Route path={"*"} element={<>Not Found</>}></Route>
    </Routes>
  )
}

const AppLoading = () => {
  return (
    <>
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
      <p>Application libraries loaded. Loading Application Client</p>
    </>
  )
}

const Offline = (props: { onOfflineChanged: (isOffline: boolean) => void }) => {

  const TM_BASE_DEFAULT: number = 45000;
  const { onOfflineChanged } = props;
  const [timeout_base, setTimeoutBase] = React.useState<number>(TM_BASE_DEFAULT);
  const [offline, setOfflineStatus] = React.useState<boolean>(false);

  let timeoutMS: number = 45000;
  let totals = { error: 0, slow: 0, ok: 0, total: 0 };
  let last_slow = null;


  const getApiStatus = () => {

    const started = Date.now();

    reactory.status({ emitLogin: false, forceLogout: false }).then((apiStatus: any) => {
      const done = Date.now();
      const api_ok = apiStatus.status === 'API OK'

      setOfflineStatus(!api_ok);
      if (offline !== !api_ok) {
        onOfflineChanged(!api_ok);
      }

      let isSlow = false;

      const newLast = {
        when: started,
        pingMS: done - started,
      };

      timeoutMS = timeout_base;

      //if our ping timeout is slow
      if (newLast.pingMS > 4000 && totals.total > 10) {
        last_slow = done;
        timeoutMS = timeout_base * 1.25;
      }

      //if our ping time is really low
      if (newLast.pingMS > 7000 && totals.total > 10) {
        isSlow = true;
        timeoutMS = timeout_base * 1.5;
      }

      let next_tm_base = TM_BASE_DEFAULT;
      if (totals.total > 5) {
        let avg: number = (totals.ok * 100) / totals.total;
        if (avg > 90) next_tm_base = TM_BASE_DEFAULT * 1.30


        if (avg > 95) next_tm_base = TM_BASE_DEFAULT * 1.5;


        if (avg > 98) next_tm_base = TM_BASE_DEFAULT * 2.5;

      }

      const newTotals = {
        error: totals.error,
        slow: isSlow ? totals.slow + 1 : totals.slow,
        ok: api_ok ? totals.ok + 1 : totals.ok,
        total: totals.total + 1,
      };

      totals = newTotals;

      reactory.stat(`user-session-api-status-totals`, { user_id: reactory.getUser().id, ...totals, ...newLast });
      reactory.emit('onApiStatusTotalsChange', { ...totals, ...newLast, api_ok, isSlow });

      if (next_tm_base !== timeout_base) setTimeoutBase(next_tm_base);

      setTimeout(() => {
        getApiStatus();
      }, timeoutMS);

      reactory.log(`Client Ping Totals:`, { totals: newTotals, nextIn: timeoutMS }, 'debug');
    }).catch((statusError) => {
      reactory.log(`Error while fetching api status`, { error: statusError }, 'error');
      setOfflineStatus(true);
      onOfflineChanged(true);

      totals = {
        error: totals.error + 1,
        slow: totals.slow,
        ok: totals.ok + 1,
        total: totals.total + 1,
      };

      setTimeout(() => {
        getApiStatus();
      }, timeoutMS);
    });


  };


  useEffect(() => {

    getApiStatus();

  }, []);


  if (offline === false) return null;

  return (
    <React.Fragment>
      <Box style={{ margin: 'auto', textAlign: 'center', paddingTop: '100px' }}>
        <Typography variant="h1" style={{ color: reactory.muiTheme.palette.error.main }}>
          <Icon style={{ fontSize: '100px' }}>cloud_off</Icon>
        </Typography>
        <Typography variant="body2">
          We are unable to connect you to our service at this time.
          This may be due to a poor internet connection or your
          device is currently offline.
        </Typography>

        <Typography variant="body2">
          This message will disappear as soon as we are able to establish a connection.
          If you accessed the system with an email link, please retry using this link in a few moments.
        </Typography>
      </Box>
    </React.Fragment>
  )
}

export const ReactoryHOC = (props: ReactoryHOCProps) => {

  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [auth_validated, setIsValidated] = React.useState<boolean>(false);
  const [user, setUser] = React.useState<any | Reactory.Models.IUser>(null);
  const [error, setError] = React.useState<Error>(null);
  const [apiStatus, setApiStatus] = React.useState<any>(null);
  const [offline, setOfflineStatus] = React.useState<boolean>(false);
  const [theme, setTheme] = React.useState<any>(createTheme({ palette: { mode: "dark" } }));
  const [statusInterval, setStatusInterval] = React.useState<any>(null);
  const [current_route, setCurrentRoute] = React.useState<string>("/");
  const [version, setVersion] = React.useState(0);
  const [isAuthenticating, setIsAuthenticating] = React.useState<boolean>(true);

  const components: any = reactory.getComponents(dependencies);
  const { NotificationComponent, Footer } = components;

  const getApiStatus = (emitLogin = true) => {

    reactory.status({ emitLogin, forceLogout: false }).then((user: any) => {
      setIsValidated(true);
      setOfflineStatus(user.offline === true)
      setUser(user);
      setIsReady(true);
      setIsAuthenticating(false);
      applyTheme();
    }).catch((validationError) => {
      setIsValidated(true);
      setUser(null);
      setOfflineStatus(true)
      setError(validationError);
      setIsAuthenticating(false);
      setIsReady(false);
    });
  };


  const onRouteChanged = (path: string) => {
    setCurrentRoute(path)
  }

  const onLogin = () => {
    reactory.log('App.onLogin handler', {}, 'debug')
    setUser(reactory.getUser());
    const redirect = localStorage.getItem('$reactory.onlogin.redirect$')
    if (redirect && redirect !== "" && redirect.indexOf("logout") < 0) {
      setTimeout(() => {
        localStorage.removeItem('$reactory.onlogin.redirect$');
        localStorage.setItem('hasRefreshed', 'true');
        window.location.assign(redirect);
      }, 1500)
    }

    localStorage.removeItem('$reactory.onlogin.redirect$');
  };

  const onLogout = () => {
    reactory.log('App.onLogout handler', {}, 'debug')
    setUser(reactory.getUser());
  };


  const applyTheme = () => {
    let activeTheme = reactory.getTheme();
    if (isNil(activeTheme)) activeTheme = { ...props.appTheme };
    if (Object.keys(activeTheme).length === 0) activeTheme = { ...props.appTheme };


    //default empty state is mui  create theme
    let muiTheme: Theme & any = createTheme();

    const {
      type = 'material',
      options = {}
    } = activeTheme;

    // let themeMode = 'light';

    // debugger;

    // const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches

    // if (localStorage) {
    //   themeMode = localStorage.getItem("$reactory$theme_mode")
    //   if (!themeMode) {
    //     themeMode = isDarkMode === true ? 'dark' : 'light'
    //   }
    // }

    // let $theme = lodash.cloneDeep(options || activeTheme);
    // $theme.extensions = extensions;

    // if (type === 'material') {
    //   if ($theme.palette) $theme.palette.mode = themeMode;
    //   else {
    //     $theme.palette = {
    //       mode: themeMode
    //     }
    //   }
    // }

    // return $theme;

    //using new mechanism.      
    switch (type) {

      case 'material':
      default: {

        if (activeTheme.options) {
          muiTheme = createTheme(activeTheme.options);
        } else {
          //backward compat while in progress
          muiTheme = createTheme(activeTheme);
        }
      }

    }

    reactory.muiTheme = muiTheme;
    setTheme(muiTheme);
    //setSizeSpec(api.getSizeSpec());

  };

  const onThemeChanged = () => {
    applyTheme();
  };

  const onApiStatusUpdate = (status) => {

    if (!(status === null || status === undefined)) {
      reactory.log('App.onApiStatusUpdate(status)', { status }, status.offline === true ? 'error' : 'debug');
      let isOffline = status.offline === true;

      if (isOffline === true) {
        setOfflineStatus(isOffline);
        setTimeout(() => { getApiStatus() }, 3500);
      } else {
        let user = reactory.utils.lodash.cloneDeep(reactory.getUser());
        delete user.when;
        let _user = reactory.utils.lodash.cloneDeep(user);
        delete _user.when;

        if (deepEquals(user, _user) === false || status.offline !== offline) {
          setUser(user)
          setOfflineStatus(false);
        }

      }
    } else {
      reactory.log(`apiStaus returned null value`, { status }, 'warning');
    }
  }


  const onWindowResize = async () => {
    const _size_spec = reactory.getSizeSpec();
    reactory.$windowSize = _size_spec;
    reactory.log('ReactoryHOC Resize', _size_spec);
    reactory.emit('onWindowResize', _size_spec);
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
        if (window.location.pathname.indexOf('reset-password') === -1) {
          localStorage.removeItem('$reactory.last.attempted.route$');
          location.assign(lastRoute);
        }
      }
    }

    const waitForClient = () => {
      if (reactory.client === null || reactory.client === undefined) {
        setTimeout(waitForClient, 100);
      } else {
        getApiStatus();
      }
    }

    reactory.on(ReactoryApiEventNames.onLogout, onLogout)
    reactory.on(ReactoryApiEventNames.onLogin, onLogin)
    reactory.on(ReactoryApiEventNames.onApiStatusUpdate, onApiStatusUpdate);
    reactory.on(ReactoryApiEventNames.onRouteChanged, onRouteChanged);
    reactory.on(ReactoryApiEventNames.onThemeChanged, onThemeChanged);

    const query = queryString.parse(window.location.search);

    reactory.queryObject = query;
    reactory.queryString = window.location.search;
    reactory.objectToQueryString = queryString.stringify;

    if (window && !window.reactory) {
      window.reactory = {
        api: reactory,
      };
    }


    if (query.auth_token) {
      localStorage.setItem('auth_token', query.auth_token);
      ReactoryApolloClient().then((cli) => {
        //@ts-ignore
        reactory.client = cli.client;
        reactory.ws_link = cli.ws_link;
        cli.clearCache();
        getApiStatus();
      });
      setIsAuthenticating(true);
    } else {
      setIsAuthenticating(true);
      waitForClient();
    }

    return willUnmount;
  };

  useEffect(willMount, []);


  const useStyles = makeStyles(() => {

    return {

      root_paper: {
        minHeight: window.innerHeight,
        borderRadius: 0,
        margin: 0,
        padding: 0,
        overflowX: "hidden",
        overflowY: "auto"
      },

      selectedMenuLabel: {
        color: theme.palette.primary.main,
        paddingRight: theme.spacing(1.5),
        paddingLeft: theme.spacing(1)
      },
      prepend: {
        color: 'rgb(34, 39, 50)',
        opacity: 0.7,
        paddingLeft: theme.spacing(1.5),
        paddingRight: theme.spacing(1)
      },
      selected: {
        color: 'rgb(34, 39, 50)',
        opacity: 1,
        paddingLeft: theme.spacing(1)
      },
      preffered: {
        fontWeight: 'bold',
        color: theme.palette.primary.main
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

  const onOfflineChanged = (isOffline: boolean) => {
    setOfflineStatus(isOffline)
  };

  if (isReady === false) return <AppLoading />;
  //@ts-ignore
  let header = isAuthenticating === false ? (<Header api={reactory} title={theme && theme.content && auth_validated ? theme.content.appTitle : 'Starting'} />) : null;


  let onlyChild = (
    <Paper elevation={0} className={classes.root_paper} id={'reactory_paper_root'}>
      {offline === false && <Globals api={reactory} />}
      {header}
      <NotificationComponent />
      {offline === false && <ReactoryRouter reactory={reactory} user={user} auth_validated={auth_validated} authenticating={isAuthenticating} />}
      <Offline onOfflineChanged={onOfflineChanged} />
      <Footer />
    </Paper>);

  return (
    <Router>
      <React.Fragment>
        <CssBaseline />
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <ApolloProvider client={reactory.client as any}>
              <React.StrictMode>
                <ReactoryProvider reactory={reactory}>
                  {onlyChild}
                </ReactoryProvider>
              </React.StrictMode>
            </ApolloProvider>
          </Provider>
        </ThemeProvider>
      </React.Fragment>
    </Router>
  );
};


export default ReactoryHOC

