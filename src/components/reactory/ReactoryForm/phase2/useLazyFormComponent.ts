/**
 * Phase 2.1: Lazy Form Component Hook
 * 
 * Lazy loading hook for heavy form components to improve initial load performance
 * and reduce bundle size by loading components on-demand.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface LazyComponentConfig {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  preload?: boolean;
  retryAttempts?: number;
  timeout?: number;
  fallback?: React.ComponentType<any>;
  errorBoundary?: React.ComponentType<any>;
}

export interface LazyComponentState {
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  error: Error | null;
  loadTime: number | null;
  retryCount: number;
  lastLoadAttempt: number | null;
}

export interface LazyComponentResult {
  // State
  state: LazyComponentState;
  Component: React.ComponentType<any> | null;
  
  // Actions
  load: () => Promise<void>;
  retry: () => Promise<void>;
  unload: () => void;
  preload: () => Promise<void>;
  
  // Utilities
  isVisible: boolean;
  shouldLoad: boolean;
  getLoadPriority: () => number;
  getLoadStats: () => { loadTime: number | null; retryCount: number; lastLoadAttempt: number | null };
}

// ============================================================================
// UTILITIES
// ============================================================================

const getPriorityWeight = (priority: 'high' | 'medium' | 'low'): number => {
  switch (priority) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 1;
  }
};

const isInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useLazyFormComponent = (
  loader: () => Promise<{ default: React.ComponentType<any> }>,
  config: LazyComponentConfig
): LazyComponentResult => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [state, setState] = useState<LazyComponentState>({
    isLoaded: false,
    isLoading: false,
    hasError: false,
    error: null,
    loadTime: null,
    retryCount: 0,
    lastLoadAttempt: null
  });

  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityObserverRef = useRef<IntersectionObserver | null>(null);

  const {
    id,
    name,
    priority,
    preload: shouldPreload = false,
    retryAttempts = 3,
    timeout = 10000,
    fallback: FallbackComponent,
    errorBoundary: ErrorBoundaryComponent
  } = config;

  // ============================================================================
  // LOADING LOGIC
  // ============================================================================
  
  const load = useCallback(async (): Promise<void> => {
    if (state.isLoaded || state.isLoading) {
      return;
    }

    const startTime = Date.now();
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false,
      error: null,
      lastLoadAttempt: startTime
    }));

    try {
      // Set timeout for loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        loadTimeoutRef.current = setTimeout(() => {
          reject(new Error(`Loading timeout for ${name}`));
        }, timeout);
      });

      // Load component
      const loadPromise = loader();
      
      const result = await Promise.race([loadPromise, timeoutPromise]);
      
      // Clear timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

      const loadTime = Date.now() - startTime;
      
      setComponent(() => result.default);
      setState(prev => ({
        ...prev,
        isLoaded: true,
        isLoading: false,
        loadTime,
        retryCount: 0
      }));

      console.log(`✅ Lazy component ${name} loaded in ${loadTime}ms`);
      
    } catch (error) {
      const loadTime = Date.now() - startTime;
      const retryCount = state.retryCount + 1;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        error: error as Error,
        loadTime,
        retryCount
      }));

      console.error(`❌ Failed to load lazy component ${name}:`, error);
      
      // Auto-retry if attempts remaining
      if (retryCount < retryAttempts) {
        console.log(`🔄 Retrying load for ${name} (attempt ${retryCount + 1}/${retryAttempts})`);
        setTimeout(() => load(), 1000 * retryCount); // Exponential backoff
      }
    }
  }, [state.isLoaded, state.isLoading, state.retryCount, loader, name, timeout, retryAttempts]);

  const retry = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, retryCount: 0, hasError: false, error: null }));
    await load();
  }, [load]);

  const unload = useCallback(() => {
    setComponent(null);
    setState(prev => ({
      ...prev,
      isLoaded: false,
      isLoading: false,
      hasError: false,
      error: null,
      loadTime: null,
      retryCount: 0,
      lastLoadAttempt: null
    }));
  }, []);

  const preload = useCallback(async (): Promise<void> => {
    if (shouldPreload && !state.isLoaded && !state.isLoading) {
      await load();
    }
  }, [shouldPreload, state.isLoaded, state.isLoading, load]);

  // ============================================================================
  // VISIBILITY DETECTION
  // ============================================================================
  
  const setupVisibilityObserver = useCallback(() => {
    if (!containerRef.current || visibilityObserverRef.current) {
      return;
    }

    visibilityObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Auto-load when visible
            if (!state.isLoaded && !state.isLoading) {
              load();
            }
          } else {
            setIsVisible(false);
          }
        });
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before component is visible
        threshold: 0.1
      }
    );

    visibilityObserverRef.current.observe(containerRef.current);
  }, [state.isLoaded, state.isLoading, load]);

  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  const shouldLoad = useMemo(() => {
    return isVisible || shouldPreload || priority === 'high';
  }, [isVisible, shouldPreload, priority]);

  const getLoadPriority = useCallback(() => {
    return getPriorityWeight(priority);
  }, [priority]);

  const getLoadStats = useCallback(() => {
    return {
      loadTime: state.loadTime,
      retryCount: state.retryCount,
      lastLoadAttempt: state.lastLoadAttempt
    };
  }, [state.loadTime, state.retryCount, state.lastLoadAttempt]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Setup visibility observer
  useEffect(() => {
    setupVisibilityObserver();
    
    return () => {
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
        visibilityObserverRef.current = null;
      }
    };
  }, [setupVisibilityObserver]);

  // Auto-preload high priority components
  useEffect(() => {
    if (priority === 'high' && !state.isLoaded && !state.isLoading) {
      load();
    }
  }, [priority, state.isLoaded, state.isLoading, load]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================
  
  return {
    // State
    state,
    Component,
    
    // Actions
    load,
    retry,
    unload,
    preload,
    
    // Utilities
    isVisible,
    shouldLoad,
    getLoadPriority,
    getLoadStats
  };
};

// ============================================================================
// LAZY COMPONENT WRAPPER
// ============================================================================

export const createLazyFormComponent = (
  loader: () => Promise<{ default: React.ComponentType<any> }>,
  config: LazyComponentConfig
): React.ComponentType<any> => {
  // This is a simplified wrapper - in real usage, you would use React.lazy
  return React.lazy(loader);
}; 