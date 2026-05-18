import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatStatusIndicator from '../components/ChatStatusIndicator';
import PendingToolCallsBanner from '../components/PendingToolCallsBanner';
import ToolIterationLimitBanner from '../components/ToolIterationLimitBanner';
import NetworkStatusIndicator from '../components/NetworkStatusIndicator';
import { mockMaterial, mockIl8n } from './mockMaterial';

// ──────────────────────────────────────────────
// ChatStatusIndicator
// ──────────────────────────────────────────────
describe('ChatStatusIndicator', () => {
  const base = {
    label: 'Ready',
    icon: 'check_circle',
    color: 'success.main',
    Material: mockMaterial,
  };

  it('renders nothing when status is idle', () => {
    const { container } = render(
      <ChatStatusIndicator {...base} status="idle" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the label for thinking status', () => {
    render(<ChatStatusIndicator {...base} status="thinking" label="Thinking..." />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('renders the label for streaming status', () => {
    render(<ChatStatusIndicator {...base} status="streaming" label="Responding..." />);
    expect(screen.getByText('Responding...')).toBeInTheDocument();
  });

  it('renders the label for executing_tools status', () => {
    render(
      <ChatStatusIndicator {...base} status="executing_tools" label="Executing tools..." />
    );
    expect(screen.getByText('Executing tools...')).toBeInTheDocument();
  });

  it('renders the label for paused status', () => {
    render(<ChatStatusIndicator {...base} status="paused" label="Paused" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('renders the label for pending_resume status', () => {
    render(
      <ChatStatusIndicator {...base} status="pending_resume" label="Pending tool calls" />
    );
    expect(screen.getByText('Pending tool calls')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// PendingToolCallsBanner
// ──────────────────────────────────────────────
describe('PendingToolCallsBanner', () => {
  const onResume = jest.fn();
  const onDismiss = jest.fn();

  beforeEach(() => {
    onResume.mockClear();
    onDismiss.mockClear();
  });

  const render_ = (overrides = {}) =>
    render(
      <PendingToolCallsBanner
        pendingCount={2}
        toolNames={['readFile', 'writeFile']}
        onResume={onResume}
        onDismiss={onDismiss}
        Material={mockMaterial}
        il8n={mockIl8n}
        {...overrides}
      />
    );

  it('renders the title text', () => {
    render_();
    expect(screen.getByText('Pending Tool Calls')).toBeInTheDocument();
  });

  it('renders Resume button and calls onResume when clicked', () => {
    render_();
    const btn = screen.getByText('Resume');
    fireEvent.click(btn);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('renders Dismiss button and calls onDismiss when clicked', () => {
    render_();
    const btn = screen.getByText('Dismiss');
    fireEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────
// ToolIterationLimitBanner
// ──────────────────────────────────────────────
describe('ToolIterationLimitBanner', () => {
  const onContinue = jest.fn();
  const onStop = jest.fn();

  beforeEach(() => {
    onContinue.mockClear();
    onStop.mockClear();
  });

  const render_ = (overrides = {}) =>
    render(
      <ToolIterationLimitBanner
        iterationsCompleted={5}
        maxIterations={5}
        onContinue={onContinue}
        onStop={onStop}
        Material={mockMaterial}
        il8n={mockIl8n}
        {...overrides}
      />
    );

  it('renders the title', () => {
    render_();
    expect(screen.getByText('Tool Iteration Limit Reached')).toBeInTheDocument();
  });

  it('calls onContinue when Continue is clicked', () => {
    render_();
    fireEvent.click(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('calls onStop when Stop is clicked', () => {
    render_();
    fireEvent.click(screen.getByText('Stop'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('passes the updated maxIterations value when Continue is clicked after changing the input', () => {
    render_();
    const input = screen.getByRole('spinbutton');
    // Change value to 10
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByText('Continue'));
    // onContinue called with 10 (different from original 5)
    expect(onContinue).toHaveBeenCalledWith(10);
  });

  it('passes undefined when maxIterations is unchanged', () => {
    render_();
    // Input starts at 5, same as maxIterations — no change
    fireEvent.click(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalledWith(undefined);
  });
});

// ──────────────────────────────────────────────
// NetworkStatusIndicator
// ──────────────────────────────────────────────
describe('NetworkStatusIndicator', () => {
  const onRetry = jest.fn();
  const onDismiss = jest.fn();

  beforeEach(() => {
    onRetry.mockClear();
    onDismiss.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const render_ = (status: any, overrides = {}) =>
    render(
      <NetworkStatusIndicator
        status={status}
        networkError={null}
        reconnectAttempt={1}
        maxAttempts={5}
        onRetry={onRetry}
        onDismiss={onDismiss}
        Material={mockMaterial}
        il8n={mockIl8n}
        {...overrides}
      />
    );

  it('renders nothing for idle status', () => {
    const { container } = render_('idle');
    expect(container.firstChild).toBeNull();
  });

  it('renders reconnecting state', () => {
    render_('reconnecting');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state with Retry button', () => {
    render_('error');
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders dismiss button in error state and calls onDismiss', () => {
    render_('error');
    // Close button (icon button)
    const closeBtn = screen.getAllByRole('button').find(
      (b) => b.innerHTML.includes('close') || b.getAttribute('data-size') !== null
    );
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn!);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows Reconnected briefly after transitioning from reconnecting to connected', () => {
    const { rerender } = render_('reconnecting');
    rerender(
      <NetworkStatusIndicator
        status="connected"
        networkError={null}
        reconnectAttempt={1}
        maxAttempts={5}
        onRetry={onRetry}
        onDismiss={onDismiss}
        Material={mockMaterial}
        il8n={mockIl8n}
      />
    );
    expect(screen.getByText('Reconnected')).toBeInTheDocument();
  });

  it('auto-dismisses after 2s when reconnected', () => {
    const { rerender } = render_('reconnecting');
    rerender(
      <NetworkStatusIndicator
        status="connected"
        networkError={null}
        reconnectAttempt={1}
        maxAttempts={5}
        onRetry={onRetry}
        onDismiss={onDismiss}
        Material={mockMaterial}
        il8n={mockIl8n}
      />
    );
    jest.advanceTimersByTime(2000);
    expect(onDismiss).toHaveBeenCalled();
  });
});
