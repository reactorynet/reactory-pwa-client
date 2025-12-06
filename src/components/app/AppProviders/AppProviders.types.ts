/**
 * AppProviders Type Definitions
 */
import { Theme } from '@mui/material';
import { Store } from 'redux';

/**
 * Props for the AppProviders wrapper component
 */
export interface AppProvidersProps {
  /**
   * MUI theme instance
   */
  theme: Theme;

  /**
   * Redux store instance
   */
  store: Store;

  /**
   * Reactory SDK instance
   */
  reactory: Reactory.Client.ReactorySDK;

  /**
   * Children to render within the providers
   */
  children: React.ReactNode;
}
