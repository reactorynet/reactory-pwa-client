import React, { useEffect } from 'react';
import { styled } from '@mui/material/styles';
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
import { 
  REACT_APP_CLIENT_KEY,
  REACT_APP_CLIENT_PASSWORD,
  REACT_APP_API_ENDPOINT,
  classes,
  packageInfo
} from './app/constants';
import { 
  AppLoading,
  Offline, 
} from './app/widgets';
import { ReactoryRouter } from './app/router';

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
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';




const StyledRouter = styled(Router)(({ theme }: { theme: Theme }) => {

  return {
    [`& .${classes.root_paper}`]: {
      minHeight: '100vh',
      maxHeight: '100vh',        
    },
    [`& .${classes.selectedMenuLabel}`]: {
      color: theme.palette.primary.main,
      paddingRight: theme.spacing(1.5),
      paddingLeft: theme.spacing(1)
    },
    [`& .${classes.prepend}`]: {
      color: 'rgb(34, 39, 50)',
      opacity: 0.7,
      paddingLeft: theme.spacing(1.5),
      paddingRight: theme.spacing(1)
    },
    [`& .${classes.selected}`]: {
      color: 'rgb(34, 39, 50)',
      opacity: 1,
      paddingLeft: theme.spacing(1)
    },
    [`& .${classes.preffered}`]: {
      fontWeight: 'bold',
      color: theme.palette.primary.main
    },
    [`& .${classes.get_started}`]: {
      fontSize: '20px',
      color: 'grey',
      textAlign: 'center',
      marginTop: '30px'
    },
    [`& .${classes.schema_selector}`]: {
      textAlign: 'right'
    }
  };
});

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
}

interface ReactoryRouterProps {
  reactory: Reactory.Client.ReactorySDK,
  auth_validated: boolean,
  user: Reactory.Models.IUser,
  authenticating: boolean,
  header: React.ReactElement
  footer: React.ReactElement
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
    // set the background color on the body to the background color of the theme
    document.body.style.backgroundColor = muiTheme.palette.background.default;
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
              // Use React Router navigation instead of location.assign
              setTimeout(() => {
                window.location.href = lastRoute;
              }, 100);
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
    <StyledRouter>
      <React.Fragment>
        <CssBaseline />
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <ApolloProvider client={reactory.client as any}>
              <React.StrictMode>
                <ReactoryProvider reactory={reactory}>
                  <LocalizationProvider dateAdapter={AdapterMoment}>
                  <Paper
                    id='reactory_paper_root'
                    elevation={0}
                    square={true}                     
                    classes={{ root: classes.root_paper }}
                    >
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
                  </LocalizationProvider>
                </ReactoryProvider>
              </React.StrictMode>
            </ApolloProvider>
          </Provider>
        </ThemeProvider>
      </React.Fragment>
    </StyledRouter>
  );
};


export default ReactoryHOC

