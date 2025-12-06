/**
 * Type definitions for Reactory App components
 * @module types/app/AppTypes
 */

import React from 'react';
import { Theme } from '@mui/material';
import Reactory from '@reactory/reactory-core';

/**
 * Notification interface for app-level notifications
 */
export interface NewNotification {
  /** Unique identifier for the notification */
  id: string;
  /** Title of the notification */
  title: string;
  /** Type of notification (e.g., 'success', 'error', 'warning', 'info') */
  type: string;
}

/**
 * Application state interface
 * @deprecated This interface may be refactored as we extract state to custom hooks
 */
export interface AppState {
  /** Current user object */
  user: any;
  /** Whether the drawer/sidebar is open */
  drawerOpen: boolean;
  /** Whether authentication is valid */
  auth_valid: boolean;
  /** Whether authentication has been validated */
  auth_validated: boolean;
  /** Current theme object */
  theme: any;
  /** Available routes */
  routes: any[];
  /** Validation error if any */
  validationError: any;
  /** Whether the app is offline */
  offline: boolean;
  /** Current active route */
  currentRoute: any;
}

/**
 * Props for the ReactoryHOC component
 */
export interface ReactoryHOCProps {
  /** App theme configuration */
  appTheme?: Reactory.UX.IReactoryTheme;
  /** Additional props */
  [key: string]: any;
}

/**
 * Props for the ReactoryRouter component
 */
export interface ReactoryRouterProps {
  /** Reactory SDK instance */
  reactory: Reactory.Client.ReactorySDK;
  /** Whether authentication has been validated */
  auth_validated: boolean;
  /** Current user object */
  user: Reactory.Models.IUser;
  /** Whether authentication is in progress */
  authenticating: boolean;
  /** Header component to render */
  header: React.ReactElement;
  /** Footer component to render */
  footer: React.ReactElement;
}

/**
 * Props for the AppLoading component
 */
export interface AppLoadingProps {
  /** Optional loading message to display */
  message?: string;
}

/**
 * Props for the RouteComponentWrapper component
 */
export interface RouteComponentWrapperProps {
  /** Route definition object */
  routeDef: Reactory.Routing.IReactoryRoute;
  /** Reactory SDK instance */
  reactory: Reactory.Client.ReactorySDK;
  /** Component arguments/props */
  componentArgs: Record<string, any>;
  /** Child elements to render */
  children: React.ReactNode[];
  /** Callback when component loads */
  onComponentLoad: () => void;
  /** Whether route has a header */
  hasHeader?: boolean;
  /** Height of the header in pixels */
  headerHeight?: number;
}

/**
 * Props for the Offline/OfflineMonitor component
 */
export interface OfflineProps {
  /** Callback when offline status changes */
  onOfflineChanged: (isOffline: boolean) => void;
}

/**
 * Props for the StyledRouter component
 */
export interface StyledRouterProps {
  /** Child elements to render */
  children: React.ReactNode;
}

/**
 * Props for the AppProviders component
 */
export interface AppProvidersProps {
  /** Reactory SDK instance */
  reactory: Reactory.Client.ReactorySDK;
  /** Redux store instance */
  store: any;
  /** MUI theme */
  theme: Theme;
  /** Child elements to render */
  children: React.ReactNode;
}

/**
 * Configuration object for environment variables
 */
export interface EnvironmentConfig {
  /** Client key for authentication */
  REACT_APP_CLIENT_KEY: string;
  /** Client password for authentication */
  REACT_APP_CLIENT_PASSWORD: string;
  /** API endpoint URL */
  REACT_APP_API_ENDPOINT: string;
}

/**
 * Package information object
 */
export interface PackageInfo {
  /** Application version */
  version: string;
}

/**
 * Style classes for the app
 */
export interface AppStyleClasses {
  root_paper: string;
  selectedMenuLabel: string;
  prepend: string;
  selected: string;
  preffered: string;
  get_started: string;
  schema_selector: string;
}
