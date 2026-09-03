import React from 'react';
import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';
import { RouteFailureKind } from '../types';

export interface RouteFailureProps {
  kind: RouteFailureKind;
  title?: string;
  message: string;
  fqn?: string;
  path?: string;
  elapsedMs?: number;
  onRetry?: () => void;
  onStopWaiting?: () => void;
  extra?: React.ReactNode;
}

const titles: Record<RouteFailureKind, string> = {
  missing: 'Component not found',
  timeout: 'Component did not load in time',
  error: 'Route failed to render',
  'empty-catalog': 'No routes available',
  forbidden: 'Access denied',
  'not-found': 'Page not found',
};

const RouteFailure: React.FC<RouteFailureProps> = ({
  kind,
  title,
  message,
  fqn,
  path,
  elapsedMs,
  onRetry,
  onStopWaiting,
  extra,
}) => {
  const severity = kind === 'forbidden' ? 'warning' : kind === 'timeout' ? 'info' : 'error';

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }} data-testid="route-failure">
      <Alert severity={severity} variant="outlined">
        <AlertTitle>{title || titles[kind]}</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {message}
        </Typography>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {path && (
            <Typography variant="caption" component="div">
              Path: {path}
            </Typography>
          )}
          {fqn && (
            <Typography variant="caption" component="div">
              Component: {fqn}
            </Typography>
          )}
          {typeof elapsedMs === 'number' && elapsedMs > 0 && (
            <Typography variant="caption" component="div">
              Waited: {Math.round(elapsedMs / 100) / 10}s
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          {onRetry && (
            <Button size="small" variant="contained" onClick={onRetry}>
              Retry
            </Button>
          )}
          {onStopWaiting && kind === 'timeout' && (
            <Button size="small" variant="text" onClick={onStopWaiting}>
              Dismiss
            </Button>
          )}
        </Stack>
        {extra}
      </Alert>
    </Box>
  );
};

export default RouteFailure;
