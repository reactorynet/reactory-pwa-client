import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { ToolApprovalMode } from '../types';

/**
 * Hook-level regression coverage for the client-tool pause.
 *
 * The production defect lived in `useChatFactory`'s event handlers, so this
 * suite drives those handlers directly: `useSSE` is faked so the test can hand
 * the hook the exact `tool_call` / `awaiting_client_tool` frames the server
 * sends, and `useMacros` is faked so the executor is observable.
 *
 * `document.hasFocus()` is stubbed to `false`. jsdom reports `true`, so without
 * the stub the suite would pass whether or not the focus gate existed — which is
 * exactly how the original defect survived review.
 */

const CLIENT_TOOL_CALL_ID = 'call_00_81jh';

const mockExecuteMacro = jest.fn();
let capturedMacrosProps: any = null;
let capturedSSEOptions: any = null;

jest.mock('../hooks/useMacros', () => ({
  __esModule: true,
  default: (props: any) => {
    capturedMacrosProps = props;
    const sidePanelMacro = {
      name: 'sidePanelState',
      alias: 'side_panel_state',
      nameSpace: 'reactor-macros',
      version: '1.0.0',
      runat: 'client',
    };
    return {
      getMacroById: jest.fn(),
      executeMacro: mockExecuteMacro,
      parseMacro: jest.fn(),
      macros: [sidePanelMacro],
      findMacroByAlias: (alias: string) => (alias === 'side_panel_state' ? sidePanelMacro : null),
      findMacroByName: (name: string) => (name === 'side_panel_state' ? sidePanelMacro : null),
    };
  },
}));

jest.mock('../hooks/useSSE', () => ({
  __esModule: true,
  default: (options: any) => {
    capturedSSEOptions = options;
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      rearm: jest.fn(() => false),
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
    START: 'start',
    AWAITING_CLIENT_TOOL: 'awaiting_client_tool',
  },
}));

jest.mock('../hooks/graphql/useGraph', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    sendMessage: jest.fn().mockResolvedValue({
      __typename: 'ReactorInitiateSSE',
      sessionId: 'sess-1',
      endpoint: 'http://localhost/sse',
      token: 't',
      headers: {},
    }),
    getConversation: jest.fn().mockResolvedValue({ id: 'sess-1', history: [], processing: false }),
    listConversations: jest.fn().mockResolvedValue([]),
    initializeChat: jest.fn().mockResolvedValue('sess-1'),
    executeMacro: jest.fn(),
    rateMessage: jest.fn(),
    deleteChatSession: jest.fn().mockResolvedValue(true),
    updateChatData: jest.fn(),
    setSystemPrompt: jest.fn(),
  })),
}));

import useChatFactory from '../hooks/useChatFactory';

const graphqlMutation = jest.fn();
const graphqlQuery = jest.fn();

const reactory: any = {
  getUser: () => ({ loggedIn: { id: 'user-1', roles: ['USER'], user: { id: 'user-1' } } }),
  utils: { uuid: () => `uuid-${Math.random().toString(36).slice(2)}` },
  graphqlMutation,
  graphqlQuery,
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

const makeChatState = (overrides: Record<string, any> = {}) => ({
  id: 'sess-1',
  persona,
  history: [
    {
      id: 'm1',
      role: 'assistant',
      content: 'Processing...',
      timestamp: new Date('2026-11-04T13:18:00.000Z'),
      sessionId: 'sess-1',
    },
  ],
  macros: [],
  tools: [],
  toolApprovalMode: ToolApprovalMode.AUTO,
  ...overrides,
});

const completeCalls = () =>
  graphqlMutation.mock.calls.filter((call: any[]) =>
    String(call[0]).includes('ReactorCompleteClientToolCalls'),
  );

const submittedResults = () =>
  completeCalls().flatMap((call: any[]) => (call[1]?.results ?? []) as any[]);

const continuations = () =>
  completeCalls().filter((call: any[]) => call[1]?.continueProcessing === true);

/**
 * Renders the hook with a STABLE options object.
 *
 * The hook has `useEffect(..., [existingSession, reactory])`; an options literal
 * created inside the render callback is a new object on every render, which
 * re-runs that effect, which writes state, which re-renders — an infinite loop
 * that exhausts the worker's heap. Building it once per test is required.
 */
const renderChat = (chatStateOverrides: Record<string, any> = {}) => {
  const chatState = makeChatState(chatStateOverrides);
  const options = {
    reactory,
    persona,
    protocol: 'sse' as const,
    existingSession: { chatState, isInitialized: true },
    sessionLogger,
  };
  return renderHook(() => useChatFactory(options as any));
};

const toolCallEvent = () => ({
  type: 'tool_call',
  sessionId: 'sess-1',
  conversationId: 'sess-1',
  messageId: 'msg-1',
  timestamp: new Date(),
  data: {
    id: CLIENT_TOOL_CALL_ID,
    name: 'side_panel_state',
    arguments: '{"open":true}',
    isComplete: false,
  },
});

const awaitingEvent = (calls = [{ toolCallId: CLIENT_TOOL_CALL_ID, toolName: 'side_panel_state' }]) => ({
  type: 'awaiting_client_tool',
  sessionId: 'sess-1',
  conversationId: 'sess-1',
  messageId: 'msg-2',
  timestamp: new Date(),
  data: { pendingToolCalls: calls },
});

beforeEach(() => {
  capturedMacrosProps = null;
  capturedSSEOptions = null;
  mockExecuteMacro.mockReset();
  graphqlMutation.mockReset();
  graphqlQuery.mockReset();
  (reactory.log as jest.Mock).mockClear();
  (sessionLogger.warn as jest.Mock).mockClear();

  graphqlMutation.mockResolvedValue({
    data: {
      ReactorCompleteClientToolCalls: {
        __typename: 'ReactorInitiateSSE',
        sessionId: 'sess-1',
        endpoint: 'http://localhost/sse',
        token: 't',
        headers: {},
        expiry: new Date(Date.now() + 60_000),
      },
    },
  });
  // Nothing outstanding server-side unless a test says otherwise.
  graphqlQuery.mockResolvedValue({ data: { ReactorPendingClientToolCalls: [] } });

  mockExecuteMacro.mockResolvedValue({ content: '{"mounted":true}' });

  // The defect is invisible when the tab is watched: jsdom reports hasFocus()
  // as true. Fake the OS-level focus state explicitly.
  jest.spyOn(document, 'hasFocus').mockReturnValue(false);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useChatFactory — client tool pause (hook level)', () => {
  it('executes and reports a client tool call that arrives while unfocused (AUTO)', async () => {
    const { result } = renderChat();
    expect(capturedSSEOptions?.onToolCall).toBeDefined();
    expect(capturedSSEOptions?.onAwaitingClientTool).toBeDefined();

    // 1. The server forwards the call.
    await act(async () => {
      await capturedSSEOptions.onToolCall(toolCallEvent());
    });
    expect(result.current.waitingClientToolCalls.map((c: any) => c.id)).toContain(CLIENT_TOOL_CALL_ID);

    // 2. The server announces the pause: this is what drives execution.
    await act(async () => {
      await capturedSSEOptions.onAwaitingClientTool(awaitingEvent());
    });

    // Executed despite `document.hasFocus() === false`, and the batch asked the
    // executor not to report so the batch can submit once.
    expect(mockExecuteMacro).toHaveBeenCalledTimes(1);
    expect(mockExecuteMacro.mock.calls[0][0]).toMatchObject({ alias: 'side_panel_state' });
    expect(mockExecuteMacro.mock.calls[0][3]).toBe(CLIENT_TOOL_CALL_ID);
    expect(mockExecuteMacro.mock.calls[0][4]).toEqual({ reportResult: false });

    // One submission carrying the result, then one continuation.
    expect(submittedResults()).toEqual([
      {
        toolCallId: CLIENT_TOOL_CALL_ID,
        toolName: 'side_panel_state',
        result: '{"mounted":true}',
      },
    ]);
    expect(continuations()).toHaveLength(1);

    // The blocked call is logged at warning, naming tool, call id and session.
    const warnings = (reactory.log as jest.Mock).mock.calls.filter((c: any[]) => c[2] === 'warning');
    const blocking = warnings.find((c: any[]) => String(c[0]).includes(CLIENT_TOOL_CALL_ID));
    expect(blocking).toBeDefined();
    expect(String(blocking[0])).toContain('side_panel_state');
    expect(String(blocking[0])).toContain('sess-1');

    // The pause is resolved locally.
    expect(result.current.waitingClientToolCalls).toHaveLength(0);
  });

  /**
   * Review F1 — the blocking regression.
   *
   * `ToolApprovalMode.PROMPT` is the default on both sides. A `tool_call` frame
   * is streamed before the server executes anything and irrespective of approval
   * mode, so a PROMPT session must NOT have the call executed by the implicit
   * batch (which would run it unapproved, at 1.5 s, and then again when the user
   * approved the prompt) and must not send a continuation for a turn the server
   * never paused.
   */
  it('does not execute or answer a tool_call in PROMPT mode', async () => {
    jest.useFakeTimers();
    renderChat({ toolApprovalMode: ToolApprovalMode.PROMPT });

    await act(async () => {
      await capturedSSEOptions.onToolCall(toolCallEvent());
    });

    // The 1.5 s fallback is the dangerous path: it fires without any
    // announcement from the server.
    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(mockExecuteMacro).not.toHaveBeenCalled();
    expect(completeCalls()).toHaveLength(0);
    expect(continuations()).toHaveLength(0);

    // The call is still tracked for the approval flow, which will run it once.
    expect(capturedMacrosProps?.onClientToolComplete).toBeDefined();
  });

  it('does not execute or answer a tool_call in SAFE_AUTO or PLAN mode either', async () => {
    for (const mode of [ToolApprovalMode.SAFE_AUTO, ToolApprovalMode.PLAN]) {
      mockExecuteMacro.mockClear();
      graphqlMutation.mockClear();
      jest.useFakeTimers();

      const { unmount } = renderChat({ toolApprovalMode: mode });
      await act(async () => {
        await capturedSSEOptions.onToolCall(toolCallEvent());
      });
      await act(async () => {
        jest.advanceTimersByTime(5_000);
        await Promise.resolve();
      });

      expect(mockExecuteMacro).not.toHaveBeenCalled();
      expect(completeCalls()).toHaveLength(0);
      unmount();
      jest.useRealTimers();
    }
  });

  /**
   * Acceptance criterion 2, at the site where it broke.
   *
   * The pause must do the terminal UI work `COMPLETE` used to do: drain the
   * buffered text into the message, stop the streaming indicator and surface the
   * pause — WITHOUT claiming the turn finished (`agentBusy` stays true).
   *
   * The executor is held open so the assertions run inside the paused window,
   * before the continuation restarts a stream.
   */
  it('finalises the assistant message, stops streaming and surfaces the pause', async () => {
    let releaseExecutor: (value: any) => void = () => {};
    mockExecuteMacro.mockImplementation(
      () => new Promise((resolve) => { releaseExecutor = resolve; }),
    );

    const { result } = renderChat();

    // A turn is in flight when the pause arrives: `start`/`token` are what put
    // the hook into the busy+streaming state the pause must undo.
    await act(async () => {
      capturedSSEOptions.onStreamActivity();
    });
    expect(result.current.agentBusy).toBe(true);

    await act(async () => {
      capturedSSEOptions.onToken({
        type: 'token',
        sessionId: 'sess-1',
        conversationId: 'sess-1',
        messageId: 'msg-1',
        timestamp: new Date(),
        data: { content: 'One moment', delta: 'One moment', position: 0, isComplete: false },
      });
    });
    // Let the debounced token buffer flush into the message.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(result.current.isStreaming).toBe(true);

    let handler: Promise<void> = Promise.resolve();
    act(() => {
      handler = capturedSSEOptions.onAwaitingClientTool(awaitingEvent());
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Streaming UI stopped by the pause itself. (`waitingForResponse` is
    // internal state in this hook — `isStreaming` is the exposed indicator.)
    expect(result.current.isStreaming).toBe(false);

    // ...the message was finalised, not left on the placeholder...
    const last = result.current.chatState.history[result.current.chatState.history.length - 1] as any;
    expect(last.content).toBe('One moment');
    expect(last.content).not.toBe('Processing...');

    // ...the pause is surfaced on BOTH views (hook state and chat state)...
    expect(result.current.waitingClientToolCalls.map((c: any) => c.id)).toEqual([CLIENT_TOOL_CALL_ID]);
    expect(result.current.hasWaitingClientToolCalls).toBe(true);
    expect((result.current.chatState.waitingClientToolCalls || []).map((c: any) => c.id)).toEqual([
      CLIENT_TOOL_CALL_ID,
    ]);

    // ...and the turn is NOT reported as finished.
    expect(result.current.agentBusy).toBe(true);

    // Releasing the executor resolves the pause and clears both views.
    await act(async () => {
      releaseExecutor({ content: '{"mounted":true}' });
      await handler;
    });
    expect(result.current.waitingClientToolCalls).toHaveLength(0);
    expect(result.current.chatState.waitingClientToolCalls || []).toHaveLength(0);
  });

  /**
   * Review F3 — the reload / duplicate criterion.
   *
   * The pending list is read immediately after a flush, before the server has
   * necessarily cleared the rows. The flush's answered ids are excluded from the
   * replay, so a call answered once is never submitted twice and the pause gets
   * exactly one continuation.
   */
  it('does not re-submit a call the flush already answered when the pending list lags', async () => {
    // The server still lists the call as pending, as it can immediately after a
    // submission.
    graphqlQuery.mockResolvedValue({
      data: {
        ReactorPendingClientToolCalls: [
          { toolCallId: CLIENT_TOOL_CALL_ID, toolName: 'side_panel_state', args: { open: true } },
        ],
      },
    });

    renderChat();

    await act(async () => {
      await capturedSSEOptions.onToolCall(toolCallEvent());
    });
    await act(async () => {
      await capturedSSEOptions.onAwaitingClientTool(awaitingEvent());
    });

    const forCall = submittedResults().filter((r) => r.toolCallId === CLIENT_TOOL_CALL_ID);
    expect(forCall).toHaveLength(1);
    expect(mockExecuteMacro).toHaveBeenCalledTimes(1);
    expect(continuations()).toHaveLength(1);
  });

  it('reports a rejection of the result submission without resuming the turn', async () => {
    graphqlMutation.mockImplementation(async (doc: string, variables: any) => {
      // The submission is rejected (duplicate / expired); the continuation never
      // happens because the client does not ask for one.
      if (String(doc).includes('ReactorCompleteClientToolCalls') && variables?.results?.length > 0) {
        return { data: { ReactorCompleteClientToolCalls: { __typename: 'ReactorErrorResponse', code: 'DUPLICATE', message: 'already answered' } } };
      }
      return {
        data: {
          ReactorCompleteClientToolCalls: {
            __typename: 'ReactorInitiateSSE',
            sessionId: 'sess-1',
            endpoint: 'http://localhost/sse',
            token: 't',
            headers: {},
            expiry: new Date(Date.now() + 60_000),
          },
        },
      };
    });

    renderChat();

    await act(async () => {
      await capturedSSEOptions.onToolCall(toolCallEvent());
    });
    await act(async () => {
      await capturedSSEOptions.onAwaitingClientTool(awaitingEvent());
    });

    // One submission attempt, no continuation for a rejected submission.
    expect(submittedResults()).toHaveLength(1);
    expect(continuations()).toHaveLength(0);
    expect(reactory.error).toHaveBeenCalled();
  });
});
