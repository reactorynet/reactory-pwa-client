/**
 * Reactory API event name constants.
 *
 * Extracted into a standalone module so that any file in the api/
 * directory tree can import these without creating circular
 * dependency chains (e.g. ReactoryPluginLoader ↔ ReactoryApi).
 */
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
};
