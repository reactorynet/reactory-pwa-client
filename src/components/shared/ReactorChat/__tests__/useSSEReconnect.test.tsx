import { renderHook, act } from '@testing-library/react-hooks';
import useSSE, {
  computeReconnectDelay,
  RECONNECT_MAX_ELAPSED_MS,
  SSE_LIVENESS_TIMEOUT_MS,
} from '../hooks/useSSE';
import useStreamRecovery from '../hooks/useStreamRecovery';

/**
 * Minimal EventSource stand-in. Records every instance so tests can assert on
 * how many streams were opened, and can open/fail/emit into a specific one.
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

  /** Simulate a terminal transport failure (HTTP error / CORS / socket reset). */
  fail() {
    this.readyState = FakeEventSource.CLOSED;
    this.onerror?.();
  }

  emit(type: string, data: unknown) {
    const payload = JSON.stringify({ type, sessionId: 's1', conversationId: 's1', data });
    (this.listeners[type] || []).forEach((cb) => cb({ data: payload } as MessageEvent));
  }

  /** A server keepalive: a bare token, deliberately not a JSON streaming event. */
  emitKeepalive() {
    (this.listeners['heartbeat'] || []).forEach((cb) => cb({ data: 'ping' } as MessageEvent));
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

describe('SSE reconnect policy', () => {
  beforeEach(() => {
    (global as any).EventSource = FakeEventSource;
    FakeEventSource.instances = [];
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-24T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('computeReconnectDelay', () => {
    it('backs off exponentially from the base delay', () => {
      expect(computeReconnectDelay(1, () => 0.5)).toBe(1_000);
      expect(computeReconnectDelay(2, () => 0.5)).toBe(2_000);
      expect(computeReconnectDelay(3, () => 0.5)).toBe(4_000);
      expect(computeReconnectDelay(4, () => 0.5)).toBe(8_000);
      expect(computeReconnectDelay(5, () => 0.5)).toBe(16_000);
    });

    it('caps each delay instead of growing without bound', () => {
      expect(computeReconnectDelay(20, () => 0.5)).toBe(30_000);
      expect(computeReconnectDelay(200, () => 1)).toBe(30_000);
    });

    it('spreads each delay by ±25% within a 250 ms floor and the per-delay cap', () => {
      expect(computeReconnectDelay(1, () => 0)).toBe(750);
      expect(computeReconnectDelay(1, () => 1)).toBe(1_250);
      expect(computeReconnectDelay(1, () => 0)).toBeGreaterThanOrEqual(750);
    });
  });

  it('keeps retrying far past the old five-attempt / 31-second ceiling', async () => {
    const onReconnectFailed = jest.fn();
    const onReconnecting = jest.fn();
    const onReconnected = jest.fn();

    const { result } = renderHook(() =>
      useSSE({ reactory, onReconnectFailed, onReconnecting, onReconnected }),
    );

    act(() => {
      result.current.connect(connectOpts);
    });
    expect(FakeEventSource.instances).toHaveLength(1);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      act(() => {
        latest().fail();
      });
      await act(async () => {
        jest.advanceTimersByTime(31_000);
      });
    }

    // Nine streams: the original plus eight retries. The old policy stopped at
    // five attempts with a 31-second budget and never tried again.
    expect(FakeEventSource.instances).toHaveLength(9);
    expect(onReconnectFailed).not.toHaveBeenCalled();
    expect(onReconnecting).toHaveBeenCalledTimes(8);
    expect(onReconnecting.mock.calls[7][0]).toBe(8);
    expect(result.current.isReconnecting).toBe(true);

    // The server comes back: the transport recovers without a reload.
    act(() => {
      latest().open();
    });
    expect(onReconnected).toHaveBeenCalledTimes(1);
    expect(result.current.isReconnecting).toBe(false);
  });

  it('gives up only once the elapsed budget is exhausted, and says so', async () => {
    const onReconnectFailed = jest.fn();
    const { result } = renderHook(() => useSSE({ reactory, onReconnectFailed }));

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().fail();
    });
    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });

    // Stand-in for a machine that slept / a proxy that black-holed the socket
    // for longer than the budget, rather than waiting four real hours.
    jest.setSystemTime(new Date(Date.now() + RECONNECT_MAX_ELAPSED_MS + 1_000));

    act(() => {
      latest().fail();
    });
    await settle();

    expect(onReconnectFailed).toHaveBeenCalledTimes(1);
    // The number reported is the attempts that were actually made, which is
    // what the user-facing log and the caller's banner should say.
    expect(onReconnectFailed.mock.calls[0][0]).toBeGreaterThanOrEqual(1);
    expect(result.current.isReconnecting).toBe(false);
  });

  it('rearm() revives a transport that gave up', async () => {
    const onReconnectFailed = jest.fn();
    const onReconnected = jest.fn();
    const { result } = renderHook(() =>
      useSSE({ reactory, onReconnectFailed, onReconnected }),
    );

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().fail();
    });
    jest.setSystemTime(new Date(Date.now() + RECONNECT_MAX_ELAPSED_MS + 1_000));
    act(() => {
      latest().fail();
    });
    await settle();
    expect(onReconnectFailed).toHaveBeenCalledTimes(1);

    const before = FakeEventSource.instances.length;
    let revived = false;
    act(() => {
      revived = result.current.rearm();
    });

    expect(revived).toBe(true);
    expect(FakeEventSource.instances).toHaveLength(before + 1);

    act(() => {
      latest().open();
    });
    expect(onReconnected).toHaveBeenCalledTimes(1);
  });

  it('rearm() leaves a healthy stream alone', () => {
    const { result } = renderHook(() => useSSE({ reactory }));

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    const before = FakeEventSource.instances.length;
    let revived = true;
    act(() => {
      revived = result.current.rearm();
    });

    expect(revived).toBe(false);
    expect(FakeEventSource.instances).toHaveLength(before);
  });

  it('surfaces keepalive frames as heartbeats, never as content activity', () => {
    const onHeartbeat = jest.fn();
    const onStreamActivity = jest.fn();
    const { result } = renderHook(() => useSSE({ reactory, onHeartbeat, onStreamActivity }));

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });
    act(() => {
      latest().emitKeepalive();
    });

    expect(onHeartbeat).toHaveBeenCalled();
    expect(onStreamActivity).not.toHaveBeenCalled();
  });

  it('recycles a live-but-silent stream after the liveness window while a turn is running', async () => {
    const { result } = renderHook(() => useSSE({ reactory, turnActive: true }));

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    // No data and no keepalive for the whole window: the socket is presumed
    // dead even though the browser never fired onerror.
    await act(async () => {
      jest.advanceTimersByTime(SSE_LIVENESS_TIMEOUT_MS);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(FakeEventSource.instances.length).toBe(2);
  });

  it('leaves an idle open chat alone: no reconnect, no resync, one stream', async () => {
    // Regression: the backstop used to be armed on every opened stream, so a
    // perfectly healthy idle chat closed and reopened its SSE connection every
    // five minutes — flashing 'Reconnecting...'/'Reconnected' and forcing a
    // conversation fetch each time. `loadChat` re-establishes a stream for every
    // session it loads, so idle open streams are the common case.
    const onReconnecting = jest.fn();
    const onReconnected = jest.fn();
    const onReconnectFailed = jest.fn();
    const onHeartbeat = jest.fn();

    const { result } = renderHook(() => useSSE({
      reactory,
      onReconnecting,
      onReconnected,
      onReconnectFailed,
      onHeartbeat,
      // No turn in flight: this is a chat sitting open with nothing to do.
      turnActive: false,
    }));

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    for (let window = 0; window < 3; window += 1) {
      await act(async () => {
        jest.advanceTimersByTime(SSE_LIVENESS_TIMEOUT_MS);
        await Promise.resolve();
      });
    }

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].readyState).toBe(FakeEventSource.OPEN);
    expect(onReconnecting).not.toHaveBeenCalled();
    expect(onReconnected).not.toHaveBeenCalled();
    expect(onReconnectFailed).not.toHaveBeenCalled();
    expect(result.current.isReconnecting).toBe(false);
  });

  it('starts watching liveness when a turn begins and stops when it ends', async () => {
    const { result, rerender } = renderHook(
      ({ turnActive }: { turnActive: boolean }) => useSSE({ reactory, turnActive }),
      { initialProps: { turnActive: false } },
    );

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    // Idle: silence proves nothing.
    await act(async () => {
      jest.advanceTimersByTime(SSE_LIVENESS_TIMEOUT_MS);
      await Promise.resolve();
    });
    expect(FakeEventSource.instances).toHaveLength(1);

    // A turn starts: the stream must now prove it is alive.
    rerender({ turnActive: true });
    await act(async () => {
      jest.advanceTimersByTime(SSE_LIVENESS_TIMEOUT_MS);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(FakeEventSource.instances.length).toBeGreaterThan(1);
  });

  it('does not treat a 13-minute silent tool step as a dead stream', async () => {
    const { result } = renderHook(() => useSSE({ reactory, turnActive: true }));

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    // A long tool step emits nothing. Keep the transport alive with keepalives,
    // exactly as a server-side heartbeat would.
    for (let elapsed = 0; elapsed < 13 * 60 * 1000; elapsed += 15_000) {
      act(() => {
        latest().emitKeepalive();
      });
      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
    }

    expect(FakeEventSource.instances).toHaveLength(1);
  });
});

describe('SSE give-up → conversation resync', () => {
  beforeEach(() => {
    (global as any).EventSource = FakeEventSource;
    FakeEventSource.instances = [];
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-24T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reconciles the conversation when the transport gives up', async () => {
    const resync = jest.fn().mockResolvedValue({ processing: false });
    const onTurnSettled = jest.fn();

    const { result } = renderHook(() => {
      const recovery = useStreamRecovery({
        busy: true,
        enabled: true,
        resync,
        onTurnSettled,
      });
      const sse = useSSE({
        reactory,
        onReconnectFailed: () => recovery.handleReconnectFailed(),
        onReconnected: () => recovery.handleReconnected(),
      });
      return { recovery, sse };
    });

    act(() => {
      result.current.sse.connect(connectOpts);
    });

    // Exhaust the reconnect budget, exactly as an extended outage or a sleep
    // would, and let the hook give up.
    act(() => {
      latest().fail();
    });
    jest.setSystemTime(new Date(Date.now() + RECONNECT_MAX_ELAPSED_MS + 1_000));
    act(() => {
      latest().fail();
    });
    await settle();

    // The give-up path is what used to leave the tab silently wrong forever.
    expect(resync).toHaveBeenCalledWith('reconnect-failed');
    // The server says the run already finished while we were not listening.
    expect(onTurnSettled).toHaveBeenCalledTimes(1);
  });

  it('reconciles the conversation after a successful reconnect', async () => {
    const resync = jest.fn().mockResolvedValue({ processing: true });

    const { result } = renderHook(() => {
      const recovery = useStreamRecovery({
        busy: true,
        enabled: true,
        resync,
      });
      const sse = useSSE({
        reactory,
        onReconnectFailed: () => recovery.handleReconnectFailed(),
        onReconnected: () => recovery.handleReconnected(),
      });
      return { recovery, sse };
    });

    act(() => {
      result.current.sse.connect(connectOpts);
    });
    act(() => {
      latest().fail();
    });
    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });
    act(() => {
      latest().open();
    });
    await settle();

    expect(resync).toHaveBeenCalledWith('reconnected');
  });
});
