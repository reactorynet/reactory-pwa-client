import React from 'react';
import RouteFailure from './RouteFailure';

export interface RouteForbiddenProps {
  path?: string;
  roles?: string[];
}

const RouteForbidden: React.FC<RouteForbiddenProps> = ({ path, roles }) => (
  <RouteFailure
    kind="forbidden"
    message="You do not have sufficient permissions to access this route."
    path={path}
    extra={
      roles && roles.length > 0 ? (
        <div data-testid="required-roles">Required roles: {roles.join(', ')}</div>
      ) : null
    }
  />
);

export default RouteForbidden;
