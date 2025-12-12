import React from "react";
import { useParams, useLocation } from "react-router-dom";
import queryString from '../../components/utility/query-string';
import { AppLoading } from '../widgets';
/**
 * Wrapper component that renders inside each route to access params
 * and process componentProps templates
 */
const RouteComponentWrapper = ({ routeDef, reactory, componentArgs, children, onComponentLoad, hasHeader = false, headerHeight = 48 }) => {
  const params = useParams();
  const location = useLocation();
  const query = queryString.parse(location.search);

  // Recursive function to process template strings in objects and arrays
  const processTemplateStrings = (obj) => {
    if (typeof obj === 'string' && obj.includes('${')) {
      try {
        if (obj.includes('::')) {
          const [_value, transform] = obj.split('::');
          let processed = reactory.utils.template(_value)({ route: params, location, query });
          if (transform) {
            switch (transform) {
              case 'toInt':
                processed = parseInt(processed);
                break;
              case 'toString':
                processed = String(processed);
                break;
              case 'toDate':
                processed = new Date(processed);
                break;
              case 'toBoolean':
                processed = Boolean(processed);
                break;
              default:
                // no change
            }
          }
          return processed;
        } else {
          // Replace ${route.paramName} with actual param values
          return reactory.utils.template(obj)({ route: params, location, query } );
        }
      } catch (error) {
        reactory.warning(`Error processing template ${obj}:`, error);
        return obj; // fallback to original value
      }
    } else if (Array.isArray(obj)) {
      return obj.map(item => processTemplateStrings(item));
    } else if (obj !== null && typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        result[key] = processTemplateStrings(obj[key]);
      }
      return result;
    } else {
      return obj;
    }
  };

  // Process componentProps templates with actual route params
  let processedArgs = { ...componentArgs };

  // Add route params directly to component args
  Object.keys(params).forEach(paramKey => {
    processedArgs[paramKey] = params[paramKey];
  });

  if (routeDef.componentProps) {
    processedArgs = { ...routeDef.componentProps };

    // Process template strings recursively in componentProps
    processedArgs = processTemplateStrings(processedArgs);
  }



  const ReactoryComponent = reactory.getComponent(routeDef.componentFqn);
  const NotFound = reactory.getComponent("core.NotFound");

  // Calculate margin-top based on header presence and height
  const wrapperStyle = hasHeader ? { marginTop: `${headerHeight}px` } : {};

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
      }

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