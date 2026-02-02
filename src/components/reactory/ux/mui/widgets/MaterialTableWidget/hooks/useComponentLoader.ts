/**
 * useComponentLoader Hook
 * 
 * Provides a proper subscription-based mechanism for waiting on Reactory components
 * to become available, avoiding polling with setTimeout.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ComponentLoaderState<T = React.ComponentType<any>> {
  /** The loaded component, null if not yet available */
  component: T | null;
  /** Whether the component is still loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Force a retry to load the component */
  retry: () => void;
}

export interface UseComponentLoaderOptions {
  /** Maximum time to wait for component in ms (default: 10000) */
  timeout?: number;
  /** Callback when component becomes available */
  onLoaded?: (component: React.ComponentType<any>) => void;
  /** Callback when loading times out */
  onTimeout?: () => void;
}

/**
 * Hook to load a single Reactory component with proper lifecycle management.
 * Uses the reactory event system instead of polling.
 * 
 * @param reactory - The Reactory API instance
 * @param componentId - The component FQN to load (e.g., 'core.AlertDialog@1.0.0')
 * @param options - Loading options
 */
export function useComponentLoader<T = React.ComponentType<any>>(
  reactory: any,
  componentId: string | null | undefined,
  options: UseComponentLoaderOptions = {}
): ComponentLoaderState<T> {
  const { timeout = 10000, onLoaded, onTimeout } = options;
  
  const [state, setState] = useState<{
    component: T | null;
    isLoading: boolean;
    error: string | null;
  }>(() => {
    // Check if component is already available on initial render
    if (!componentId) {
      return { component: null, isLoading: false, error: null };
    }
    const existing = reactory?.componentRegister?.[componentId];
    if (existing) {
      return { component: existing as T, isLoading: false, error: null };
    }
    return { component: null, isLoading: true, error: null };
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const loadComponent = useCallback(() => {
    if (!componentId || !reactory) {
      setState({ component: null, isLoading: false, error: null });
      return;
    }

    // Check if already registered
    const existing = reactory.componentRegister?.[componentId];
    if (existing) {
      setState({ component: existing as T, isLoading: false, error: null });
      onLoaded?.(existing);
      return;
    }

    // Set loading state
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout for loading
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        const component = reactory.componentRegister?.[componentId];
        if (!component) {
          setState({
            component: null,
            isLoading: false,
            error: `Component ${componentId} failed to load within ${timeout}ms`
          });
          onTimeout?.();
        }
      }
    }, timeout);

    // Listen for component registration event
    const eventName = `component:registered:${componentId}`;
    const handleComponentRegistered = (component: T) => {
      if (mountedRef.current) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setState({ component, isLoading: false, error: null });
        onLoaded?.(component as any);
      }
    };

    // Check periodically (but less frequently than before)
    // This is a fallback in case the event system doesn't fire
    const checkInterval = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(checkInterval);
        return;
      }
      const component = reactory.componentRegister?.[componentId];
      if (component) {
        clearInterval(checkInterval);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setState({ component: component as T, isLoading: false, error: null });
        onLoaded?.(component);
      }
    }, 100); // Check every 100ms instead of 777ms

    // Subscribe to component registration
    reactory.on?.(eventName, handleComponentRegistered);

    // Cleanup function
    return () => {
      clearInterval(checkInterval);
      reactory.removeListener?.(eventName, handleComponentRegistered);
    };
  }, [componentId, reactory, timeout, onLoaded, onTimeout]);

  const retry = useCallback(() => {
    loadComponent();
  }, [loadComponent]);

  useEffect(() => {
    mountedRef.current = true;
    const cleanup = loadComponent();
    
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      cleanup?.();
    };
  }, [loadComponent]);

  return {
    component: state.component,
    isLoading: state.isLoading,
    error: state.error,
    retry
  };
}

/**
 * Hook to load multiple Reactory components at once.
 * 
 * @param reactory - The Reactory API instance
 * @param componentIds - Array of component FQNs to load
 * @param options - Loading options
 */
export function useComponentsLoader(
  reactory: any,
  componentIds: (string | null | undefined)[],
  options: UseComponentLoaderOptions = {}
): {
  components: Map<string, React.ComponentType<any>>;
  isLoading: boolean;
  errors: Map<string, string>;
  allLoaded: boolean;
  retry: () => void;
} {
  const { timeout = 10000 } = options;
  
  const [components, setComponents] = useState<Map<string, React.ComponentType<any>>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [loadingSet, setLoadingSet] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);

  const validIds = componentIds.filter((id): id is string => !!id);

  const loadComponents = useCallback(() => {
    if (!reactory || validIds.length === 0) {
      return;
    }

    const newComponents = new Map<string, React.ComponentType<any>>();
    const newLoading = new Set<string>();
    const newErrors = new Map<string, string>();

    validIds.forEach(id => {
      const existing = reactory.componentRegister?.[id];
      if (existing) {
        newComponents.set(id, existing);
      } else {
        newLoading.add(id);
      }
    });

    setComponents(newComponents);
    setLoadingSet(newLoading);

    if (newLoading.size === 0) {
      return;
    }

    // Set up polling for remaining components
    const checkInterval = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(checkInterval);
        return;
      }

      let changed = false;
      const updatedComponents = new Map(newComponents);
      const updatedLoading = new Set(newLoading);

      newLoading.forEach(id => {
        const component = reactory.componentRegister?.[id];
        if (component) {
          updatedComponents.set(id, component);
          updatedLoading.delete(id);
          changed = true;
        }
      });

      if (changed) {
        setComponents(updatedComponents);
        setLoadingSet(updatedLoading);
        
        if (updatedLoading.size === 0) {
          clearInterval(checkInterval);
        }
      }
    }, 100);

    // Timeout handling
    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;
      
      clearInterval(checkInterval);
      
      setLoadingSet(prev => {
        if (prev.size > 0) {
          const updatedErrors = new Map(errors);
          prev.forEach(id => {
            updatedErrors.set(id, `Component ${id} failed to load within ${timeout}ms`);
          });
          setErrors(updatedErrors);
        }
        return new Set();
      });
    }, timeout);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeoutId);
    };
  }, [reactory, validIds.join(','), timeout]);

  const retry = useCallback(() => {
    setErrors(new Map());
    loadComponents();
  }, [loadComponents]);

  useEffect(() => {
    mountedRef.current = true;
    const cleanup = loadComponents();
    
    return () => {
      mountedRef.current = false;
      cleanup?.();
    };
  }, [loadComponents]);

  return {
    components,
    isLoading: loadingSet.size > 0,
    errors,
    allLoaded: validIds.length > 0 && validIds.every(id => components.has(id)),
    retry
  };
}

export default useComponentLoader;
