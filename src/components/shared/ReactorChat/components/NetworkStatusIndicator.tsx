import React, { useEffect, useState } from 'react';
import { NetworkStatus } from '../types';

interface NetworkStatusIndicatorProps {
  status: NetworkStatus;
  networkError: string | null;
  reconnectAttempt: number;
  maxAttempts: number;
  onRetry: () => void;
  onDismiss: () => void;
  Material: any;
  il8n: any;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  status,
  networkError,
  reconnectAttempt,
  maxAttempts,
  onRetry,
  onDismiss,
  Material,
  il8n,
}) => {
  const [showReconnected, setShowReconnected] = useState(false);
  const prevStatusRef = React.useRef(status);

  const {
    Box,
    Typography,
    IconButton,
    Icon,
    CircularProgress,
    Fade,
  } = Material.MaterialCore;

  // When status transitions to 'connected', briefly show "Reconnected" then auto-dismiss
  useEffect(() => {
    if (prevStatusRef.current !== 'connected' && status === 'connected') {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        onDismiss();
      }, 2000);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status, onDismiss]);

  const visible = status === 'reconnecting' || status === 'error' || showReconnected;
  if (!visible) return null;

  let bgColor = 'warning.main';
  let textColor = 'warning.contrastText';
  let iconEl: React.ReactNode = (
    <CircularProgress size={12} color="inherit" sx={{ mr: 0.75, flexShrink: 0 }} />
  );
  let label = il8n?.t('reactor.network.reconnecting', {
    defaultValue: `Reconnecting… (${reconnectAttempt}/${maxAttempts})`,
    attempt: reconnectAttempt,
    max: maxAttempts,
  });

  if (showReconnected) {
    bgColor = 'success.main';
    textColor = 'success.contrastText';
    iconEl = <Icon sx={{ fontSize: 14, mr: 0.75, flexShrink: 0 }}>check_circle</Icon>;
    label = il8n?.t('reactor.network.reconnected', { defaultValue: 'Reconnected' });
  } else if (status === 'error') {
    bgColor = 'error.main';
    textColor = 'error.contrastText';
    iconEl = <Icon sx={{ fontSize: 14, mr: 0.75, flexShrink: 0 }}>error_outline</Icon>;
    label = il8n?.t('reactor.network.connectionLost', { defaultValue: 'Connection lost' });
  }

  return (
    <Fade in={visible}>
      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          px: 1.25,
          py: 0.6,
          bgcolor: bgColor,
          color: textColor,
          borderRadius: 999,
          boxShadow: 4,
          userSelect: 'none',
          maxWidth: 300,
          gap: 0,
        }}
      >
        {iconEl}
        <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.4, flexShrink: 1, minWidth: 0 }}>
          {label}
        </Typography>

        {status === 'error' && !showReconnected && (
          <Box
            component="button"
            onClick={onRetry}
            sx={{
              ml: 1,
              p: 0,
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.7rem',
              textDecoration: 'underline',
              opacity: 0.9,
              flexShrink: 0,
              '&:hover': { opacity: 1 },
            }}
          >
            {il8n?.t('reactor.network.retry', { defaultValue: 'Retry' })}
          </Box>
        )}

        {!showReconnected && (
          <IconButton
            size="small"
            onClick={onDismiss}
            sx={{
              p: 0.25,
              ml: 0.5,
              color: 'inherit',
              opacity: 0.8,
              flexShrink: 0,
              '&:hover': { opacity: 1, background: 'transparent' },
            }}
          >
            <Icon sx={{ fontSize: 13 }}>close</Icon>
          </IconButton>
        )}
      </Box>
    </Fade>
  );
};

export default NetworkStatusIndicator;
