import React from 'react';
import useSSE, { StreamingEventType } from './useSSE';

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
  requestPermission: () => Promise<boolean>;
  state: AudioRecordingState;
  audioStream: MediaStream | null;
}

const useAudioRecording = (
  reactory: any,
  onAudioData?: (data: string | Uint8Array, format: 'base64' | 'bytes') => void,
  options: AudioRecordingOptions = {}
): UseAudioRecordingResult => {
  const {
    sampleRate = 16000,
    channels = 1,
    bufferSize = 4096,
    format = 'base64',
    streamingInterval = 100
  } = options;

  const [state, setState] = React.useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    error: null,
    hasPermission: false
  });

  const [audioStream, setAudioStream] = React.useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(null);
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);
  const [startTime, setStartTime] = React.useState<number>(0);
  const [durationTimer, setDurationTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [audioLevelTimer, setAudioLevelTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [analyser, setAnalyser] = React.useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = React.useState<Uint8Array | null>(null);

  // SSE connection for streaming audio data
  const { connect, disconnect, isStreaming, connected } = useSSE({
    reactory,
    onError: (error) => {
      console.error('Audio recording SSE error:', error);
      setState(prev => ({ ...prev, error: error.message || 'SSE connection error' }));
    }
  });

  // Request microphone permission
  const requestPermission = React.useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate,
          channelCount: channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setAudioStream(stream);
      setState(prev => ({ ...prev, hasPermission: true, error: null }));
      
      // Set up audio context and analyser for audio level monitoring
      const context = new AudioContext({ sampleRate });
      const source = context.createMediaStreamSource(stream);
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      
      setAudioContext(context);
      setAnalyser(analyserNode);
      setDataArray(new Uint8Array(analyserNode.frequencyBinCount));
      
      return true;
    } catch (error) {
      console.error('Failed to get microphone permission:', error);
      setState(prev => ({ 
        ...prev, 
        hasPermission: false, 
        error: error instanceof Error ? error.message : 'Microphone access denied' 
      }));
      return false;
    }
  }, [sampleRate, channels]);

  // Start recording
  const startRecording = React.useCallback(async (): Promise<void> => {
    if (!audioStream) {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;
    }

    try {
      if (!audioStream) throw new Error('No audio stream available');

      const recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstart = () => {
        setState(prev => ({ ...prev, isRecording: true, isPaused: false, error: null }));
        setStartTime(Date.now());
        
        // Start duration timer
        const timer = setInterval(() => {
          setState(prev => ({ ...prev, duration: Date.now() - startTime }));
        }, 100);
        setDurationTimer(timer);

        // Start audio level monitoring
        const levelTimer = setInterval(() => {
          if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setState(prev => ({ ...prev, audioLevel: average / 255 }));
          }
        }, 50);
        setAudioLevelTimer(levelTimer);

        // Start streaming audio data
        if (format === 'base64') {
          startBase64Streaming(recorder);
        } else {
          startBytesStreaming(recorder);
        }
      };

      recorder.onstop = () => {
        setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
        
        if (durationTimer) {
          clearInterval(durationTimer);
          setDurationTimer(null);
        }
        
        if (audioLevelTimer) {
          clearInterval(audioLevelTimer);
          setAudioLevelTimer(null);
        }

        // Create final audio blob and send
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        sendFinalAudioData(audioBlob);
      };

      setMediaRecorder(recorder);
      recorder.start(streamingInterval);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start recording' 
      }));
    }
  }, [audioStream, requestPermission, format, streamingInterval, startTime, analyser, dataArray]);

  // Stop recording
  const stopRecording = React.useCallback(() => {
    if (mediaRecorder && state.isRecording) {
      mediaRecorder.stop();
    }
    
    if (durationTimer) {
      clearInterval(durationTimer);
      setDurationTimer(null);
    }
    
    if (audioLevelTimer) {
      clearInterval(audioLevelTimer);
      setAudioLevelTimer(null);
    }
  }, [mediaRecorder, state.isRecording, durationTimer, audioLevelTimer]);

  // Pause recording
  const pauseRecording = React.useCallback(() => {
    if (mediaRecorder && state.isRecording && !state.isPaused) {
      mediaRecorder.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [mediaRecorder, state.isRecording, state.isPaused]);

  // Resume recording
  const resumeRecording = React.useCallback(() => {
    if (mediaRecorder && state.isPaused) {
      mediaRecorder.resume();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [mediaRecorder, state.isPaused]);

  // Start base64 streaming
  const startBase64Streaming = React.useCallback((recorder: MediaRecorder) => {
    const streamInterval = setInterval(() => {
      if (recorder.state === 'recording') {
        // For base64 streaming, we'll collect chunks and convert to base64
        // This is a simplified approach - in production you might want to use
        // a more sophisticated streaming mechanism
        recorder.requestData();
      } else {
        clearInterval(streamInterval);
      }
    }, streamingInterval);
  }, [streamingInterval]);

  // Start bytes streaming
  const startBytesStreaming = React.useCallback((recorder: MediaRecorder) => {
    const streamInterval = setInterval(() => {
      if (recorder.state === 'recording') {
        recorder.requestData();
      } else {
        clearInterval(streamInterval);
      }
    }, streamingInterval);
  }, [streamingInterval]);

  // Send final audio data
  const sendFinalAudioData = React.useCallback(async (audioBlob: Blob) => {
    try {
      if (format === 'base64') {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        if (onAudioData) {
          onAudioData(base64, 'base64');
        }
      } else {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        if (onAudioData) {
          onAudioData(bytes, 'bytes');
        }
      }
    } catch (error) {
      console.error('Failed to process audio data:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to process audio data' 
      }));
    }
  }, [format, onAudioData]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (durationTimer) clearInterval(durationTimer);
      if (audioLevelTimer) clearInterval(audioLevelTimer);
      if (mediaRecorder) mediaRecorder.stop();
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) audioContext.close();
      disconnect();
    };
  }, [durationTimer, audioLevelTimer, mediaRecorder, audioStream, audioContext, disconnect]);

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    requestPermission,
    state,
    audioStream
  };
};

export default useAudioRecording;
