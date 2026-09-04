import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import RouteForbidden from './widgets/RouteForbidden';
import RouteInspector from './widgets/RouteInspector';
import RouteResolving from './RouteResolving';
import { LOGIN_PATH } from './constants';
import { currentUserRoles, isAnonymousSession } from './auth';
import { RouteGuardProps } from './types';

const RouteGuard: React.FC<RouteGuardProps> = ({
  routeDef,
  authenticating,
  authValidated,
  children,
}) => {
  const reactory = useReactory();
  const location = useLocation();
  const isDevelopmentMode = reactory.isDevelopmentMode() === true;
  const isPublic = routeDef.public === true;
  const isAnon = isAnonymousSession(reactory);
  const roles = currentUserRoles(reactory);
  const loginOnly = isArrayishAnonOnly(routeDef.roles);

  if (routeDef.redirect) {
    return <Navigate to={routeDef.redirect} replace />;
  }

  if (!isAnon && loginOnly && location.pathname === LOGIN_PATH) {
    const returnTo = new URLSearchParams(location.search).get('r') || '/';
    return <Navigate to={returnTo} replace />;
  }

  if (!isPublic && isAnon && routeDef.path !== LOGIN_PATH) {
    if (authenticating === true && authValidated === false) {
      return (
        <RouteResolving
          fqn={routeDef.componentFqn}
          elapsedMs={0}
        />
      );
    }
    const currentPath = `${location.pathname}${location.search}`;
    return <Navigate to={`${LOGIN_PATH}?r=${encodeURIComponent(currentPath)}`} replace />;
  }

  if (!isPublic && !isAnon) {
    const hasRoles = reactory.hasRole(routeDef.roles || [], roles) === true;
    if (hasRoles === false) {
      return (
        <>
          <RouteForbidden path={routeDef.path} roles={routeDef.roles} />
          {isDevelopmentMode && (
            <RouteInspector
              routeDef={routeDef}
              status="missing"
              elapsedMs={0}
              nearbyFqns={[]}
              lastPluginEvent={null}
              pathname={location.pathname}
              search={location.search}
            />
          )}
        </>
      );
    }
  }

  return <>{children}</>;
};

const isArrayishAnonOnly = (roles?: string[]): boolean => {
  return Array.isArray(roles) && roles.length === 1 && roles[0] === 'ANON';
};

export default RouteGuard;
