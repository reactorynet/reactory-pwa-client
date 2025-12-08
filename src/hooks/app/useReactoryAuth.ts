/**
 * useReactoryAuth Hook
 * Manages authentication state and login/logout event handlers
 */
import { useState, useEffect } from 'react';
import { registerComponents } from '../../utils/app/componentRegistration';

export interface UseReactoryAuthParams {
  reactory: Reactory.Client.ReactorySDK;
  componentRegistry: any[];
  setUser: (user: any) => void;
  setIsValidated: (validated: boolean) => void;
  setIsAuthenticating: (authenticating: boolean) => void;
  setIsReady: (ready: boolean) => void;
  applyTheme: () => void;
}

export interface UseReactoryAuthReturn {
  auth_validated: boolean;
  isAuthenticating: boolean;
  isAuthTransitioning: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

/**
 * Custom hook for managing Reactory authentication state
 */
export const useReactoryAuth = ({
  reactory,
  componentRegistry,
  setUser,
  setIsValidated,
  setIsAuthenticating,
  setIsReady,
  applyTheme,
}: UseReactoryAuthParams): UseReactoryAuthReturn => {
  const [auth_validated, setAuthValidated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticatingState] = useState<boolean>(true);
  const [isAuthTransitioning, setIsAuthTransitioning] = useState<boolean>(false);

  /**
   * Refreshes forms and re-registers components after login
   */
  const refreshFormsAndComponents = async () => {
    try {
      // Force refresh forms cache to get forms for the logged-in user
      await reactory.forms(true);

      // Re-register built-in components after forms are loaded
      registerComponents(reactory, componentRegistry);

      reactory.log('Forms and components refreshed after login');
    } catch (error) {
      reactory.error('Error refreshing forms and components after login:', error);
    }
  };

  /**
   * Cleans up forms and components after logout
   */
  const cleanupFormsAndComponents = async () => {
    try {
      // Clear form schemas cache
      reactory.formSchemas = [];
      reactory.formSchemaMap = {};
      reactory.formSchemaLastFetch = null;

      // Clear the component registry for forms that may no longer be accessible
      Object.keys(reactory.componentRegister).forEach((key) => {
        const component = reactory.componentRegister[key];
        if (component && component.componentType === 'form') {
          delete reactory.componentRegister[key];
        }
      });

      reactory.log('Forms and components cleaned up after logout');
    } catch (error) {
      reactory.error('Error cleaning up forms and components after logout:', error);
    }
  };

  /**
   * Handler for login events
   */
  const onLogin = () => {
    reactory.log('useReactoryAuth.onLogin handler', {});
    
    // Set flags to prevent re-rendering loops during auth transition
    setIsAuthTransitioning(true);
    setIsAuthenticating(true);
    setIsAuthenticatingState(true);

    // Get the current user data directly without triggering additional API calls
    const currentUser = reactory.getUser();
    if (currentUser && currentUser.loggedIn) {
      setUser(currentUser);
      setIsValidated(true);
      setAuthValidated(true);
      applyTheme();

      // Refresh forms and components after login, then set ready state
      refreshFormsAndComponents().then(() => {
        setIsAuthenticating(false);
        setIsAuthenticatingState(false);
        setIsReady(true);
        // Clear the transition flag after a short delay
        setTimeout(() => setIsAuthTransitioning(false), 100);
      });
    } else {
      // If user data is not immediately available, set a timeout to retry
      setTimeout(async () => {
        const retryUser = reactory.getUser();
        setUser(retryUser);
        setIsValidated(true);
        setAuthValidated(true);
        applyTheme();

        // Refresh forms and components after login, then set ready state
        await refreshFormsAndComponents();
        setIsAuthenticating(false);
        setIsAuthenticatingState(false);
        setIsReady(true);

        // Clear the transition flag
        setIsAuthTransitioning(false);
      }, 500);
    }
  };

  /**
   * Handler for logout events
   */
  const onLogout = () => {
    reactory.log('useReactoryAuth.onLogout handler', {});

    // Set flag to prevent re-rendering loops during auth transition
    setIsAuthTransitioning(true);

    // Clear user data and reset authentication state
    setUser(null);
    setIsValidated(false);
    setAuthValidated(false);
    setIsAuthenticating(false);
    setIsAuthenticatingState(false);
    setIsReady(false);

    // Cleanup forms and components
    void cleanupFormsAndComponents();

    // Clear the transition flag after a short delay
    setTimeout(() => setIsAuthTransitioning(false), 100);
  };



  useEffect(() => { 
    reactory.once('onReactoryApiInitialized', () => {
      // Check if user is already logged in on hook initialization
      const initialUser = reactory.getUser();
      if (initialUser && initialUser.loggedIn) {
        setUser(initialUser);
        setIsValidated(true);
        setAuthValidated(true);
        applyTheme();
      }
      setIsAuthenticating(false);
      setIsAuthenticatingState(false);
      setIsReady(true);
    });

  }, []);

  return {
    auth_validated,
    isAuthenticating,
    isAuthTransitioning,
    onLogin,
    onLogout,
  };
};
