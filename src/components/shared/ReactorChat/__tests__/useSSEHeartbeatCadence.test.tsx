import { renderHook, act } from '@testing-library/react-hooks';
import useSSE, {
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MULTIPLIER,
  SSE_LIVENESS_MAX_TIMEOUT_MS,
  SSE_LIVENESS_MIN_TIMEOUT_MS,
  SSE_LIVENESS_TIMEOUT_MS,
  deriveLivenessTimeoutMs,
  resolveLivenessTimeoutMs,
} from '../hooks/useSSE';

/**
 * The dead-stream window is a *measurement*, not a guess.
 *
 * The reported defect: the server's keepalive was an SSE comment (`: heartbeat`),
 * which `EventSource` never surfaces, so the client's watchdog never reset and
 * closed a healthy socket after five minutes of an active turn. The server half
 * now emits a NAMED `event: heartbeat`, which reaches `noteFrame()`.
 *
 * These tests pin the three properties that keep the client honest afterwards:
 *
 *   1. a named heartbeat resets the staleness timer (C1);
 *   2. the window is derived from the observed cadence — 3× the interval, with a
 *      floor and ceiling — and falls back to the legacy five minutes only while
 *      no heartbeat has ever been seen (C2);
 *   3. a cadence-derived window still tolerates a long pause between tokens (C2
 *      regression guard), and an operator override is read at arm time.
 *
 * Falsification for C2: the derivation test advances less than the five-minute
 * fallback and asserts a recycle. Leave the timeout at 5 minutes and it fails,
 * even though heartbeats are present — it proves the derivation is in effect,
 * not merely that a constant exists.
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

  /** A NAMED heartbeat frame (`event: heartbeat`), as the server half emits it. */
  heartbeat() {
    (this.listeners['heartbeat'] || []).forEach((cb) => cb({ data: 'ping' } as MessageEvent));
  }

  /**
   * A heartbeat delivered as an UNNAMED data frame instead — `data:
   * {"type":"heartbeat"}` with no `event:` line. Not what the server sends today,
   * but `handleMessage` advertises the `case` and it must behave identically:
   * reset the watchdog and feed the cadence measurement.
   */
  heartbeatDataFrame() {
    const payload = JSON.stringify({ type: 'heartbeat', sessionId: 's1', conversationId: 's1', data: {} });
    this.onmessage?.({ data: payload } as MessageEvent);
  }

  /** A named streaming event (delivered only to that channel's listeners). */
  emitNamed(type: string, data: unknown) {
    const payload = JSON.stringify({ type, sessionId: 's1', conversationId: 's1', data });
    (this.listeners[type] || []).forEach((cb) => cb({ data: payload } as MessageEvent));
  }

  /** A JSON streaming event with no `event:` line, i.e. delivered via onmessage. */
  emitDataFrame(type: string, data: unknown) {
    const payload = JSON.stringify({ type, sessionId: 's1', conversationId: 's1', data });
    this.onmessage?.({ data: payload } as MessageEvent);
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

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
};

/** Establish a measured cadence of `cadenceMs` and leave the stream open. */
const openWithCadence = async (cadenceMs: number, beats = 2) => {
  FakeEventSource.instances[0].open();
  for (let beat = 0; beat < beats; beat += 1) {
    if (beat > 0) await advance(cadenceMs);
    act(() => {
      latest().heartbeat();
    });
  }
};

beforeEach(() => {
  (global as any).EventSource = FakeEventSource;
  FakeEventSource.instances = [];
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-07T10:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('deriveLivenessTimeoutMs', () => {
  it('derives three heartbeat intervals from the observed cadence', () => {
    expect(deriveLivenessTimeoutMs(DEFAULT_HEARTBEAT_INTERVAL_MS)).toBe(
      DEFAULT_HEARTBEAT_INTERVAL_MS * HEARTBEAT_TIMEOUT_MULTIPLIER,
    );
    expect(deriveLivenessTimeoutMs(25_000)).toBe(75_000);
  });

  it('applies the floor so a fast cadence cannot make a slow token stream look dead', () => {
    // The server's per-turn heartbeat is 15 s; 3× that would be 45 s, which is
    // less than a legitimate pause between tokens.
    expect(deriveLivenessTimeoutMs(15_000)).toBe(SSE_LIVENESS_MIN_TIMEOUT_MS);
    expect(SSE_LIVENESS_MIN_TIMEOUT_MS).toBeGreaterThan(40_000);
  });

  it('applies the ceiling so detection latency stays bounded', () => {
    expect(deriveLivenessTimeoutMs(90_000)).toBe(SSE_LIVENESS_MAX_TIMEOUT_MS);
  });

  it('falls back to the legacy five minutes when no heartbeat has ever been seen', () => {
    // An older server only sends an SSE comment, which EventSource hides.
    expect(deriveLivenessTimeoutMs(null)).toBe(SSE_LIVENESS_TIMEOUT_MS);
    expect(deriveLivenessTimeoutMs(undefined)).toBe(SSE_LIVENESS_TIMEOUT_MS);
    expect(deriveLivenessTimeoutMs(0)).toBe(SSE_LIVENESS_TIMEOUT_MS);
    // The fallback must not be shorter than the derived floor, or an older
    // server would be watchdog-hammered.
    expect(SSE_LIVENESS_TIMEOUT_MS).toBeGreaterThan(SSE_LIVENESS_MAX_TIMEOUT_MS);
  });

  it('prefers an explicit override over the derivation', () => {
    expect(resolveLivenessTimeoutMs(5_000, 25_000)).toBe(5_000);
    expect(resolveLivenessTimeoutMs(undefined, 25_000)).toBe(75_000);
    expect(resolveLivenessTimeoutMs(0, 25_000)).toBe(75_000);
  });
});

describe('useSSE — heartbeat-driven liveness', () => {
  it('resets the staleness timer on every named heartbeat (C1)', async () => {
    const onReconnecting = jest.fn();
    const { result } = renderHook(() => useSSE({ reactory, turnActive: true, onReconnecting }));

    act(() => {
      result.current.connect(connectOpts);
    });

    // Establish a 25 s cadence, which derives a 75 s window.
    await openWithCadence(25_000);

    // Ten minutes of a silent tool step, kept alive only by named heartbeats.
    // If the `heartbeat` listener did not reach `noteFrame()`, the timer armed
    // at the last heartbeat would recycle the stream 75 s later.
    for (let elapsed = 0; elapsed < 10 * 60 * 1000; elapsed += 25_000) {
      await advance(25_000);
      act(() => {
        latest().heartbeat();
      });
    }

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(onReconnecting).not.toHaveBeenCalled();
  });

  it('also resets the timer for a heartbeat delivered as an unnamed data frame', async () => {
    // The `case 'heartbeat'` in `handleMessage` advertises this path. It is not
    // what the server sends, but a client that advertised it and then recycled a
    // stream that was beating would be lying about its own contract.
    const onHeartbeat = jest.fn();
    const onStreamActivity = jest.fn();
    const { result } = renderHook(() =>
      useSSE({ reactory, turnActive: true, onHeartbeat, onStreamActivity }),
    );

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    // Two data-frame heartbeats 25 s apart ⇒ a 75 s window derived from them.
    act(() => {
      latest().heartbeatDataFrame();
    });
    await advance(25_000);
    act(() => {
      latest().heartbeatDataFrame();
    });

    // Four more minutes of silence would have tripped the 5-minute fallback; the
    // derived window trips at 75 s, so this proves the data frame was measured
    // AND that it reset the timer.
    for (let elapsed = 0; elapsed < 6 * 60 * 1000; elapsed += 25_000) {
      await advance(25_000);
      act(() => {
        latest().heartbeatDataFrame();
      });
    }

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(onHeartbeat.mock.calls.length).toBeGreaterThan(10);
    // A keepalive is transport liveness only — never content activity.
    expect(onStreamActivity).not.toHaveBeenCalled();
  });

  it('recycles a stream that stops beating after less than the five-minute fallback (C2)', async () => {
    const { result } = renderHook(() => useSSE({ reactory, turnActive: true }));

    act(() => {
      result.current.connect(connectOpts);
    });

    // Two heartbeats 25 s apart ⇒ a 75 s window, not 300 s.
    await openWithCadence(25_000);

    // Nothing at all from here: the socket is dead even though `onerror` never
    // fires. 126 s is well inside the old five-minute guess.
    await advance(76_000);
    await advance(2_000);

    // With the timeout left at 5 minutes this assertion fails: no reconnect has
    // been scheduled yet, which is exactly the false negative the ticket is
    // about.
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('keeps the five-minute fallback when no heartbeat is ever received (older server)', async () => {
    const onReconnecting = jest.fn();
    const { result } = renderHook(() => useSSE({ reactory, turnActive: true, onReconnecting }));

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    // Three minutes of silence: a cadence-less client must not have derived a
    // short window and gone into a reconnect loop.
    await advance(3 * 60 * 1000);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(onReconnecting).not.toHaveBeenCalled();

    // Only the legacy fallback fires, and only once.
    await advance(2 * 60 * 1000);
    await advance(2_000);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(onReconnecting).toHaveBeenCalledTimes(1);
  });

  it('does not treat a 40 s pause between tokens as a dead stream (C2 regression guard)', async () => {
    const { result } = renderHook(() => useSSE({ reactory, turnActive: true }));

    act(() => {
      result.current.connect(connectOpts);
    });
    await openWithCadence(25_000);

    // A slow model: one token, then 40 s of silence, then another token. The
    // derived window is 75 s, so the pause must survive — and the second token
    // re-arms it for the next pause.
    act(() => {
      latest().emitDataFrame('token', { content: 'a', delta: 'a', position: 0, isComplete: false });
    });
    await advance(40_000);
    act(() => {
      latest().emitDataFrame('token', { content: 'b', delta: 'b', position: 1, isComplete: false });
    });
    await advance(40_000);

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('uses an explicit livenessTimeoutMs override instead of the derivation', async () => {
    const onReconnecting = jest.fn();
    const { result } = renderHook(() =>
      useSSE({ reactory, turnActive: true, onReconnecting, livenessTimeoutMs: 5_000 }),
    );

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    await advance(5_100);
    await advance(2_000);

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(onReconnecting).toHaveBeenCalledTimes(1);
  });

  it('reads the override at arm time, so a change takes effect without reconnecting', async () => {
    const { result, rerender } = renderHook(
      ({ timeout }: { timeout: number }) =>
        useSSE({ reactory, turnActive: true, livenessTimeoutMs: timeout }),
      { initialProps: { timeout: 60_000 } },
    );

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    // Armed with 60 s. Move 30 s in, then tighten the override and let a
    // heartbeat re-arm the timer: a value captured at bind time would still be
    // 60 s here and nothing would recycle.
    await advance(30_000);
    rerender({ timeout: 5_000 });
    act(() => {
      latest().heartbeat();
    });
    await advance(5_100);
    await advance(2_000);

    expect(FakeEventSource.instances).toHaveLength(2);
  });
});
