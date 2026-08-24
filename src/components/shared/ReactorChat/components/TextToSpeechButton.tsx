import React from 'react';
import {
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Icon,
} from '@mui/material';
import { keyframes } from '@mui/system';
import useSpeechServices, { UseSpeechServicesResult, cleanTextForSpeech } from '../hooks/useSpeechServices';

const waveAnimation = keyframes`
  0% { transform: scaleY(0.4); }
  50% { transform: scaleY(1.0); }
  100% { transform: scaleY(0.4); }
`;

export interface TextToSpeechButtonProps {
  /** Text content to be synthesized into speech */
  text: string;
  /** Reactory client SDK */
  reactory?: Reactory.Client.ReactorySDK;
  /** Target voice ID (e.g. 'af_heart', 'am_adam') */
  voice?: string;
  /** Playback speed (0.5 to 2.0, default 1.0) */
  speed?: number;
  /** Button visual variant */
  variant?: 'icon' | 'chip' | 'player';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Color theme */
  color?: 'inherit' | 'primary' | 'secondary' | 'default';
  /** Optional pre-existing speech services instance to share playback state */
  speechService?: UseSpeechServicesResult;
  /** Persona ID associated with this message */
  personaId?: string;
  /** Chat session ID */
  chatSessionId?: string;
  /** Callback fired when playback state changes */
  onPlayStateChange?: (state: 'idle' | 'loading' | 'playing' | 'paused' | 'error') => void;
  /** Whether the control is disabled */
  disabled?: boolean;
  /** Custom MUI sx styling */
  sx?: any;
}

export const TextToSpeechButton: React.FC<TextToSpeechButtonProps> = ({
  text,
  reactory,
  voice,
  speed: initialSpeed = 1.0,
  variant = 'icon',
  size = 'small',
  color = 'inherit',
  speechService: externalSpeechService,
  personaId,
  chatSessionId,
  onPlayStateChange,
  disabled = false,
  sx,
}) => {
  // If no external speech service provided, create local instance
  const internalSpeechService = useSpeechServices({
    reactory: reactory as any,
    personaId,
    chatSessionId,
    voice,
  });

  const speech = externalSpeechService || internalSpeechService;
  const [speed, setSpeed] = React.useState<number>(initialSpeed);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  const cleanedText = React.useMemo(() => cleanTextForSpeech(text), [text]);

  const isCurrentText = speech.state.currentText === cleanedText;
  const isPlaying = isCurrentText && speech.state.playing;
  const isPaused = isCurrentText && speech.state.paused;
  const isLoading = isCurrentText && speech.state.synthesizing;
  const hasError = isCurrentText && Boolean(speech.state.error);

  const currentState = React.useMemo(() => {
    if (isLoading) return 'loading';
    if (isPlaying) return 'playing';
    if (isPaused) return 'paused';
    if (hasError) return 'error';
    return 'idle';
  }, [isLoading, isPlaying, isPaused, hasError]);

  React.useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(currentState);
    }
  }, [currentState, onPlayStateChange]);

  const handleClick = React.useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !cleanedText) return;

    if (isPlaying) {
      speech.pausePlayback();
    } else if (isPaused) {
      await speech.resumePlayback();
    } else {
      await speech.speakText(cleanedText, voice, speed);
    }
  }, [disabled, cleanedText, isPlaying, isPaused, speech, voice, speed]);

  const handleStop = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    speech.stopPlayback();
  }, [speech]);

  const handleContextMenu = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }, []);

  const handleCloseMenu = React.useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleSpeedSelect = React.useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    setMenuAnchor(null);
    if (isPlaying) {
      // Re-synthesize with new speed
      speech.speakText(cleanedText, voice, newSpeed);
    }
  }, [isPlaying, speech, cleanedText, voice]);

  const tooltipTitle = React.useMemo(() => {
    if (disabled) return 'Text-to-speech disabled';
    if (isLoading) return 'Generating audio...';
    if (isPlaying) return 'Pause audio (right-click for speed)';
    if (isPaused) return 'Resume audio';
    if (hasError) return `Audio error: ${speech.state.error}`;
    return 'Read aloud (right-click for speed)';
  }, [disabled, isLoading, isPlaying, isPaused, hasError, speech.state.error]);

  const iconFontSize = size === 'small' ? '1rem' : size === 'large' ? '1.5rem' : '1.25rem';
  const buttonSize = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium';

  // Chip variant
  if (variant === 'chip') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ...sx }}>
        <Chip
          icon={
            isLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : isPlaying ? (
              <Icon sx={{ fontSize: '1rem !important' }}>pause</Icon>
            ) : isPaused ? (
              <Icon sx={{ fontSize: '1rem !important' }}>play_arrow</Icon>
            ) : (
              <Icon sx={{ fontSize: '1rem !important' }}>volume_up</Icon>
            )
          }
          label={
            isLoading
              ? 'Generating...'
              : isPlaying
              ? 'Pause'
              : isPaused
              ? 'Resume'
              : 'Listen'
          }
          size={size === 'small' ? 'small' : 'medium'}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          color={isPlaying ? 'primary' : 'default'}
          variant={isPlaying ? 'filled' : 'outlined'}
          disabled={disabled || !cleanedText}
          sx={{
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          }}
        />

        {(isPlaying || isPaused) && (
          <Tooltip title="Stop playback">
            <IconButton size="small" onClick={handleStop} sx={{ p: 0.25 }}>
              <Icon sx={{ fontSize: '1rem' }}>stop</Icon>
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  // Player variant with live equalizer animation and stop button
  if (variant === 'player') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1,
          py: 0.5,
          borderRadius: 2,
          bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          border: '1px solid',
          borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          ...sx,
        }}
      >
        <Tooltip title={tooltipTitle}>
          <span>
            <IconButton
              size="small"
              onClick={handleClick}
              disabled={disabled || !cleanedText}
              color={isPlaying ? 'primary' : 'default'}
              aria-label={tooltipTitle}
            >
              {isLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : isPlaying ? (
                <Icon sx={{ fontSize: iconFontSize }}>pause</Icon>
              ) : isPaused ? (
                <Icon sx={{ fontSize: iconFontSize }}>play_arrow</Icon>
              ) : (
                <Icon sx={{ fontSize: iconFontSize }}>volume_up</Icon>
              )}
            </IconButton>
          </span>
        </Tooltip>

        {/* Animated equalizer bars while playing */}
        {isPlaying && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', height: 16 }}>
            {[0.1, 0.3, 0.2, 0.4, 0.15].map((delay, idx) => (
              <Box
                key={idx}
                sx={{
                  width: 3,
                  height: 14,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  transformOrigin: 'bottom',
                  animation: `${waveAnimation} 0.8s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </Box>
        )}

        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}>
          {isLoading ? 'Synthesizing...' : isPlaying ? 'Playing' : isPaused ? 'Paused' : `${speed}x`}
        </Typography>

        {(isPlaying || isPaused) && (
          <Tooltip title="Stop playback">
            <IconButton size="small" onClick={handleStop} sx={{ p: 0.25 }}>
              <Icon sx={{ fontSize: '1rem' }}>stop</Icon>
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  // Default 'icon' variant
  return (
    <>
      <Tooltip title={tooltipTitle} placement="top">
        <span>
          <IconButton
            size={buttonSize}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            disabled={disabled || !cleanedText}
            color={isPlaying ? 'primary' : color}
            aria-label={tooltipTitle}
            sx={{
              fontSize: iconFontSize,
              transition: 'all 0.2s ease-in-out',
              ...(isPlaying && {
                color: 'primary.main',
                animation: 'pulse 1.5s infinite',
              }),
              ...sx,
            }}
          >
            {isLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : isPlaying ? (
              <Icon sx={{ fontSize: iconFontSize }}>graphic_eq</Icon>
            ) : isPaused ? (
              <Icon sx={{ fontSize: iconFontSize }}>play_arrow</Icon>
            ) : (
              <Icon sx={{ fontSize: iconFontSize }}>volume_up</Icon>
            )}
          </IconButton>
        </span>
      </Tooltip>

      {/* Speed selection context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Typography variant="caption" sx={{ px: 2, py: 0.5, fontWeight: 600, color: 'text.secondary', display: 'block' }}>
          Speech Speed
        </Typography>
        {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
          <MenuItem
            key={rate}
            selected={speed === rate}
            onClick={() => handleSpeedSelect(rate)}
            sx={{ fontSize: '0.85rem' }}
          >
            {rate}x {rate === 1.0 ? '(Normal)' : ''}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default TextToSpeechButton;
