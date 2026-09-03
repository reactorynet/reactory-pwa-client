import React from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { ROUTE_COMPONENT_HINT_MS } from './constants';

export interface RouteResolvingProps {
  fqn?: string;
  elapsedMs: number;
  onStopWaiting?: () => void;
}

const RouteResolving: React.FC<RouteResolvingProps> = ({
  fqn,
  elapsedMs,
  onStopWaiting,
}) => {
  const showStop = elapsedMs >= ROUTE_COMPONENT_HINT_MS;

  return (
    <Box sx={{ p: 4, maxWidth: 560, mx: 'auto' }} data-testid="route-resolving">
      <Typography variant="h6" gutterBottom>
        Loading route component
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, wordBreak: 'break-all' }}>
        Waiting for {fqn || 'component'}… {Math.round(elapsedMs / 100) / 10}s
      </Typography>
      <LinearProgress />
      {showStop && onStopWaiting && (
        <Stack direction="row" sx={{ mt: 2 }}>
          <Button size="small" onClick={onStopWaiting}>
            Stop waiting
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default RouteResolving;
