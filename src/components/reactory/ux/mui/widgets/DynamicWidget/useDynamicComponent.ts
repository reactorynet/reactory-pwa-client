/**
 * useDynamicComponent Hook
 * 
 * Provides component loading with proper lifecycle management for dynamically
 * mounting Reactory components by their FQN.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ComponentLoaderState } from './types';

export interface UseDynamicComponentOptions {
  /** Maximum time to wait for component in ms (default: 10000) */
  timeout?: number;
  /** Callback when component becomes available */
  onLoaded?: (component: React.ComponentType<any>) => void;
  /** Callback when loading times out or fails */
  onError?: (error: string) => void;
}

/**
 * Hook to load a single Reactory component with proper lifecycle management.
 * 
 * @param reactory - The Reactory API instance
 * @param componentFqn - The component FQN to load (e.g., 'core.AlertDialog@1.0.0')
 * @param options - Loading options
 */
export function useDynamicComponent<T = React.ComponentType<any>>(
  reactory: any,
  componentFqn: string | null | undefined,
  options: UseDynamicComponentOptions = {}
): ComponentLoaderState<T> {
  const { timeout = 10000, onLoaded, onError } = options;
  
  const [state, setState] = useState<{
    component: T | null;
    isLoading: boolean;
    error: string | null;
  }>(() => {
    // Check if component is already available on initial render
    if (!componentFqn) {
      return { component: null, isLoading: false, error: null };
    }
    
    try {
      const existing = reactory?.getComponent?.(componentFqn) || 
                       reactory?.componentRegister?.[componentFqn];
      if (existing) {
        return { component: existing as T, isLoading: false, error: null };
      }
    } catch {
      // Component not found, will try to load
    }
    
    return { component: null, isLoading: true, error: null };
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  const loadComponent = useCallback(() => {
    if (!componentFqn || !reactory) {
      setState({ component: null, isLoading: false, error: null });
      return;
    }

    // Check if already registered
    try {
      const existing = reactory.getComponent?.(componentFqn) || 
                       reactory.componentRegister?.[componentFqn];
      if (existing) {
        setState({ component: existing as T, isLoading: false, error: null });
        onLoaded?.(existing);
        return;
      }
    } catch {
      // Component not found, continue with loading
    }

    // Set loading state
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Clear any existing timers
    clearTimers();

    // Set timeout for loading
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        try {
          const component = reactory.getComponent?.(componentFqn) || 
                           reactory.componentRegister?.[componentFqn];
          if (!component) {
            const errorMsg = `Component ${componentFqn} failed to load within ${timeout}ms`;
            setState({
              component: null,
              isLoading: false,
              error: errorMsg
            });
            onError?.(errorMsg);
          }
        } catch (err) {
          const errorMsg = `Error loading component ${componentFqn}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          setState({
            component: null,
            isLoading: false,
            error: errorMsg
          });
          onError?.(errorMsg);
        }
      }
    }, timeout);

    // Check periodically for component availability
    checkIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) {
        clearTimers();
        return;
      }
      
      try {
        const component = reactory.getComponent?.(componentFqn) || 
                         reactory.componentRegister?.[componentFqn];
        if (component) {
          clearTimers();
          setState({ component: component as T, isLoading: false, error: null });
          onLoaded?.(component);
        }
      } catch {
        // Still loading, continue checking
      }
    }, 100);

  }, [componentFqn, reactory, timeout, onLoaded, onError, clearTimers]);

  const retry = useCallback(() => {
    loadComponent();
  }, [loadComponent]);

  useEffect(() => {
    mountedRef.current = true;
    loadComponent();
    
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [loadComponent, clearTimers]);

  return {
    component: state.component,
    isLoading: state.isLoading,
    error: state.error,
    retry
  };
}

export default useDynamicComponent;
