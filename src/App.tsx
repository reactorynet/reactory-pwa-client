import React, { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
  useLocation,
  useNavigation,
  useParams
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

/**
 * Wrapper component that renders inside each route to access params
 * and process componentProps templates
 */
const RouteComponentWrapper = ({ routeDef, reactory, componentArgs, children, onComponentLoad, hasHeader = false, headerHeight = 48 }) => {
  const params = useParams();
  const location = useLocation();

  // Process componentProps templates with actual route params
  let processedArgs = { ...componentArgs };

  // Add route params directly to component args
  Object.keys(params).forEach(paramKey => {
    processedArgs[paramKey] = params[paramKey];
  });

  if (routeDef.componentProps) {
    processedArgs = { ...routeDef.componentProps };

    // Process template strings in componentProps
    Object.keys(processedArgs).forEach(key => {
      const value = processedArgs[key];
      if (typeof value === 'string' && value.includes('${')) {
        try {
          if (value.includes('::')) {
            const [_value, transform] = value.split('::');
            processedArgs[key] = reactory.utils.template(_value)({ route: params, location });
            if (transform) {
              switch (transform) {
                case 'toInt':
                  processedArgs[key] = parseInt(processedArgs[key]);
                  break;
                case 'toString':
                  processedArgs[key] = String(processedArgs[key]);
                  break;
                case 'toDate':
                  processedArgs[key] = new Date(processedArgs[key]);
                  break;
                case 'toBoolean':
                  processedArgs[key] = Boolean(processedArgs[key]);
                  break;
                default:
                  processedArgs[key] = processedArgs[key];
              }
            }
          } else {
            // Replace ${route.paramName} with actual param values
            processedArgs[key] = reactory.utils.template(value)({ route: params, location });
          }
        } catch (error) {
          reactory.warning(`Error processing template ${value}:`, error);
          processedArgs[key] = value; // fallback to original value
        }
      }
    });
  }



  const ReactoryComponent = reactory.getComponent(routeDef.componentFqn);
  const NotFound = reactory.getComponent("core.NotFound");

  // Calculate margin-top based on header presence and height
  const wrapperStyle = hasHeader ? { marginTop: `${headerHeight}px` } : {};

  // Add additional safety checks for component loading
  if (!ReactoryComponent) {
    return (
      <div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10% 2rem', marginTop: `${headerHeight}px` }}>
          <span>Loading component...</span>
        </div>
      </div>
    );
  }

  try {
    if (ReactoryComponent) {

      const componentProps = {
        ...processedArgs,
        style: {
          marginTop: `${headerHeight}px`,
          ...processedArgs?.style,
        }
      }

      return (
        <div>
          {children}
          <ReactoryComponent {...componentProps} key={routeDef.id} />
        </div>
      );
    } else {
      // Component not found - show loading state with retry mechanism
      return (
        <div>
          {children}
          <NotFound
            key={routeDef.id}
            message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`}
            waitingFor={routeDef.componentFqn}
            args={processedArgs}
            wait={500}
            onFound={onComponentLoad}
            style={{ marginTop: `${headerHeight}px` }}
          />
        </div>
      );
    }
  } catch (routeError) {
    reactory.error(`Error rendering component ${routeDef.componentFqn} for route ${routeDef.path}`, {
      error: routeError,
      routeDef,
      params,
      location
    });
    return (
      <div>
        {children}
        <NotFound
          key={routeDef.id}
          message={`Error rendering component ${routeDef.componentFqn} for route ${routeDef.path}`}
          waitingFor={routeDef.componentFqn}
          args={processedArgs}
          wait={500}
          onFound={onComponentLoad}
          style={{ marginTop: `${headerHeight}px` }}
        />
      </div>
    );
  }
};

const ReactoryRouter = (props: ReactoryRouterProps) => {

  const navigation = useNavigate();
  const location = useLocation();
  const reactory = useReactory();
  // Remove useParams from here - it won't work at router level
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
    // Add a small delay to ensure the main app state has been updated
    setTimeout(() => {
      configureRouting();
      setVersion(v + 1);
    }, 100);
  };


  const onLogout = () => {
    // Add a small delay to ensure the main app state has been updated
    setTimeout(() => {
      setVersion(v + 1);
    }, 100);
  };

  reactory.on(ReactoryApiEventNames.onLogout, onLogout);
  reactory.on(ReactoryApiEventNames.onLogin, onLogin);

  reactory.navigation = navigation;
  reactory.location = location;


  const configureRouting = () => {
    debug('Configuring Routing', { auth_validated, user });

    // Add safety checks to prevent route configuration during transitions
    if (authenticating) {
      debug('Skipping route configuration - authenticating', {
        authenticating
      });
      return;
    }

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
  routes.forEach((routeDef: Reactory.Routing.IReactoryRoute, index: number) => {
    reactory.log(`Configuring Route ${routeDef.path}`, { routeDef, props: props });
    if (routeDef.redirect) {
      navigation(routeDef.redirect, { state: { from: location }, replace: true })
    }

    let componentArgs = {};

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

    let children = [];
    let hasHeader = false;
    let headerHeight = 48; // Default header height

    // Determine header configuration
    if (routeDef.header) {
      const {
        componentFqn,
        show = true,
        propsMap
      } = routeDef.header;

      const headerProps: { height?: number } = routeDef.header.props || {
        height: 48
      };

      if (show === true) {
        const Header = reactory.getComponent<any>(componentFqn);
        if (Header) {
          let $props = { ...headerProps };
          if (propsMap) {
            $props = { ...headerProps, }
          }
          children.push(<Header {...$props} />);
          hasHeader = true;
          headerHeight = headerProps?.height || 48;
        } else {
          // Fallback to default header if custom header component not found
          if (props.header) {
            children.push(props.header);
            hasHeader = true;
            headerHeight = 48; // Default header height
          }
        }
      }
    } else if (props.header) {
      children.push(props.header);
      hasHeader = true;
      headerHeight = 48; // Default header height
    }

    if (routeDef.public === true) {
      // public access we don't have to check roles or auth
      ChildRoutes.push(
        <Route
          key={index}
          path={routeDef.path}
          element={
            <RouteComponentWrapper
              routeDef={routeDef}
              reactory={reactory}
              componentArgs={componentArgs}
              children={children}
              onComponentLoad={() => setVersion(v + 1)}
              hasHeader={hasHeader}
              headerHeight={headerHeight}
            />
          }
        />
      );
    } else {
      const hasRolesForRoute = reactory.hasRole(routeDef.roles, reactory.getUser().loggedIn.roles) === true;

      if (reactory.isAnon() === false && hasRolesForRoute === false) {
        const NotFoundComponent = reactory.getComponent("core.NotFound");
        if (NotFoundComponent) {
          children.push(React.createElement(NotFoundComponent as any, {
            key: "not-found-permissions",
            message: "You don't have sufficient permissions to access this route.",
            link: routeDef.path,
            wait: 500
          }));
        }
        ChildRoutes.push(
          <Route
            key={index}
            path={routeDef.path}
            element={<React.Fragment>{children}</React.Fragment>}
          />
        );
      } else {
        if (auth_validated === true && hasRolesForRoute === true) {
          ChildRoutes.push(
            <Route
              key={index}
              path={routeDef.path}
              element={
                <RouteComponentWrapper
                  routeDef={routeDef}
                  reactory={reactory}
                  componentArgs={componentArgs}
                  children={children}
                  onComponentLoad={() => setVersion(v + 1)}
                  hasHeader={hasHeader}
                  headerHeight={headerHeight}
                />
              }
            />
          );
        } else {
          const hasRefreshed: boolean = localStorage.getItem('hasRefreshed') === 'true';

          //auth token not validated yet in process of checking
          //@ts-ignore
          if (auth_validated === false || authenticating === true) {
            children.push(<Typography style={{ display: 'flex', justifyContent: 'center', padding: '10% 2rem' }} variant='h5'>Please wait while we validate your access token...</Typography>);
          } else {
            if (hasRefreshed === true && reactory.isAnon() === true && routeDef.path !== "/login") {
              localStorage.removeItem('hasRefreshed');
              navigation("/login", { state: { from: location }, replace: true })
            }
          }

          ChildRoutes.push(
            <Route
              key={index}
              path={routeDef.path}
              element={<React.Fragment>{children}</React.Fragment>}
            />
          );
        }
      }
    }

    if (props.footer && routeDef.footer) {
      const {
        componentFqn,
        show = true,
        props = {},
        propsMap
      } = routeDef.footer;

      if (show === true) {
        const Footer = reactory.getComponent<any>(componentFqn);
        if (Footer) {
          let $props = { ...props };
          if (propsMap) {
            $props = { ...props, }
          }
          // Footer should be added to children in RouteComponentWrapper if needed
        } else {
          // use the default footer
          // Footer should be added to children in RouteComponentWrapper if needed
        }
      }
    }
  });

  const NotFoundElement = reactory.getComponent<any>("core.NotFound");
  ChildRoutes.push(<Route key={ChildRoutes.length + 1} path="*" element={<NotFoundElement />} />)
  return (
    <Routes key={'reactory-router-routes-' + v}>
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
  // Add flag to prevent re-rendering loops during auth transitions
  const [isAuthTransitioning, setIsAuthTransitioning] = React.useState<boolean>(false);
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

      // Load forms after successful status check
      if (apiStatus.status === 'API OK') {
        try {
          await (reactory as any).forms(true);
          reactory.log('Forms loaded during initialization');
        } catch (formError) {
          reactory.error('Error loading forms during initialization:', formError);
        }
      }

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
    // Set flags to prevent re-rendering loops during auth transition
    setIsAuthTransitioning(true);
    setIsAuthenticating(true);

    // Ensure forms are refreshed when login state changes
    const refreshFormsAndComponents = async () => {
      try {
        // Force refresh forms cache to get forms for the logged-in user
        await (reactory as any).forms(true);

        // Re-register built-in components after forms are loaded
        componentRegistery.forEach((componentDef) => {
          const { nameSpace, name, version = '1.0.0', component = (<i>*</i>), tags = [], roles = ["*"], wrapWithApi = false, } = componentDef
          reactory.registerComponent(nameSpace, name, version, component, tags, roles, wrapWithApi);
        });

        reactory.log('Forms and components refreshed after login');
      } catch (error) {
        reactory.error('Error refreshing forms and components after login:', error);
      }
    };

    // Get the current user data directly without triggering additional API calls
    const currentUser = reactory.getUser();
    if (currentUser && currentUser.loggedIn) {
      setUser(currentUser);
      setIsValidated(true);
      applyTheme();

      // Refresh forms and components after login, then set ready state
      refreshFormsAndComponents().then(() => {
        setIsAuthenticating(false);
        setIsReady(true);
        // Clear the transition flag after a short delay
        setTimeout(() => setIsAuthTransitioning(false), 100);
      });
    } else {
      // If user data is not immediately available, set a timeout to retry
      setTimeout(async () => {
        const retryUser = reactory.getUser();
        setUser(retryUser);
        setIsValidated(true);
        applyTheme();

        // Refresh forms and components after login, then set ready state
        await refreshFormsAndComponents();
        setIsAuthenticating(false);
        setIsReady(true);

        // Clear the transition flag
        setIsAuthTransitioning(false);
      }, 500);
    }
  };

  const onLogout = () => {
    reactory.log('App.onLogout handler', {});

    // Set flag to prevent re-rendering loops during auth transition
    setIsAuthTransitioning(true);

    // Clear forms cache and component registrations to prevent stale data
    const cleanupFormsAndComponents = async () => {
      try {
        // Clear form schemas cache
        reactory.formSchemas = [];
        reactory.formSchemaMap = {};
        reactory.formSchemaLastFetch = null;

        // Clear the component registry for forms that may no longer be accessible
        // This helps prevent components from being rendered with stale permissions
        Object.keys(reactory.componentRegister).forEach((key) => {
          const component = reactory.componentRegister[key];
          if (component && component.componentType === 'form') {
            delete reactory.componentRegister[key];
          }
        });

        reactory.log('Forms and components cleaned up after logout');
      } catch (error) {
        reactory.error('Error cleaning up forms and components after logout:', error);
      }
    };

    // Clear user data and reset authentication state
    setUser(null);
    setIsValidated(false);
    setIsAuthenticating(false);
    setIsReady(false);

    // Cleanup forms and components
    void cleanupFormsAndComponents();

    // Clear the transition flag after a short delay
    setTimeout(() => setIsAuthTransitioning(false), 100);
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

      // Skip updates during auth transitions to prevent loops
      if (isAuthTransitioning) {
        reactory.debug('Skipping API status update during auth transition');
        return;
      }

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
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener('change', (evt) => {
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
        //maxHeight: screen.availHeight,
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

  // Add additional check for authentication transition
  if (isAuthenticating === true || isAuthTransitioning === true) {
    return <AppLoading message={"Authenticating..."} />;
  }

  // Add check for user state during authentication transitions
  if (auth_validated === false && user === null) {
    return <AppLoading message={"Validating authentication..."} />;
  }

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

