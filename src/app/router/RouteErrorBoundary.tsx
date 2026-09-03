import React from 'react';
import { ErrorBoundary } from '@reactory/client-core/api/ErrorBoundary';
import RouteFailure from './widgets/RouteFailure';
import RouteInspector from './widgets/RouteInspector';
import { RouteComponentStatus } from './types';

export interface RouteErrorBoundaryProps {
  routeDef: Reactory.Routing.IReactoryRoute;
  isDevelopmentMode: boolean;
  children: React.ReactNode;
}

const RouteErrorFallback: React.FC<{
  error: Error;
  resetErrorBoundary: () => void;
  routeDef: Reactory.Routing.IReactoryRoute;
  isDevelopmentMode: boolean;
}> = ({ error, resetErrorBoundary, routeDef, isDevelopmentMode }) => (
  <>
    <RouteFailure
      kind="error"
      message={error.message || `Error rendering ${routeDef.componentFqn}`}
      fqn={routeDef.componentFqn}
      path={routeDef.path}
      onRetry={resetErrorBoundary}
    />
    {isDevelopmentMode && (
      <RouteInspector
        routeDef={routeDef}
        status={'error' as RouteComponentStatus}
        elapsedMs={0}
        nearbyFqns={[]}
        lastPluginEvent={null}
        error={error}
        onRetry={resetErrorBoundary}
      />
    )}
  </>
);

const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  routeDef,
  isDevelopmentMode,
  children,
}) => (
  <ErrorBoundary
    resetKeys={[routeDef.path, routeDef.componentFqn]}
    fallbackRender={({ error, resetErrorBoundary }) => (
      <RouteErrorFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
        routeDef={routeDef}
        isDevelopmentMode={isDevelopmentMode}
      />
    )}
  >
    {children}
  </ErrorBoundary>
);

export default RouteErrorBoundary;
