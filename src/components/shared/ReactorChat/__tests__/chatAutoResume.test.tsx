import { renderHook, act } from '@testing-library/react-hooks';
import { ChatState, ToolApprovalMode } from '../types';
import { resolveAutoSessionTarget } from '../personaAutoSession';

/**
 * Auto-resume must not read the search-filtered history list — REACTORY-302016408 R1.
 *
 * The regression under test: making the search term part of the shared list
 * state meant `ReactorChat`'s persona-load effect was resolving "which
 * conversation do I resume?" from the SAME filtered list the history panel
 * renders. In the default standalone configuration (`autoResume = true`) a user
 * who searched, closed the panel and switched agent would then either resume an
 * old matching thread instead of their latest one, or — when nothing matched —
 * get a brand new conversation silently created for them.
 *
 * The fix is two separate questions asked separately:
 *   * DISPLAY  — `refreshChatList` (filtered; this is the panel's list)
 *   * RESUME   — `getMostRecentChatForPersona` (unfiltered probe, limit 1)
 *
 * These tests drive the real hook, so they fail if the probe ever starts
 * carrying the committed term, or if the resume decision is fed the filtered
 * list again.
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

jest.mock('../hooks/useSSE', () => ({
  __esModule: true,
  default: () => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    rearm: jest.fn(() => true),
    isStreaming: false,
    connected: true,
    eventSource: null,
    currentStreamingMessage: '',
    isReconnecting: false,
    reconnectAttempt: 0,
  }),
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

jest.mock('../hooks/graphql/useGraph', () => ({ __esModule: true, default: jest.fn() }));

import useGraph from '../hooks/graphql/useGraph';
import useChatFactory from '../hooks/useChatFactory';

const useGraphMock = useGraph as unknown as jest.Mock;

const graph = {
  sendMessage: jest.fn(),
  getConversation: jest.fn(),
  listConversations: jest.fn(),
  deleteChatSession: jest.fn(),
  updateChatData: jest.fn(),
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
const edges = [{ name: 'workflowId', value: 'wf-1', edge_type: 'workflow' }];

const row = (id: string, personaId = 'persona-1'): ChatState =>
  ({ id, personaId, title: id, created: new Date('2026-01-01T00:00:00.000Z') } as ChatState);

/**
 * A STABLE options object per render.
 *
 * The hook re-runs `useEffect(..., [existingSession, reactory])`. Building this
 * object inside the `renderHook` callback gives `existingSession` a new
 * identity on every render, the effect writes state, the write re-renders, and
 * the suite exhausts the worker heap. The object is therefore constructed once,
 * per test, and handed to `renderHook` by reference.
 */
const renderChat = (overrides: Record<string, any> = {}) => {
  const options = {
    reactory,
    persona,
    protocol: 'sse' as const,
    existingSession: {
      chatState: {
        id: 'sess-1',
        persona,
        history: [],
        macros: [],
        tools: [],
        toolApprovalMode: ToolApprovalMode.AUTO,
      },
      isInitialized: true,
    },
    sessionLogger,
    useCase: 'workflow',
    edges,
    ...overrides,
  };
  return renderHook(() => useChatFactory(options as any));
};

beforeEach(() => {
  Object.keys(graph).forEach((key) => {
    (graph as any)[key]?.mockReset?.();
  });
  useGraphMock.mockReset();
  useGraphMock.mockReturnValue(graph as any);
  graph.sendMessage.mockResolvedValue({
    __typename: 'ReactorInitiateSSE',
    sessionId: 'sess-1',
    endpoint: 'http://localhost/sse',
    token: 't',
    headers: {},
  });
  graph.getConversation.mockResolvedValue({ id: 'sess-1', history: [], processing: false });
  graph.listConversations.mockResolvedValue([]);
  graph.deleteChatSession.mockResolvedValue(true);
  graph.updateChatData.mockResolvedValue({ id: 'sess-1', title: 'Edited' });
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getMostRecentChatForPersona — unfiltered resume probe', () => {
  it('is exposed by the hook', () => {
    const { result } = renderChat();
    expect(typeof result.current.getMostRecentChatForPersona).toBe('function');
  });

  it('never carries the committed search term', async () => {
    const { result } = renderChat();

    // The user searches first, so the committed term is in force.
    graph.listConversations.mockResolvedValue([row('email-1')]);
    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });
    expect(result.current.chatListFilter.search).toBe('Email Templates');

    graph.listConversations.mockClear();
    graph.listConversations.mockResolvedValue([row('newest-thread')]);

    let recent: any;
    await act(async () => {
      recent = await result.current.getMostRecentChatForPersona('persona-2');
    });

    // This is the whole point of R1: the resume probe is UNFILTERED.
    const sent = graph.listConversations.mock.calls[0][0];
    expect('search' in sent).toBe(false);
    expect(sent.personaId).toBe('persona-2');
    expect(sent.limit).toBe(1);
    expect(sent.offset).toBe(0);
    // Host scope still applies, exactly like every other list call.
    expect(sent.use_case).toBe('workflow');
    expect(sent.edges).toEqual(edges);

    expect(recent?.id).toBe('newest-thread');
    // The display list is untouched by the probe.
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-1']);
  });

  it('returns null when the persona has no conversations', async () => {
    const { result } = renderChat();
    graph.listConversations.mockResolvedValue([]);

    let recent: any;
    await act(async () => {
      recent = await result.current.getMostRecentChatForPersona('persona-2');
    });

    expect(recent).toBeNull();
  });

  it('does not write the rendered history list', async () => {
    const { result } = renderChat();

    graph.listConversations.mockResolvedValue([row('a'), row('b')]);
    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['a', 'b']);

    graph.listConversations.mockResolvedValue([row('probe-only')]);
    await act(async () => {
      await result.current.getMostRecentChatForPersona('persona-2');
    });

    // `chats` is the panel's list; the probe must not clobber it.
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['a', 'b']);
  });
});

describe('auto-resume decision after a committed search', () => {
  it('zero search matches must NOT create a new conversation for the new persona', async () => {
    const { result } = renderChat();

    // 1. The user searches; nothing matches, so the DISPLAY list is empty.
    graph.listConversations.mockResolvedValueOnce([]);
    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });
    expect(result.current.chats).toEqual([]);
    expect(result.current.chatListFilter.search).toBe('Email Templates');

    // 2. They switch agent. The display refresh for persona B also returns
    //    nothing (the term matches nothing there either)...
    graph.listConversations.mockResolvedValueOnce([]);
    await act(async () => {
      await result.current.refreshChatList(
        { personaId: 'persona-2', use_case: 'workflow', edges },
        { preserveWindow: false },
      );
    });
    expect(result.current.chats).toEqual([]);

    // 3. ...but persona B *does* have a most recent conversation, which the
    //    unfiltered probe finds.
    graph.listConversations.mockResolvedValueOnce([row('persona-2-latest', 'persona-2')]);
    let recent: any;
    await act(async () => {
      recent = await result.current.getMostRecentChatForPersona('persona-2');
    });

    // 4. The decision therefore resumes — it never falls through to newChat().
    const target = resolveAutoSessionTarget({ autoResume: true, recent });
    expect(target).toEqual({ kind: 'resume', sessionId: 'persona-2-latest' });
    expect(graph.listConversations).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ search: expect.anything() }),
    );
  });

  it('a search match must not override the persona’s latest conversation', async () => {
    const { result } = renderChat();

    // The committed term matches an OLDER thread.
    graph.listConversations.mockResolvedValueOnce([row('email-old')]);
    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-old']);

    // The unfiltered probe returns the persona's LATEST thread, which the
    // search did not match (otherwise it would have been in the list).
    graph.listConversations.mockResolvedValueOnce([row('latest-thread')]);
    let recent: any;
    await act(async () => {
      recent = await result.current.getMostRecentChatForPersona('persona-2');
    });

    const target = resolveAutoSessionTarget({ autoResume: true, recent });
    // Resuming the newest thread, NOT the search match.
    expect(target).toEqual({ kind: 'resume', sessionId: 'latest-thread' });

    // The display list still shows the filtered result (the feature is intact).
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-old']);
    expect(result.current.chatListFilter.search).toBe('Email Templates');
  });

  it('honours autoResume = false even when the probe finds a conversation', async () => {
    const { result } = renderChat();
    graph.listConversations.mockResolvedValueOnce([row('latest-thread')]);

    let recent: any;
    await act(async () => {
      recent = await result.current.getMostRecentChatForPersona('persona-2');
    });

    expect(resolveAutoSessionTarget({ autoResume: false, recent })).toEqual({ kind: 'create' });
  });

  it('keeps the term and the filtered rows across the persona switch (display path unchanged)', async () => {
    const { result } = renderChat();

    graph.listConversations.mockResolvedValueOnce([row('email-1')]);
    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });

    graph.listConversations.mockClear();
    graph.listConversations.mockResolvedValueOnce([row('email-2', 'persona-2')]);
    await act(async () => {
      await result.current.refreshChatList(
        { personaId: 'persona-2', use_case: 'workflow', edges },
        { preserveWindow: false },
      );
    });

    expect(result.current.chatListFilter.search).toBe('Email Templates');
    expect(graph.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Email Templates', personaId: 'persona-2' }),
    );
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-2']);
  });
});
