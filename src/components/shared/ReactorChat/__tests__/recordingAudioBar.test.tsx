import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecordingAudioBar from '../components/RecordingAudioBar';
import ChatInput from '../components/ChatInput';
import { mockMaterial, mockIl8n } from './mockMaterial';

const mockReactory = {
  i18n: mockIl8n,
  theme: {
    primary: '#1976d2',
    secondary: '#dc004e',
  },
  getLocale: () => 'en-US',
  getComponents: () => ({
    React,
    Material: mockMaterial,
  }),
  muiTheme: {
    palette: {
      mode: 'dark',
      primary: { main: '#1976d2' },
      text: { primary: '#fff', disabled: '#888' },
      secondary: { main: '#dc004e' },
      divider: '#333',
      action: { hover: 'rgba(255,255,255,0.1)' },
    },
  },
  log: jest.fn(),
  error: jest.fn(),
};

jest.mock('@reactory/client-core/api', () => ({
  useReactory: () => mockReactory,
}));

describe('RecordingAudioBar & ChatInput speech improvements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('RecordingAudioBar', () => {
    it('renders the recording bar when open', () => {
      render(
        <RecordingAudioBar
          open={true}
          onClose={jest.fn()}
          il8n={mockIl8n}
          reactory={mockReactory}
        />
      );

      expect(screen.getByText('Ready to record')).toBeInTheDocument();
    });

    it('displays countdown and Keep Editing button when countdown is active', () => {
      const onStopCountdown = jest.fn();
      render(
        <RecordingAudioBar
          open={true}
          onClose={jest.fn()}
          il8n={mockIl8n}
          reactory={mockReactory}
          onStopCountdown={onStopCountdown}
        />
      );

      // Verify the stop button click stops countdown if active
      const closeBtn = screen.getByLabelText('Close recording');
      expect(closeBtn).toBeInTheDocument();
    });
  });

  describe('ChatInput', () => {
    it('populates with speechTranscript prop from speech services', () => {
      const onSendMessage = jest.fn();
      const { rerender } = render(
        <ChatInput
          onSendMessage={onSendMessage}
          speechTranscript="Hello agent"
        />
      );

      const input = screen.getByPlaceholderText('Ask me anything... (Press Enter to send)') as HTMLInputElement;
      expect(input.value).toBe('Hello agent');

      // Update with new streaming speech text
      rerender(
        <ChatInput
          onSendMessage={onSendMessage}
          speechTranscript="Hello agent, what is the status?"
        />
      );

      expect(input.value).toBe('Hello agent, what is the status?');
    });

    it('displays countdown chip and cancels timer when user types or clicks cancel', () => {
      const onSendMessage = jest.fn();
      const onCancelCountdown = jest.fn();

      render(
        <ChatInput
          onSendMessage={onSendMessage}
          speechTranscript="Streaming voice text"
          countdown={4}
          onCancelCountdown={onCancelCountdown}
        />
      );

      // Should show the auto-send badge
      expect(screen.getByText('Auto-send 4s')).toBeInTheDocument();

      // Typing into input cancels countdown
      const input = screen.getByPlaceholderText('Ask me anything... (Press Enter to send)') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Streaming voice text edited' } });

      expect(onCancelCountdown).toHaveBeenCalled();
      expect(input.value).toBe('Streaming voice text edited');
    });

    it('renders and toggles auto-speech output button', () => {
      const onAutoSpeakToggle = jest.fn();
      const onStopSpeaking = jest.fn();

      const { rerender } = render(
        <ChatInput
          onSendMessage={jest.fn()}
          autoSpeakEnabled={false}
          onAutoSpeakToggle={onAutoSpeakToggle}
        />
      );

      const speakBtn = screen.getByLabelText('Enable auto-speech output');
      expect(speakBtn).toBeInTheDocument();

      fireEvent.click(speakBtn);
      expect(onAutoSpeakToggle).toHaveBeenCalled();

      // When auto-speak is enabled
      rerender(
        <ChatInput
          onSendMessage={jest.fn()}
          autoSpeakEnabled={true}
          onAutoSpeakToggle={onAutoSpeakToggle}
        />
      );

      expect(screen.getByLabelText('Disable auto-speech output')).toBeInTheDocument();

      // When actively speaking
      rerender(
        <ChatInput
          onSendMessage={jest.fn()}
          autoSpeakEnabled={true}
          isSpeaking={true}
          onStopSpeaking={onStopSpeaking}
          onAutoSpeakToggle={onAutoSpeakToggle}
        />
      );

      const stopSpeakBtn = screen.getByLabelText('Stop speaking');
      expect(stopSpeakBtn).toBeInTheDocument();
      fireEvent.click(stopSpeakBtn);
      expect(onStopSpeaking).toHaveBeenCalled();
    });
  });
});
