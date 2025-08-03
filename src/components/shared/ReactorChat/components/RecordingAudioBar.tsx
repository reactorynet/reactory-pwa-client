import React from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';

export interface RecordingAudioBarProps {
  open: boolean;
  onClose: () => void;
  il8n: any;
  reactory: any;
}

const RecordingAudioBar: React.FC<RecordingAudioBarProps> = ({ open, onClose, il8n, reactory }) => {
  // TODO: Add recording state, timer, and logic as needed
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-in-out',
        background: `linear-gradient(135deg, 
          ${reactory?.theme?.primary || '#1976d2'}20 0%, 
          ${reactory?.theme?.secondary || '#dc004e'}20 100%)`,
        backdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '16px 16px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        opacity: 0.95,
      }}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        px: 3
      }}>
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            color: 'white',
            opacity: 0.8,
            '&:hover': {
              opacity: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
          size="small"
          aria-label="Close recording"
        >
          <span className="material-icons">close</span>
        </IconButton>

        {/* Recording Mic Icon with Pulse Effect */}
        <Box sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Pulse Circles */}
          <Box sx={{
            position: 'absolute',
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': {
                transform: 'scale(0.8)',
                opacity: 0.7,
              },
              '50%': {
                transform: 'scale(1.1)',
                opacity: 0.3,
              },
              '100%': {
                transform: 'scale(1.3)',
                opacity: 0,
              },
            },
          }} />

          {/* Main Mic Button */}
          <IconButton
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.3)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={() => {
              // TODO: Start/stop recording logic
              reactory?.log('Recording button clicked');
            }}
          >
            <span className="material-icons" style={{ fontSize: 24 }}>mic</span>
          </IconButton>
        </Box>

        {/* Recording Status Text */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              mb: 0.5
            }}
          >
            {il8n?.t('reactor.client.recording.listening', { defaultValue: 'Listening...' })}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem'
            }}
          >
            {il8n?.t('reactor.client.recording.tip.compact', { defaultValue: 'Tap mic to stop' })}
          </Typography>
        </Box>

        {/* Optional: Recording Duration */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          ml: 'auto'
        }}>
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: '#ff4444',
            animation: 'blink 1s infinite',
            '@keyframes blink': {
              '0%, 50%': { opacity: 1 },
              '51%, 100%': { opacity: 0.3 },
            },
          }} />
          <Typography
            variant="caption"
            sx={{
              color: 'white',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}
          >
            00:00
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default RecordingAudioBar;
