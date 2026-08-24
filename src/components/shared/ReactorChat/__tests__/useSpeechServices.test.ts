/**
 * Tests for useSpeechServices hook
 * @module ReactorChat/hooks/__tests__/useSpeechServices
 */

import { renderHook, act } from '@testing-library/react-hooks';
import useSpeechServices, { cleanTextForSpeech, clearAudioCache } from '../hooks/useSpeechServices';

// Mock useGraph
const mockStartVoiceSession = jest.fn();
const mockEndVoiceSession = jest.fn();
const mockSendVoiceMessage = jest.fn();
const mockSynthesizeSpeech = jest.fn();

jest.mock('../hooks/graphql/useGraph', () => {
  return jest.fn(() => ({
    startVoiceSession: mockStartVoiceSession,
    endVoiceSession: mockEndVoiceSession,
    sendVoiceMessage: mockSendVoiceMessage,
    synthesizeSpeech: mockSynthesizeSpeech,
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
      paused: false,
      onended: null,
      onerror: null,
    };
    audio.play = jest.fn(() => {
      audio.paused = false;
      setTimeout(() => { if (audio.onended) audio.onended(); }, 10);
      return Promise.resolve();
    });
    audio.pause = jest.fn(() => {
      audio.paused = true;
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
    clearAudioCache();
    mockStartVoiceSession.mockReset();
    mockEndVoiceSession.mockReset();
    mockSendVoiceMessage.mockReset();
    mockSynthesizeSpeech.mockReset();
  });

  it('should return correct initial state', () => {
    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    expect(result.current.state.voiceModeActive).toBe(false);
    expect(result.current.state.voiceSession).toBeNull();
    expect(result.current.state.processing).toBe(false);
    expect(result.current.state.synthesizing).toBe(false);
    expect(result.current.state.playing).toBe(false);
    expect(result.current.state.paused).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should clean text correctly for speech synthesis', () => {
    const input = '# Header\nHere is **bold** text with `code` and ```\nblock\n``` plus [a link](http://example.com) and https://test.org';
    const cleaned = cleanTextForSpeech(input);
    expect(cleaned).not.toContain('#');
    expect(cleaned).not.toContain('**');
    expect(cleaned).not.toContain('```');
    expect(cleaned).not.toContain('http://');
    expect(cleaned).toContain('Here is bold text with code and plus a link and');
  });

  it('should synthesize text using Reactory speech service', async () => {
    mockSynthesizeSpeech.mockResolvedValue({
      audioBase64: 'UklGRi4AAABXQVZF',
      duration: 1.5,
      format: 'wav',
      sampleRate: 24000,
    });

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1', voice: 'af_heart' })
    );

    let synthResult: any;
    await act(async () => {
      synthResult = await result.current.synthesizeText('Hello world', 'af_heart', 1.0);
    });

    expect(synthResult).toBeTruthy();
    expect(synthResult.audioBase64).toBe('UklGRi4AAABXQVZF');
    expect(mockSynthesizeSpeech).toHaveBeenCalledWith({
      text: 'Hello world',
      voice: 'af_heart',
      speed: 1.0,
    });
  });

  it('should speak text and manage playback state', async () => {
    mockSynthesizeSpeech.mockResolvedValue({
      audioBase64: 'UklGRi4AAABXQVZF',
      duration: 1.5,
      format: 'wav',
      sampleRate: 24000,
    });

    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    await act(async () => {
      await result.current.speakText('Hello world');
    });

    expect(mockSynthesizeSpeech).toHaveBeenCalled();
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

  it('should stop playback', async () => {
    const { result } = renderHook(() =>
      useSpeechServices({ reactory: mockReactory, personaId: 'p1' })
    );

    act(() => {
      result.current.stopPlayback();
    });

    expect(result.current.state.playing).toBe(false);
    expect(result.current.state.paused).toBe(false);
  });
});
