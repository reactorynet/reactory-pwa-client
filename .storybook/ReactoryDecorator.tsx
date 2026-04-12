
import React, { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { defaultTheme } from '../src/themes/index.js';
import ReactoryProvider from '../src/api/ApiProvider';
import configureStore from '../src/models/redux';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

/**
 * Creates a lightweight mock of the Reactory SDK for Storybook.
 * Bypasses all network calls (auth, GraphQL, translations) so
 * stories render immediately.
 */
function createMockReactoryApi() {
  const noop = () => {};
  const noopAsync = async () => {};
  const noopPromise = () => Promise.resolve(null);

  return {
    // Logging
    log: console.log,
    debug: console.debug,
    warning: console.warn,
    error: console.error,
    info: console.info,
    // Auth
    login: noopAsync,
    logout: noop,
    getUser: () => ({ id: 'storybook-user', firstName: 'Storybook', lastName: 'User', email: 'storybook@reactory.net', roles: ['USER'] }),
    setUser: noop,
    isAnon: () => false,
    getAuthToken: () => 'storybook-mock-token',
    setAuthToken: noop,
    validateToken: noopAsync,
    // Components
    componentRegister: {},
    registerComponent: noop,
    getComponent: () => null,
    getComponents: () => [],
    getGlobalComponents: () => [],
    mountComponent: () => null,
    loadComponent: noopPromise,
    loadComponentWithFQN: noopPromise,
    showModalWithComponent: noop,
    // Forms
    formSchemas: [],
    formSchemaMap: {},
    forms: () => [],
    form: () => null,
    renderForm: () => null,
    raiseFormCommand: noop,
    onFormCommandEvent: noop,
    trackFormInstance: noop,
    // GraphQL
    graphqlQuery: noopPromise,
    graphqlMutation: noopPromise,
    // Navigation
    goto: noop,
    history: null,
    getRoutes: () => [],
    getNotFoundComponent: () => null,
    // Theme / Assets
    CDN_ROOT: 'https://cdn.reactory.net',
    API_ROOT: 'http://localhost:4000',
    CLIENT_KEY: 'storybook',
    getTheme: () => ({}),
    getThemeResource: (path?: string) => path || '',
    getCDNResource: (path: string) => path || '',
    getAvatar: () => '',
    getOrganizationLogo: () => '',
    getUserFullName: (user: any) => user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    assets: { logo: '', avatar: '', icons: {} },
    // Utils
    utils: {
      lodash: require('lodash'),
      nil: (v: any) => v === null || v === undefined,
      nilStr: (v: any) => !v || v.trim() === '',
      uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      }),
      deepEquals: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
      templateObject: (t: any) => t,
      classNames: (...args: any[]) => args.filter(Boolean).join(' '),
    },
    // Misc
    $func: {},
    registerFunction: noop,
    rest: { json: { get: noopPromise, post: noopPromise }, text: { get: noopPromise } },
    status: () => ({}),
    getSizeSpec: () => ({ width: 1280, height: 720, breakpoint: 'lg', isMobile: false }),
    getThemeMode: () => 'light',
    isDevelopmentMode: () => true,
    setDevelopmentMode: noop,
    createNotification: noop,
    extendClientResolver: noop,
    setFormTranslationMaps: noop,
    setFormValidationMaps: noop,
    clearStoreAndCache: noop,
    startWorkFlow: noop,
    companyWithId: noopPromise,
    stat: noop,
    flushstats: noop,
    publishstats: noop,
    init: noopAsync,
    hydrate: noopAsync,
    getApiStatus: noopAsync,
    // EventEmitter stubs
    on: noop,
    off: noop,
    once: noop,
    emit: noop,
    removeListener: noop,
    removeAllListeners: noop,
    __REACTORYAPI: true,
  };
}

interface ReactoryDecoratorProps {
  children: React.ReactNode;
}

export const ReactoryDecorator: React.FC<ReactoryDecoratorProps> = ({ children }) => {
  const { store, apolloClient, theme, reactory } = useMemo(() => {
    const storeInstance = configureStore(null);

    const apolloClientInstance = new ApolloClient({
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: { fetchPolicy: 'cache-only' },
        query: { fetchPolicy: 'cache-only' },
      },
    });

    const themeInstance = createTheme(defaultTheme || {});
    const reactoryInstance = createMockReactoryApi();

    // Expose for debugging
    // @ts-ignore
    window.reactory = reactoryInstance;

    return {
      store: storeInstance,
      apolloClient: apolloClientInstance,
      theme: themeInstance,
      reactory: reactoryInstance,
    };
  }, []);

  return (
    <BrowserRouter>
      <CssBaseline />
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <ApolloProvider client={apolloClient}>
            <ReactoryProvider reactory={reactory}>
              {children}
            </ReactoryProvider>
          </ApolloProvider>
        </Provider>
      </ThemeProvider>
    </BrowserRouter>
  );
};