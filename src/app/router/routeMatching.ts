import React from 'react';
import { matchPath } from 'react-router-dom';
import { isEqual, isArray } from 'lodash';

export interface NormalizedRouteConfig {
  path: string;
  exact: boolean;
  public: boolean;
  roles: string[];
  componentFqn: string;
  componentProps: Record<string, unknown> | null;
  args: Array<{ key: string; value: unknown }> | null;
  redirect: string | null;
  header: Record<string, unknown> | null;
  footer: Record<string, unknown> | null;
  components: Array<Record<string, unknown>> | null;
  title: string | null;
}

export const normalizeRouteConfig = (
  route?: Reactory.Routing.IReactoryRoute | null,
): NormalizedRouteConfig | null => {
  if (!route) return null;
  return {
    path: route.path || '',
    exact: route.exact !== false,
    public: route.public === true,
    roles: isArray(route.roles) ? [...route.roles].sort() : [],
    componentFqn: route.componentFqn || '',
    componentProps: (route.componentProps as Record<string, unknown>) || null,
    args: (route.args as Array<{ key: string; value: unknown }>) || null,
    redirect: route.redirect || null,
    header: (route.header as Record<string, unknown>) || null,
    footer: (route.footer as Record<string, unknown>) || null,
    components: (route.components as Array<Record<string, unknown>>) || null,
    title: route.title || null,
  };
};

export const areRouteConfigsEqual = (
  a?: Reactory.Routing.IReactoryRoute | null,
  b?: Reactory.Routing.IReactoryRoute | null,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return isEqual(normalizeRouteConfig(a), normalizeRouteConfig(b));
};

export const areRouteCatalogsEqual = (
  prevRoutes: Reactory.Routing.IReactoryRoute[] = [],
  nextRoutes: Reactory.Routing.IReactoryRoute[] = [],
): boolean => {
  if (prevRoutes === nextRoutes) return true;
  if (!isArray(prevRoutes) || !isArray(nextRoutes)) return false;
  if (prevRoutes.length !== nextRoutes.length) return false;

  for (let i = 0; i < prevRoutes.length; i++) {
    if (!areRouteConfigsEqual(prevRoutes[i], nextRoutes[i])) {
      return false;
    }
  }
  return true;
};

export const findMatchingRoute = (
  routes: Reactory.Routing.IReactoryRoute[] = [],
  pathname: string,
): Reactory.Routing.IReactoryRoute | null => {
  if (!isArray(routes) || routes.length === 0 || typeof pathname !== 'string') {
    return null;
  }

  // First check explicit routes (excluding catch-all '*')
  for (const route of routes) {
    if (!route || !route.path || route.path === '*') continue;
    const end = route.exact !== false;
    const match = matchPath({ path: route.path, end }, pathname);
    if (match) {
      return route;
    }
  }

  // Fallback to wildcard '*' route if defined in catalog
  const catchAll = routes.find((r) => r && r.path === '*');
  if (catchAll) return catchAll;

  return null;
};

export const areReactElementsEqual = (
  a: React.ReactNode,
  b: React.ReactNode,
): boolean => {
  if (a === b) return true;
  if (!React.isValidElement(a) || !React.isValidElement(b)) return false;
  if (a.type !== b.type || a.key !== b.key) return false;
  return isEqual(a.props, b.props);
};

export const areUserPropsEqual = (prevUser: any, nextUser: any): boolean => {
  if (prevUser === nextUser) return true;
  if (!prevUser || !nextUser) return false;
  const prevId = prevUser.id || prevUser.email;
  const nextId = nextUser.id || nextUser.email;
  if (prevId !== nextId) return false;
  const prevRoles = prevUser.roles || prevUser.loggedIn?.roles || [];
  const nextRoles = nextUser.roles || nextUser.loggedIn?.roles || [];
  if (!isEqual(prevRoles, nextRoles)) return false;
  if (prevUser.anon !== nextUser.anon) return false;
  return true;
};
