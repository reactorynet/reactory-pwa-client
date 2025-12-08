import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import configureStore from './models/redux';
import { CssBaseline, Paper } from '@mui/material';
import { createTheme } from '@mui/material/styles';
//@ts-ignore
import './App.css';
import { ReactoryHeader as Header } from '@reactory/client-core/components/shared/header';
import { componentRegistery } from './components/index';
import ReactoryApi from './api';
import ReactoryApolloClient from './api/ReactoryApolloClient';
import license from './license';

// Import extracted components
import { StyledRouter } from './components/app/StyledRouter';
import { AppLoading } from './components/app/AppLoading';
import { ReactoryRouter } from './components/app/ReactoryRouter';
import { OfflineMonitor } from './components/app/OfflineMonitor';
import { AppProviders } from './components/app/AppProviders';

// Import custom hooks
import {
  useReactoryAuth,
  useReactoryTheme,
  useReactoryInit,
  useApiHealthCheck,
  useRouteConfiguration,
} from './hooks/app';

// Constants
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

// Type definitions
interface ReactoryHOCProps {
  appTheme?: any;
  [key: string]: any;
}

// Component dependencies that need to be registered
const dependencies = [
  'core.Loading@1.0.0',
  'core.Login@1.0.0',
  'core.FullScreenModal@1.0.0',
  'core.NotificationComponent@1.0.0',
  'core.NotFound@1.0.0',
  'reactory.Footer@1.0.0',
];

// CSS classes for Paper component
const classes = {
  root_paper: 'ReactoryHOC-root_paper',
};

/**
 * ReactoryHOC - Main Application Component
 * Uses extracted hooks and components for clean separation of concerns
 */
export const ReactoryHOC = (props: ReactoryHOCProps) => {
  // Initialize Reactory SDK
  const [reactory] = useState(() => new ReactoryApi({
    clientId: `${localStorage.getItem('REACT_APP_CLIENT_KEY')}`,
    clientSecret: `${localStorage.getItem('REACT_APP_CLIENT_PASSWORD')}`,
    $version: `${packageInfo.version}-${license.version}`,
    useNavigate
  }) as unknown as Reactory.Client.ReactorySDK);

  // Initialize Redux store
  const [store] = useState(() => configureStore(null));

  // State for application readiness and errors
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offline, setOfflineStatus] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [authenticating, setAuthenticating] = useState<boolean>(true);

  // Custom hook: Theme management  
  const {
    theme,
    applyTheme,
    onThemeChanged,
  } = useReactoryTheme({
    reactory: reactory as any,
    appTheme: props.appTheme,
  });

  // Custom hook: Authentication management
  const {
    auth_validated,
    isAuthenticating,
    isAuthTransitioning,  
    onLogin,
    onLogout,
  } = useReactoryAuth({
    reactory: reactory as any,
    componentRegistry: componentRegistery,
    setUser,
    setIsValidated,
    setIsAuthenticating: setAuthenticating,
    setIsReady,
    applyTheme,    
  });

  
  // Custom hook: Initialization
useReactoryInit({
    reactory: reactory as any,
    store,
    componentRegistry: componentRegistery,
    version: 0,
    setVersion: () => {},
    onLogin,
    onLogout,
    onApiStatusUpdate: (status) => {
      if (status && status.offline === true) {
        setOfflineStatus(true);
      } else {
        setOfflineStatus(false);
      }
    },
    onRouteChanged: () => {
      // Route change handling
    },
    onThemeChanged,
  });
  

  // Custom hook: API health checking
  const {
    offline: apiOffline,
    isCheckingApi,
    checkApiHealth,
  } = useApiHealthCheck({
    reactory: reactory as any,
    offline,
    setOffline: setOfflineStatus,
    autoCheck: true    
  });

  // Custom hook: Route configuration
  const {
    routes,
    routeVersion,
    configureRouting,
    onRouteChanged: handleRouteChange,
  } = useRouteConfiguration({
    reactory: reactory as any,
    initialRoutes: [],
  });


  // initialize the reactory sdk api client
  useEffect(() => {
    const initializeReactory = async () => {
      try {
        reactory.log('ReactoryHOC - Initializing Reactory SDK...');
        await reactory.init();
        reactory.log('ReactoryHOC - Reactory SDK initialized successfully');
      } catch (initError) {
        reactory.error('ReactoryHOC - Error during Reactory SDK initialization', initError);
        setError(initError as Error);
      }
    };

    initializeReactory();
  }, []);

  // Get components needed for rendering
  const components: any = reactory.getComponents(dependencies);
  const { NotificationComponent, Footer } = components;

  // Loading states
  if (!isReady) {
    return <AppLoading message="Loading..." />;
  }

  if (isAuthenticating || isAuthTransitioning) {
    return <AppLoading message="Authenticating..." />;
  }

  if (!auth_validated) {
    return <AppLoading message="Validating authentication..." />;
  }

  // Prepare header and footer
  const header = !isAuthenticating ? (
    <Header
      title={
        theme && (theme as any).content && auth_validated
          ? (theme as any).content.appTitle
          : 'Starting'
      }
    />
  ) : null;

  const footer = !isAuthenticating ? <Footer /> : null;

  // Render application
  return (
    <StyledRouter>
      <React.Fragment>
        <CssBaseline />
        <AppProviders theme={theme} store={store} reactory={reactory}>
          <Paper
            id="reactory_paper_root"
            elevation={0}
            square={true}
            classes={{ root: classes.root_paper }}
          >
            {!offline && (
              <React.Fragment>
                <NotificationComponent />
                <ReactoryRouter
                  header={header}
                  reactory={reactory as any}
                  user={user}
                  auth_validated={auth_validated}
                  authenticating={isAuthenticating}
                  footer={footer}
                />
              </React.Fragment>
            )}
            <OfflineMonitor
              onOfflineChanged={setOfflineStatus}
            />
          </Paper>
        </AppProviders>
      </React.Fragment>
    </StyledRouter>
  );
};


export default ReactoryHOC

