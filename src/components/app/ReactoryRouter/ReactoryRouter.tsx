/**
 * ReactoryRouter Component
 * Manages route configuration and rendering based on authentication and authorization
 */
import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { fabClasses, Typography } from '@mui/material';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryRouterProps } from '../../../types/app';
import { RouteComponentWrapper } from '../RouteComponentWrapper';
import {
  shouldRedirectAnonymousUser,
  hasRolesForRoute as checkUserRoles,
  buildRouteArgs,
  getHeaderConfig,
  haveRoutesChanged,
} from './route.utils';

/**
 * ReactoryRouter component
 * Configures and renders routes based on user authentication and authorization
 */
export const ReactoryRouter: React.FC<ReactoryRouterProps> = (props) => {
  const navigation = useNavigate();
  const location = useLocation();
  const reactory = useReactory();
  
  const {
    utils,
    debug,
  } = reactory;

  const { auth_validated, authenticating = false } = props;
  const [routes, setRoutes] = useState<Reactory.Routing.IReactoryRoute[]>([]);
  const [v, setVersion] = useState<number>(0);

  /**
   * Configures routing by fetching and updating routes
   */
  const configureRouting = () => {
    debug('Configuring Routing', { auth_validated });

    // Add safety checks to prevent route configuration during transitions
    if (authenticating) {
      debug('Skipping route configuration - authenticating', {
        authenticating
      });
      return;
    }

    const $routes = [...reactory.getRoutes()];
    if (haveRoutesChanged($routes, routes, utils.hashCode)) {
      setRoutes($routes);
      setVersion(v + 1);
    }
  };

  /**
   * Handler for login events
   */
  const onLogin = () => {
    // Add a small delay to ensure the main app state has been updated
    setTimeout(() => {
      configureRouting();
      setVersion(v + 1);
    }, 100);
  };

  /**
   * Handler for logout events
   */
  const onLogout = () => {
    // Add a small delay to ensure the main app state has been updated
    setTimeout(() => {
      setVersion(v + 1);
    }, 100);
  };

  // Set up event listeners
  useEffect(() => {
    reactory.on('onLogout', onLogout);
    reactory.on('onLogin', onLogin);

    return () => {
      reactory.off('onLogout', onLogout);
      reactory.off('onLogin', onLogin);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set navigation and location on reactory instance
  useEffect(() => {
    reactory.navigation = navigation;
    reactory.location = location;
  }, [navigation, location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Configure routing on mount and when auth state changes
  useEffect(() => {
    configureRouting();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    configureRouting();
  }, [auth_validated, authenticating]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show validation message while authenticating
  if (auth_validated === false || authenticating === true) {
    return <span>Validating Authentication</span>;
  }

  // Build route elements
  const ChildRoutes: JSX.Element[] = [];
  
  routes.forEach((routeDef: Reactory.Routing.IReactoryRoute, index: number) => {
    reactory.log(`Configuring Route ${routeDef.path}`, { routeDef, props });

    // Handle redirects
    if (routeDef.redirect) {
      debug('Executing immediate redirect:', routeDef.redirect);
      window.location.href = routeDef.redirect;
      return;
    }

    // Build component arguments
    const componentArgs = buildRouteArgs(routeDef);

    // Get header configuration
    const { hasHeader, headerHeight, headerComponent } = getHeaderConfig(
      routeDef,
      reactory,
      props.header
    );

    const children: React.ReactNode[] = [];
    if (headerComponent) {
      children.push(headerComponent);
    }

    // Handle public routes
    if (routeDef.public === true) {
      ChildRoutes.push(
        <Route
          key={index}
          path={routeDef.path}
          element={
            <RouteComponentWrapper
              routeDef={routeDef}
              reactory={reactory}
              componentArgs={componentArgs}
              children={children}
              onComponentLoad={() => setVersion(v + 1)}
              hasHeader={hasHeader}
              headerHeight={headerHeight}
            />
          }
        />
      );
      return;
    }

    // Handle protected routes
    const isAnon = reactory.isAnon();

    // Redirect anonymous users to login
    if (shouldRedirectAnonymousUser(isAnon, routeDef)) {
      debug('Redirecting anonymous user to login for protected route:', routeDef.path);
      window.location.href = "/login";
      return;
    }

    debug('User is authenticated or route is public, proceeding with route configuration.', {
      routeDef
    });

    // Check user roles
    const hasRequiredRoles = checkUserRoles(reactory, routeDef);

    // Handle insufficient permissions
    if (!isAnon && !hasRequiredRoles) {
      const NotFoundComponent = reactory.getComponent("core.NotFound");
      if (NotFoundComponent) {
        children.push(
          React.createElement(NotFoundComponent as any, {
            key: "not-found-permissions",
            message: "You don't have sufficient permissions to access this route.",
            link: routeDef.path,
            wait: 500
          })
        );
      }
      ChildRoutes.push(
        <Route
          key={index}
          path={routeDef.path}
          element={<React.Fragment>{children}</React.Fragment>}
        />
      );
      return;
    }

    // Handle authenticated users with proper roles
    if (auth_validated === true && hasRequiredRoles) {
      ChildRoutes.push(
        <Route
          key={index}
          path={routeDef.path}
          element={
            <RouteComponentWrapper
              routeDef={routeDef}
              reactory={reactory}
              componentArgs={componentArgs}
              children={children}
              onComponentLoad={() => setVersion(v + 1)}
              hasHeader={hasHeader}
              headerHeight={headerHeight}
            />
          }
        />
      );
      return;
    }

    // Handle authentication in progress
    const hasRefreshed: boolean = localStorage.getItem('hasRefreshed') === 'true';

    if (auth_validated) {
      children.push(
        <Typography
          key="validating-token"
          style={{ display: 'flex', justifyContent: 'center', padding: '10% 2rem' }}
          variant='h5'
        >
          Please wait while we validate your access token...
        </Typography>
      );
    } else {
      // Handle login redirect after refresh
      if (hasRefreshed && isAnon && routeDef.path !== "/login") {
        debug('Redirecting to login after refresh');
        localStorage.removeItem('hasRefreshed');
        window.location.href = "/login";
        return;
      }
    }

    ChildRoutes.push(
      <Route
        key={index}
        path={routeDef.path}
        element={<React.Fragment>{children}</React.Fragment>}
      />
    );
  });

  // Add 404 route
  const NotFoundElement = reactory.getComponent<any>("core.NotFound");
  ChildRoutes.push(
    <Route
      key={ChildRoutes.length + 1}
      path="*"
      element={<NotFoundElement />}
    />
  );

  return (
    <Routes key={'reactory-router-routes-' + v}>
      {ChildRoutes}
    </Routes>
  );
};
