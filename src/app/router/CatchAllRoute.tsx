import React from 'react';
import { useLocation } from 'react-router-dom';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import RouteFailure from './widgets/RouteFailure';
import RouteInspector from './widgets/RouteInspector';

const fallbackRoute: Reactory.Routing.IReactoryRoute = {
  id: 'catch-all',
  key: 'catch-all',
  path: '*',
  public: true,
  roles: ['*'],
  componentFqn: 'core.NotFound@1.0.0',
};

const CatchAllRoute: React.FC = () => {
  const reactory = useReactory();
  const location = useLocation();
  const NotFound = reactory.getComponent<React.ComponentType<any>>('core.NotFound');
  const isDevelopmentMode = reactory.isDevelopmentMode() === true;

  return (
    <>
      {NotFound ? (
        <NotFound
          message={`No route matched ${location.pathname}`}
          link={location.pathname}
        />
      ) : (
        <RouteFailure
          kind="not-found"
          message={`No route matched ${location.pathname}`}
          path={location.pathname}
        />
      )}
      {isDevelopmentMode && (
        <RouteInspector
          routeDef={fallbackRoute}
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
};

export default CatchAllRoute;
