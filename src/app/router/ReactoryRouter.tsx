import React, { useEffect } from 'react';
import { Typography, Icon, Paper, Box } from '@mui/material';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryApiEventNames } from '@reactory/client-core/api'
import { isArray } from 'lodash';
import { ReactoryRouterProps } from '../types';
import {
 default as RouteComponentWrapper
} from './RouteComponentWrapper';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
  useLocation,
  useNavigation,
  useParams
} from 'react-router-dom';
const ReactoryRouter = (props: ReactoryRouterProps) => {

  const navigation = useNavigate();
  const location = useLocation();
  const reactory = useReactory();
  // Remove useParams from here - it won't work at router level
  const {
    utils,
    debug,
    error,
    warning,
  } = reactory;

  const {
    objectMapper,
  } = utils;
  const { auth_validated, user, authenticating = false } = props;
  const [routes, setRoutes] = React.useState<Reactory.Routing.IReactoryRoute[]>([]);
  const [routeHash, setRouteHash] = React.useState<number>(0);
  // useReducer-based trigger for edge cases (e.g., lazy component load)
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);

  reactory.navigation = navigation;
  reactory.location = location;

  const configureRouting = () => {
    debug('Configuring Routing', { auth_validated, user });

    if (authenticating) {
      debug('Skipping route configuration - authenticating', {
        authenticating
      });
      return;
    }

    const $routes = [...reactory.getRoutes()];
    const newHash = reactory.utils.hashCode(JSON.stringify($routes));
    const currentHash = reactory.utils.hashCode(JSON.stringify(routes));
    if (newHash !== currentHash) {
      setRoutes($routes);
      setRouteHash(newHash);
    }
  };

  // Ref to always have the latest configureRouting, avoiding stale closures
  const configureRoutingRef = React.useRef(configureRouting);
  configureRoutingRef.current = configureRouting;

  // Register all event listeners in a single effect with proper cleanup
  useEffect(() => {
    configureRoutingRef.current();

    const handleLogin = () => {
      // Small delay to ensure main app state has been updated
      setTimeout(() => configureRoutingRef.current(), 100);
    };
    const handleLogout = () => {
      setTimeout(() => configureRoutingRef.current(), 100);
    };
    const handlePluginLoaded = (pluginName: string) => {
      debug(`Plugin Loaded: ${pluginName}, reconfiguring routes.`);
      configureRoutingRef.current();
    };

    reactory.on(ReactoryApiEventNames.onLogin, handleLogin);
    reactory.on(ReactoryApiEventNames.onLogout, handleLogout);
    reactory.on(ReactoryApiEventNames.onPluginLoaded, handlePluginLoaded);

    return () => {
      reactory.off(ReactoryApiEventNames.onLogin, handleLogin);
      reactory.off(ReactoryApiEventNames.onLogout, handleLogout);
      reactory.off(ReactoryApiEventNames.onPluginLoaded, handlePluginLoaded);
    };
  }, []);

  useEffect(() => {
    configureRouting();
  }, [auth_validated, authenticating]);

  if (auth_validated === false || authenticating === true) {
    return (<span>Validating Authentication</span>)
  }

  const ChildRoutes = [];
  routes.forEach((routeDef: Reactory.Routing.IReactoryRoute, index: number) => {
    reactory.log(`Configuring Route ${routeDef.path}`, { routeDef, props: props });
    if (routeDef.redirect) {
      // Use direct browser navigation for immediate redirect
      debug('Executing immediate redirect:', routeDef.redirect);
      window.location.href = routeDef.redirect;
      return; // Skip creating a route element for redirects
    }

    let componentArgs = {};

    /**
     * If the route has args, we add them to the component args
     * this is the secondary method of setting the props, provides
     * additional meta data about the props to allow for potential 
     * future features.
     */
    if (isArray(routeDef.args)) {
      routeDef.args.forEach((arg) => {
        componentArgs[arg.key] = arg.value[arg.key];
      })
    }

    let children = [];
    let hasHeader = false;
    let headerHeight = 48; // Default header height

    // Determine header configuration
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
            $props = { ...headerProps, }
          }
          children.push(<Header {...$props} />);
          hasHeader = true;
          headerHeight = headerProps?.height || 48;
        } else {
          // Fallback to default header if custom header component not found
          if (props.header) {
            children.push(props.header);
            hasHeader = true;
            headerHeight = 48; // Default header height
          }
        }
      }
    } else if (props.header) {
      children.push(props.header);
      hasHeader = true;
      headerHeight = 48; // Default header height
    }

    if (routeDef.public === true) {
      // public access we don't have to check roles or auth
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
              onComponentLoad={forceRender}
              hasHeader={hasHeader}
              headerHeight={headerHeight}
            />
          }
        />
      );
    } else {
      // Check if user is anonymous and route is not public      
      if (reactory.isAnon() && !routeDef.public && routeDef.path !== "/login") {
        // If user is anonymous but route requires authentication, redirect to login
        // Preserve the current path as a redirect param so user returns after login
        const currentPath = window.location.pathname + window.location.search;
        const loginUrl = `/login?r=${encodeURIComponent(currentPath)}`;
        debug(`Redirecting anonymous user to login for protected route: ${routeDef.path}, with redirect: ${currentPath}`);
        window.location.href = loginUrl;
        return; // Skip creating route element for redirected routes
      } else {
        debug('User is authenticated or route is public, proceeding with route configuration.', { routeDef
        });
      }

      const hasRolesForRoute = reactory.hasRole(routeDef.roles, reactory.getUser().loggedIn.roles) === true;

      if (!reactory.isAnon() && hasRolesForRoute === false) {
        const NotFoundComponent = reactory.getComponent("core.NotFound");
        if (NotFoundComponent) {
          children.push(React.createElement(NotFoundComponent as any, {
            key: "not-found-permissions",
            message: "You don't have sufficient permissions to access this route.",
            link: routeDef.path,
            wait: 500
          }));
        }
        ChildRoutes.push(
          <Route
            key={index}
            path={routeDef.path}
            element={<React.Fragment>{children}</React.Fragment>}
          />
        );
      } else {
        if (auth_validated === true && hasRolesForRoute === true) {
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
                  onComponentLoad={forceRender}
                  hasHeader={hasHeader}
                  headerHeight={headerHeight}
                />
              }
            />
          );
        } else {
          debugger;
          const hasRefreshed: boolean = localStorage.getItem('hasRefreshed') === 'true';

          //auth token not validated yet in process of checking
          //@ts-ignore
          if (auth_validated === false || authenticating === true) {
            children.push(<Typography style={{ display: 'flex', justifyContent: 'center', padding: '10% 2rem' }} variant='h5'>Please wait while we validate your access token...</Typography>);
          } else {
            // Handle login redirect - if user is anonymous and has refreshed, redirect to login
            if (hasRefreshed && reactory.isAnon() && routeDef.path !== "/login") {
              debug('Redirecting to login after refresh');
              localStorage.removeItem('hasRefreshed');
              const currentPath = window.location.pathname + window.location.search;
              window.location.href = `/login?r=${encodeURIComponent(currentPath)}`;
              return; // Skip creating route element for redirected routes
            }
          }

          ChildRoutes.push(
            <Route
              key={index}
              path={routeDef.path}
              element={<React.Fragment>{children}</React.Fragment>}
            />
          );
        }
      }
    }

    if (props.footer && routeDef.footer) {
      const {
        componentFqn,
        show = true,
        props = {},
        propsMap
      } = routeDef.footer;

      if (show === true) {
        const Footer = reactory.getComponent<any>(componentFqn);
        if (Footer) {
          let $props = { ...props };
          if (propsMap) {
            $props = { ...props, }
          }
          // Footer should be added to children in RouteComponentWrapper if needed
        } else {
          // use the default footer
          // Footer should be added to children in RouteComponentWrapper if needed
        }
      }
    }
  });

  const NotFoundElement = reactory.getComponent<any>("core.NotFound");
  ChildRoutes.push(<Route key={ChildRoutes.length + 1} path="*" element={<NotFoundElement />} />)
  return (
    <Routes key={'reactory-router-routes-' + routeHash}>
      {ChildRoutes}
    </Routes>
  )
}

export default ReactoryRouter;