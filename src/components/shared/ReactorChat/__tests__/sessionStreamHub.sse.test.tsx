import { renderHook, act } from '@testing-library/react-hooks';

const createStreamingSessionMock = jest.fn();
jest.mock('../components/Shell/shellApi', () => ({
  createStreamingSession: (...args: any[]) => createStreamingSessionMock(...args),
}));

import { useSessionStreamHub, TrackedSession } from '../hooks/useSessionStreamHub';
import { ChatState } from '../types';

/**
 * Minimal EventSource stand-in. Records every instance so tests can assert on
 * how many streams were opened, and emit named events into them.
 */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState = FakeEventSource.OPEN;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  private listeners: Record<string, Array<(e: MessageEvent) => void>> = {};

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    (this.listeners[type] = this.listeners[type] || []).push(cb);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  /** Emit a server-shaped StreamingEvent frame on a named channel. */
  emit(type: string, data: unknown) {
    const payload = JSON.stringify({ type, sessionId: 'sse', conversationId: 'c', data });
    (this.listeners[type] || []).forEach((cb) => cb({ data: payload } as MessageEvent));
  }

  /** Simulate a terminal transport failure (HTTP error / CORS). */
  fail() {
    this.readyState = FakeEventSource.CLOSED;
    this.onerror?.();
  }
}

const reactory: any = {
  debug: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  API_ROOT: 'http://localhost:4000',
  CLIENT_KEY: 'reactor',
  getAuthToken: () => 'jwt',
};

const chats = [
  { id: 'session-a', personaId: 'p1', title: 'Session A' },
  { id: 'session-b', personaId: 'p1', title: 'Session B' },
] as unknown as ChatState[];

const find = (sessions: TrackedSession[], id: string) => sessions.find((s) => s.sessionId === id);

/** Let the connect effect's awaited fetch settle. */
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderHub = (initialProps: { active: string; status?: any; chats?: ChatState[] }) =>
  renderHook(
    ({ active, status, chats: chatList }: any) =>
      useSessionStreamHub({
        reactory,
        activeSessionId: active,
        activePersonaId: 'p1',
        chats: chatList ?? chats,
        subAgents: [],
        getPersona: () => null,
        activeSessionStatus: status ?? 'idle',
      }),
    { initialProps },
  );

describe('useSessionStreamHub background streams', () => {
  beforeEach(() => {
    (global as any).EventSource = FakeEventSource;
    FakeEventSource.instances = [];
    createStreamingSessionMock.mockReset();
    createStreamingSessionMock.mockImplementation(async (_r: any, channelId: string) => ({
      sessionId: `sse-${channelId}`,
      channelId,
      endpoint: `http://localhost:4000/reactor-chat/streaming/sse/sse-${channelId}`,
      expiresAt: '',
    }));
  });

  it('opens a background stream for the session navigated away from and reflects its events', async () => {
    const { result, rerender } = renderHub({ active: 'session-a' });
    await settle();

    // Switch to B — A is now backgrounded and must get its own stream.
    rerender({ active: 'session-b' });
    await settle();

    const streamForA = FakeEventSource.instances.find((es) => es.url.includes('sse-session-a'));
    expect(streamForA).toBeDefined();
    expect(streamForA!.readyState).toBe(FakeEventSource.OPEN);

    act(() => { streamForA!.emit('tool_call', { name: 'search_files' }); });
    expect(find(result.current.backgroundSessions, 'session-a')?.status).toBe('executing_tools');
    expect(find(result.current.backgroundSessions, 'session-a')?.lastToolName).toBe('search_files');

    act(() => { streamForA!.emit('complete', { content: 'All done.' }); });
    const a = find(result.current.backgroundSessions, 'session-a');
    expect(a?.status).toBe('completed');
    expect(a?.unread).toBe(true);
  });

  it('carries a running turn over to the background tracker on switch', async () => {
    const { result, rerender } = renderHub({ active: 'session-a', status: 'idle' });
    await settle();

    // A turn starts in A...
    rerender({ active: 'session-a', status: 'executing_tools' });
    await settle();

    // ...and the user navigates to B before it finishes.
    rerender({ active: 'session-b', status: 'idle' });

    // Busy immediately, without waiting for A's background stream to deliver.
    expect(find(result.current.backgroundSessions, 'session-a')?.status).toBe('executing_tools');
  });

  it('does not open streams before the active session is known', async () => {
    const { rerender } = renderHub({ active: undefined as any });
    await settle();

    expect(FakeEventSource.instances).toHaveLength(0);
    expect(createStreamingSessionMock).not.toHaveBeenCalled();

    rerender({ active: 'session-a' });
    await settle();
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('never opens a background stream for the active session', async () => {
    const { rerender } = renderHub({ active: 'session-a' });
    await settle();
    rerender({ active: 'session-b' });
    await settle();

    const urls = FakeEventSource.instances
      .filter((es) => es.readyState !== FakeEventSource.CLOSED)
      .map((es) => es.url);
    expect(urls.some((u) => u.includes('sse-session-b'))).toBe(false);
  });

  it('retries a failed connect instead of blacklisting the session', async () => {
    jest.useFakeTimers();
    createStreamingSessionMock.mockRejectedValueOnce(new Error('500 Internal Server Error'));

    const { rerender } = renderHub({ active: 'session-a' });
    await settle();

    // First attempt for B failed — nothing open, but the failure is reported.
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(reactory.log).toHaveBeenCalledWith(
      expect.stringContaining('Background stream connect failed for session-b'),
      expect.objectContaining({ attempts: 1 }),
      'warning',
    );

    // Backoff elapses, the retry pass wakes the connect effect, and it succeeds.
    await act(async () => { jest.advanceTimersByTime(4000); });
    await settle();

    expect(FakeEventSource.instances.map((es) => es.url)).toEqual([
      'http://localhost:4000/reactor-chat/streaming/sse/sse-session-b',
    ]);
    jest.useRealTimers();
  });

  it('retries a stream the browser closed terminally', async () => {
    jest.useFakeTimers();
    const { rerender } = renderHub({ active: 'session-a' });
    await settle();

    const first = FakeEventSource.instances[0];
    act(() => { first.fail(); });

    await act(async () => { jest.advanceTimersByTime(4000); });
    await settle();

    expect(FakeEventSource.instances).toHaveLength(2);
    jest.useRealTimers();
  });

  it('prunes and closes streams for sessions that leave scope', async () => {
    const { result, rerender } = renderHub({ active: 'session-a' });
    await settle();

    const streamForB = FakeEventSource.instances[0];
    expect(streamForB.readyState).toBe(FakeEventSource.OPEN);
    expect(result.current.backgroundSessions).toHaveLength(1);

    // Persona switch replaces the chat list.
    rerender({
      active: 'session-a',
      chats: [{ id: 'session-a', personaId: 'p1', title: 'Session A' }] as unknown as ChatState[],
    });
    await settle();

    expect(result.current.backgroundSessions).toHaveLength(0);
    expect(streamForB.readyState).toBe(FakeEventSource.CLOSED);
  });

  it('closes every stream on unmount', async () => {
    const { unmount } = renderHub({ active: 'session-a' });
    await settle();
    expect(FakeEventSource.instances).toHaveLength(1);

    unmount();
    expect(FakeEventSource.instances.every((es) => es.readyState === FakeEventSource.CLOSED)).toBe(true);
  });
});

describe('useSessionStreamHub session tracking', () => {
  beforeEach(() => {
    (global as any).EventSource = FakeEventSource;
    FakeEventSource.instances = [];
    createStreamingSessionMock.mockReset();
    createStreamingSessionMock.mockImplementation(async (_r: any, channelId: string) => ({
      sessionId: `sse-${channelId}`,
      channelId,
      endpoint: `http://localhost:4000/reactor-chat/streaming/sse/sse-${channelId}`,
      expiresAt: '',
    }));
  });

  /** Sessions spanning three different personas, as the server would return them. */
  const crossPersona = [
    { id: 'sess-c', personaId: 'agent-c', title: 'Agent C chat', updated: new Date('2026-08-26T10:00:00Z') },
    { id: 'sess-b', personaId: 'agent-b', title: 'Agent B chat', updated: new Date('2026-08-26T09:00:00Z') },
    { id: 'sess-a', personaId: 'agent-a', title: 'Agent A chat', updated: new Date('2026-08-26T08:00:00Z') },
  ] as unknown as ChatState[];

  const renderTracker = (initialProps: any) =>
    renderHook(
      ({ active, recent, chatList, subs, maxTracked }: any) =>
        useSessionStreamHub({
          reactory,
          activeSessionId: active,
          activePersonaId: 'agent-a',
          chats: chatList ?? [],
          recentSessions: recent ?? crossPersona,
          subAgents: subs ?? [],
          getPersona: () => null,
          maxTrackedSessions: maxTracked,
        }),
      { initialProps },
    );

  it('orders the stack by visit trail: A → B → C leaves B then A behind C', async () => {
    const { result, rerender } = renderTracker({ active: 'sess-a' });
    await settle();

    rerender({ active: 'sess-b' });
    await settle();
    rerender({ active: 'sess-c' });
    await settle();

    // C is active; B was left most recently, so it sits closest to the button.
    expect(result.current.backgroundSessions.map((s) => s.sessionId)).toEqual(['sess-b', 'sess-a']);
  });

  it('tracks sessions from other personas, not just the active one', async () => {
    const { result } = renderTracker({ active: 'sess-a' });
    await settle();

    const personaIds = result.current.backgroundSessions.map((s) => s.personaId);
    expect(personaIds).toEqual(expect.arrayContaining(['agent-b', 'agent-c']));
    expect(result.current.backgroundSessions.map((s) => s.title))
      .toEqual(expect.arrayContaining(['Agent B chat', 'Agent C chat']));
  });

  it('caps the tracked set', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `s-${i}`,
      personaId: `p-${i}`,
      title: `Chat ${i}`,
      updated: new Date(Date.now() - i * 1000),
    })) as unknown as ChatState[];

    const { result } = renderTracker({ active: 's-0', recent: many, maxTracked: 5 });
    await settle();

    expect(result.current.backgroundSessions).toHaveLength(5);
    expect(result.current.backgroundSessions.map((s) => s.sessionId))
      .toEqual(['s-1', 's-2', 's-3', 's-4', 's-5']);
  });

  /**
   * Tracking a session in the stack is free; streaming it costs one of the
   * browser's six sockets per host, held open indefinitely. So idle sessions
   * are tracked without a stream — only the most recently left one is covered
   * speculatively, in case the handover missed a turn.
   */
  it('tracks five sessions but only streams the one it has reason to', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `s-${i}`,
      personaId: `p-${i}`,
      title: `Chat ${i}`,
      updated: new Date(Date.now() - i * 1000),
    })) as unknown as ChatState[];

    const { result } = renderTracker({ active: 's-0', recent: many, maxTracked: 5 });
    await settle();

    expect(result.current.backgroundSessions).toHaveLength(5);
    expect(FakeEventSource.instances.map((es) => es.url.split('/').pop())).toEqual(['sse-s-1']);
  });

  it('streams a session that was mid-turn when it was backgrounded', async () => {
    const { rerender } = renderTracker({ active: 'sess-a', status: 'idle' });
    await settle();
    FakeEventSource.instances = [];

    // A turn is running in A, then the user switches to C (skipping B, so A is
    // not rank 0 by virtue of being the only candidate).
    rerender({ active: 'sess-a', status: 'executing_tools' });
    await settle();
    rerender({ active: 'sess-c', status: 'idle' });
    await settle();

    const streamed = FakeEventSource.instances.map((es) => es.url.split('/').pop());
    expect(streamed).toContain('sse-sess-a');
  });

  it('releases the socket when the background turn ends', async () => {
    const { result, rerender } = renderTracker({ active: 'sess-a' });
    await settle();
    rerender({ active: 'sess-b' });
    await settle();

    const stream = FakeEventSource.instances.find((es) => es.url.includes('sse-sess-a'));
    expect(stream!.readyState).toBe(FakeEventSource.OPEN);

    act(() => { stream!.emit('complete', { content: 'done' }); });

    // Socket handed back, badge kept.
    expect(stream!.readyState).toBe(FakeEventSource.CLOSED);
    const a = result.current.backgroundSessions.find((s) => s.sessionId === 'sess-a');
    expect(a?.status).toBe('completed');
    expect(a?.unread).toBe(true);
  });

  it('suspends connects while the active conversation is loading', async () => {
    const { result } = renderHook(
      ({ defer }: any) =>
        useSessionStreamHub({
          reactory,
          activeSessionId: 'sess-a',
          activePersonaId: 'agent-a',
          chats: [],
          recentSessions: crossPersona,
          subAgents: [],
          getPersona: () => null,
          deferConnections: defer,
        }),
      { initialProps: { defer: true } },
    );
    await settle();

    // Tracked and rendered, but no socket taken from the load.
    expect(result.current.backgroundSessions.length).toBeGreaterThan(0);
    expect(createStreamingSessionMock).not.toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  /**
   * Regression guard for socket exhaustion: the speculative rank-0 stream must
   * be released when the session is demoted, or every slot ends up permanently
   * occupied by idle sessions as the user moves around and nothing else can
   * connect.
   */
  it('releases an idle session stream once it is demoted out of rank 0', async () => {
    const { rerender } = renderTracker({ active: 'sess-a' });
    await settle();

    // A active → B is rank 0 and gets the speculative stream.
    rerender({ active: 'sess-b' });
    await settle();
    const streamForA = FakeEventSource.instances.find((es) => es.url.includes('sse-sess-a'));
    expect(streamForA!.readyState).toBe(FakeEventSource.OPEN);

    // Now leave B too: B takes rank 0, A is demoted to rank 1 while idle.
    rerender({ active: 'sess-c' });
    await settle();

    expect(streamForA!.readyState).toBe(FakeEventSource.CLOSED);
    const streamForB = FakeEventSource.instances.find((es) => es.url.includes('sse-sess-b'));
    expect(streamForB!.readyState).toBe(FakeEventSource.OPEN);
  });

  it('never holds more streams than the connection cap', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `s-${i}`,
      personaId: `p-${i}`,
      title: `Chat ${i}`,
      updated: new Date(Date.now() - i * 1000),
    })) as unknown as ChatState[];

    const { rerender } = renderTracker({ active: 's-0', recent: many, maxTracked: 5 });
    await settle();

    // Walk through several sessions, as the navigation would.
    for (const active of ['s-1', 's-2', 's-3', 's-4', 's-1']) {
      rerender({ active, recent: many, maxTracked: 5 });
      await settle();
      const open = FakeEventSource.instances.filter((es) => es.readyState === FakeEventSource.OPEN);
      expect(open.length).toBeLessThanOrEqual(2);
    }
  });

  // Sub-agents always need a stream, so they are the way to exercise the cap
  // itself rather than the needs-a-stream gating.
  const threeSubAgents = [
    { id: 'sub-1', personaId: 'agent-a', title: 'Task one' },
    { id: 'sub-2', personaId: 'agent-a', title: 'Task two' },
    { id: 'sub-3', personaId: 'agent-a', title: 'Task three' },
  ];

  /**
   * Same-origin streams share the six-socket pool with GraphQL and the CDN, so
   * the hub holds itself to one until it can see they live elsewhere.
   */
  it('clamps to a single stream while streams share the API origin', async () => {
    renderTracker({ active: 'sess-a', subs: threeSubAgents });
    await settle();

    const open = FakeEventSource.instances.filter((es) => es.readyState === FakeEventSource.OPEN);
    expect(open).toHaveLength(1);
    expect(reactory.log).toHaveBeenCalledWith(
      expect.stringContaining('share the API origin'),
      expect.anything(),
      'warning',
    );
  });

  it('uses the full cap once streams are served from their own origin', async () => {
    // What the server mints with SSE_URI_ROOT pointed at another origin.
    createStreamingSessionMock.mockImplementation(async (_r: any, channelId: string) => ({
      sessionId: `sse-${channelId}`,
      channelId,
      endpoint: `http://127.0.0.1:4000/reactor-chat/streaming/sse/sse-${channelId}`,
      expiresAt: '',
    }));

    renderTracker({ active: 'sess-a', subs: threeSubAgents });
    await settle();
    await settle();

    // Default cap is 2, so three eligible sub-agents still yield two streams.
    const open = FakeEventSource.instances.filter((es) => es.readyState === FakeEventSource.OPEN);
    expect(open).toHaveLength(2);
  });

  it('still includes sub-agents of the active session', async () => {
    const { result } = renderTracker({
      active: 'sess-a',
      subs: [{ id: 'sub-1', personaId: 'agent-a', title: 'Research task' }],
    });
    await settle();

    const sub = result.current.backgroundSessions.find((s) => s.sessionId === 'sub-1');
    expect(sub?.isSubAgent).toBe(true);
    expect(sub?.parentSessionId).toBe('sess-a');
  });
});

describe('useSessionStreamHub update coalescing', () => {
  beforeEach(() => {
    (global as any).EventSource = FakeEventSource;
    FakeEventSource.instances = [];
    createStreamingSessionMock.mockReset();
    createStreamingSessionMock.mockImplementation(async (_r: any, channelId: string) => ({
      sessionId: `sse-${channelId}`,
      channelId,
      endpoint: `http://localhost:4000/reactor-chat/streaming/sse/sse-${channelId}`,
      expiresAt: '',
    }));
  });

  /** Get the stream the hub opened for a backgrounded session. */
  const backgroundStreamFor = (id: string) =>
    FakeEventSource.instances.find((es) => es.url.includes(`sse-${id}`))!;

  /**
   * The hub sits inside ReactorChat and ChatList is not memoised, so one state
   * update per streamed token means one full-tree render per token. A slow
   * provider does not reduce that cost, it just spaces the stalls out.
   */
  it('does not re-render per streamed token', async () => {
    const { result, rerender } = renderHub({ active: 'session-a' });
    await settle();
    rerender({ active: 'session-b' });
    await settle();

    const stream = backgroundStreamFor('session-a');
    // First token moves idle -> streaming, which flushes immediately.
    act(() => { stream.emit('token', { content: 'a' }); });
    const rendersAfterFirstToken = result.all.length;

    // 40 further tokens change nothing a user perceives.
    act(() => {
      for (let i = 0; i < 40; i++) stream.emit('token', { content: 'x' });
    });

    expect(result.all.length).toBe(rendersAfterFirstToken);
    expect(result.current.backgroundSessions[0].status).toBe('streaming');
  });

  it('publishes the accumulated preview once the window elapses', async () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHub({ active: 'session-a' });
    await settle();
    rerender({ active: 'session-b' });
    await settle();

    const stream = backgroundStreamFor('session-a');
    act(() => { stream.emit('token', { content: 'Hello' }); });
    act(() => { stream.emit('token', { content: ' world' }); });

    // Coalesced: the tail is not visible yet.
    expect(result.current.backgroundSessions[0].lastMessage).toBe('Hello');

    act(() => { jest.advanceTimersByTime(300); });
    expect(result.current.backgroundSessions[0].lastMessage).toBe('Hello world');
    jest.useRealTimers();
  });

  it('flushes a status change immediately', async () => {
    const { result, rerender } = renderHub({ active: 'session-a' });
    await settle();
    rerender({ active: 'session-b' });
    await settle();

    const stream = backgroundStreamFor('session-a');
    act(() => { stream.emit('token', { content: 'x' }); });
    expect(result.current.backgroundSessions[0].status).toBe('streaming');

    // streaming -> executing_tools is a visible change, so no waiting.
    act(() => { stream.emit('tool_call', { name: 'grep' }); });
    expect(result.current.backgroundSessions[0].status).toBe('executing_tools');
    expect(result.current.backgroundSessions[0].lastToolName).toBe('grep');
  });

  it('flushes a finished turn immediately, preview included', async () => {
    const { result, rerender } = renderHub({ active: 'session-a' });
    await settle();
    rerender({ active: 'session-b' });
    await settle();

    const stream = backgroundStreamFor('session-a');
    act(() => { stream.emit('token', { content: 'partial' }); });
    act(() => { stream.emit('complete', { content: 'Done at last.' }); });

    const a = result.current.backgroundSessions[0];
    expect(a.status).toBe('completed');
    expect(a.unread).toBe(true);
    expect(a.lastMessage).toBe('Done at last.');
  });

  it('keeps accumulating across a flush without losing text', async () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHub({ active: 'session-a' });
    await settle();
    rerender({ active: 'session-b' });
    await settle();

    const stream = backgroundStreamFor('session-a');
    act(() => { stream.emit('token', { content: 'one ' }); });
    act(() => { jest.advanceTimersByTime(300); });
    act(() => { stream.emit('token', { content: 'two ' }); });
    act(() => { jest.advanceTimersByTime(300); });
    act(() => { stream.emit('token', { content: 'three' }); });
    act(() => { jest.advanceTimersByTime(300); });

    expect(result.current.backgroundSessions[0].lastMessage).toBe('one two three');
    jest.useRealTimers();
  });
});
