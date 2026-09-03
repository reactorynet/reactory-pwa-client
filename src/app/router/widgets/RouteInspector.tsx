import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Fab,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import CloseIcon from '@mui/icons-material/Close';
import { RouteComponentStatus } from '../types';
import {
  isRouteInspectorEnabled,
  ROUTE_INSPECTOR_PREFERENCE_EVENT,
  setRouteInspectorEnabled,
} from '../inspectorPreference';

export interface RouteInspectorProps {
  routeDef: Reactory.Routing.IReactoryRoute;
  status: RouteComponentStatus;
  elapsedMs: number;
  nearbyFqns: string[];
  lastPluginEvent: unknown;
  error?: Error | null;
  params?: Record<string, string | undefined>;
  query?: Record<string, unknown>;
  pathname?: string;
  search?: string;
  onRetry?: () => void;
}

const statusColor = (status: RouteComponentStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'ready':
      return 'success';
    case 'resolving':
      return 'info';
    case 'timeout':
      return 'warning';
    default:
      return 'error';
  }
};

const copyText = async (value: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    }
  } catch {
    // clipboard is optional in tests / older browsers
  }
};

const RouteInspector: React.FC<RouteInspectorProps> = ({
  routeDef,
  status,
  elapsedMs,
  nearbyFqns,
  lastPluginEvent,
  error,
  params,
  query,
  pathname,
  search,
  onRetry,
}) => {
  const [enabled, setEnabled] = React.useState<boolean>(() => isRouteInspectorEnabled());
  const [open, setOpen] = React.useState(status !== 'ready' && enabled);

  React.useEffect(() => {
    const onPreference = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setEnabled(detail === true);
    };
    window.addEventListener(ROUTE_INSPECTOR_PREFERENCE_EVENT, onPreference);
    return () => {
      window.removeEventListener(ROUTE_INSPECTOR_PREFERENCE_EVENT, onPreference);
    };
  }, []);

  React.useEffect(() => {
    if (enabled && status !== 'ready') {
      setOpen(true);
    }
    if (!enabled) {
      setOpen(false);
    }
  }, [status, enabled]);

  if (!enabled) {
    return null;
  }

  const snapshot = {
    pathname,
    search,
    params,
    query,
    status,
    elapsedMs,
    nearbyFqns,
    lastPluginEvent,
    error: error ? { message: error.message, stack: error.stack } : null,
    routeDef,
  };

  return (
    <>
      <Tooltip title="Route inspector">
        <Fab
          size="small"
          color="secondary"
          onClick={() => setOpen(true)}
          data-testid="route-inspector-toggle"
          aria-label="Open route inspector"
          sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1400 }}
        >
          <AltRouteIcon />
        </Fab>
      </Tooltip>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 2 } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <AltRouteIcon fontSize="small" />
            <Typography variant="h6">Route Inspector</Typography>
          </Stack>
          <IconButton onClick={() => setOpen(false)} aria-label="Close inspector">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ my: 1 }} alignItems="center">
          <Chip size="small" label={status} color={statusColor(status)} />
          <Typography variant="caption">{Math.round(elapsedMs / 100) / 10}s</Typography>
        </Stack>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          {pathname || routeDef.path}{search || ''}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
          FQN: {routeDef.componentFqn || '(none)'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block' }}>
          Public: {String(routeDef.public === true)} · Roles: {(routeDef.roles || []).join(', ') || '(none)'}
        </Typography>
        {nearbyFqns.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Nearby registry keys</Typography>
            {nearbyFqns.map((key) => (
              <Typography key={key} variant="caption" component="div" sx={{ wordBreak: 'break-all' }}>
                {key}
              </Typography>
            ))}
          </Box>
        )}
        {error && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Error</Typography>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {error.stack || error.message}
            </Typography>
          </Box>
        )}
        {lastPluginEvent != null && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Last plugin event</Typography>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(lastPluginEvent, null, 2)}
            </Typography>
          </Box>
        )}
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" onClick={() => copyText(routeDef.componentFqn || '')}>
            Copy FQN
          </Button>
          <Button size="small" onClick={() => copyText(JSON.stringify(snapshot, null, 2))}>
            Copy config
          </Button>
          {onRetry && (
            <Button size="small" variant="contained" onClick={onRetry}>
              Re-resolve
            </Button>
          )}
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              setRouteInspectorEnabled(false);
              setEnabled(false);
              setOpen(false);
            }}
          >
            Hide inspector
          </Button>
        </Stack>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Route definition</Typography>
          <Typography
            variant="caption"
            component="pre"
            data-testid="route-inspector-json"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
          >
            {JSON.stringify(routeDef, null, 2)}
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};

export default RouteInspector;
