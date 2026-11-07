import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NetworkStatusIndicator from '../components/NetworkStatusIndicator';
import { mockMaterial, mockIl8n } from './mockMaterial';

/**
 * C3 — the terminal "connection lost" state must be explicit and persistent.
 *
 * `onReconnectFailed` fires when the reconnect budget is exhausted. Until this
 * change the pill used the same dismissible `error` state as a transient parse
 * failure, so the user could close the only evidence that the transcript had
 * stopped updating — leaving a frozen stream that is indistinguishable from a
 * hung agent. `lost` is therefore its own status: it stays on screen and keeps
 * offering a reconnect.
 *
 * Falsification: remove (or stop rendering) the indicator and these assertions
 * have nothing to match; drop the `lost` branch and the label/affordance revert
 * to the dismissible error pill, so the "no dismiss control" assertion fails.
 */

const onRetry = jest.fn();
const onDismiss = jest.fn();

const render_ = (status: any, overrides: Record<string, any> = {}) =>
  render(
    <NetworkStatusIndicator
      status={status}
      networkError={null}
      reconnectAttempt={1}
      maxAttempts={0}
      onRetry={onRetry}
      onDismiss={onDismiss}
      Material={mockMaterial}
      il8n={mockIl8n}
      {...overrides}
    />,
  );

/**
 * The dismiss control is queried by its accessible name (`close`), not by a
 * mock-specific attribute: `data-size` only exists because `PassthroughIconButton`
 * emits it, so asserting on it would couple the "no dismiss control" rule to the
 * test double rather than to what a user (or screen reader) can actually reach.
 */
const dismissControls = () => screen.queryAllByRole('button', { name: /close/i });

beforeEach(() => {
  onRetry.mockClear();
  onDismiss.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('NetworkStatusIndicator — terminal stale state', () => {
  it('renders an explicit, non-dismissible connection-lost band with a reconnect affordance', () => {
    render_('lost');

    expect(screen.getByText('Connection lost — transcript may be stale')).toBeInTheDocument();

    // The affordance must be present AND do something.
    const reconnect = screen.getByText('Reconnect');
    fireEvent.click(reconnect);
    expect(onRetry).toHaveBeenCalledTimes(1);

    // Persistent: no dismiss control, so the user cannot hide the only sign
    // that the stream stopped.
    expect(dismissControls()).toHaveLength(0);
  });

  it('exposes the stale state to assistive technology', () => {
    render_('lost', { networkError: 'Connection lost. The conversation will be refreshed from the server.' });

    const band = screen.getByRole('status');
    expect(band).toHaveAttribute('title', 'Connection lost. The conversation will be refreshed from the server.');
    expect(band).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps a transient error dismissible', () => {
    // Regression: `error` covers one-off parse/stream failures the user may
    // dismiss. Only the give-up state is terminal.
    render_('error');
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
    expect(dismissControls()).toHaveLength(1);
  });

  it('still shows progress while reconnecting', () => {
    render_('reconnecting');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Reconnect')).toBeNull();
  });
});
