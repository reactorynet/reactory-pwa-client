import { renderHook, act } from '@testing-library/react-hooks';
import useSSE, { ResyncSignal } from '../hooks/useSSE';
import useStreamRecovery from '../hooks/useStreamRecovery';

/**
 * C4 — the server's `resync` signal.
 *
 * When the client reconnects with a `Last-Event-ID` that the server's bounded
 * replay buffer has already evicted, the server cannot replay the gap: the
 * socket is alive but resuming from it silently skips whatever was missed. The
 * server says so explicitly with a `resync` frame.
 *
 * The client must react by re-fetching conversation state through the SAME
 * reconcile path `useStreamRecovery` already owns — not by inventing a second
 * recovery mechanism. These tests wire the two hooks exactly as
 * `useChatFactory` does and assert that the frame reaches that path.
 *
 * Falsification: delete the `resync` listener from `addStreamListeners` and the
 * reconciler is never called — the named-frame tests fail rather than silently
 * passing. Deleting the `case 'resync'` in `handleMessage` breaks the unnamed
 * data-frame test the same way.
 */

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState = FakeEventSource.OPEN;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  private listeners: Record<string, Array<(event: MessageEvent) => void>> = {};

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (event: MessageEvent) => void) {
    (this.listeners[type] = this.listeners[type] || []).push(cb);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  open() {
    this.readyState = FakeEventSource.OPEN;
    this.onopen?.();
  }

  /** Deliver a NAMED frame verbatim, exactly as EventSource would. */
  emitNamed(type: string, data?: string) {
    (this.listeners[type] || []).forEach((cb) => cb({ data } as MessageEvent));
  }

  /** Deliver an unnamed data frame (no `event:` line), reaching `onmessage`. */
  emitDataFrame(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
  }
}

const reactory: any = {
  debug: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
};

const connectOpts = {
  endpoint: 'http://localhost:4000/reactor-chat/streaming/sse/s1',
  sessionId: 's1',
};

const latest = (): FakeEventSource => FakeEventSource.instances[FakeEventSource.instances.length - 1];

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setup = () => {
  const resync = jest.fn().mockResolvedValue({ processing: true, settled: false });
  const onResync = jest.fn<void, [ResyncSignal]>();

  const { result } = renderHook(() => {
    const recovery = useStreamRecovery({
      busy: true,
      enabled: true,
      resync,
    });
    const sse = useSSE({
      reactory,
      turnActive: true,
      onResync: (signal) => {
        onResync(signal);
        // Exactly what `useChatFactory` does: extend the existing path.
        recovery.handleResyncRequest();
      },
    });
    return { recovery, sse };
  });

  act(() => {
    result.current.sse.connect(connectOpts);
  });
  act(() => {
    latest().open();
  });

  return { result, resync, onResync };
};

beforeEach(() => {
  (global as any).EventSource = FakeEventSource;
  FakeEventSource.instances = [];
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-07T10:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useSSE — server resync signal', () => {
  it('re-fetches conversation state through useStreamRecovery when resync arrives', async () => {
    const { resync, onResync } = setup();

    expect(resync).not.toHaveBeenCalled();

    act(() => {
      latest().emitNamed(
        'resync',
        JSON.stringify({
          type: 'resync',
          sessionId: 's1',
          conversationId: 's1',
          data: { reason: 'evicted', requestedId: '41', oldestAvailableId: '90' },
        }),
      );
    });
    await settle();

    // The frame's payload is normalised, not thrown away.
    expect(onResync).toHaveBeenCalledTimes(1);
    expect(onResync.mock.calls[0][0]).toEqual({
      reason: 'evicted',
      requestedId: '41',
      oldestAvailableId: '90',
    });

    // ... and it lands on the reconciler every other recovery reason uses.
    expect(resync).toHaveBeenCalledTimes(1);
    expect(resync).toHaveBeenCalledWith('resync');
  });

  it('tolerates a bare-token resync frame', async () => {
    const { resync, onResync } = setup();

    act(() => {
      latest().emitNamed('resync', 'evicted');
    });
    await settle();

    expect(onResync.mock.calls[0][0]).toMatchObject({ reason: 'evicted' });
    expect(resync).toHaveBeenCalledWith('resync');
  });

  it('handles resync arriving as an unnamed data frame', async () => {
    // `handleMessage`'s `case 'resync'` covers a server (or proxy) that frames
    // the signal as ordinary data rather than as a named event. Both routes must
    // reach the same reconcile.
    const { resync, onResync } = setup();

    act(() => {
      latest().emitDataFrame({
        type: 'resync',
        sessionId: 's1',
        conversationId: 's1',
        data: { reason: 'unknown-id', requestedId: '7' },
      });
    });
    await settle();

    expect(onResync.mock.calls[0][0]).toMatchObject({ reason: 'unknown-id', requestedId: '7' });
    expect(resync).toHaveBeenCalledWith('resync');
  });

  it('does not treat the resync frame as a dead or completed stream', async () => {
    const { result } = setup();

    act(() => {
      latest().emitNamed('resync', 'evicted');
    });
    await settle();

    // The socket is alive; only the *gap* is unobservable. No reconnect is
    // manufactured and the turn is not declared over.
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(result.current.sse.isReconnecting).toBe(false);
    expect(result.current.sse.connected).toBe(true);
  });
});
