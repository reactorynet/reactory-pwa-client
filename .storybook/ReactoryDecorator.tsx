
import { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { defaultTheme } from '../src/themes/index.js';
import ReactoryApi from '../src/api/ReactoryApi';
import ReactoryProvider from '../src/api/ApiProvider';
import configureStore from '../src/models/redux';
import ReactoryApolloClient from '../src/api/ReactoryApolloClient';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';

interface ReactoryDecoratorProps {
  children: React.ReactNode;
}

export const ReactoryDecorator: React.FC<ReactoryDecoratorProps> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [reactory, setReactory] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [apolloClient, setApolloClient] = useState<any>(null);
  const [theme, setTheme] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // 1. Create and init ReactoryApi
      const reactoryInstance = new ReactoryApi({
        baseUrl: process.env.REACT_APP_REACTORY_API_URL || 'http://localhost:4000/graphql',
        clientId: process.env.REACT_APP_REACTORY_CLIENT_ID || 'default-client-id',
      });
      await reactoryInstance.init();
      // 2. Create Redux store
      const storeInstance = configureStore(null);
      // 3. Create Apollo client
      const apollo = await ReactoryApolloClient();
      // 4. Set theme
      const themeInstance = reactoryInstance.muiTheme || createTheme(defaultTheme);
      // 5. Register built-in components if needed (optional)
      // ...
      if (isMounted) {
        setReactory(reactoryInstance);
        setStore(storeInstance);
        setApolloClient(apollo.client);
        setTheme(themeInstance);
        setReady(true);
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  if (!ready || !reactory || !store || !apolloClient || !theme) {
    return <div style={{ padding: 32, textAlign: 'center' }}>Initializing Reactory SDK...</div>;
  }

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