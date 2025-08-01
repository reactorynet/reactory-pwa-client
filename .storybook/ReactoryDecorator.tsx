import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ReactoryProvider } from '@reactory/client-core/api/ApiProvider';
import ReactoryApi from '@reactory/client-core/api/ReactoryApi';
import configureStore from '@reactory/client-core/models/redux';

// Mock ReactoryApi for Storybook
const createMockReactoryApi = () => {
  const mockApi = {
    // Basic properties
    $version: '1.0.0-storybook',
    $windowSize: { innerWidth: 1920, innerHeight: 1080 },
    $user: {
      id: 'storybook-user',
      email: 'storybook@example.com',
      firstName: 'Storybook',
      lastName: 'User',
      loggedIn: true,
      roles: ['USER', 'ADMIN']
    },
    client: null, // Apollo client will be null in Storybook
    muiTheme: createTheme(),
    
    // Mock methods
    log: (message: string, data?: any) => console.log(`[Reactory] ${message}`, data),
    debug: (message: string, data?: any) => console.debug(`[Reactory Debug] ${message}`, data),
    warning: (message: string, data?: any) => console.warn(`[Reactory Warning] ${message}`, data),
    error: (message: string, data?: any) => console.error(`[Reactory Error] ${message}`, data),
    info: (message: string, data?: any) => console.info(`[Reactory Info] ${message}`, data),
    
    // Component registry
    componentRegister: {},
    getComponent: (fqn: string) => {
      console.log(`[Reactory] Getting component: ${fqn}`);
      return null; // Return null for storybook - components will be mocked
    },
    registerComponent: (nameSpace: string, name: string, version: string, component: any) => {
      console.log(`[Reactory] Registering component: ${nameSpace}.${name}@${version}`);
    },
    
    // User and auth methods
    getUser: () => mockApi.$user,
    isAnon: () => false,
    hasRole: (requiredRoles: string[], userRoles: string[]) => {
      if (!requiredRoles || requiredRoles.length === 0) return true;
      if (!userRoles) return false;
      return requiredRoles.some(role => userRoles.includes(role));
    },
    
    // Utility methods
    utils: {
      template: (template: string) => (data: any) => {
        return template.replace(/\${([^}]+)}/g, (match, key) => {
          return data[key] || match;
        });
      },
      lodash: {
        cloneDeep: (obj: any) => JSON.parse(JSON.stringify(obj))
      }
    },
    
    // Event system
    on: (event: string, handler: Function) => console.log(`[Reactory] Listening to event: ${event}`),
    off: (event: string, handler: Function) => console.log(`[Reactory] Stopping listener: ${event}`),
    emit: (event: string, data?: any) => console.log(`[Reactory] Emitting event: ${event}`, data),
    
    // Form methods
    formSchemas: [],
    formSchemaMap: {},
    formSchemaLastFetch: null,
    forms: async () => [],
    
    // Navigation
    navigation: null,
    location: null,
    
    // Theme
    getTheme: () => mockApi.muiTheme,
    
    // API methods
    status: async () => ({ status: 'API OK', user: mockApi.$user }),
    
    // Create notification
    createNotification: (title: string, options: any = {}) => {
      console.log(`[Reactory] Notification: ${title}`, options);
    },
    
    // Function registry
    $func: {},
    registerFunction: (fqn: string, func: Function) => {
      mockApi.$func[fqn] = func;
    },
    
    // Reactory SDK flag
    __REACTORYAPI: true
  };
  
  return mockApi as any;
};

// Create mock store
const createMockStore = () => {
  return configureStore(null);
};

// Create mock Apollo client
const createMockApolloClient = () => {
  return {
    query: async () => ({ data: null }),
    mutate: async () => ({ data: null }),
    watchQuery: () => ({
      subscribe: () => ({ unsubscribe: () => {} })
    })
  };
};

interface ReactoryDecoratorProps {
  children: React.ReactNode;
}

export const ReactoryDecorator: React.FC<ReactoryDecoratorProps> = ({ children }) => {
  const mockReactory = createMockReactoryApi();
  const mockStore = createMockStore();
  const mockApolloClient = createMockApolloClient();
  const theme = createTheme();

  return (
    <BrowserRouter>
      <CssBaseline />
      <ThemeProvider theme={theme}>
        <Provider store={mockStore}>
          <ApolloProvider client={mockApolloClient as any}>
            <ReactoryProvider reactory={mockReactory}>
              {children}
            </ReactoryProvider>
          </ApolloProvider>
        </Provider>
      </ThemeProvider>
    </BrowserRouter>
  );
}; 