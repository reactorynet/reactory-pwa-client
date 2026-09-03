import React from 'react';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { MappedSlotConfig } from './types';

export interface RouteSlotProps {
  config?: MappedSlotConfig;
  fallback?: React.ReactNode;
}

const RouteSlot: React.FC<RouteSlotProps> = ({ config, fallback }) => {
  const reactory = useReactory();

  if (!config || config.show === false) {
    return fallback ? <>{fallback}</> : null;
  }

  const { componentFqn, props = {}, propsMap } = config;
  if (!componentFqn) {
    return fallback ? <>{fallback}</> : null;
  }

  const Component = reactory.getComponent<React.ComponentType<any>>(componentFqn);
  if (!Component) {
    return fallback ? <>{fallback}</> : null;
  }

  let mappedProps: Record<string, unknown> = { ...props };
  if (propsMap && reactory.utils?.objectMapper) {
    try {
      const mapped = reactory.utils.objectMapper(
        { reactory, props, route: config },
        propsMap,
      );
      if (mapped && typeof mapped === 'object') {
        mappedProps = { ...mappedProps, ...(mapped as Record<string, unknown>) };
      }
    } catch (error) {
      reactory.warning('Failed to map slot props', error);
    }
  }

  return <Component {...mappedProps} />;
};

export default RouteSlot;
