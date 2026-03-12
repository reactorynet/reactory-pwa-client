import React from 'react';
import useGraph, {
  StartVoiceSessionInput,
  VoiceMessageInput,
  VoiceSessionResult,
  VoiceChatResult,
} from './graphql/useGraph';

export interface VoiceSession {
  chatSessionId: string;
  personaId: string;
  ttsEnabled: boolean;
  sttEnabled: boolean;
  voice?: string;
  sttLanguage?: string;
  ttsStreamUrl?: string;
  sttStreamUrl?: string;
}

export interface SpeechServicesState {
  /** Whether voice mode is active */
  voiceModeActive: boolean;
  /** Current voice session info */
  voiceSession: VoiceSession | null;
  /** Whether we're currently sending/processing a voice message */
  processing: boolean;
  /** Whether TTS audio is currently playing */
  playing: boolean;
  /** Last error message */
  error: string | null;
}

export interface UseSpeechServicesResult {
  state: SpeechServicesState;
  /** Start a voice session for the given persona */
  startVoiceSession: (personaId: string, chatSessionId?: string, voice?: string) => Promise<void>;
  /** End the current voice session */
  endVoiceSession: () => Promise<void>;
  /** Toggle voice mode on/off */
  toggleVoiceMode: (personaId: string, chatSessionId?: string) => Promise<void>;
  /** Send recorded audio and optionally play back the TTS response */
  sendVoiceMessage: (audioBlob: Blob, onTranscription?: (text: string, audioResponse?: string) => void) => Promise<void>;
  /** Stop any currently playing TTS audio */
  stopPlayback: () => void;
  /** Play a base64-encoded audio string */
  playAudio: (audioBase64: string, format?: string) => Promise<void>;
}

interface UseSpeechServicesOptions {
  reactory: Reactory.Client.ReactorySDK;
  personaId?: string;
  chatSessionId?: string;
  /** Default voice for TTS */
  voice?: string;
  /** Whether to auto-synthesize AI responses */
  synthesizeResponses?: boolean;
}

const useSpeechServices = (options: UseSpeechServicesOptions): UseSpeechServicesResult => {
  const {
    reactory,
    personaId,
    chatSessionId,
    voice,
    synthesizeResponses = true,
  } = options;

  const graph = useGraph({ reactory });

  const [state, setState] = React.useState<SpeechServicesState>({
    voiceModeActive: false,
    voiceSession: null,
    processing: false,
    playing: false,
    error: null,
  });

  // Ref for the currently playing audio element so we can stop it
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const playAudio = React.useCallback(async (audioBase64: string, format: string = 'wav') => {
    try {
      // Stop any existing playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const mimeType = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;
      const dataUri = `data:${mimeType};base64,${audioBase64}`;
      const audio = new Audio(dataUri);
      audioRef.current = audio;

      setState(prev => ({ ...prev, playing: true }));

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          audioRef.current = null;
          setState(prev => ({ ...prev, playing: false }));
          resolve();
        };
        audio.onerror = (e) => {
          audioRef.current = null;
          setState(prev => ({ ...prev, playing: false }));
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        playing: false,
        error: error instanceof Error ? error.message : 'Audio playback failed',
      }));
    }
  }, []);

  const stopPlayback = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setState(prev => ({ ...prev, playing: false }));
    }
  }, []);

  const startVoiceSession = React.useCallback(async (
    pId: string,
    sessionId?: string,
    voiceId?: string,
  ) => {
    setState(prev => ({ ...prev, error: null, processing: true }));

    try {
      const input: StartVoiceSessionInput = {
        personaId: pId,
        ttsEnabled: true,
        sttEnabled: true,
        voice: voiceId || voice,
        chatSessionId: sessionId || chatSessionId,
      };

      const result = await graph.startVoiceSession(input);

      if (result?.__typename === 'ReactorErrorResponse') {
        setState(prev => ({
          ...prev,
          processing: false,
          error: result.message,
        }));
        return;
      }

      if (result?.__typename === 'ReactorVoiceSession') {
        setState(prev => ({
          ...prev,
          voiceModeActive: true,
          voiceSession: {
            chatSessionId: result.chatSessionId,
            personaId: result.personaId,
            ttsEnabled: result.ttsEnabled,
            sttEnabled: result.sttEnabled,
            voice: result.voice,
            sttLanguage: result.sttLanguage,
            ttsStreamUrl: result.ttsStreamUrl,
            sttStreamUrl: result.sttStreamUrl,
          },
          processing: false,
          error: null,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Failed to start voice session',
      }));
    }
  }, [graph, voice, chatSessionId]);

  const endVoiceSession = React.useCallback(async () => {
    stopPlayback();

    const sessionId = state.voiceSession?.chatSessionId;
    if (!sessionId) {
      setState(prev => ({
        ...prev,
        voiceModeActive: false,
        voiceSession: null,
      }));
      return;
    }

    try {
      await graph.endVoiceSession(sessionId);
    } catch (error) {
      reactory.log(`Failed to end voice session: ${error}`, { level: 'warn' });
    }

    setState(prev => ({
      ...prev,
      voiceModeActive: false,
      voiceSession: null,
      error: null,
    }));
  }, [graph, state.voiceSession?.chatSessionId, stopPlayback, reactory]);

  const toggleVoiceMode = React.useCallback(async (pId: string, sessionId?: string) => {
    if (state.voiceModeActive) {
      await endVoiceSession();
    } else {
      await startVoiceSession(pId, sessionId);
    }
  }, [state.voiceModeActive, startVoiceSession, endVoiceSession]);

  const sendVoiceMessage = React.useCallback(async (
    audioBlob: Blob,
    onTranscription?: (text: string, audioResponse?: string) => void,
  ) => {
    if (!state.voiceSession) {
      setState(prev => ({ ...prev, error: 'No active voice session' }));
      return;
    }

    setState(prev => ({ ...prev, processing: true, error: null }));

    try {
      const input: VoiceMessageInput = {
        chatSessionId: state.voiceSession.chatSessionId,
        personaId: state.voiceSession.personaId,
        synthesizeResponse: synthesizeResponses,
        voice: state.voiceSession.voice,
      };

      const result = await graph.sendVoiceMessage(audioBlob, input);

      if (result?.__typename === 'ReactorErrorResponse') {
        setState(prev => ({
          ...prev,
          processing: false,
          error: result.message,
        }));
        return;
      }

      if (result?.__typename === 'ReactorVoiceChatMessage') {
        setState(prev => ({ ...prev, processing: false }));

        // Notify caller with the transcribed text + audio
        if (onTranscription) {
          onTranscription(result.content || '', result.audioBase64);
        }

        // Auto-play TTS response if available
        if (result.audioBase64) {
          await playAudio(result.audioBase64, result.audioFormat || 'wav');
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Failed to send voice message',
      }));
    }
  }, [state.voiceSession, synthesizeResponses, graph, playAudio]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  return {
    state,
    startVoiceSession,
    endVoiceSession,
    toggleVoiceMode,
    sendVoiceMessage,
    stopPlayback,
    playAudio,
  };
};

export default useSpeechServices;
