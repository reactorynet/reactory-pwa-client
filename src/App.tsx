import React, { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import {
  BrowserRouter as Router,
  Route,
  RouterProvider,
  Routes,
  useNavigate,
  useLocation,
  createBrowserRouter,
  RouteObject,
  RouteProps,
  useNavigation,
} from 'react-router-dom';
import { isNil, isArray } from 'lodash';
import { Provider } from 'react-redux';
import configureStore from './models/redux';

import { Theme, CssBaseline } from '@mui/material'
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import queryString from './components/utility/query-string';
import './App.css';
import { ReactoryHeader as Header } from '@reactory/client-core/components/shared/header';
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

const Globals = ({ reactory }) => {

  const globals = reactory.getGlobalComponents();

  const [version, setVersion] = React.useState(0);

  reactory.on('onLogout', () => { setVersion(version + 1) });
  reactory.on('onLogin', () => { setVersion(version + 1) });

  return (
    <div data-v={`1`} data-globals-container="true" style={{ height: 0, width: 0, position: "absolute", left: 0, top: 0, display: 'none' }}>
      {globals.map((GLOBALFORM, gidx) => {
        return (<GLOBALFORM key={gidx} />)
      })}
    </div>
  );

};

interface ReactoryHOCProps {
  [key: string]: any,
};

interface ReactoryRouterProps {
  reactory: Reactory.Client.ReactorySDK,
  auth_validated: boolean,
  user: Reactory.Models.IUser,
  authenticating: boolean,
  header: React.ReactElement
  footer: React.ReactElement
};

const ReactoryRoute = (routeDef: Reactory.Routing.IReactoryRoute, auth_validated: boolean = false, authenticating: boolean = false) => {

  
}


const ReactoryRouter = (props: ReactoryRouterProps) => {
  
  const navigation = useNavigate();
  const location = useLocation();
  const reactory = useReactory();
  const { 
    utils,
    debug,
    error,
    warning,
  } = reactory;

  const {
    objectMapper,
  } = utils;
  const { auth_validated, user, authenticating = false } = props;
  const [routes, setRoutes] = React.useState<Reactory.Routing.IReactoryRoute[]>([]);
  const [v, setVersion] = React.useState<number>(0);
  

  const onLogin = () => {
    configureRouting();
    setVersion(v + 1);
  };


  const onLogout = () => {
    setVersion(v + 1);
  };

  reactory.on(ReactoryApiEventNames.onLogout, onLogout);
  reactory.on(ReactoryApiEventNames.onLogin, onLogin);

  reactory.navigation = navigation;
  reactory.location = location;


  const configureRouting = () => {
    debug('Configuring Routing', { auth_validated, user });
    const $routes = [...reactory.getRoutes()];
    if (reactory.utils.hashCode(JSON.stringify($routes)) !== reactory.utils.hashCode(JSON.stringify(routes))) { 
      setRoutes($routes);
      setVersion(v + 1);
    }
  }


  useEffect(() => {
    configureRouting();
  }, []);

  useEffect(() => {
    configureRouting();
  }, [auth_validated, authenticating])

  if (auth_validated === false || authenticating === true) {
    return (<span>Validating Authentication</span>)
  }

  const ChildRoutes = [];
  routes.forEach((routeDef: Reactory.Routing.IReactoryRoute) => {
    reactory.log(`Configuring Route ${routeDef.path}`, { routeDef, props: props });          
    if (routeDef.redirect) {
      navigation(routeDef.redirect, { state: { from: location }, replace: true })
    }

    let componentArgs = {};
    /**
     * If the route has props, we add them to the component args
     * this is the preferred way of setting the props.
     */
    if(routeDef.componentProps) {
      componentArgs = {...routeDef.componentProps}
    }

    /**
     * If the route has args, we add them to the component args
     * this is the secondary method of setting the props, provides
     * additional meta data about the props to allow for potential 
     * future features.
     */
    if (isArray(routeDef.args)) {
      routeDef.args.forEach((arg) => {
        componentArgs[arg.key] = arg.value[arg.key];
      })
    }
      
    const ReactoryComponent = reactory.getComponent<any>(routeDef.componentFqn)
    const NotFound = reactory.getComponent<any>("core.NotFound");
    
    let children = [];

    if(props.header && routeDef.header) {
      const {
        componentFqn,
        show = true,
        props = {},
        propsMap
      } = routeDef.header;

      if (show === true) {
        const Header = reactory.getComponent<any>(componentFqn);
        if (Header) {
          let $props = {...props};
          if (propsMap) {
            $props = {...props, }
          }
          children.push(<Header {...$props } />);
        } else {
          // use the default header
          children.push(props.header);
        }
      }
    } else {
      if (props.header) {
        children.push(props.header);
      }
    }
    
    if (routeDef.public === true) {
      // public access we don't have to check roles or auth
      if (ReactoryComponent) { 
        children.push(<ReactoryComponent {...componentArgs} />);
      }
      else {
        children.push(<NotFound 
          message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`} 
          waitingFor={routeDef.componentFqn} args={componentArgs} 
          wait={500}
          onFound={()=>{setVersion(v+1)}} 
        />)
      } 
    } else {

      const hasRolesForRoute = reactory.hasRole(routeDef.roles, reactory.getUser().loggedIn.roles) === true;

      if (reactory.isAnon() === false && hasRolesForRoute === false) {
        children.push(<NotFound message="You don't have sufficient permissions to access this route." link={routeDef.path} wait={500} />);
      } else {
        if (auth_validated === true && hasRolesForRoute === true) {
          if (ReactoryComponent) {             
            children.push(<ReactoryComponent {...componentArgs} />)
          }
          else  {
            children.push(<NotFound 
              message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`} 
              waitingFor={routeDef.componentFqn} 
              args={componentArgs} 
              wait={500}/>)
          }
        } else {

          const hasRefreshed: boolean = localStorage.getItem('hasRefreshed') === 'true';

          //auth token not validated yet in process of checking
          //@ts-ignore
          if (auth_validated === false || authenticating === true) {
            return <Typography style={{ display: 'flex', justifyContent: 'center', padding: '10% 2rem' }} variant='h5'>Please wait while we validate your access token...</Typography>
          } else {
            if (hasRefreshed === true && reactory.isAnon() === true && routeDef.path !== "/login") {
              localStorage.removeItem('hasRefreshed');
              //return <Redirect to={{ pathname: '/login', state: { from: routeDef.path } }} />
              navigation("/login", { state: { from: location }, replace: true })
            }
          }
        }
      }
    }

    if(props.footer && routeDef.footer) {
      const {
        componentFqn,
        show = true,
        props = {},
        propsMap
      } = routeDef.footer;

      if (show === true) {
        const Footer = reactory.getComponent<any>(componentFqn);
        if (Footer) {
          let $props = {...props};
          if (propsMap) {
            $props = {...props, }
          }
          children.push(<Footer {...$props } />);
        } else {
          // use the default footer
          children.push(props.footer);
        }
      }
    } else {
      if (props.footer) {
        children.push(props.footer);
      }
    }

    
    ChildRoutes.push(<Route 
      key={routeDef.path}
      path={routeDef.path}
      element={<React.Fragment>{children}</React.Fragment>}
      />)
  });

  const NotFoundElement = reactory.getComponent<any>("core.NotFound");
  ChildRoutes.push(<Route path="*" element={<NotFoundElement />} />)
  return (
    <Routes>
      {ChildRoutes}      
    </Routes>
  )
}

const AppLoading = (props) => {
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
      <p>{props.message ? props.message : 'Loading'}</p>
    </>
  )
}

const Offline = (props: { onOfflineChanged: (isOffline: boolean) => void }) => {

  const TM_BASE_DEFAULT: number = 45000;
  const reactory = useReactory();
  const { onOfflineChanged } = props;
  const [timeout_base, setTimeoutBase] = React.useState<number>(TM_BASE_DEFAULT);
  const [offline, setOfflineStatus] = React.useState<boolean>(false);

  let timeoutMS: number = 45000;
  let totals = { error: 0, slow: 0, ok: 0, total: 0 };
  let last_slow = null;


  const getApiStatus = async (): Promise<void> => {
    const started = Date.now();

    try { 
      const apiStatus = await reactory.status({ emitLogin: false, forceLogout: false });
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
        void getApiStatus();
      }, timeoutMS);

      reactory.debug(`Client Ping Totals:`, { totals: newTotals, nextIn: timeoutMS });
    } catch (error) {
      reactory.error(`Error while fetching api status`, { error: error });
      setOfflineStatus(true);
      onOfflineChanged(true);

      totals = {
        error: totals.error + 1,
        slow: totals.slow,
        ok: totals.ok + 1,
        total: totals.total + 1,
      };

      setTimeout(() => {
        void getApiStatus();
      }, timeoutMS);
    }
  };


  useEffect(() => {
    void getApiStatus();
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


const dependencies = [
  'core.Loading@1.0.0',
  'core.Login@1.0.0',
  'core.FullScreenModal@1.0.0',
  'core.NotificationComponent@1.0.0',
  'core.NotFound@1.0.0',
  'reactory.Footer@1.0.0',
];

export const ReactoryHOC = (props: ReactoryHOCProps) => {
  //@ts-ignore
  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [auth_validated, setIsValidated] = React.useState<boolean>(false);
  const [user, setUser] = React.useState<any | Reactory.Models.IUser>(null);
  const [error, setError] = React.useState<Error>(null);
  //  const [apiStatus, setApiStatus] = React.useState<any>(null);
  const [offline, setOfflineStatus] = React.useState<boolean>(false);
  const [theme, setTheme] = React.useState<any>(createTheme({ palette: { mode: "dark" } }));
  //  const [statusInterval, setStatusInterval] = React.useState<any>(null);
  const [current_route, setCurrentRoute] = React.useState<string>("/");
  const [version, setVersion] = React.useState(0);
  const [isAuthenticating, setIsAuthenticating] = React.useState<boolean>(true);
  //@ts-ignore
  const [reactory] = React.useState<Reactory.Client.ReactorySDK>(new ReactoryApi({
    clientId: `${localStorage.getItem('REACT_APP_CLIENT_KEY')}`,
    clientSecret: `${localStorage.getItem('REACT_APP_CLIENT_PASSWORD')}`,
    $version: `${packageInfo.version}-${license.version}`,
    useNavigation
  }));

  const [store] = React.useState<any>(configureStore(null));

  const components: any = reactory.getComponents(dependencies);
  const { NotificationComponent, Footer } = components;

  const getApiStatus = async (emitLogin = true): Promise<void> => {

    try { 
      const apiStatus = await reactory.status({ emitLogin, forceLogout: false });
      setIsValidated(true);
      setOfflineStatus(false);
      setUser(apiStatus);
      setIsReady(true);
      setIsAuthenticating(false);
      applyTheme();
    } catch (err) {
      setIsValidated(true);
      setUser(null);
      setOfflineStatus(true)
      setError(err);
      setIsAuthenticating(false);
      setIsReady(false);
    }
  };


  const onRouteChanged = (path: string) => {
    setCurrentRoute(path)
  }

  const onLogin = () => {
    reactory.log('App.onLogin handler', {});
    setUser(reactory.getUser());    
  };

  const onLogout = () => {
    reactory.log('App.onLogout handler', {});
    setUser(reactory.getUser());
  };


  const applyTheme = () => {    
    let activeTheme: Reactory.UX.IReactoryTheme = reactory.getTheme();
    if (isNil(activeTheme)) activeTheme = { ...props.appTheme };
    if (Object.keys(activeTheme).length === 0) activeTheme = { ...props.appTheme };


    //default empty state is mui  create theme
    let muiTheme: Theme & any = createTheme();

    const {
      type = 'material',
    } = activeTheme;
    //additional theme support will be added here.
    switch (type) {
      case 'material':
      default: {
        muiTheme = createTheme(activeTheme.options);
      }

    }    
    reactory.muiTheme = muiTheme;
    setTheme(muiTheme);
  };

  /**
   * 
   * @param theme 
   * @param mode 
   */
  const onThemeChanged = () => {
    reactory.status({
      emitLogin: false,
    }).then(() => {
      applyTheme();
    });
  };

  const onApiStatusUpdate = (status) => {

    if (!(status === null || status === undefined)) {
      reactory.debug('App.onApiStatusUpdate(status)', { status });
      let isOffline = status.offline === true;

      if (isOffline === true) {
        setOfflineStatus(isOffline);
        setTimeout(() => { void getApiStatus() }, 3500);
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
      reactory.warning(`apiStatus returned null value`, { status });;
    }
  }


  const onWindowResize = async () => {
    const _size_spec = reactory.getSizeSpec();
    reactory.$windowSize = _size_spec;
    reactory.log('ReactoryHOC Resize', _size_spec);
    reactory.emit('onWindowResize', _size_spec);
    setVersion(version + 1)    
  };


  const willUnmount = () => { 
    window.removeEventListener('resize', onWindowResize);
    window.matchMedia("(prefers-color-scheme: dark)").removeEventListener('change', (evt) => {
      if (evt.matches === true) {
        localStorage.setItem('$reactory$theme_mode', 'dark');
        setVersion(version + 1);
      } else {
        localStorage.setItem('$reactory$theme_mode', 'light');
        setVersion(version + 1);
      }
    });
    reactory.off(ReactoryApiEventNames.onLogout, onLogout)
    reactory.off(ReactoryApiEventNames.onLogin, onLogin)
    reactory.off(ReactoryApiEventNames.onApiStatusUpdate, onApiStatusUpdate);
    reactory.off(ReactoryApiEventNames.onRouteChanged, onRouteChanged);
    reactory.off(ReactoryApiEventNames.onThemeChanged, onThemeChanged);
  };

  const willMount = () => {
    let failedCount = 0;
    const doInit = async () => { 
      reactory.init().then(() => {
        //register built-in components
        componentRegistery.forEach((componentDef) => {
          const { nameSpace, name, version = '1.0.0', component = (<i>*</i>), tags = [], roles = ["*"], wrapWithApi = false, } = componentDef
          reactory.registerComponent(nameSpace, name, version, component, tags, roles, wrapWithApi);
        });
  
        reactory.$windowSize = reactory.getSizeSpec();  
        reactory.reduxStore = store;
  
        window.addEventListener('resize', onWindowResize);
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener('change',(evt) => {
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
  
      reactory.on(ReactoryApiEventNames.onLogout, onLogout)
      reactory.on(ReactoryApiEventNames.onLogin, onLogin)
      reactory.on(ReactoryApiEventNames.onApiStatusUpdate, onApiStatusUpdate);
      reactory.on(ReactoryApiEventNames.onRouteChanged, onRouteChanged);
      reactory.on(ReactoryApiEventNames.onThemeChanged, onThemeChanged);
  
      const query = queryString.parse(window.location.search);
  
      reactory.queryObject = query;
      reactory.queryString = window.location.search;
      reactory.objectToQueryString = queryString.stringify;
  
      window.reactory.api = reactory;
  
  
      if (query.auth_token) {
        localStorage.setItem('auth_token', query.auth_token);
        ReactoryApolloClient().then((cli) => {
          //@ts-ignore
          reactory.client = cli.client;
          reactory.ws_link = cli.ws_link;
          cli.clearCache();
          void getApiStatus();
          // strip the auth token from the url bar
          setTimeout(() => { window.history.replaceState({}, document.title, window.location.pathname) }, 500);
        });
        setIsAuthenticating(true);
      } else {
        setIsAuthenticating(true);
        void getApiStatus();
      }
      }).catch((err) => { 
        reactory.log('Error initializing Reactory', { err }, 'error');
        if (failedCount < 3) {
          failedCount++;
          setTimeout(() => { doInit() }, 750 * failedCount);
        } else {
          reactory.log('Failed to initialize Reactory', { err },
            'error');
          setError(err);
          setIsReady(false);
        }
      });      
    }
    
    void doInit();

    return willUnmount;
  };

  useEffect(willMount, []);

  const useStyles = makeStyles(() => {

    return {

      root_paper: {
        minHeight: screen.availHeight,
        maxHeight: screen.availHeight,
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

  if (isReady === false) return <AppLoading message={"Loading..."} />;
  //@ts-ignore
  let header = isAuthenticating === false ? (<Header title={theme && theme.content && auth_validated ? theme.content.appTitle : 'Starting'} />) : null;
  let footer = isAuthenticating === false ? (<Footer />) : null;
  return (
    <Router>
      <React.Fragment>
        <CssBaseline />
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <ApolloProvider client={reactory.client as any}>
              <React.StrictMode>
                <ReactoryProvider reactory={reactory}>
                  <Paper 
                    id='reactory_paper_root'
                    elevation={0} 
                    className={classes.root_paper}>
                    {offline === false && 
                      <React.Fragment>
                        <NotificationComponent />
                        <ReactoryRouter 
                          header={header}
                          reactory={reactory} 
                          user={user} 
                          auth_validated={auth_validated} 
                          authenticating={isAuthenticating}
                          footer={footer} 
                        />
                      </React.Fragment>}                    
                    <Offline onOfflineChanged={onOfflineChanged} />                  
                  </Paper>
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

