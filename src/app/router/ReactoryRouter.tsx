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
import {
  areRouteConfigsEqual,
  areRouteCatalogsEqual,
  findMatchingRoute,
  areReactElementsEqual,
  areUserPropsEqual,
} from './routeMatching';

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

const componentArgsCache = new WeakMap<Reactory.Routing.IReactoryRoute, Record<string, unknown>>();

const getComponentArgs = (routeDef: Reactory.Routing.IReactoryRoute): Record<string, unknown> => {
  if (typeof routeDef !== 'object' || routeDef === null) {
    return buildComponentArgs(routeDef);
  }
  let cached = componentArgsCache.get(routeDef);
  if (!cached) {
    cached = buildComponentArgs(routeDef);
    componentArgsCache.set(routeDef, cached);
  }
  return cached;
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

  const routesRef = React.useRef<Reactory.Routing.IReactoryRoute[]>(routes);
  routesRef.current = routes;

  const currentPathRef = React.useRef<string>(location.pathname);
  currentPathRef.current = location.pathname;

  const pendingRoutesRef = React.useRef<Reactory.Routing.IReactoryRoute[] | null>(null);

  // When location changes, flush any pending route updates that were deferred during apiStatus
  useEffect(() => {
    currentPathRef.current = location.pathname;
    if (pendingRoutesRef.current) {
      const nextRoutes = pendingRoutesRef.current;
      pendingRoutesRef.current = null;
      routesRef.current = nextRoutes;
      setRoutes(nextRoutes);
    }
  }, [location.pathname]);

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

  const syncRoutes = React.useCallback((options?: { force?: boolean; source?: string }) => {
    const force = options?.force === true;
    const source = options?.source || 'unknown';
    const nextSessionRoutes = selectRoutesForSession(reactory.getRoutes() || [], reactory);
    const currentSessionRoutes = routesRef.current;

    const catalogChanged = !areRouteCatalogsEqual(currentSessionRoutes, nextSessionRoutes);

    // 1. Only ever do an auto refresh if the user's route config has changed
    if (!catalogChanged && !force) {
      debug(`ReactoryRouter: [${source}] route catalog unchanged. Skipping refresh.`);
      return;
    }

    // 2. Only re-render a route if that route configuration has changed and it is the current active route
    const currentActive = findMatchingRoute(currentSessionRoutes, currentPathRef.current);
    const nextActive = findMatchingRoute(nextSessionRoutes, currentPathRef.current);

    const activeRouteConfigChanged = force || !areRouteConfigsEqual(currentActive, nextActive);

    // If this update was triggered by apiStatus and the active route configuration did not change,
    // isolate apiStatus by deferring the catalog update until the next navigation.
    if (source === 'apiStatus' && !activeRouteConfigChanged) {
      debug('ReactoryRouter: [apiStatus] active route config unchanged. Deferring catalog update to isolate apiStatus.');
      pendingRoutesRef.current = nextSessionRoutes;
      return;
    }

    debug(`ReactoryRouter: [${source}] active route configuration changed or forced. Applying route updates.`);
    pendingRoutesRef.current = null;
    routesRef.current = nextSessionRoutes;
    setRoutes(nextSessionRoutes);

    if (activeRouteConfigChanged) {
      setRouteHash((prev) => prev + 1);
    }
  }, [debug, reactory]);

  const syncRoutesRef = React.useRef(syncRoutes);
  syncRoutesRef.current = syncRoutes;

  useEffect(() => {
    syncRoutesRef.current({ force: false, source: 'mount' });

    const handleLogin = () => {
      syncRoutesRef.current({ force: true, source: 'login' });
      setTimeout(() => syncRoutesRef.current({ force: false, source: 'login-delayed' }), 100);
    };

    const handleLogout = () => {
      syncRoutesRef.current({ force: true, source: 'logout' });
      if (typeof navigation === 'function') {
        navigation('/');
      }
      setTimeout(() => syncRoutesRef.current({ force: false, source: 'logout-delayed' }), 100);
    };

    const handlePluginLoaded = (pluginName: string) => {
      debug(`Plugin Loaded: ${pluginName}, checking routes.`);
      syncRoutesRef.current({ force: false, source: `pluginLoaded:${pluginName}` });
    };

    const handleApiStatusUpdate = () => {
      // Isolate apiStatus impact: only refresh if the user's route config changed,
      // and only re-render if the active route's configuration changed.
      syncRoutesRef.current({ force: false, source: 'apiStatus' });
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
    syncRoutes({ force: false, source: 'auth-props' });
  }, [auth_validated, authenticating, userId, userRolesKey, isAnon, syncRoutes]);

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
          onRetry={() => syncRoutes({ force: true, source: 'retry' })}
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
            onRetry={() => syncRoutes({ force: true, source: 'retry' })}
          />
        )}
      </>
    );
  }

  return (
    <Routes key={`reactory-router-routes-${routeHash}`}>
      {routes.map((routeDef, index) => {
        const routeKey = routeKeyFor(routeDef, index);
        const componentArgs = getComponentArgs(routeDef);
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
    areUserPropsEqual(prev.user, next.user) &&
    areReactElementsEqual(prev.header, next.header) &&
    areReactElementsEqual(prev.footer, next.footer)
  );
}

export default React.memo(ReactoryRouter, arePropsEqual);
