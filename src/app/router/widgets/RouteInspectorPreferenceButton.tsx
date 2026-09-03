import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import {
  isRouteInspectorEnabled,
  ROUTE_INSPECTOR_PREFERENCE_EVENT,
  toggleRouteInspectorEnabled,
} from '../inspectorPreference';

export interface RouteInspectorPreferenceButtonProps {
  size?: 'small' | 'medium' | 'large';
}

const RouteInspectorPreferenceButton: React.FC<RouteInspectorPreferenceButtonProps> = ({
  size = 'large',
}) => {
  const reactory = useReactory();
  const [enabled, setEnabled] = React.useState<boolean>(() => isRouteInspectorEnabled());
  const [developmentMode, setDevelopmentMode] = React.useState<boolean>(
    () => reactory?.isDevelopmentMode?.() === true,
  );

  React.useEffect(() => {
    const onPreference = (value: boolean | Event) => {
      const enabledValue = typeof value === 'boolean'
        ? value
        : (value as CustomEvent<boolean>).detail;
      setEnabled(enabledValue === true);
    };
    const onDevelopmentMode = (value: boolean) => setDevelopmentMode(value === true);

    reactory?.on?.(ROUTE_INSPECTOR_PREFERENCE_EVENT, onPreference);
    reactory?.on?.('onReactoryDevelopmentModeChanged', onDevelopmentMode);
    window.addEventListener(ROUTE_INSPECTOR_PREFERENCE_EVENT, onPreference as EventListener);

    return () => {
      reactory?.off?.(ROUTE_INSPECTOR_PREFERENCE_EVENT, onPreference);
      reactory?.off?.('onReactoryDevelopmentModeChanged', onDevelopmentMode);
      window.removeEventListener(ROUTE_INSPECTOR_PREFERENCE_EVENT, onPreference as EventListener);
    };
  }, [reactory]);

  if (developmentMode !== true) {
    return null;
  }

  const label = enabled ? 'Hide route inspector' : 'Show route inspector';

  return (
    <Tooltip title={label}>
      <IconButton
        color={enabled ? 'secondary' : 'inherit'}
        onClick={() => setEnabled(toggleRouteInspectorEnabled(reactory))}
        size={size}
        aria-label={label}
        data-testid="route-inspector-preference-toggle"
      >
        <AltRouteIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default RouteInspectorPreferenceButton;
