import React from 'react';
import { Box, IconButton, Paper, Typography, LinearProgress, Alert } from '@mui/material';
import useAudioRecording from '../hooks/useAudioRecording';

export interface RecordingAudioBarProps {
  open: boolean;
  onClose: () => void;
  il8n: any;
  reactory: any;
  onAudioData?: (data: string | Uint8Array, format: 'base64' | 'bytes') => void;
  recordingOptions?: {
    sampleRate?: number;
    channels?: number;
    format?: 'base64' | 'bytes';
    streamingInterval?: number;
  };
}

const RecordingAudioBar: React.FC<RecordingAudioBarProps> = ({ 
  open, 
  onClose, 
  il8n, 
  reactory,
  onAudioData,
  recordingOptions = {}
}) => {
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    requestPermission,
    state,
    audioStream
  } = useAudioRecording(reactory, onAudioData, recordingOptions);

  // Format duration as MM:SS
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle recording button click
  const handleRecordingToggle = async () => {
    if (!state.isRecording) {
      if (!state.hasPermission) {
        const hasPermission = await requestPermission();
        if (!hasPermission) return;
      }
      await startRecording();
    } else {
      stopRecording();
    }
  };

  // Handle close with cleanup
  const handleClose = () => {
    if (state.isRecording) {
      stopRecording();
    }
    onClose();
  };

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
        px: 3,
        width: '100%'
      }}>
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
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
          {/* Pulse Circles - only show when recording */}
          {state.isRecording && (
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
          )}

          {/* Main Mic Button */}
          <IconButton
            sx={{
              width: 48,
              height: 48,
              bgcolor: state.isRecording ? 'rgba(255, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: `2px solid ${state.isRecording ? 'rgba(255, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.3)'}`,
              '&:hover': {
                bgcolor: state.isRecording ? 'rgba(255, 68, 68, 0.9)' : 'rgba(255, 255, 255, 0.3)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={handleRecordingToggle}
            disabled={!state.hasPermission && !state.isRecording}
          >
            <span className="material-icons" style={{ fontSize: 24 }}>
              {state.isRecording ? 'stop' : 'mic'}
            </span>
          </IconButton>
        </Box>

        {/* Recording Status and Audio Level */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              mb: 0.5
            }}
          >
            {state.isRecording 
              ? il8n?.t('reactor.client.recording.recording', { defaultValue: 'Recording...' })
              : il8n?.t('reactor.client.recording.ready', { defaultValue: 'Ready to record' })
            }
          </Typography>
          
          {/* Audio Level Visualization */}
          {state.isRecording && (
            <Box sx={{ width: '100%', mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={state.audioLevel * 100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: state.audioLevel > 0.7 ? '#ff4444' : '#4caf50',
                    borderRadius: 2,
                  }
                }}
              />
            </Box>
          )}
          
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem'
            }}
          >
            {state.isRecording
              ? il8n?.t('reactor.client.recording.tap.stop', { defaultValue: 'Tap to stop' })
              : il8n?.t('reactor.client.recording.tap.start', { defaultValue: 'Tap mic to start' })
            }
          </Typography>
        </Box>

        {/* Recording Duration */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 60
        }}>
          {state.isRecording && (
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
          )}
          <Typography
            variant="caption"
            sx={{
              color: 'white',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}
          >
            {formatDuration(state.duration)}
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {state.error && (
        <Alert
          severity="error"
          sx={{
            position: 'absolute',
            top: -60,
            left: 16,
            right: 16,
            zIndex: 1200,
          }}
          onClose={() => {
            // Error will be cleared when recording state changes
            // or when the component unmounts
          }}
        >
          {state.error}
        </Alert>
      )}
    </Paper>
  );
};

export default RecordingAudioBar;
