import { renderHook, act } from '@testing-library/react-hooks';
import useSSE, { StreamingEventType } from '../hooks/useSSE';

/**
 * Minimal EventSource stand-in, matching the one used by the reconnect suite.
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

  emit(type: string, data: unknown) {
    const payload = JSON.stringify({ type, sessionId: 's1', conversationId: 's1', data });
    (this.listeners[type] || []).forEach((cb) => cb({ data: payload } as MessageEvent));
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

/**
 * Regression coverage for the missing `awaiting_client_tool` contract.
 *
 * The server stopped emitting `complete` while a client-tool result is
 * outstanding and emits `awaiting_client_tool` instead. The client used to fall
 * through to `default: reactory.debug('unknown event')`, so a paused turn
 * delivered no terminal event at all and the UI stayed "streaming" forever.
 */
describe('SSE awaiting_client_tool', () => {
  beforeEach(() => {
    (global as any).EventSource = FakeEventSource;
    FakeEventSource.instances = [];
    jest.useFakeTimers();
    reactory.debug.mockClear();
    reactory.log.mockClear();
    reactory.error.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const connect = (opts: Record<string, any>) => {
    const hook = renderHook(() => useSSE({ reactory, ...opts }));
    act(() => {
      hook.result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });
    return hook;
  };

  it('dispatches the event, clears the streaming state and surfaces the pause', () => {
    const onAwaitingClientTool = jest.fn();
    const onMessage = jest.fn();
    const onStreamActivity = jest.fn();
    const { result } = connect({ onAwaitingClientTool, onMessage, onStreamActivity });

    // A turn is streaming.
    act(() => {
      latest().emit('token', { content: 'Working on it', delta: 'Working on it' });
    });
    expect(result.current.isStreaming).toBe(true);

    act(() => {
      latest().emit(StreamingEventType.AWAITING_CLIENT_TOOL, {
        pendingToolCalls: [{ toolCallId: 'call_00_81jh', toolName: 'side_panel_state' }],
      });
    });

    // The event is no longer silently dropped.
    expect(onAwaitingClientTool).toHaveBeenCalledTimes(1);
    expect(onAwaitingClientTool.mock.calls[0][0]).toMatchObject({
      type: 'awaiting_client_tool',
      data: { pendingToolCalls: [{ toolCallId: 'call_00_81jh', toolName: 'side_panel_state' }] },
    });

    // Streaming UI stopped, but no completion was claimed.
    expect(result.current.isStreaming).toBe(false);
    expect(onMessage).not.toHaveBeenCalled();

    // It is still activity: the turn is paused, not finished.
    expect(onStreamActivity).toHaveBeenCalled();

    // A call blocking a turn is logged at warning, naming tool and call id.
    const warningCall = reactory.log.mock.calls.find((c: any[]) => c[2] === 'warning');
    expect(warningCall).toBeDefined();
    expect(String(warningCall[0])).toContain('side_panel_state');
    expect(String(warningCall[0])).toContain('call_00_81jh');
  });

  it('flushes drip-fed content before surfacing the pause so the message is finalised', () => {
    const onToken = jest.fn();
    const onAwaitingClientTool = jest.fn();
    const { result } = connect({ onToken, onAwaitingClientTool });

    // Exceeds DRIP_THRESHOLD (80 chars), so it is queued word by word instead
    // of delivered synchronously.
    const longText = 'A fairly long assistant preamble that is definitely longer than the drip threshold of eighty characters.';
    act(() => {
      latest().emit('token', { content: longText, delta: longText });
    });

    act(() => {
      latest().emit(StreamingEventType.AWAITING_CLIENT_TOOL, {
        pendingToolCalls: [{ toolCallId: 'call_1', toolName: 'chart' }],
      });
    });

    // Everything the model produced before the pause reached the consumer,
    // without waiting for the drip timer to finish.
    const delivered = onToken.mock.calls.map((c: any[]) => String(c[0]?.data?.delta ?? '')).join('');
    expect(delivered.length).toBeGreaterThan(0);
    expect(longText.startsWith(delivered.slice(0, 20))).toBe(true);
    expect(result.current.isStreaming).toBe(false);
    expect(onAwaitingClientTool).toHaveBeenCalledTimes(1);
  });

  it('does not mistake the pause for completion', () => {
    const onMessage = jest.fn();
    const onHeartbeat = jest.fn();
    connect({ onMessage, onHeartbeat });

    // `open` already produced one heartbeat; the pause must not add another
    // (it is not transport evidence) and must not produce a completion.
    const heartbeatsAfterOpen = onHeartbeat.mock.calls.length;

    act(() => {
      latest().emit('token', { content: 'partial', delta: 'partial' });
      latest().emit(StreamingEventType.AWAITING_CLIENT_TOOL, { pendingToolCalls: [] });
    });

    expect(onMessage).not.toHaveBeenCalled();
    expect(onHeartbeat.mock.calls.length).toBe(heartbeatsAfterOpen);
  });});
