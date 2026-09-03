import React, { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { isArray } from 'lodash';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryApiEventNames } from '@reactory/client-core/api';
import { ReactoryRouterProps } from '../types';
import RouteComponentWrapper from './RouteComponentWrapper';
import RouteGuard from './RouteGuard';
import CatchAllRoute from './CatchAllRoute';
import RouteFailure from './widgets/RouteFailure';
import RouteInspector from './widgets/RouteInspector';
import { ROUTE_AUTH_TIMEOUT_MS } from './constants';
import { routeKeyFor, selectRoutesForSession, isAnonymousSession } from './auth';

const emptyCatalogRoute: Reactory.Routing.IReactoryRoute = {
  id: 'empty-catalog',
  key: 'empty-catalog',
  path: '*',
  public: true,
  roles: ['*'],
  componentFqn: '',
};

const buildComponentArgs = (routeDef: Reactory.Routing.IReactoryRoute): Record<string, unknown> => {
  const componentArgs: Record<string, unknown> = {};
  if (isArray(routeDef.args)) {
    routeDef.args.forEach((arg) => {
      if (arg && arg.key && arg.value && typeof arg.value === 'object') {
        componentArgs[arg.key] = (arg.value as Record<string, unknown>)[arg.key];
      }
    });
  }
  return componentArgs;
};

const ReactoryRouter = (props: ReactoryRouterProps) => {
  const navigation = useNavigate();
  const location = useLocation();
  const reactory = useReactory();
  const { debug, isDevelopmentMode } = reactory;
  const { auth_validated, authenticating = false, header, footer, user } = props;
  const [routes, setRoutes] = React.useState<Reactory.Routing.IReactoryRoute[]>(
    () => [...(reactory.getRoutes() || [])],
  );
  const [routeHash, setRouteHash] = React.useState<number>(0);
  const [authWaitMs, setAuthWaitMs] = React.useState<number>(0);
  const authStartedAt = React.useRef<number>(Date.now());
  const userId = (user as { id?: string; email?: string } | null)?.id
    || (user as { email?: string } | null)?.email
    || '';
  const userRolesKey = isArray((user as any)?.roles)
    ? (user as any).roles.join(',')
    : isArray((user as any)?.loggedIn?.roles)
      ? (user as any).loggedIn.roles.join(',')
      : '';
  const isAnon = isAnonymousSession(reactory);

  reactory.navigation = navigation;
  reactory.location = location;

  const configureRouting = React.useCallback(() => {
    const $routes = selectRoutesForSession(reactory.getRoutes() || [], reactory);
    const serialized = JSON.stringify($routes);
    const newHash = typeof reactory.utils?.hashCode === 'function'
      ? reactory.utils.hashCode(serialized)
      : serialized.length;
    setRoutes((current) => {
      const currentSerialized = JSON.stringify(current);
      if (serialized !== currentSerialized) {
        setRouteHash(newHash);
        return $routes;
      }
      return current;
    });
  }, [reactory]);

  const configureRoutingRef = React.useRef(configureRouting);
  configureRoutingRef.current = configureRouting;

  useEffect(() => {
    configureRoutingRef.current();

    const handleLogin = () => {
      configureRoutingRef.current();
      setTimeout(() => configureRoutingRef.current(), 100);
    };
    const handleLogout = () => {
      configureRoutingRef.current();
      if (typeof navigation === 'function') {
        navigation('/');
      }
      setTimeout(() => configureRoutingRef.current(), 100);
    };
    const handlePluginLoaded = (pluginName: string) => {
      debug(`Plugin Loaded: ${pluginName}, reconfiguring routes.`);
      configureRoutingRef.current();
    };
    const handleApiStatusUpdate = () => {
      configureRoutingRef.current();
    };

    reactory.on(ReactoryApiEventNames.onLogin, handleLogin);
    reactory.on(ReactoryApiEventNames.onLogout, handleLogout);
    reactory.on(ReactoryApiEventNames.onPluginLoaded, handlePluginLoaded);
    reactory.on(ReactoryApiEventNames.onApiStatusUpdate, handleApiStatusUpdate);

    return () => {
      reactory.off(ReactoryApiEventNames.onLogin, handleLogin);
      reactory.off(ReactoryApiEventNames.onLogout, handleLogout);
      reactory.off(ReactoryApiEventNames.onPluginLoaded, handlePluginLoaded);
      reactory.off(ReactoryApiEventNames.onApiStatusUpdate, handleApiStatusUpdate);
    };
  }, [debug, reactory, navigation]);

  useEffect(() => {
    configureRouting();
  }, [auth_validated, authenticating, userId, userRolesKey, isAnon, configureRouting]);

  useEffect(() => {
    if (auth_validated === true || authenticating !== true) {
      setAuthWaitMs(0);
      return;
    }
    authStartedAt.current = Date.now();
    const interval = setInterval(() => {
      setAuthWaitMs(Date.now() - authStartedAt.current);
    }, 250);
    return () => clearInterval(interval);
  }, [auth_validated, authenticating]);

  if (routes.length === 0) {
    if (authenticating === true && authWaitMs < ROUTE_AUTH_TIMEOUT_MS) {
      return (
        <RouteFailure
          kind="empty-catalog"
          title="Loading routes"
          message="Waiting for the application route catalog from the API."
          elapsedMs={authWaitMs}
        />
      );
    }

    return (
      <>
        <RouteFailure
          kind="empty-catalog"
          message="The API did not return any routes. Check the client configuration and API status."
          path={location.pathname}
          elapsedMs={authWaitMs}
          onRetry={configureRouting}
        />
        {isDevelopmentMode() && (
          <RouteInspector
            routeDef={emptyCatalogRoute}
            status="missing"
            elapsedMs={authWaitMs}
            nearbyFqns={[]}
            lastPluginEvent={null}
            pathname={location.pathname}
            search={location.search}
            onRetry={configureRouting}
          />
        )}
      </>
    );
  }

  return (
    <Routes key={`reactory-router-routes-${routeHash}`}>
      {routes.map((routeDef, index) => {
        const routeKey = routeKeyFor(routeDef, index);
        const componentArgs = buildComponentArgs(routeDef);
        return (
          <Route
            key={routeKey}
            path={routeDef.path}
            element={
              <RouteGuard
                routeDef={routeDef}
                authenticating={authenticating}
                authValidated={auth_validated}
              >
                <RouteComponentWrapper
                  routeDef={routeDef}
                  componentArgs={componentArgs}
                  defaultHeader={header}
                  defaultFooter={footer}
                />
              </RouteGuard>
            }
          />
        );
      })}
      <Route path="*" element={<CatchAllRoute />} />
    </Routes>
  );
};

function arePropsEqual(prev: ReactoryRouterProps, next: ReactoryRouterProps): boolean {
  return (
    prev.auth_validated === next.auth_validated &&
    prev.authenticating === next.authenticating &&
    prev.user === next.user &&
    prev.header === next.header &&
    prev.footer === next.footer
  );
}

export default React.memo(ReactoryRouter, arePropsEqual);