/**
 * Reactory API event name constants.
 *
 * Extracted into a standalone module so that any file in the api/
 * directory tree can import these without creating circular
 * dependency chains (e.g. ReactoryPluginLoader ↔ ReactoryApi).
 */
export type InitProgressStep =
  | 'apollo-client'
  | 'auth-token'
  | 'hydrate'
  | 'i18n'
  | 'component-registration'
  | 'api-status'
  | 'forms'
  | 'plugins'
  | 'theme';

export type InitProgressStatus = 'pending' | 'active' | 'done' | 'error';

export interface InitProgressEvent {
  step: InitProgressStep;
  status: InitProgressStatus;
  label: string;
  error?: string;
  detail?: string;
}

export const INIT_STEPS: Array<{ id: InitProgressStep; label: string }> = [
  { id: 'apollo-client', label: 'Initializing GraphQL client' },
  { id: 'auth-token', label: 'Acquiring authentication token' },
  { id: 'hydrate', label: 'Restoring session data' },
  { id: 'i18n', label: 'Loading translations' },
  { id: 'component-registration', label: 'Registering components' },
  { id: 'api-status', label: 'Fetching application configuration' },
  { id: 'forms', label: 'Loading form definitions' },
  { id: 'plugins', label: 'Loading plugins' },
  { id: 'theme', label: 'Applying theme' },
];

export const ReactoryApiEventNames = {
  onLogout: 'loggedOut',
  onLogin: 'loggedIn',
  onPluginLoaded: 'onPluginLoaded',
  onPluginError: 'onPluginError',
  onApiStatusUpdate: 'onApiStatusUpdate',
  onRouteChanged: 'onRouteChanged',
  onShowNotification: 'onShowNotification',
  onThemeChanged: 'onThemeChanged',
  onHideMenu: 'onHideMenu',
  onShowMenu: 'onShowMenu',
  onComponentRegistered: 'onComponentRegistered',
  onInitProgress: 'onInitProgress',
};
