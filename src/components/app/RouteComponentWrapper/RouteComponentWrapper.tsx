/**
 * RouteComponentWrapper Component
 * Wrapper component that renders inside each route to access params and process componentProps templates
 * @module components/app/RouteComponentWrapper
 */

import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { RouteComponentWrapperProps } from '../../../types/app';
import { processComponentProps } from './RouteComponentWrapper.utils';
import { AppLoading } from '../AppLoading';

/**
 * RouteComponentWrapper - Wraps route components and processes route parameters
 * 
 * This component:
 * - Accesses route parameters via useParams
 * - Processes template strings in componentProps
 * - Applies transforms to parameter values (toInt, toString, toDate, toBoolean)
 * - Handles component loading states
 * - Provides error fallbacks
 * 
 * @param props - Component props
 * @returns React component
 * 
 * @example
 * ```tsx
 * <RouteComponentWrapper
 *   routeDef={routeDefinition}
 *   reactory={reactorySDK}
 *   componentArgs={args}
 *   onComponentLoad={() => {}}
 *   hasHeader={true}
 *   headerHeight={48}
 * >
 *   <Header />
 * </RouteComponentWrapper>
 * ```
 */
export const RouteComponentWrapper: React.FC<RouteComponentWrapperProps> = ({
  routeDef,
  reactory,
  componentArgs,
  children,
  onComponentLoad,
  hasHeader = false,
  headerHeight = 48
}) => {
  const params = useParams();
  const location = useLocation();

  // Process componentProps templates with actual route params
  let processedArgs = { ...componentArgs };

  // Add route params directly to component args
  Object.keys(params).forEach(paramKey => {
    processedArgs[paramKey] = params[paramKey];
  });

  // Process template strings in componentProps if they exist
  if (routeDef.componentProps) {
    const propsToProcess = { ...routeDef.componentProps };
    processedArgs = {
      ...processedArgs,
      ...processComponentProps(propsToProcess, params, location, reactory)
    };
  }

  const ReactoryComponent = reactory.getComponent<React.FC<any>>(routeDef.componentFqn);
  const NotFound = reactory.getComponent<React.FC<{
    message: string;
    waitingFor: string;
    args: Record<string, any>;
    wait: number;
    onFound: () => void;
    style?: React.CSSProperties;
  }>>("core.NotFound");

  // Add additional safety checks for component loading
  if (!ReactoryComponent) {
    return (
      <div key={`route-loading-${routeDef.id}`}>
        {children}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10% 2rem', marginTop: `${headerHeight}px` }}>
          <AppLoading message="Loading component..." />
        </div>
      </div>
    );
  }

  try {
    if (ReactoryComponent) {
      const componentProps = {
        reactory,
        ...processedArgs,
        style: {
          marginTop: `${headerHeight}px`,
          ...processedArgs?.style,
        }
      };
      reactory.debug(`Rendering component ${routeDef.componentFqn} for route ${routeDef.path}`, {
        routeDef,
        params,
        location,
        componentProps
      });
      return (
        <div key={`route-${routeDef.id}`}>
          {children}
          <ReactoryComponent {...componentProps} key={routeDef.id} />
        </div>
      );
    } else {
      // Component not found - show loading state with retry mechanism
      return (
        <div key={`route-not-found-${routeDef.id}`}>
          {children}
          <NotFound
            key={routeDef.id}
            message={`Component ${routeDef.componentFqn} not found for route ${routeDef.path}`}
            waitingFor={routeDef.componentFqn}
            args={processedArgs}
            wait={500}
            onFound={onComponentLoad}
            style={{ marginTop: `${headerHeight}px` }}
          />
        </div>
      );
    }
  } catch (routeError) {
    reactory.error(`Error rendering component ${routeDef.componentFqn} for route ${routeDef.path}`, {
      error: routeError,
      routeDef,
      params,
      location
    });
    return (
      <div key={`route-error-${routeDef.id}`}>
        {children}
        <NotFound
          key={routeDef.id}
          message={`Error rendering component ${routeDef.componentFqn} for route ${routeDef.path}`}
          waitingFor={routeDef.componentFqn}
          args={processedArgs}
          wait={500}
          onFound={onComponentLoad}
          style={{ marginTop: `${headerHeight}px` }}
        />
      </div>
    );
  }
};

export default RouteComponentWrapper;
