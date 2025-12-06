/**
 * AppProviders Component
 * Wraps the application with all necessary providers
 */
import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { ReactoryProvider } from '../../../api/ApiProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AppProvidersProps } from './AppProviders.types';

/**
 * AppProviders Component
 * 
 * Provides all application-level context providers:
 * - ThemeProvider: Material-UI theming
 * - Redux Provider: State management
 * - ApolloProvider: GraphQL client
 * - ReactoryProvider: Reactory SDK context
 * - LocalizationProvider: Date/time localization
 * 
 * @param props - Component props
 * @returns Provider-wrapped children
 */
export const AppProviders: React.FC<AppProvidersProps> = ({
  theme,
  store,
  reactory,
  children,
}) => {
  return (
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <ApolloProvider client={reactory.client as any}>
          <React.StrictMode>
            <ReactoryProvider reactory={reactory}>
              <LocalizationProvider dateAdapter={AdapterMoment}>
                {children}
              </LocalizationProvider>
            </ReactoryProvider>
          </React.StrictMode>
        </ApolloProvider>
      </Provider>
    </ThemeProvider>
  );
};

export default AppProviders;
