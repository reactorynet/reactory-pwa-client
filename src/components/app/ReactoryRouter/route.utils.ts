import React from "react";
/**
 * Route utilities for ReactoryRouter
 * Provides helper functions for route validation and processing
 */

/**
 * Checks if an anonymous user should be redirected to login
 * 
 * @param isAnon - Whether the user is anonymous
 * @param routeDef - Route definition
 * @returns True if redirect is needed
 */
export const shouldRedirectAnonymousUser = (
  isAnon: boolean,
  routeDef: Reactory.Routing.IReactoryRoute
): boolean => {
  return isAnon && !routeDef.public && routeDef.path !== "/login";
};

/**
 * Checks if user has required roles for a route
 * 
 * @param reactory - Reactory SDK instance
 * @param routeDef - Route definition
 * @returns True if user has required roles
 */
export const hasRolesForRoute = (
  reactory: Reactory.Client.ReactorySDK,
  routeDef: Reactory.Routing.IReactoryRoute
): boolean => {
  if (!routeDef.roles || routeDef.roles.length === 0) {
    return true;
  }
  const userRoles = reactory.getUser()?.loggedIn?.roles || [];
  return reactory.hasRole(routeDef.roles, userRoles) === true;
};

/**
 * Builds component arguments from route definition
 * 
 * @param routeDef - Route definition
 * @returns Component arguments object
 */
export const buildRouteArgs = (
  routeDef: Reactory.Routing.IReactoryRoute
): Record<string, any> => {
  const componentArgs: Record<string, any> = {};
  
  if (Array.isArray(routeDef.args)) {
    routeDef.args.forEach((arg) => {
      componentArgs[arg.key] = arg.value[arg.key];
    });
  }
  
  return componentArgs;
};

/**
 * Extracts header configuration from route definition
 * 
 * @param routeDef - Route definition
 * @param reactory - Reactory SDK instance
 * @param defaultHeader - Default header component
 * @returns Header configuration object
 */
export const getHeaderConfig = (
  routeDef: Reactory.Routing.IReactoryRoute,
  reactory: Reactory.Client.ReactorySDK,
  defaultHeader?: React.ReactNode
): {
  hasHeader: boolean;
  headerHeight: number;
  headerComponent: React.ReactNode | null;
} => {
  let hasHeader = false;
  let headerHeight = 48; // Default header height
  let headerComponent: React.ReactNode | null = null;

  if (routeDef.header) {
    const {
      componentFqn,
      show = true,
      propsMap
    } = routeDef.header;

    const headerProps: { height?: number } = routeDef.header.props || {
      height: 48
    };

    if (show === true) {
      const Header = reactory.getComponent<any>(componentFqn);
      if (Header) {
        let $props = { ...headerProps };
        if (propsMap) {
          $props = { ...headerProps };
        }
        headerComponent = React.createElement(Header, $props);
        hasHeader = true;
        headerHeight = headerProps?.height || 48;
      } else if (defaultHeader) {
        // Fallback to default header if custom header component not found
        headerComponent = defaultHeader;
        hasHeader = true;
        headerHeight = 48;
      }
    }
  } else if (defaultHeader) {
    headerComponent = defaultHeader;
    hasHeader = true;
    headerHeight = 48;
  }

  return { hasHeader, headerHeight, headerComponent };
};

/**
 * Checks if routes have changed by comparing hash codes
 * 
 * @param newRoutes - New routes array
 * @param currentRoutes - Current routes array
 * @param hashCode - Hash code function
 * @returns True if routes have changed
 */
export const haveRoutesChanged = (
  newRoutes: Reactory.Routing.IReactoryRoute[],
  currentRoutes: Reactory.Routing.IReactoryRoute[],
  hashCode: (value: string) => number
): boolean => {
  const newHash = hashCode(JSON.stringify(newRoutes));
  const currentHash = hashCode(JSON.stringify(currentRoutes));
  return newHash !== currentHash;
};
