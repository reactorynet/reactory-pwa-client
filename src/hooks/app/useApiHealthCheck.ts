/**
 * useApiHealthCheck Hook
 * Manages API health monitoring and offline detection
 */
import { useState, useEffect, useCallback } from 'react';
import { isNil } from 'lodash';

export interface UseApiHealthCheckParams {
  reactory: Reactory.Client.ReactorySDK;
  offline: boolean;
  setOffline: (offline: boolean) => void;
  autoCheck?: boolean;
}

export interface UseApiHealthCheckReturn {
  offline: boolean;
  isCheckingApi: boolean;
  checkApiHealth: () => Promise<void>;
}

/**
 * Custom hook for API health check monitoring
 */
export const useApiHealthCheck = ({
  reactory,
  offline,
  setOffline,
  autoCheck = true,
}: UseApiHealthCheckParams): UseApiHealthCheckReturn => {
  const [isCheckingApi, setIsCheckingApi] = useState<boolean>(false);

  /**
   * Check API health status
   */
  const checkApiHealth = useCallback(async () => {
    if (isCheckingApi) {
      return; // Prevent concurrent checks
    }

    setIsCheckingApi(true);

    try {
      reactory.log('useApiHealthCheck - Checking API health...');

      const apiStatus = await reactory.status();

      if (isNil(apiStatus)) {
        reactory.error('useApiHealthCheck - API status returned null or undefined');
        setOffline(true);
        return;
      }

      if (apiStatus && apiStatus.online === true) {
        reactory.log('useApiHealthCheck - API is online', apiStatus);
        setOffline(false);

        // Load forms after successful API check
        try {
          await reactory.forms(true);
          reactory.log('useApiHealthCheck - Forms loaded successfully');
        } catch (formsError) {
          reactory.error('useApiHealthCheck - Failed to load forms', formsError);
        }
      } else {
        reactory.warn('useApiHealthCheck - API is offline or unreachable', apiStatus);
        setOffline(true);
      }
    } catch (error) {
      reactory.error('useApiHealthCheck - API health check failed', error);
      setOffline(true);
    } finally {
      setIsCheckingApi(false);
    }
  }, [reactory, isCheckingApi, setOffline]);

  /**
   * Handle API status update events
   */
  const onApiStatusUpdate = useCallback(
    (status: any) => {
      reactory.log('useApiHealthCheck - API status update received', status);

      if (status && status.online === true) {
        setOffline(false);
      } else {
        setOffline(true);
      }
    },
    [reactory, setOffline]
  );

  /**
   * Effect to perform initial API health check
   */
  useEffect(() => {
    if (autoCheck === true && !offline) {
      void checkApiHealth();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Effect to register API status update listener
   */
  useEffect(() => {
    reactory.on('onApiStatusUpdate', onApiStatusUpdate);

    return () => {
      reactory.off('onApiStatusUpdate', onApiStatusUpdate);
    };
  }, [reactory, onApiStatusUpdate]);

  return {
    offline,
    isCheckingApi,
    checkApiHealth,
  };
};
