import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import TextToSpeechButton from '../components/TextToSpeechButton';

const mockSpeakText = jest.fn();
const mockPausePlayback = jest.fn();
const mockResumePlayback = jest.fn();
const mockStopPlayback = jest.fn();
const mockSynthesizeText = jest.fn();

const defaultSpeechState = {
  voiceModeActive: false,
  voiceSession: null,
  processing: false,
  synthesizing: false,
  playing: false,
  paused: false,
  currentText: null,
  error: null,
};

const createMockSpeechService = (overrides = {}) => ({
  state: {
    ...defaultSpeechState,
    ...overrides,
  },
  speakText: mockSpeakText,
  pausePlayback: mockPausePlayback,
  resumePlayback: mockResumePlayback,
  stopPlayback: mockStopPlayback,
  synthesizeText: mockSynthesizeText,
  playAudio: jest.fn(),
  startVoiceSession: jest.fn(),
  endVoiceSession: jest.fn(),
  toggleVoiceMode: jest.fn(),
  sendVoiceMessage: jest.fn(),
});

describe('TextToSpeechButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders idle icon button by default', () => {
    const mockSpeech = createMockSpeechService();
    const { container } = render(
      <TextToSpeechButton
        text="Hello world"
        speechService={mockSpeech as any}
      />
    );

    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('volume_up');
  });

  it('triggers speakText on click when idle', () => {
    const mockSpeech = createMockSpeechService();
    const { container } = render(
      <TextToSpeechButton
        text="Test message"
        voice="af_heart"
        speechService={mockSpeech as any}
      />
    );

    const button = container.querySelector('button')!;
    fireEvent.click(button);

    expect(mockSpeakText).toHaveBeenCalledWith('Test message', 'af_heart', 1.0);
  });

  it('triggers pausePlayback on click when currently playing', () => {
    const mockSpeech = createMockSpeechService({
      playing: true,
      currentText: 'Active message',
    });

    const { container } = render(
      <TextToSpeechButton
        text="Active message"
        speechService={mockSpeech as any}
      />
    );

    const button = container.querySelector('button')!;
    fireEvent.click(button);

    expect(mockPausePlayback).toHaveBeenCalled();
  });

  it('triggers resumePlayback on click when paused', async () => {
    const mockSpeech = createMockSpeechService({
      paused: true,
      currentText: 'Paused message',
    });

    const { container } = render(
      <TextToSpeechButton
        text="Paused message"
        speechService={mockSpeech as any}
      />
    );

    const button = container.querySelector('button')!;
    fireEvent.click(button);

    expect(mockResumePlayback).toHaveBeenCalled();
  });

  it('renders chip variant with label', () => {
    const mockSpeech = createMockSpeechService();
    const { container } = render(
      <TextToSpeechButton
        text="Chip text"
        variant="chip"
        speechService={mockSpeech as any}
      />
    );

    expect(container.textContent).toContain('Listen');
  });

  it('renders player variant with speed and playback controls', () => {
    const mockSpeech = createMockSpeechService({
      playing: true,
      currentText: 'Player text',
    });

    const { container } = render(
      <TextToSpeechButton
        text="Player text"
        variant="player"
        speechService={mockSpeech as any}
      />
    );

    expect(container.textContent).toContain('Playing');
    const stopButton = container.querySelectorAll('button')[1];
    expect(stopButton).toBeTruthy();

    fireEvent.click(stopButton);
    expect(mockStopPlayback).toHaveBeenCalled();
  });

  it('does not trigger speech when disabled or text is empty', () => {
    const mockSpeech = createMockSpeechService();
    const { container } = render(
      <TextToSpeechButton
        text=""
        disabled={true}
        speechService={mockSpeech as any}
      />
    );

    const button = container.querySelector('button');
    expect(button).toBeDisabled();
    if (button) fireEvent.click(button);

    expect(mockSpeakText).not.toHaveBeenCalled();
  });

  it('fires onPlayStateChange callback on state transitions', () => {
    const onPlayStateChange = jest.fn();
    const mockSpeech = createMockSpeechService({
      playing: true,
      currentText: 'Sample text',
    });

    render(
      <TextToSpeechButton
        text="Sample text"
        speechService={mockSpeech as any}
        onPlayStateChange={onPlayStateChange}
      />
    );

    expect(onPlayStateChange).toHaveBeenCalledWith('playing');
  });
});
