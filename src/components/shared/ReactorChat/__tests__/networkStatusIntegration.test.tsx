import { renderHook, act } from '@testing-library/react-hooks';
import { ToolApprovalMode } from '../types';

/**
 * End-to-end: the real `useSSE`, the real `useStreamRecovery` and the real
 * `useChatFactory`, driven through a fake `EventSource`.
 *
 * This file exists because the earlier wiring suite only proved the *mapping*
 * (`onReconnectFailed` → `'lost'`) and not the *sequence*. In the rejected
 * revision `useSSE.attemptReconnect` fired `onReconnectFailed` and then
 * immediately `onError({ type: 'SSE_ERROR' })`; the second call was the last
 * write and downgraded the terminal state to the dismissible `error` pill. A
 * single-callback test could not see that.
 *
 * Two facts discovered while writing this, both reflected below:
 *
 *   - The give-up branch that is actually reachable in production is the
 *     STREAMING-SESSION age one (55 min), not the 4 h elapsed budget: a stream
 *     that old is always past `STREAM_SESSION_MAX_AGE_MS` first. That branch
 *     reports through `onSessionExpired` and then asks the server for a *fresh*
 *     session, so it is only terminal when that re-init also fails.
 *   - Both give-up branches now report ONLY through the dedicated callback, so
 *     `onError` can no longer be the last write. The first describe asserts that
 *     at the hook level; the second asserts the user-visible outcome.
 *
 * Falsification: re-add `onError(SSE_ERROR)` after `giveUp()` in useSSE and the
 * hook-level test fails. Remove the terminal guard in `useChatFactory.onError`
 * and the late-parse-error test fails (`error` instead of `lost`).
 */

jest.mock('../hooks/useMacros', () => ({
  __esModule: true,
  default: () => ({
    getMacroById: jest.fn(),
    executeMacro: jest.fn(),
    parseMacro: jest.fn(),
    macros: [],
    findMacroByAlias: () => null,
    findMacroByName: () => null,
  }),
}));

jest.mock('../hooks/graphql/useGraph', () => ({
  __esModule: true,
  default: jest.fn(),
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState = FakeEventSource.CONNECTING;
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

  /** The browser fired `open`; the transport is live. */
  open() {
    this.readyState = FakeEventSource.OPEN;
    this.onopen?.();
  }

  /** A terminal transport failure, exactly as EventSource reports it. */
  fail() {
    this.readyState = FakeEventSource.CLOSED;
    this.onerror?.();
  }

  /** A malformed data frame: the only way to reach `PARSE_ERROR`. */
  sendMalformedFrame() {
    this.onmessage?.({ data: '{ this is not json' } as MessageEvent);
  }
}

import useGraph from '../hooks/graphql/useGraph';
import useChatFactory from '../hooks/useChatFactory';
import useSSE from '../hooks/useSSE';

const useGraphMock = useGraph as unknown as jest.Mock;

const graph = {
  sendMessage: jest.fn(),
  getConversation: jest.fn(),
  listConversations: jest.fn(),
  initializeChat: jest.fn(),
  executeMacro: jest.fn(),
  rateMessage: jest.fn(),
  deleteChatSession: jest.fn(),
  updateChatData: jest.fn(),
  setSystemPrompt: jest.fn(),
};

const reactory: any = {
  getUser: () => ({ loggedIn: { id: 'user-1', roles: ['USER'], user: { id: 'user-1' } } }),
  utils: { uuid: () => `uuid-${Math.random().toString(36).slice(2)}` },
  graphqlMutation: jest.fn(),
  graphqlQuery: jest.fn().mockResolvedValue({ data: { ReactorPendingClientToolCalls: [] } }),
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  getComponent: () => null,
  isDevelopmentMode: () => false,
  amq: { $pub: { def: jest.fn() } },
};

const sessionLogger: any = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const persona: any = { id: 'persona-1', name: 'Reactor', tools: [], macros: [] };

const chatState = () => ({
  id: 'sess-1',
  persona,
  history: [
    {
      id: 'm1',
      role: 'assistant',
      content: 'Working…',
      timestamp: new Date('2026-11-07T09:00:00.000Z'),
      sessionId: 'sess-1',
    },
  ],
  macros: [],
  tools: [],
  toolApprovalMode: ToolApprovalMode.AUTO,
});

const initiateSse = () => ({
  __typename: 'ReactorInitiateSSE',
  sessionId: 'sess-1',
  endpoint: 'http://localhost:4000/reactor-chat/streaming/sse/s1',
  token: 't',
  headers: {},
});

/** A STABLE options object: an identity change re-runs effects inside the hook. */
const renderChat = (overrides: Record<string, any> = {}) => {
  const options = {
    reactory,
    persona,
    protocol: 'sse' as const,
    existingSession: { chatState: chatState(), isInitialized: true },
    sessionLogger,
    ...overrides,
  };
  return renderHook(() => useChatFactory(options as any));
};

const latest = (): FakeEventSource => FakeEventSource.instances[FakeEventSource.instances.length - 1];

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** Send one message so the hook opens a real stream against the fake transport. */
const startTurn = async (result: any) => {
  await act(async () => {
    await result.current.sendMessage('hello', 'sess-1');
  });
  await flush();
  expect(FakeEventSource.instances.length).toBeGreaterThan(0);
  act(() => {
    latest().open();
  });
  await flush();
};

const STREAM_SESSION_MAX_AGE_MS = 55 * 60 * 1000;

beforeEach(() => {
  (global as any).EventSource = FakeEventSource;
  FakeEventSource.instances = [];
  useGraphMock.mockReturnValue(graph);
  graph.sendMessage.mockResolvedValue(initiateSse());
  graph.getConversation.mockResolvedValue({ id: 'sess-1', history: [], processing: false });
  graph.listConversations.mockResolvedValue([]);
  graph.initializeChat.mockResolvedValue('sess-1');
  graph.deleteChatSession.mockResolvedValue(true);
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-07T10:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useSSE — a give-up never reports through onError', () => {
  const connectOpts = {
    endpoint: 'http://localhost:4000/reactor-chat/streaming/sse/s1',
    sessionId: 's1',
  };

  it('reports the streaming-session give-up through onSessionExpired only', async () => {
    const onReconnectFailed = jest.fn();
    const onSessionExpired = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useSSE({ reactory, turnActive: true, onReconnectFailed, onSessionExpired, onError }),
    );

    act(() => {
      result.current.connect(connectOpts);
    });
    act(() => {
      latest().open();
    });

    // Past the streaming-session lifetime: retrying this URL can never succeed.
    jest.setSystemTime(new Date(Date.now() + STREAM_SESSION_MAX_AGE_MS + 1_000));
    act(() => {
      latest().fail();
    });
    await flush();

    expect(onReconnectFailed).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    // The rejected revision fired `onError(SESSION_EXPIRED)` here, AFTER
    // `giveUp`, so the caller's terminal state was immediately overwritten.
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports an expired session token through onReconnectFailed only', async () => {
    const onReconnectFailed = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useSSE({ reactory, turnActive: true, onReconnectFailed, onError }),
    );

    act(() => {
      result.current.connect({ ...connectOpts, expiry: new Date(Date.now() + 1_000) });
    });
    act(() => {
      latest().open();
    });

    jest.setSystemTime(new Date(Date.now() + 5_000));
    act(() => {
      latest().fail();
    });
    await flush();

    expect(onReconnectFailed).toHaveBeenCalledTimes(1);
    // Was `onError({ type: 'SESSION_EXPIRED' })` in the rejected revision.
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('reconnect give-up → terminal stale state (real hooks)', () => {
  it('keeps the terminal `lost` state when the fresh-session re-init also fails', async () => {
    const { result } = renderChat();
    await startTurn(result);

    // The server is gone: asking for a fresh streaming session fails too.
    graph.sendMessage.mockResolvedValue({ __typename: 'ReactorErrorResponse', message: 'offline' });

    jest.setSystemTime(new Date(Date.now() + STREAM_SESSION_MAX_AGE_MS + 1_000));
    act(() => {
      latest().fail();
    });
    await flush();

    expect(result.current.networkStatus).toBe('lost');
    expect(result.current.reconnectAttempt).toBe(0);
  });

  it('does not let a late parse error downgrade the terminal state', async () => {
    const { result } = renderChat();
    await startTurn(result);

    graph.sendMessage.mockResolvedValue({ __typename: 'ReactorErrorResponse', message: 'offline' });
    jest.setSystemTime(new Date(Date.now() + STREAM_SESSION_MAX_AGE_MS + 1_000));
    act(() => {
      latest().fail();
    });
    await flush();
    expect(result.current.networkStatus).toBe('lost');

    // A dead stream frequently produces one more error — a truncated frame that
    // fails to parse, a stale `error` event. `PARSE_ERROR` maps to the
    // dismissible `error` pill, so without the terminal guard this single frame
    // would replace the persistent band with something the user can close.
    act(() => {
      latest().sendMalformedFrame();
    });
    await flush();

    expect(result.current.networkStatus).toBe('lost');
  });

  it('recovers from the terminal state when the transport is re-armed', async () => {
    const { result } = renderChat();
    await startTurn(result);

    graph.sendMessage.mockResolvedValue({ __typename: 'ReactorErrorResponse', message: 'offline' });
    jest.setSystemTime(new Date(Date.now() + STREAM_SESSION_MAX_AGE_MS + 1_000));
    act(() => {
      latest().fail();
    });
    await flush();
    expect(result.current.networkStatus).toBe('lost');

    // The band's own affordance: rearm() opens a new transport.
    graph.sendMessage.mockResolvedValue(initiateSse());
    act(() => {
      result.current.retryConnection();
    });
    await flush();

    expect(result.current.networkStatus).toBe('reconnecting');

    act(() => {
      latest().open();
    });
    await flush();

    expect(result.current.networkStatus).toBe('connected');
  });
});
