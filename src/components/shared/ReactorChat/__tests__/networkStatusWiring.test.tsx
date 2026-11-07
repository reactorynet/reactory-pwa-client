import { renderHook, act } from '@testing-library/react-hooks';
import { ToolApprovalMode } from '../types';

/**
 * Call-site wiring for the two new SSE signals.
 *
 * The hook-level suites prove `useSSE` parses the frames and `useStreamRecovery`
 * reconciles. What they cannot prove is that `useChatFactory` — the only caller —
 * actually connects them, and that a give-up reaches the UI as the terminal
 * `lost` state rather than a dismissible transient error.
 *
 * Falsification: drop `onResync` from the `useSSE({...})` options and the resync
 * test never sees `getConversation`; map a give-up back to `'error'` and the
 * first test fails.
 *
 * `useSSE` is mocked so the test can invoke the exact callbacks the hook was
 * handed, without a live transport. `useGraph` returns ONE stable object for the
 * whole file: the reconcile closure captures the object from the render that
 * created it, so a per-render object would make the assertion inspect a
 * different set of mocks than the one that was called.
 */

let capturedSSEOptions: any = null;

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

jest.mock('../hooks/useSSE', () => ({
  __esModule: true,
  default: (options: any) => {
    capturedSSEOptions = options;
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      rearm: jest.fn(() => true),
      isStreaming: false,
      connected: true,
      eventSource: null,
      currentStreamingMessage: '',
      isReconnecting: false,
      reconnectAttempt: 0,
    };
  },
  StreamingEventType: {
    TOKEN: 'token',
    REASONING: 'reasoning',
    TOOL_CALL: 'tool_call',
    COMPLETE: 'complete',
    ERROR: 'error',
    TOOL_ITERATION_LIMIT: 'tool_iteration_limit',
    INTERRUPTED: 'interrupted',
    RETRY: 'retry',
    COMPACTION: 'compaction',
    SHELL: 'shell',
    RESYNC: 'resync',
    START: 'start',
    AWAITING_CLIENT_TOOL: 'awaiting_client_tool',
  },
}));

jest.mock('../hooks/graphql/useGraph', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import useGraph from '../hooks/graphql/useGraph';
import useChatFactory from '../hooks/useChatFactory';

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

/** A STABLE options object: the hook re-runs an effect on identity changes. */
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

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  capturedSSEOptions = null;
  useGraphMock.mockReturnValue(graph);
  graph.sendMessage.mockResolvedValue({
    __typename: 'ReactorInitiateSSE',
    sessionId: 'sess-1',
    endpoint: 'http://localhost/sse',
    token: 't',
    headers: {},
  });
  graph.getConversation.mockResolvedValue({ id: 'sess-1', history: [], processing: false });
  graph.listConversations.mockResolvedValue([]);
  graph.initializeChat.mockResolvedValue('sess-1');
  graph.deleteChatSession.mockResolvedValue(true);
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useChatFactory — SSE resilience wiring', () => {
  it('surfaces an exhausted reconnect budget as the terminal `lost` state', async () => {
    const { result } = renderChat();
    expect(typeof capturedSSEOptions?.onReconnectFailed).toBe('function');

    act(() => {
      capturedSSEOptions.onReconnectFailed(9);
    });
    await flush();

    // Terminal, not the dismissible `error` state: the banner must remain.
    expect(result.current.networkStatus).toBe('lost');
    expect(result.current.networkError).toMatch(/Connection lost/);

    // ... and the give-up still reconciles the transcript, so "lost" never
    // means "silently wrong".
    expect(graph.getConversation).toHaveBeenCalledWith('sess-1');
  });

  /**
   * The production sequence, not just the mapping.
   *
   * This is the case the rejected revision missed: `useSSE` called
   * `onReconnectFailed` and then, on the same tick, `onError({ type: 'SSE_ERROR' })`.
   * Asserting only the first callback proved a mapping that production
   * immediately overwrote. The hook no longer emits that second call (see
   * `networkStatusIntegration.test.tsx`), and this test additionally pins the
   * caller's side of the contract: even if an error of that class arrives after
   * a give-up — a late PARSE_ERROR from the dead socket, an older hook build —
   * the terminal state must survive.
   */
  it('keeps the terminal state when onError(SSE_ERROR) follows onReconnectFailed', async () => {
    const { result } = renderChat();

    act(() => {
      capturedSSEOptions.onReconnectFailed(9);
      capturedSSEOptions.onError({ message: 'Streaming connection error', type: 'SSE_ERROR' });
    });
    await flush();

    expect(result.current.networkStatus).toBe('lost');
    expect(result.current.networkError).toMatch(/Connection lost/);
  });

  it('keeps the terminal state when onError(SESSION_EXPIRED) follows a give-up', async () => {
    const { result } = renderChat();

    act(() => {
      capturedSSEOptions.onReconnectFailed(3);
      capturedSSEOptions.onError({ message: 'Session token has expired', type: 'SESSION_EXPIRED' });
    });
    await flush();

    expect(result.current.networkStatus).toBe('lost');
  });

  it('forwards a host-supplied liveness override to useSSE (F4)', async () => {
    // The window is derived by default, but an operator must be able to pin it
    // through the shipped component rather than by editing the hook.
    renderChat({ sseLivenessTimeoutMs: 12_345 });
    await flush();

    expect(capturedSSEOptions?.livenessTimeoutMs).toBe(12_345);
  });

  it('leaves the liveness window derived when no override is supplied (F4)', async () => {
    renderChat();
    await flush();

    // Undefined is the signal `useSSE` uses to derive the window from the
    // server's heartbeat cadence.
    expect(capturedSSEOptions?.livenessTimeoutMs).toBeUndefined();
  });

  it('re-fetches conversation state when the server signals resync', async () => {
    const { result } = renderChat();
    expect(typeof capturedSSEOptions?.onResync).toBe('function');

    act(() => {
      capturedSSEOptions.onResync({ reason: 'evicted', requestedId: '41' });
    });
    await flush();

    // The existing recovery path was extended, not duplicated: the reconcile is
    // the same conversation fetch a reconnect uses.
    expect(graph.getConversation).toHaveBeenCalledWith('sess-1');
    // The socket is alive, so no reconnect state is manufactured.
    expect(result.current.networkStatus).not.toBe('reconnecting');
  });
});
