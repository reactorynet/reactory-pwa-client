import React from 'react';
import useSSE from './useSSE';

export interface AudioStreamingOptions {
  sampleRate?: number;
  channels?: number;
  bufferSize?: number;
  format?: 'base64' | 'bytes';
  streamingInterval?: number;
  chunkSize?: number;
  endpoint?: string;
  sessionId?: string;
  token?: string;
}

export interface AudioStreamingState {
  isStreaming: boolean;
  isConnected: boolean;
  audioLevel: number;
  chunksSent: number;
  totalBytes: number;
  error: string | null;
  hasPermission: boolean;
}

export interface UseAudioStreamingResult {
  startStreaming: () => Promise<void>;
  stopStreaming: () => void;
  pauseStreaming: () => void;
  resumeStreaming: () => void;
  requestPermission: () => Promise<boolean>;
  connectSSE: (endpoint: string, sessionId: string, token?: string) => void;
  disconnectSSE: () => void;
  state: AudioStreamingState;
  audioStream: MediaStream | null;
}

const useAudioStreaming = (
  reactory: any,
  options: AudioStreamingOptions = {}
): UseAudioStreamingResult => {
  const {
    sampleRate = 16000,
    channels = 1,
    bufferSize = 4096,
    format = 'base64',
    streamingInterval = 100,
    chunkSize = 1024
  } = options;

  const [state, setState] = React.useState<AudioStreamingState>({
    isStreaming: false,
    isConnected: false,
    audioLevel: 0,
    chunksSent: 0,
    totalBytes: 0,
    error: null,
    hasPermission: false
  });

  const [audioStream, setAudioStream] = React.useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(null);
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);
  const [analyser, setAnalyser] = React.useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = React.useState<Uint8Array | null>(null);
  const [streamingTimer, setStreamingTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [audioLevelTimer, setAudioLevelTimer] = React.useState<NodeJS.Timeout | null>(null);

  // SSE connection for streaming audio data
  const { connect, disconnect, isStreaming: sseStreaming, connected } = useSSE({
    reactory,
    onError: (error) => {
      console.error('Audio streaming SSE error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'SSE connection error',
        isStreaming: false 
      }));
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

  // Connect to SSE endpoint
  const connectSSE = React.useCallback((endpoint: string, sessionId: string, token?: string) => {
    connect({
      endpoint,
      sessionId,
      token,
      onConnectionOpened: () => {
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      }
    });
  }, [connect]);

  // Disconnect from SSE
  const disconnectSSE = React.useCallback(() => {
    disconnect();
    setState(prev => ({ ...prev, isConnected: false }));
  }, [disconnect]);

  // Start audio streaming
  const startStreaming = React.useCallback(async (): Promise<void> => {
    if (!audioStream) {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;
    }

    if (!state.isConnected) {
      setState(prev => ({ 
        ...prev, 
        error: 'SSE connection not established. Call connectSSE first.' 
      }));
      return;
    }

    try {
      if (!audioStream) throw new Error('No audio stream available');

      const recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      const chunks: Blob[] = [];
      let chunkCounter = 0;
      
      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          
          // Process and send audio chunk
          try {
            const audioData = await processAudioChunk(event.data);
            if (audioData) {
              await sendAudioChunk(audioData, chunkCounter++);
              setState(prev => ({ 
                ...prev, 
                chunksSent: prev.chunksSent + 1,
                totalBytes: prev.totalBytes + audioData.length
              }));
            }
          } catch (error) {
            console.error('Failed to process audio chunk:', error);
          }
        }
      };

      recorder.onstart = () => {
        setState(prev => ({ ...prev, isStreaming: true, error: null }));
        
        // Start audio level monitoring
        const levelTimer = setInterval(() => {
          if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setState(prev => ({ ...prev, audioLevel: average / 255 }));
          }
        }, 50);
        setAudioLevelTimer(levelTimer);

        // Start streaming timer for regular data requests
        const timer = setInterval(() => {
          if (recorder.state === 'recording') {
            recorder.requestData();
          }
        }, streamingInterval);
        setStreamingTimer(timer);
      };

      recorder.onstop = () => {
        setState(prev => ({ ...prev, isStreaming: false }));
        
        if (streamingTimer) {
          clearInterval(streamingTimer);
          setStreamingTimer(null);
        }
        
        if (audioLevelTimer) {
          clearInterval(audioLevelTimer);
          setAudioLevelTimer(null);
        }

        // Send final audio data
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        sendFinalAudioData(audioBlob);
      };

      setMediaRecorder(recorder);
      recorder.start(streamingInterval);

    } catch (error) {
      console.error('Failed to start streaming:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start streaming' 
      }));
    }
  }, [audioStream, requestPermission, state.isConnected, streamingInterval, analyser, dataArray]);

  // Stop streaming
  const stopStreaming = React.useCallback(() => {
    if (mediaRecorder && state.isStreaming) {
      mediaRecorder.stop();
    }
    
    if (streamingTimer) {
      clearInterval(streamingTimer);
      setStreamingTimer(null);
    }
    
    if (audioLevelTimer) {
      clearInterval(audioLevelTimer);
      setAudioLevelTimer(null);
    }
  }, [mediaRecorder, state.isStreaming, streamingTimer, audioLevelTimer]);

  // Pause streaming
  const pauseStreaming = React.useCallback(() => {
    if (mediaRecorder && state.isStreaming) {
      mediaRecorder.pause();
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  }, [mediaRecorder, state.isStreaming]);

  // Resume streaming
  const resumeStreaming = React.useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.resume();
      setState(prev => ({ ...prev, isStreaming: true }));
    }
  }, [mediaRecorder]);

  // Process audio chunk for streaming
  const processAudioChunk = React.useCallback(async (blob: Blob): Promise<string | Uint8Array | null> => {
    try {
      if (format === 'base64') {
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        return base64;
      } else {
        const arrayBuffer = await blob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } catch (error) {
      console.error('Failed to process audio chunk:', error);
      return null;
    }
  }, [format]);

  // Send audio chunk over SSE
  const sendAudioChunk = React.useCallback(async (audioData: string | Uint8Array, chunkIndex: number) => {
    try {
      // Create a custom event for audio streaming
      const audioEvent = {
        type: 'audio_chunk',
        sessionId: options.sessionId || 'default',
        conversationId: 'audio-stream',
        messageId: `chunk-${chunkIndex}`,
        timestamp: new Date(),
        data: {
          chunkIndex,
          format,
          audioData,
          size: audioData.length,
          timestamp: Date.now()
        }
      };

      // Send via SSE if connected
      if (connected) {
        // Note: In a real implementation, you would send this through your SSE connection
        // For now, we'll log it and could implement a custom event dispatch
        console.log('Audio chunk ready for SSE:', audioEvent);
        
        // You could implement a custom event emitter here or use the SSE connection
        // to send the audio data to the server
      }
    } catch (error) {
      console.error('Failed to send audio chunk:', error);
    }
  }, [connected, format, options.sessionId]);

  // Send final audio data
  const sendFinalAudioData = React.useCallback(async (audioBlob: Blob) => {
    try {
      const audioData = await processAudioChunk(audioBlob);
      if (audioData) {
        await sendAudioChunk(audioData, state.chunksSent);
      }
    } catch (error) {
      console.error('Failed to send final audio data:', error);
    }
  }, [processAudioChunk, sendAudioChunk, state.chunksSent]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (streamingTimer) clearInterval(streamingTimer);
      if (audioLevelTimer) clearInterval(audioLevelTimer);
      if (mediaRecorder) mediaRecorder.stop();
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) audioContext.close();
      disconnect();
    };
  }, [streamingTimer, audioLevelTimer, mediaRecorder, audioStream, audioContext, disconnect]);

  return {
    startStreaming,
    stopStreaming,
    pauseStreaming,
    resumeStreaming,
    requestPermission,
    connectSSE,
    disconnectSSE,
    state,
    audioStream
  };
};

export default useAudioStreaming;
