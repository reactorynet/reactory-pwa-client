/**
 * useReactoryInit Hook
 * Manages Reactory initialization and lifecycle events
 */
import { useEffect, useState } from 'react';
import queryString from '@reactory/client-core/components/utility/query-string';
import { registerComponents } from '../../utils/app/componentRegistration';
import Reactory from '@reactory/reactory-core';
import { ReactoryApiEventNames } from '@reactory/client-core/api';

export interface UseReactoryInitParams {
  reactory: Reactory.Client.ReactorySDK;
  store: any;
  componentRegistry: any[];
  version: number;
  setVersion: (version: number) => void;
  onLogin: () => void;
  onLogout: () => void;
  onApiStatusUpdate: (status: any) => void;
  onRouteChanged: (path: string) => void;
  onThemeChanged: () => void;
}

/**
 * Custom hook for Reactory initialization and cleanup
 */
export const useReactoryInit = ({
  reactory,
  store,
  componentRegistry,
  version,
  setVersion,
  onLogin,
  onLogout,
  onApiStatusUpdate,
  onRouteChanged,
  onThemeChanged,
}: UseReactoryInitParams): { isInitialized: boolean } => {

  const [isInitialized] = useState<boolean>(false);

  /**
   * Window resize handler
   */
  const onWindowResize = async () => {
    const _size_spec = reactory.getSizeSpec();
    reactory.$windowSize = _size_spec;
    reactory.log('useReactoryInit Resize', _size_spec);
    reactory.emit('onWindowResize', _size_spec);
    setVersion(version + 1);
  };

  /**
   * Theme mode change handler for system preference
   */
  const onThemeModeChange = (evt: MediaQueryListEvent) => {
    if (evt.matches === true) {
      localStorage.setItem('$reactory$theme_mode', 'dark');
      setVersion(version + 1);
    } else {
      localStorage.setItem('$reactory$theme_mode', 'light');
      setVersion(version + 1);
    }
  };

  /**
   * Initialization logic - runs on mount
   */
  const willMount = async () => {
    try {      
      // Register built-in components
      registerComponents(reactory, componentRegistry);

      reactory.$windowSize = reactory.getSizeSpec();
      reactory.reduxStore = store;

      // Set up event listeners
      window.addEventListener('resize', onWindowResize);
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onThemeModeChange);

      // Restore last attempted route
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

      // Register Reactory event listeners
      reactory.on('onLogout', onLogout);
      reactory.on('onLogin', onLogin);
      reactory.on('onApiStatusUpdate', onApiStatusUpdate);
      reactory.on('onRouteChanged', onRouteChanged);
      reactory.on('onThemeChanged', onThemeChanged);

      // Parse query string
      const query = queryString.parse(window.location.search);
      reactory.queryObject = query;
      reactory.queryString = window.location.search;
      reactory.objectToQueryString = queryString.stringify;      
      reactory.log('useReactoryInit - Initialization complete');
    } catch (error) {
      reactory.error('useReactoryInit - Initialization failed', error);
    }
  };

  /**
   * Cleanup logic - runs on unmount
   */
  const willUnmount = () => {
    window.removeEventListener('resize', onWindowResize);
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', onThemeModeChange);
    
    reactory.off('onLogout', onLogout);
    reactory.off('onLogin', onLogin);
    reactory.off('onApiStatusUpdate', onApiStatusUpdate);
    reactory.off('onRouteChanged', onRouteChanged);
    reactory.off('onThemeChanged', onThemeChanged);
  };

  // Run initialization on mount and cleanup on unmount
  useEffect(() => {
    reactory.once('onReactoryApiInitialized', () => {
      willMount();
    });    
    return willUnmount;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isInitialized,
  }
};
