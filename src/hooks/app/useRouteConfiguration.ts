/**
 * useRouteConfiguration Hook
 * Manages route configuration, versioning, and updates
 */
import { useState, useCallback, useEffect } from 'react';
import { saveRoutes, loadRoutes } from '../../utils/app/localStorage';

export interface UseRouteConfigurationParams {
  reactory: Reactory.Client.ReactorySDK;
  initialRoutes: Reactory.Routing.IReactoryRoute[];
}

export interface UseRouteConfigurationReturn {
  routes: Reactory.Routing.IReactoryRoute[];
  routeVersion: number;
  configureRouting: () => Promise<void>;
  onRouteChanged: (path: string) => void;
}

/**
 * Custom hook for route configuration management
 */
export const useRouteConfiguration = ({
  reactory,
  initialRoutes,
}: UseRouteConfigurationParams): UseRouteConfigurationReturn => {
  const [routes, setRoutes] = useState<Reactory.Routing.IReactoryRoute[]>(initialRoutes);
  const [routeVersion, setRouteVersion] = useState<number>(0);

  /**
   * Configure routing - load routes from API and cache
   */
  const configureRouting = useCallback(async () => {
    try {
      reactory.log('useRouteConfiguration - Configuring routes...');

      // Try to load cached routes first
      const cachedRoutes = loadRoutes();
      if (cachedRoutes && cachedRoutes.length > 0) {
        reactory.log('useRouteConfiguration - Loaded routes from cache', {
          count: cachedRoutes.length,
        });
        setRoutes(cachedRoutes);
      }

      // Fetch fresh routes from API
      const apiStatus = await reactory.status();
      
      if (apiStatus && apiStatus.routes) {
        reactory.log('useRouteConfiguration - Loaded routes from API', {
          count: apiStatus.routes.length,
        });
        
        setRoutes(apiStatus.routes);
        saveRoutes(apiStatus.routes);
        
        // Increment route version to trigger re-render
        setRouteVersion((prev) => prev + 1);
      } else {
        reactory.warn('useRouteConfiguration - No routes returned from API');
      }
    } catch (error) {
      reactory.error('useRouteConfiguration - Failed to configure routes', error);
      
      // Fall back to cached routes on error
      const cachedRoutes = loadRoutes();
      if (cachedRoutes && cachedRoutes.length > 0) {
        reactory.log('useRouteConfiguration - Using cached routes due to API error');
        setRoutes(cachedRoutes);
      }
    }
  }, [reactory]);

  /**
   * Handle route change events
   */
  const onRouteChanged = useCallback(
    (path: string) => {
      reactory.log('useRouteConfiguration - Route changed', { path });
      
      // Store the current route for restoration on app reload
      if (localStorage) {
        localStorage.setItem('$reactory.last.attempted.route$', path);
      }
      
      // Emit route change event
      reactory.emit('onRouteNavigate', { path });
      
      // Increment version to trigger re-render if needed
      setRouteVersion((prev) => prev + 1);
    },
    [reactory]
  );

  /**
   * Effect to configure routing on mount
   */
  useEffect(() => {
    void configureRouting();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Effect to register route change listener
   */
  useEffect(() => {
    const handleRouteChange = (event: any) => {
      if (event && event.path) {
        onRouteChanged(event.path);
      }
    };

    reactory.on('onRouteChanged', handleRouteChange);

    return () => {
      reactory.off('onRouteChanged', handleRouteChange);
    };
  }, [reactory, onRouteChanged]);

  return {
    routes,
    routeVersion,
    configureRouting,
    onRouteChanged,
  };
};
