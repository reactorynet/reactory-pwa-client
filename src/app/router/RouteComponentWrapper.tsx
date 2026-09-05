import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { isArray, isEqual } from 'lodash';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import queryString from '../../components/utility/query-string';
import { useRouteComponent } from './hooks/useRouteComponent';
import { processTemplateStrings } from './processTemplateStrings';
import RouteErrorBoundary from './RouteErrorBoundary';
import RouteResolving from './RouteResolving';
import RouteSlot from './RouteSlot';
import RouteFailure from './widgets/RouteFailure';
import RouteInspector from './widgets/RouteInspector';
import { ROUTE_COMPONENT_TIMEOUT_MS } from './constants';
import { RouteComponentWrapperProps } from './types';
import { areRouteConfigsEqual, areReactElementsEqual } from './routeMatching';

const RouteComponentWrapper = ({
  routeDef,
  componentArgs,
  defaultHeader,
  defaultFooter,
}: RouteComponentWrapperProps) => {
  const reactory = useReactory();
  const params = useParams();
  const location = useLocation();
  const query = queryString.parse(location.search);
  const isDevelopmentMode = reactory.isDevelopmentMode() === true;
  const timeoutMs = Number((routeDef as { timeoutMs?: number }).timeoutMs) || ROUTE_COMPONENT_TIMEOUT_MS;
  const resolution = useRouteComponent(reactory, routeDef.componentFqn, timeoutMs);

  const processedArgs = React.useMemo(() => {
    let args: Record<string, unknown> = { ...componentArgs };
    Object.keys(params).forEach((paramKey) => {
      args[paramKey] = params[paramKey];
    });

    if (routeDef.componentProps) {
      args = processTemplateStrings(
        { ...routeDef.componentProps },
        reactory,
        { route: params, location, query },
      ) as Record<string, unknown>;
    }
    return args;
  }, [componentArgs, params, routeDef.componentProps, reactory, location.pathname, location.search]);

  const headerNode = (
    <RouteSlot config={routeDef.header} fallback={defaultHeader} />
  );
  const footerNode = (
    <RouteSlot config={routeDef.footer} fallback={defaultFooter} />
  );

  const companionComponents = isArray(routeDef.components)
    ? routeDef.components.map((slot, index) => (
      <RouteSlot
        key={`${slot.componentFqn || 'slot'}-${index}`}
        config={{ show: true, ...slot }}
      />
    ))
    : null;

  const inspector = isDevelopmentMode ? (
    <RouteInspector
      routeDef={routeDef}
      status={resolution.status}
      elapsedMs={resolution.elapsedMs}
      nearbyFqns={resolution.nearbyFqns}
      lastPluginEvent={resolution.lastPluginEvent}
      error={resolution.error}
      params={params}
      query={query as Record<string, unknown>}
      pathname={location.pathname}
      search={location.search}
      onRetry={resolution.retry}
    />
  ) : null;

  let body: React.ReactNode = null;
  const canRender = resolution.status === 'ready'
    && resolution.component
    && (typeof resolution.component === 'function'
      || (typeof resolution.component === 'object'
        && resolution.component !== null
        && (resolution.component as { $$typeof?: unknown }).$$typeof));
  if (canRender) {
    const ReactoryComponent = resolution.component as React.ComponentType<any>;
    body = (
      <ReactoryComponent
        reactory={reactory}
        {...processedArgs}
      />
    );
  } else if (resolution.status === 'resolving') {
    body = (
      <RouteResolving
        fqn={routeDef.componentFqn}
        elapsedMs={resolution.elapsedMs}
        onStopWaiting={resolution.stopWaiting}
      />
    );
  } else {
    const kind = resolution.status === 'timeout' ? 'timeout' : 'missing';
    const message = kind === 'timeout'
      ? `Timed out waiting for ${routeDef.componentFqn}.`
      : `Component ${routeDef.componentFqn || '(unspecified)'} is not registered.`;
    body = (
      <RouteFailure
        kind={kind}
        message={message}
        fqn={routeDef.componentFqn}
        path={routeDef.path}
        elapsedMs={resolution.elapsedMs}
        onRetry={resolution.retry}
      />
    );
  }

  return (
    <React.Fragment>
      {headerNode}
      {companionComponents}
      <RouteErrorBoundary routeDef={routeDef} isDevelopmentMode={isDevelopmentMode}>
        {body}
      </RouteErrorBoundary>
      {footerNode}
      {inspector}
    </React.Fragment>
  );
};

export const areRouteComponentWrapperPropsEqual = (
  prev: RouteComponentWrapperProps,
  next: RouteComponentWrapperProps,
): boolean => {
  return (
    areRouteConfigsEqual(prev.routeDef, next.routeDef) &&
    isEqual(prev.componentArgs, next.componentArgs) &&
    areReactElementsEqual(prev.defaultHeader, next.defaultHeader) &&
    areReactElementsEqual(prev.defaultFooter, next.defaultFooter)
  );
};

export default React.memo(RouteComponentWrapper, areRouteComponentWrapperPropsEqual);
