/**
 * Tests for useSpeechServices hook
 * @module ReactorChat/hooks/__tests__/useSpeechServices
 */

import { renderHook, act } from '@testing-library/react-hooks';
import useSpeechServices from '../hooks/useSpeechServices';

// Mock useGraph
const mockStartVoiceSession = jest.fn();
const mockEndVoiceSession = jest.fn();
const mockSendVoiceMessage = jest.fn();

jest.mock('../hooks/graphql/useGraph', () => {
  return jest.fn(() => ({
    startVoiceSession: mockStartVoiceSession,
    endVoiceSession: mockEndVoiceSession,
    sendVoiceMessage: mockSendVoiceMessage,
    // Include other methods to prevent errors
    startChatSession: jest.fn(),
    sendMessage: jest.fn(),
    setChatToolApprovalMode: jest.fn(),
    attachFile: jest.fn(),
    askQuestionAudio: jest.fn(),
    deleteChatSession: jest.fn(),
    getConversation: jest.fn(),
    listConversations: jest.fn(),
    executeMacro: jest.fn(),
    executeTool: jest.fn(),
  }));
});

// Mock HTMLAudioElement
const mockPlay = jest.fn().mockImplementation(function(this: any) {
  // Simulate audio playback completing asynchronously
  setTimeout(() => {
    if (this.onended) this.onended();
  }, 10);
  return Promise.resolve();
});
const mockPause = jest.fn();

beforeEach(() => {
  // @ts-ignore
  global.Audio = jest.fn().mockImplementation(() => {
    const audio: any = {
      play: mockPlay,
      pause: mockPause,
      onended: null,
      onerror: null,
    };
    // Bind play so `this` refers to audio
    audio.play = jest.fn(() => {
      setTimeout(() => { if (audio.onended) audio.onended(); }, 10);
      return Promise.resolve();
    });
    return audio;
  });
});

const mockReactory = {
  graphqlMutation: jest.fn(),
  graphqlQuery: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as any;

describe('useSpeechServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartVoiceSession.mockReset();
    mockEndVoiceSession.mockReset();
    mockSendVoiceMessage.mockReset();
  });

  it('should return correct initial state', () => {
    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    expect(result.current.state.voiceModeActive).toBe(false);
    expect(result.current.state.voiceSession).toBeNull();
    expect(result.current.state.processing).toBe(false);
    expect(result.current.state.playing).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should start a voice session successfully', async () => {
    mockStartVoiceSession.mockResolvedValue({
      __typename: 'ReactorVoiceSession',
      chatSessionId: 'sess-1',
      personaId: 'p1',
      ttsEnabled: true,
      sttEnabled: true,
      voice: 'af_heart',
      sttLanguage: 'en',
      ttsStreamUrl: null,
      sttStreamUrl: null,
    });

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    await act(async () => {
      await result.current.startVoiceSession('p1', 'sess-1');
    });

    expect(result.current.state.voiceModeActive).toBe(true);
    expect(result.current.state.voiceSession).toBeTruthy();
    expect(result.current.state.voiceSession!.chatSessionId).toBe('sess-1');
    expect(result.current.state.voiceSession!.voice).toBe('af_heart');
    expect(result.current.state.error).toBeNull();
    expect(mockStartVoiceSession).toHaveBeenCalledWith({
      personaId: 'p1',
      ttsEnabled: true,
      sttEnabled: true,
      voice: undefined,
      chatSessionId: 'sess-1',
    });
  });

  it('should handle error response when starting voice session', async () => {
    mockStartVoiceSession.mockResolvedValue({
      __typename: 'ReactorErrorResponse',
      code: 'SPEECH_UNAVAILABLE',
      message: 'Speech service not available',
    });

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    await act(async () => {
      await result.current.startVoiceSession('p1');
    });

    expect(result.current.state.voiceModeActive).toBe(false);
    expect(result.current.state.error).toBe('Speech service not available');
  });

  it('should end a voice session', async () => {
    mockStartVoiceSession.mockResolvedValue({
      __typename: 'ReactorVoiceSession',
      chatSessionId: 'sess-1',
      personaId: 'p1',
      ttsEnabled: true,
      sttEnabled: true,
    });
    mockEndVoiceSession.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    // Start first
    await act(async () => {
      await result.current.startVoiceSession('p1', 'sess-1');
    });
    expect(result.current.state.voiceModeActive).toBe(true);

    // End
    await act(async () => {
      await result.current.endVoiceSession();
    });

    expect(result.current.state.voiceModeActive).toBe(false);
    expect(result.current.state.voiceSession).toBeNull();
    expect(mockEndVoiceSession).toHaveBeenCalledWith('sess-1');
  });

  it('should toggle voice mode on and off', async () => {
    mockStartVoiceSession.mockResolvedValue({
      __typename: 'ReactorVoiceSession',
      chatSessionId: 'sess-1',
      personaId: 'p1',
      ttsEnabled: true,
      sttEnabled: true,
    });
    mockEndVoiceSession.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    // Toggle on
    await act(async () => {
      await result.current.toggleVoiceMode('p1', 'sess-1');
    });
    expect(result.current.state.voiceModeActive).toBe(true);

    // Toggle off
    await act(async () => {
      await result.current.toggleVoiceMode('p1', 'sess-1');
    });
    expect(result.current.state.voiceModeActive).toBe(false);
  });

  it('should send a voice message and receive response', async () => {
    mockStartVoiceSession.mockResolvedValue({
      __typename: 'ReactorVoiceSession',
      chatSessionId: 'sess-1',
      personaId: 'p1',
      ttsEnabled: true,
      sttEnabled: true,
      voice: 'af_heart',
    });
    mockSendVoiceMessage.mockResolvedValue({
      __typename: 'ReactorVoiceChatMessage',
      sessionId: 'sess-1',
      content: 'Hello! How can I help?',
      role: 'assistant',
      audioBase64: 'AAAA',
      audioFormat: 'wav',
      audioDuration: 2.0,
    });

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    // Start voice session first
    await act(async () => {
      await result.current.startVoiceSession('p1', 'sess-1');
    });

    const onTranscription = jest.fn();
    const audioBlob = new Blob(['audio-data'], { type: 'audio/webm' });

    await act(async () => {
      await result.current.sendVoiceMessage(audioBlob, onTranscription);
    });

    expect(mockSendVoiceMessage).toHaveBeenCalledWith(audioBlob, {
      chatSessionId: 'sess-1',
      personaId: 'p1',
      synthesizeResponse: true,
      voice: 'af_heart',
    });
    expect(onTranscription).toHaveBeenCalledWith('Hello! How can I help?', 'AAAA');
  });

  it('should handle error when sending voice message', async () => {
    mockStartVoiceSession.mockResolvedValue({
      __typename: 'ReactorVoiceSession',
      chatSessionId: 'sess-1',
      personaId: 'p1',
      ttsEnabled: true,
      sttEnabled: true,
    });
    mockSendVoiceMessage.mockResolvedValue({
      __typename: 'ReactorErrorResponse',
      code: 'TRANSCRIPTION_FAILED',
      message: 'Could not transcribe audio',
    });

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    await act(async () => {
      await result.current.startVoiceSession('p1', 'sess-1');
    });

    await act(async () => {
      await result.current.sendVoiceMessage(new Blob([]));
    });

    expect(result.current.state.error).toBe('Could not transcribe audio');
  });

  it('should return error when sending voice message without active session', async () => {
    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    await act(async () => {
      await result.current.sendVoiceMessage(new Blob([]));
    });

    expect(result.current.state.error).toBe('No active voice session');
    expect(mockSendVoiceMessage).not.toHaveBeenCalled();
  });

  it('should stop playback', async () => {
    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    // stopPlayback should not throw when nothing is playing
    act(() => {
      result.current.stopPlayback();
    });

    expect(result.current.state.playing).toBe(false);
  });

  it('should handle start voice session network error', async () => {
    mockStartVoiceSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    await act(async () => {
      await result.current.startVoiceSession('p1');
    });

    expect(result.current.state.voiceModeActive).toBe(false);
    expect(result.current.state.error).toBe('Network error');
  });

  it('should end voice session gracefully even if server call fails', async () => {
    mockStartVoiceSession.mockResolvedValue({
      __typename: 'ReactorVoiceSession',
      chatSessionId: 'sess-1',
      personaId: 'p1',
      ttsEnabled: true,
      sttEnabled: true,
    });
    mockEndVoiceSession.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    await act(async () => {
      await result.current.startVoiceSession('p1', 'sess-1');
    });

    // Should not throw, just log and clear state
    await act(async () => {
      await result.current.endVoiceSession();
    });

    expect(result.current.state.voiceModeActive).toBe(false);
    expect(result.current.state.voiceSession).toBeNull();
  });
});
