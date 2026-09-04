export const isAnonymousSession = (reactory: Reactory.Client.ReactorySDK): boolean => {
  const user = reactory.getUser?.();
  //@ts-ignore
  const loggedInRoles: string[] = user?.loggedIn?.roles || [];
  // If the session has authenticated roles other than ANON, it is authenticated
  if (Array.isArray(loggedInRoles) && loggedInRoles.some((r: string) => r !== 'ANON')) {
    return false;
  }
  if (user?.anon === true) {
    return true;
  }
  if (typeof reactory.isAnon === 'function') {
    return reactory.isAnon() === true;
  }
  if (Array.isArray(loggedInRoles) && loggedInRoles.includes('ANON')) {
    return true;
  }
  return !(user as any)?.loggedIn;
};

export const currentUserRoles = (reactory: Reactory.Client.ReactorySDK): string[] => {
  const user = reactory.getUser?.();
  //@ts-ignore
  return user?.loggedIn?.roles || user?.roles || [];
};

export const routeKeyFor = (routeDef: Reactory.Routing.IReactoryRoute, index: number): string => {
  return routeDef.id || routeDef.key || `${routeDef.path}:${index}`;
};

const isAnonOnly = (roles?: string[]): boolean => {
  return Array.isArray(roles) && roles.length === 1 && roles[0] === 'ANON';
};

export const selectRoutesForSession = (
  routes: Reactory.Routing.IReactoryRoute[] = [],
  reactory: Reactory.Client.ReactorySDK,
): Reactory.Routing.IReactoryRoute[] => {
  const anon = isAnonymousSession(reactory);

  return routes.filter((route) => {
    if (isAnonOnly(route.roles)) {
      return anon === true;
    }
    if (anon) {
      return route.public === true;
    }
    return true;
  });
};
