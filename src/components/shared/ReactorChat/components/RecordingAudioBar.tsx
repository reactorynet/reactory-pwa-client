import React from 'react';
import { Box, IconButton, Paper, Typography, LinearProgress, Alert, Button } from '@mui/material';
import useAudioRecording, { AudioRecordingOptions } from '../hooks/useAudioRecording';
import useGraph from '../hooks/graphql/useGraph';

export interface RecordingAudioBarProps {
  open: boolean;
  onClose: () => void;
  il8n: any;
  reactory: any;
  onAudioData?: (data: string | Uint8Array, format: 'base64' | 'bytes') => void;
  /** Callback for voice mode: receives the recorded Blob when recording stops */
  onRecordingComplete?: (audioBlob: Blob) => void;
  /** Whether voice mode is active (changes UI to reflect voice mode) */
  voiceModeActive?: boolean;
  /** Whether a voice message is being processed */
  voiceProcessing?: boolean;
  /** Whether TTS audio is playing */
  voicePlaying?: boolean;
  /** Callback to stop TTS playback */
  onStopPlayback?: () => void;
  /** Live transcription callback — streams recognized text to populate the input */
  onTranscript?: (text: string) => void;
  /** Auto-send callback invoked when silence timer expires */
  onAutoSend?: (text: string) => void;
  /** Countdown change callback to notify parent of remaining seconds (5..0 or null) */
  onCountdownChange?: (seconds: number | null) => void;
  /** Callback when user explicitly stops/cancels the countdown to keep editing */
  onStopCountdown?: () => void;
  recordingOptions?: AudioRecordingOptions;
}

const DEFAULT_RECORDING_OPTIONS: AudioRecordingOptions = {};

const RecordingAudioBar: React.FC<RecordingAudioBarProps> = ({ 
  open, 
  onClose, 
  il8n, 
  reactory,
  onAudioData,
  onRecordingComplete,
  voiceModeActive = false,
  voiceProcessing = false,
  voicePlaying = false,
  onStopPlayback,
  onTranscript,
  onAutoSend,
  onCountdownChange,
  onStopCountdown,
  recordingOptions = DEFAULT_RECORDING_OPTIONS
}) => {
  const [countdownRemaining, setCountdownRemaining] = React.useState<number | null>(null);

  const recognitionRef = React.useRef<any>(null);
  const lastSpokenTimeRef = React.useRef<number>(0);
  const hasSpokenRef = React.useRef<boolean>(false);
  const transcriptRef = React.useRef<string>('');
  const silenceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isStoppingCountdownRef = React.useRef<boolean>(false);

  // Stable callback refs
  const onTranscriptRef = React.useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onAutoSendRef = React.useRef(onAutoSend);
  onAutoSendRef.current = onAutoSend;
  const onCountdownChangeRef = React.useRef(onCountdownChange);
  onCountdownChangeRef.current = onCountdownChange;
  const onStopCountdownRef = React.useRef(onStopCountdown);
  onStopCountdownRef.current = onStopCountdown;

  const graph = useGraph({ reactory });

  // When in voice mode, capture the raw Blob via onAudioData and forward to onRecordingComplete.
  // Also transcribe via backend SpeechService if browser speech recognition produced no transcript.
  const handleAudioData = React.useCallback(async (data: string | Uint8Array, format: 'base64' | 'bytes') => {
    if (onRecordingComplete) {
      // Convert base64/bytes back to Blob for the voice mutation
      if (format === 'base64' && typeof data === 'string') {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        onRecordingComplete(new Blob([bytes], { type: 'audio/webm' }));
      } else if (data instanceof Uint8Array) {
        onRecordingComplete(new Blob([data], { type: 'audio/webm' }));
      }
    } else if (onAudioData) {
      onAudioData(data, format);
    }

    // Backend SpeechService fallback for environments without Web Speech API
    if (!transcriptRef.current && format === 'base64' && typeof data === 'string') {
      try {
        const serverText = await graph.transcribeAudio(data);
        if (serverText && serverText.trim()) {
          transcriptRef.current = serverText.trim();
          onTranscriptRef.current?.(serverText.trim());
        }
      } catch (err) {
        console.warn('[RecordingAudioBar] Backend transcription fallback error:', err);
      }
    }
  }, [onAudioData, onRecordingComplete, graph]);

  const {
    startRecording: baseStartRecording,
    stopRecording: baseStopRecording,
    pauseRecording,
    resumeRecording,
    requestPermission,
    clearError,
    state,
    audioStream
  } = useAudioRecording(reactory, handleAudioData, recordingOptions);

  // Format duration as MM:SS
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Stop speech recognition instance safely
  const stopSpeechRecognition = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  // Clear countdown & silence timers
  const clearCountdownTimers = React.useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setCountdownRemaining(null);
    onCountdownChangeRef.current?.(null);
  }, []);

  // Start speech recognition + recording
  const startRecording = React.useCallback(async () => {
    isStoppingCountdownRef.current = false;
    hasSpokenRef.current = false;
    transcriptRef.current = '';
    lastSpokenTimeRef.current = 0;
    clearCountdownTimers();

    await baseStartRecording();

    // Initialize Web Speech API if supported in browser
    const SpeechRecognitionAPI = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = (reactory && typeof reactory.getLocale === 'function' ? reactory.getLocale() : 'en-US') || 'en-US';

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const resultText = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += (finalTranscript.length > 0 && !finalTranscript.endsWith(' ') ? ' ' : '') + resultText;
            } else {
              interim += resultText;
            }
          }

          const fullText = (finalTranscript + (interim ? (finalTranscript.length > 0 ? ' ' : '') + interim : '')).trim();
          if (fullText.length > 0) {
            transcriptRef.current = fullText;
            hasSpokenRef.current = true;
            lastSpokenTimeRef.current = Date.now();
            onTranscriptRef.current?.(fullText);

            // If a countdown was running, cancel it because user is continuing to speak
            if (!isStoppingCountdownRef.current) {
              setCountdownRemaining(null);
              onCountdownChangeRef.current?.(null);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[RecordingAudioBar] Speech recognition error:', event.error);
        };

        recognition.onend = () => {
          if (recognitionRef.current === recognition && !isStoppingCountdownRef.current) {
            try {
              recognition.start();
            } catch (err) {
              // ignore
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('[RecordingAudioBar] Failed to start speech recognition:', err);
      }
    }
  }, [baseStartRecording, clearCountdownTimers, reactory]);

  // Stop recording
  const stopRecording = React.useCallback(() => {
    stopSpeechRecognition();
    clearCountdownTimers();
    baseStopRecording();
  }, [baseStopRecording, stopSpeechRecognition, clearCountdownTimers]);

  // User explicitly stops the countdown to keep editing the text
  const handleStopCountdown = React.useCallback(() => {
    isStoppingCountdownRef.current = true;
    clearCountdownTimers();
    onStopCountdownRef.current?.();

    // Close recording stream so it stops listening, but keep the bar / text ready
    stopRecording();
  }, [clearCountdownTimers, stopRecording]);

  // Monitor silence & audio levels for 5-second silence countdown
  React.useEffect(() => {
    if (!state.isRecording) {
      clearCountdownTimers();
      return;
    }

    // Audio level voice activity detector
    if (state.audioLevel > 0.08) {
      lastSpokenTimeRef.current = Date.now();
      if (countdownRemaining !== null && !isStoppingCountdownRef.current) {
        setCountdownRemaining(null);
        onCountdownChangeRef.current?.(null);
      }
    }

    // Silence checker interval
    if (!silenceTimerRef.current) {
      silenceTimerRef.current = setInterval(() => {
        if (isStoppingCountdownRef.current) return;
        if (!hasSpokenRef.current || !lastSpokenTimeRef.current) return;

        const silenceDuration = Date.now() - lastSpokenTimeRef.current;
        if (silenceDuration >= 5000) {
          // 5 seconds elapsed with no speech — auto close and send!
          clearCountdownTimers();
          stopRecording();

          const finalText = transcriptRef.current;
          if (onAutoSendRef.current && finalText.trim()) {
            onAutoSendRef.current(finalText.trim());
          }
          onClose();
        } else if (silenceDuration > 0) {
          const remainingSec = Math.ceil((5000 - silenceDuration) / 1000);
          setCountdownRemaining(remainingSec);
          onCountdownChangeRef.current?.(remainingSec);
        }
      }, 200);
    }

    return () => {
      if (silenceTimerRef.current && !state.isRecording) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [state.isRecording, state.audioLevel, countdownRemaining, clearCountdownTimers, stopRecording, onClose]);

  // Handle recording button click
  const handleRecordingToggle = async () => {
    if (!state.isRecording) {
      await startRecording();
    } else {
      stopRecording();
      const text = transcriptRef.current?.trim();
      if (text) {
        onTranscriptRef.current?.(text);
        onCountdownChangeRef.current?.(5);
      }
      onClose();
    }
  };

  // Handle close with cleanup
  const handleClose = () => {
    if (state.isRecording) {
      stopRecording();
    }
    clearCountdownTimers();
    onClose();
  };

  // Cleanup on unmount & auto-start on open
  React.useEffect(() => {
    if (open && !state.isRecording) {
      startRecording();
    } else if (!open && state.isRecording) {
      stopRecording();
    }
  }, [open]);

  React.useEffect(() => {
    return () => {
      stopSpeechRecognition();
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
    };
  }, [stopSpeechRecognition]);

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
        gap: 2.5,
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
            disabled={voiceProcessing}
          >
            <span className="material-icons" style={{ fontSize: 24 }}>
              {state.isRecording ? 'stop' : 'mic'}
            </span>
          </IconButton>
        </Box>

        {/* Recording Status and Audio Level */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              mb: 0.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {countdownRemaining !== null && countdownRemaining > 0
              ? il8n?.t('reactor.client.recording.autoSending', { 
                  seconds: countdownRemaining, 
                  defaultValue: `Auto-sending in ${countdownRemaining}s...` 
                })
              : voiceProcessing
              ? il8n?.t('reactor.client.voice.processing', { defaultValue: 'Processing...' })
              : voicePlaying
              ? il8n?.t('reactor.client.voice.playing', { defaultValue: 'Speaking...' })
              : state.isRecording 
              ? il8n?.t('reactor.client.recording.recording', { defaultValue: 'Recording & transcribing...' })
              : voiceModeActive
              ? il8n?.t('reactor.client.voice.ready', { defaultValue: 'Voice mode active' })
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
                    backgroundColor: countdownRemaining !== null ? '#ff9800' : (state.audioLevel > 0.7 ? '#ff4444' : '#4caf50'),
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
            {countdownRemaining !== null && countdownRemaining > 0
              ? il8n?.t('reactor.client.recording.pauseToEdit', { defaultValue: 'Click "Keep Editing" or edit text to cancel' })
              : state.isRecording
              ? il8n?.t('reactor.client.recording.tap.stop', { defaultValue: 'Tap mic to stop' })
              : il8n?.t('reactor.client.recording.tap.start', { defaultValue: 'Tap mic to start' })
            }
          </Typography>
        </Box>

        {/* Action button when countdown is active */}
        {countdownRemaining !== null && countdownRemaining > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleStopCountdown}
            startIcon={<span className="material-icons" style={{ fontSize: 16 }}>edit</span>}
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.7)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 0.5,
              px: 1.5,
              borderRadius: 2,
              whiteSpace: 'nowrap',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
              }
            }}
          >
            {il8n?.t('reactor.client.recording.keepEditing', { defaultValue: 'Keep Editing' })}
          </Button>
        )}

        {/* Recording Duration / Voice Status */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 60
        }}>
          {voicePlaying && onStopPlayback && (
            <IconButton
              onClick={onStopPlayback}
              sx={{ color: 'white', p: 0.5 }}
              size="small"
              aria-label="Stop playback"
            >
              <span className="material-icons" style={{ fontSize: 20 }}>volume_off</span>
            </IconButton>
          )}
          {state.isRecording && (
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: countdownRemaining !== null ? '#ff9800' : '#ff4444',
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
            clearError();
          }}
        >
          {state.error}
        </Alert>
      )}
    </Paper>
  );
};

export default RecordingAudioBar;
