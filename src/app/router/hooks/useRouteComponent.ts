import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ReactoryApiEventNames } from '@reactory/client-core/api';
import { nearbyRegistryFqns, ensureFqn, fqnMatches } from '../fqn';
import {
  ROUTE_COMPONENT_TIMEOUT_MS,
  ROUTE_POLL_INTERVAL_MS,
} from '../constants';
import { RouteComponentStatus, RouteResolutionMeta } from '../types';

export interface UseRouteComponentResult extends RouteResolutionMeta {
  component: React.ComponentType<any> | null;
  retry: () => void;
  stopWaiting: () => void;
}

const resolveComponent = (
  reactory: Reactory.Client.ReactorySDK,
  fqn?: string,
): React.ComponentType<any> | null => {
  if (!fqn) {
    return null;
  }
  try {
    return reactory.getComponent(fqn) as React.ComponentType<any> | null;
  } catch (error) {
    reactory.warning(`Failed to resolve component ${fqn}`, error);
    return null;
  }
};

export const useRouteComponent = (
  reactory: Reactory.Client.ReactorySDK,
  fqn?: string,
  timeoutMs: number = ROUTE_COMPONENT_TIMEOUT_MS,
): UseRouteComponentResult => {
  const startedAtRef = useRef<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [status, setStatus] = useState<RouteComponentStatus>(() => {
    return resolveComponent(reactory, fqn) ? 'ready' : 'resolving';
  });
  const [component, setComponent] = useState<React.ComponentType<any> | null>(
    () => resolveComponent(reactory, fqn),
  );
  const [lastPluginEvent, setLastPluginEvent] = useState<unknown>(null);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState<number>(0);

  const retry = useCallback(() => {
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setError(null);
    setLastPluginEvent(null);
    setAttempt((value) => value + 1);
  }, []);

  const stopWaiting = useCallback(() => {
    setStatus((current) => (current === 'ready' ? current : 'timeout'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setError(null);

    const found = resolveComponent(reactory, fqn);
    if (found) {
      setComponent(() => found);
      setStatus('ready');
      return () => {
        cancelled = true;
      };
    }

    if (!fqn) {
      setComponent(() => null);
      setStatus('missing');
      return () => {
        cancelled = true;
      };
    }

    setComponent(() => null);
    setStatus('resolving');

    const tick = () => {
      if (cancelled) {
        return;
      }
      const next = resolveComponent(reactory, fqn);
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (next) {
        setComponent(() => next);
        setStatus('ready');
        return true;
      }
      if (elapsed >= timeoutMs) {
        setStatus('timeout');
        return true;
      }
      return false;
    };

    const handleRegistered = (payload: { fqn?: string } | string) => {
      const registered = typeof payload === 'string' ? payload : payload?.fqn;
      if (fqnMatches(registered, fqn) || resolveComponent(reactory, fqn)) {
        tick();
      }
    };

    const handlePluginLoaded = (payload: unknown) => {
      setLastPluginEvent(payload);
      tick();
    };

    const handlePluginError = (payload: unknown) => {
      setLastPluginEvent(payload);
      setError(new Error('Plugin failed to load'));
      tick();
    };

    reactory.on(ReactoryApiEventNames.onComponentRegistered, handleRegistered);
    reactory.on(ReactoryApiEventNames.onPluginLoaded, handlePluginLoaded);
    reactory.on(ReactoryApiEventNames.onPluginError, handlePluginError);

    const interval = setInterval(() => {
      if (tick()) {
        clearInterval(interval);
      }
    }, ROUTE_POLL_INTERVAL_MS);

    tick();

    return () => {
      cancelled = true;
      clearInterval(interval);
      reactory.off(ReactoryApiEventNames.onComponentRegistered, handleRegistered);
      reactory.off(ReactoryApiEventNames.onPluginLoaded, handlePluginLoaded);
      reactory.off(ReactoryApiEventNames.onPluginError, handlePluginError);
    };
  }, [reactory, fqn, timeoutMs, attempt]);

  return {
    status,
    component,
    elapsedMs,
    nearbyFqns: nearbyRegistryFqns(
      reactory.componentRegister as Record<string, unknown>,
      ensureFqn(fqn),
    ),
    lastPluginEvent,
    error,
    retry,
    stopWaiting,
  };
};
