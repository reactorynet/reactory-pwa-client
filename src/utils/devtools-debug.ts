import React from 'react';

/**
 * React DevTools Debugging Utility
 * 
 * This utility helps identify issues that cause React DevTools to disconnect
 * by monitoring component renders, memory usage, and potential infinite loops.
 */

interface DebugInfo {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  props: any;
  error?: Error;
}

class DevToolsDebugger {
  private static instance: DevToolsDebugger;
  private renderCounts: Map<string, number> = new Map();
  private lastRenderTimes: Map<string, number> = new Map();
  private errors: Map<string, Error[]> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  static getInstance(): DevToolsDebugger {
    if (!DevToolsDebugger.instance) {
      DevToolsDebugger.instance = new DevToolsDebugger();
    }
    return DevToolsDebugger.instance;
  }

  logRender(componentName: string, props: any) {
    if (!this.isEnabled) return;

    const now = Date.now();
    const renderCount = (this.renderCounts.get(componentName) || 0) + 1;
    const lastRenderTime = this.lastRenderTimes.get(componentName) || 0;
    
    this.renderCounts.set(componentName, renderCount);
    this.lastRenderTimes.set(componentName, now);

    // Check for potential infinite loops (renders happening too frequently)
    const timeSinceLastRender = now - lastRenderTime;
    if (timeSinceLastRender < 100 && renderCount > 10) {
      console.warn(`🚨 Potential infinite loop detected in ${componentName}:`, {
        renderCount,
        timeSinceLastRender,
        props
      });
    }

    // Log render info
    console.log(`🔄 ${componentName} render #${renderCount}:`, {
      timeSinceLastRender,
      props: this.sanitizeProps(props)
    });
  }

  logError(componentName: string, error: Error) {
    if (!this.isEnabled) return;

    const componentErrors = this.errors.get(componentName) || [];
    componentErrors.push(error);
    this.errors.set(componentName, componentErrors);

    console.error(`❌ Error in ${componentName}:`, error);
  }

  getDebugInfo(componentName: string): DebugInfo | null {
    const renderCount = this.renderCounts.get(componentName) || 0;
    const lastRenderTime = this.lastRenderTimes.get(componentName) || 0;
    const componentErrors = this.errors.get(componentName) || [];

    if (renderCount === 0) return null;

    return {
      componentName,
      renderCount,
      lastRenderTime,
      props: {},
      error: componentErrors[componentErrors.length - 1]
    };
  }

  private sanitizeProps(props: any): any {
    try {
      // Remove circular references and large objects
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(props, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }));
    } catch (error) {
      return '[Unable to serialize props]';
    }
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  reset() {
    this.renderCounts.clear();
    this.lastRenderTimes.clear();
    this.errors.clear();
  }
}

// HOC to wrap components with debugging
export function withDevToolsDebug<T extends React.ComponentType<any>>(
  Component: T,
  componentName?: string
): T {
  const debuggerInstance = DevToolsDebugger.getInstance();
  const name = componentName || Component.displayName || Component.name || 'Unknown';

  const DebuggedComponent = React.forwardRef<any, any>((props, ref) => {
    React.useEffect(() => {
      debuggerInstance.logRender(name, props);
    });

    try {
      return React.createElement(Component, { ...props, ref });
    } catch (error) {
      debuggerInstance.logError(name, error as Error);
      throw error;
    }
  });

  DebuggedComponent.displayName = `withDevToolsDebug(${name})`;
  return DebuggedComponent as unknown as T;
}

// Hook for functional components - FIXED to prevent re-render loops
export function useDevToolsDebug(componentName: string, props: any) {
  const debuggerInstance = DevToolsDebugger.getInstance();
  const propsRef = React.useRef(props);

  // Only log on mount and when props actually change
  React.useEffect(() => {
    const prevProps = propsRef.current;
    const propsChanged = JSON.stringify(prevProps) !== JSON.stringify(props);
    
    if (propsChanged) {
      debuggerInstance.logRender(componentName, props);
      propsRef.current = props;
    }
  }, [componentName, JSON.stringify(props)]); // Use JSON.stringify for deep comparison

  return {
    logError: React.useCallback((error: Error) => {
      debuggerInstance.logError(componentName, error);
    }, [componentName]),
    getDebugInfo: React.useCallback(() => {
      return debuggerInstance.getDebugInfo(componentName);
    }, [componentName])
  };
}

// Global debugging controls
export const DevToolsDebug = {
  enable: () => DevToolsDebugger.getInstance().enable(),
  disable: () => DevToolsDebugger.getInstance().disable(),
  reset: () => DevToolsDebugger.getInstance().reset(),
  getDebugInfo: (componentName: string) => DevToolsDebugger.getInstance().getDebugInfo(componentName)
};

// Auto-enable in development
if (process.env.NODE_ENV === 'development') {
  DevToolsDebug.enable();
  
  // Add to window for manual debugging
  if (typeof window !== 'undefined') {
    (window as any).DevToolsDebug = DevToolsDebug;
  }
}

export default DevToolsDebugger.getInstance(); 