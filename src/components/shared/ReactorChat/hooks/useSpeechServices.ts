import React from 'react';
import useGraph, {
  StartVoiceSessionInput,
  VoiceMessageInput,
  VoiceSessionResult,
  VoiceChatResult,
  SpeechSynthesizeInput,
  SpeechSynthesisResult,
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
  /** Whether TTS synthesis is in progress */
  synthesizing: boolean;
  /** Whether TTS audio is currently playing */
  playing: boolean;
  /** Whether playback is currently paused */
  paused: boolean;
  /** The text currently playing or paused */
  currentText: string | null;
  /** Playback engine: 'server' | 'browser' | null */
  playbackEngine: 'server' | 'browser' | null;
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
  /** Pause currently playing audio */
  pausePlayback: () => void;
  /** Resume playing paused audio */
  resumePlayback: () => Promise<void>;
  /** Play a base64-encoded audio string */
  playAudio: (audioBase64: string, format?: string) => Promise<void>;
  /** Synthesize text to speech audio via Reactory speech service */
  synthesizeText: (text: string, voice?: string, speed?: number) => Promise<SpeechSynthesisResult | null>;
  /** Synthesize and immediately play back the given text (falls back to browser Web Speech API if server fails) */
  speakText: (text: string, voice?: string, speed?: number) => Promise<void>;
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

/**
 * Strips markdown, code blocks, URLs, and HTML tags for natural speech synthesis
 */
export const cleanTextForSpeech = (rawText: string): string => {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const audioCache = new Map<string, SpeechSynthesisResult>();

export const clearAudioCache = () => {
  audioCache.clear();
};

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
    synthesizing: false,
    playing: false,
    paused: false,
    currentText: null,
    playbackEngine: null,
    error: null,
  });

  // Ref for the currently playing HTML5 audio element
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  // Ref to track if playback is active via Web Speech API
  const isBrowserSpeakingRef = React.useRef(false);

  const stopPlayback = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis error
      }
    }
    isBrowserSpeakingRef.current = false;

    setState(prev => ({
      ...prev,
      playing: false,
      paused: false,
      currentText: null,
      playbackEngine: null,
    }));
  }, []);

  const pausePlayback = React.useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, playing: false, paused: true }));
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      try {
        window.speechSynthesis.pause();
        setState(prev => ({ ...prev, playing: false, paused: true }));
      } catch {
        // Ignore synthesis error
      }
    }
  }, []);

  const resumePlayback = React.useCallback(async () => {
    if (audioRef.current && audioRef.current.paused) {
      try {
        setState(prev => ({ ...prev, playing: true, paused: false }));
        await audioRef.current.play();
        return;
      } catch (err) {
        setState(prev => ({
          ...prev,
          playing: false,
          paused: false,
          error: err instanceof Error ? err.message : 'Failed to resume audio',
        }));
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      try {
        setState(prev => ({ ...prev, playing: true, paused: false }));
        window.speechSynthesis.resume();
      } catch (err) {
        setState(prev => ({
          ...prev,
          playing: false,
          paused: false,
          error: err instanceof Error ? err.message : 'Failed to resume speech',
        }));
      }
    }
  }, []);

  const playAudio = React.useCallback(async (audioBase64: string, format: string = 'wav') => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const mimeType = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;
      const dataUri = `data:${mimeType};base64,${audioBase64}`;
      const audio = new Audio(dataUri);
      audioRef.current = audio;

      setState(prev => ({ ...prev, playing: true, paused: false, playbackEngine: 'server' }));

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          audioRef.current = null;
          setState(prev => ({ ...prev, playing: false, paused: false, currentText: null, playbackEngine: null }));
          resolve();
        };
        audio.onerror = () => {
          audioRef.current = null;
          setState(prev => ({ ...prev, playing: false, paused: false, currentText: null, playbackEngine: null }));
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        playing: false,
        paused: false,
        currentText: null,
        playbackEngine: null,
        error: error instanceof Error ? error.message : 'Audio playback failed',
      }));
    }
  }, []);

  /**
   * Browser Web Speech API fallback when server-side TTS is slow or unavailable
   */
  const speakWithBrowserSpeech = React.useCallback((text: string, speed: number = 1.0): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setState(prev => ({
          ...prev,
          playing: false,
          paused: false,
          currentText: null,
          playbackEngine: null,
          error: 'Speech synthesis is not supported by your browser',
        }));
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = Math.max(0.5, Math.min(2.0, speed));

        utterance.onend = () => {
          isBrowserSpeakingRef.current = false;
          setState(prev => ({
            ...prev,
            playing: false,
            paused: false,
            currentText: null,
            playbackEngine: null,
          }));
          resolve();
        };

        utterance.onerror = (err) => {
          isBrowserSpeakingRef.current = false;
          setState(prev => ({
            ...prev,
            playing: false,
            paused: false,
            currentText: null,
            playbackEngine: null,
            error: err?.error || 'Browser speech synthesis failed',
          }));
          resolve();
        };

        isBrowserSpeakingRef.current = true;
        setState(prev => ({
          ...prev,
          playing: true,
          paused: false,
          currentText: text,
          playbackEngine: 'browser',
          error: null,
        }));

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setState(prev => ({
          ...prev,
          playing: false,
          paused: false,
          currentText: null,
          playbackEngine: null,
          error: err instanceof Error ? err.message : 'Browser speech synthesis failed',
        }));
        resolve();
      }
    });
  }, []);

  const synthesizeText = React.useCallback(async (
    textToSpeak: string,
    voiceId?: string,
    speed?: number,
  ): Promise<SpeechSynthesisResult | null> => {
    const cleaned = cleanTextForSpeech(textToSpeak);
    if (!cleaned) return null;

    const chosenVoice = voiceId || voice || 'af_heart';
    const chosenSpeed = speed || 1.0;
    const cacheKey = `${cleaned}:${chosenVoice}:${chosenSpeed}`;

    if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey)!;
    }

    setState(prev => ({ ...prev, synthesizing: true, error: null }));

    try {
      const input: SpeechSynthesizeInput = {
        text: cleaned,
        voice: chosenVoice,
        speed: chosenSpeed,
      };

      const result = await graph.synthesizeSpeech(input);

      if (result && result.audioBase64) {
        audioCache.set(cacheKey, result);
        setState(prev => ({ ...prev, synthesizing: false }));
        return result;
      }

      setState(prev => ({
        ...prev,
        synthesizing: false,
      }));
      return null;
    } catch (error) {
      setState(prev => ({
        ...prev,
        synthesizing: false,
      }));
      return null;
    }
  }, [graph, voice]);

  const speakText = React.useCallback(async (
    textToSpeak: string,
    voiceId?: string,
    speed: number = 1.0,
  ) => {
    const cleaned = cleanTextForSpeech(textToSpeak);
    if (!cleaned) return;

    // If already playing this text, pause it
    if (state.playing && state.currentText === cleaned) {
      pausePlayback();
      return;
    }

    // If paused on this text, resume it
    if (state.paused && state.currentText === cleaned) {
      await resumePlayback();
      return;
    }

    // Stop current audio if playing something else
    stopPlayback();

    setState(prev => ({ ...prev, currentText: cleaned, error: null }));

    try {
      // 1. Try server-side Reactory Speech Service first
      const result = await synthesizeText(cleaned, voiceId, speed);
      if (result && result.audioBase64) {
        await playAudio(result.audioBase64, result.format || 'wav');
        return;
      }
    } catch (err) {
      reactory.log(`Server TTS failed, falling back to browser speech: ${err}`, { level: 'warn' });
    }

    // 2. Seamless fallback to browser Web Speech API
    await speakWithBrowserSpeech(cleaned, speed);
  }, [state.playing, state.paused, state.currentText, pausePlayback, resumePlayback, stopPlayback, synthesizeText, playAudio, speakWithBrowserSpeech, reactory]);

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
    pausePlayback,
    resumePlayback,
    playAudio,
    synthesizeText,
    speakText,
  };
};

export default useSpeechServices;
