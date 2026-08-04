import React from 'react';

export interface AudioRecordingOptions {
  sampleRate?: number;
  channels?: number;
  bufferSize?: number;
  format?: 'base64' | 'bytes';
  streamingInterval?: number;
}

export interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
  hasPermission: boolean;
}

export interface UseAudioRecordingResult {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  requestPermission: () => Promise<MediaStream | null>;
  clearError: () => void;
  state: AudioRecordingState;
  audioStream: MediaStream | null;
}

const useAudioRecording = (
  reactory: any,
  onAudioData?: (data: string | Uint8Array, format: 'base64' | 'bytes') => void,
  options: AudioRecordingOptions = {}
): UseAudioRecordingResult => {
  const {
    format = 'base64',
    streamingInterval = 100,
  } = options;

  const [state, setState] = React.useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    error: null,
    hasPermission: false,
  });

  const [audioStreamState, setAudioStreamState] = React.useState<MediaStream | null>(null);

  // Active audio resources held in refs to prevent re-render cleanup loops
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const isStartingRef = React.useRef<boolean>(false);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const dataArrayRef = React.useRef<Uint8Array | null>(null);
  const durationTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioLevelTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  // Stable callback ref for onAudioData
  const onAudioDataRef = React.useRef(onAudioData);
  onAudioDataRef.current = onAudioData;

  const clearError = React.useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear timers
  const clearTimers = React.useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (audioLevelTimerRef.current) {
      clearInterval(audioLevelTimerRef.current);
      audioLevelTimerRef.current = null;
    }
  }, []);

  // Request microphone permission
  const requestPermission = React.useCallback(async (): Promise<MediaStream | null> => {
    try {
      // Close previous stream if exists
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setAudioStreamState(stream);
      setState(prev => ({ ...prev, hasPermission: true, error: null }));

      // Set up AudioContext and AnalyserNode for level monitoring
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
          }
          const context = new AudioCtx();
          const source = context.createMediaStreamSource(stream);
          const analyserNode = context.createAnalyser();
          analyserNode.fftSize = 256;
          source.connect(analyserNode);

          audioContextRef.current = context;
          analyserRef.current = analyserNode;
          dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount);
        } catch (ctxErr) {
          console.warn('AudioContext setup failed:', ctxErr);
        }
      }

      return stream;
    } catch (error) {
      console.error('Failed to get microphone permission:', error);
      setState(prev => ({
        ...prev,
        hasPermission: false,
        error: error instanceof Error ? error.message : 'Microphone access denied',
      }));
      return null;
    }
  }, []);

  // Send final audio data callback
  const sendFinalAudioData = React.useCallback(async (audioBlob: Blob) => {
    try {
      if (format === 'base64') {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        if (onAudioDataRef.current) {
          onAudioDataRef.current(base64, 'base64');
        }
      } else {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        if (onAudioDataRef.current) {
          onAudioDataRef.current(bytes, 'bytes');
        }
      }
    } catch (error) {
      console.error('Failed to process audio data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to process audio data',
      }));
    }
  }, [format]);

  // Start recording
  const startRecording = React.useCallback(async (): Promise<void> => {
    clearError();

    // Guard against concurrent re-entrant start calls
    if (isStartingRef.current) {
      console.warn('startRecording already in progress, ignoring duplicate call');
      return;
    }

    // Guard if recorder is already active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.warn('MediaRecorder is already active in state:', mediaRecorderRef.current.state);
      return;
    }

    isStartingRef.current = true;

    try {
      let currentStream = streamRef.current;
      const isStreamActive = currentStream && currentStream.active && currentStream.getAudioTracks().some(t => t.readyState === 'live');
      if (!isStreamActive) {
        currentStream = await requestPermission();
        if (!currentStream) {
          isStartingRef.current = false;
          return;
        }
      }

      // Stop any existing recorder if present
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      let recorder: MediaRecorder;
      try {
        let recOptions: MediaRecorderOptions | undefined = undefined;
        if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            recOptions = { mimeType: 'audio/webm;codecs=opus' };
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            recOptions = { mimeType: 'audio/webm' };
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            recOptions = { mimeType: 'audio/mp4' };
          }
        }
        recorder = recOptions ? new MediaRecorder(currentStream, recOptions) : new MediaRecorder(currentStream);
      } catch (recErr) {
        recorder = new MediaRecorder(currentStream);
      }

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        const now = Date.now();
        setState(prev => ({ ...prev, isRecording: true, isPaused: false, error: null, duration: 0 }));

        clearTimers();

        // Duration timer
        durationTimerRef.current = setInterval(() => {
          setState(prev => ({ ...prev, duration: Date.now() - now }));
        }, 100);

        // Audio level timer
        audioLevelTimerRef.current = setInterval(() => {
          const analyser = analyserRef.current;
          const dataArray = dataArrayRef.current;
          if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setState(prev => ({ ...prev, audioLevel: average / 255 }));
          }
        }, 50);
      };

      recorder.onstop = () => {
        setState(prev => ({ ...prev, isRecording: false, isPaused: false, audioLevel: 0 }));
        clearTimers();

        if (chunksRef.current.length > 0) {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          if (audioBlob.size > 0) {
            sendFinalAudioData(audioBlob);
          }
        }
      };

      mediaRecorderRef.current = recorder;

      // Ensure tracks are enabled
      currentStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });

      // Warm-up delay for audio hardware tracks
      await new Promise(resolve => setTimeout(resolve, 50));

      if (recorder.state === 'inactive') {
        try {
          recorder.start(streamingInterval);
        } catch (startErr) {
          recorder.start();
        }
      }

    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      }));
    } finally {
      isStartingRef.current = false;
    }
  }, [requestPermission, clearError, clearTimers, streamingInterval, sendFinalAudioData]);

  // Stop recording
  const stopRecording = React.useCallback(() => {
    isStartingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }
    clearTimers();
  }, [clearTimers]);

  // Pause recording
  const pauseRecording = React.useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);

  // Resume recording
  const resumeRecording = React.useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, []);

  // Cleanup on unmount ONLY
  React.useEffect(() => {
    return () => {
      clearTimers();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [clearTimers]);

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    requestPermission,
    clearError,
    state,
    audioStream: audioStreamState,
  };
};

export default useAudioRecording;
