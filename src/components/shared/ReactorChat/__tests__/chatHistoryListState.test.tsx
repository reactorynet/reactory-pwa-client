import { renderHook, act } from '@testing-library/react-hooks';
import { ChatState, ToolApprovalMode } from '../types';
import { CHAT_LIST_PAGE_SIZE } from '../chatListQuery';

/**
 * Chat-history list state — the hook-level half of REACTORY-302016408.
 *
 * The reported defects were both about WHERE the list comes from:
 *
 *   1. the search term was a one-shot side effect, so any background refresh
 *      (`listChats({})` on panel open, persona switch, delete, chat-data edit)
 *      replaced the filtered rows with an unfiltered set while the field kept
 *      showing the term; and
 *   2. the list had no paging at all — "more +" only expanded rows already in
 *      memory, and the server's default limit of 50 was an unreachable ceiling.
 *
 * These tests drive the real hook (only `useGraph`/`useSSE`/`useMacros` are
 * stubbed) and assert on what reaches the GraphQL boundary, because that is
 * what actually decides the result set:
 *
 *   * the committed term is part of the fetch state, so every refresh re-sends
 *     it together with the host scope;
 *   * a stale response can never overwrite a newer one (monotonic sequence);
 *   * `offset > 0` appends and de-duplicates, and a short page ends the list.
 *
 * Falsification: drop `search` from `buildConversationFilter`, or remove the
 * sequence guard, and the corresponding test fails.
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

const edges = [{ name: 'workflowId', value: 'wf-1', edge_type: 'workflow' }];

const chatState = () => ({
  id: 'sess-1',
  persona,
  history: [],
  macros: [],
  tools: [],
  toolApprovalMode: ToolApprovalMode.AUTO,
});

const row = (id: string, title = `Conversation ${id}`): ChatState =>
  ({ id, personaId: 'persona-1', title, created: new Date('2026-01-01T00:00:00.000Z') } as ChatState);

const rows = (prefix: string, count: number): ChatState[] =>
  Array.from({ length: count }, (_, i) => row(`${prefix}-${i}`));

const renderChat = (overrides: Record<string, any> = {}) => {
  const options = {
    reactory,
    persona,
    protocol: 'sse' as const,
    existingSession: { chatState: chatState(), isInitialized: true },
    sessionLogger,
    useCase: 'workflow',
    edges,
    ...overrides,
  };
  return renderHook(() => useChatFactory(options as any));
};

/** A promise whose settlement the test controls, to force response ordering. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  // `clearMocks` in jest.config only clears CALL history; queued
  // `mockResolvedValueOnce` implementations survive between tests, which makes
  // a later test consume an earlier test's page. Reset the graph double here.
  Object.keys(graph).forEach((key) => {
    (graph as any)[key]?.mockReset?.();
  });
  useGraphMock.mockReset();
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
  graph.updateChatData.mockResolvedValue({ id: 'sess-1', title: 'Edited' });
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useChatFactory — committed search term', () => {
  it('commits the term into the list state and requests it with the host scope', async () => {
    const { result } = renderChat();
    graph.listConversations.mockResolvedValue([row('email-1', 'Email Templates walkthrough')]);

    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });

    expect(result.current.chatListFilter.search).toBe('Email Templates');
    expect(graph.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Email Templates',
        use_case: 'workflow',
        edges,
        limit: CHAT_LIST_PAGE_SIZE,
        offset: 0,
      }),
    );
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-1']);
  });

  it('a background refresh (panel re-open) keeps the term and the filtered rows', async () => {
    const { result } = renderChat();
    graph.listConversations.mockResolvedValue([row('email-1', 'Email Templates walkthrough')]);

    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });

    graph.listConversations.mockClear();
    const filtered = [row('email-1', 'Email Templates walkthrough')];
    graph.listConversations.mockResolvedValue(filtered);

    // Exactly what `handleChatHistoryPanelToggle` does on open, and what the
    // persona-switch / delete / chat-data paths do: refresh, no new filter.
    await act(async () => {
      await result.current.refreshChatList();
    });

    expect(result.current.chatListFilter.search).toBe('Email Templates');
    expect(graph.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Email Templates', use_case: 'workflow' }),
    );
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-1']);
  });

  it('a persona switch patches the persona and keeps the term', async () => {
    const { result } = renderChat();
    graph.listConversations.mockResolvedValue([row('email-1')]);

    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });

    graph.listConversations.mockClear();

    await act(async () => {
      await result.current.refreshChatList({ personaId: 'persona-2' }, { preserveWindow: false });
    });

    expect(result.current.chatListFilter).toMatchObject({
      search: 'Email Templates',
      personaId: 'persona-2',
      use_case: 'workflow',
    });
    expect(graph.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Email Templates', personaId: 'persona-2' }),
    );
  });

  it('opening the history panel unscopes the persona but keeps the term', async () => {
    // `handleChatHistoryPanelToggle` refreshes with `{ personaId: null }`: the
    // panel groups conversations across agents (which is what the old unscoped
    // `listChats({})` did) and must still honour the committed term and the
    // host scope.
    const { result } = renderChat();
    graph.listConversations.mockResolvedValue([row('email-1')]);

    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });
    expect(result.current.chatListFilter.personaId).toBe('persona-1');

    graph.listConversations.mockClear();

    await act(async () => {
      await result.current.refreshChatList({ personaId: null });
    });

    expect(result.current.chatListFilter.search).toBe('Email Templates');
    expect(result.current.chatListFilter.personaId).toBeUndefined();
    const sent = graph.listConversations.mock.calls[0][0];
    expect(sent.search).toBe('Email Templates');
    expect(sent.use_case).toBe('workflow');
    expect('personaId' in sent).toBe(false);
  });

  it('deleting a chat refreshes with the term instead of reloading everything', async () => {
    const { result } = renderChat();
    graph.listConversations.mockResolvedValue([row('email-1'), row('email-2')]);

    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });

    graph.listConversations.mockClear();
    graph.listConversations.mockResolvedValue([row('email-1')]);

    await act(async () => {
      await result.current.deleteChat('email-2');
    });

    expect(graph.deleteChatSession).toHaveBeenCalledWith('email-2');
    expect(graph.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Email Templates', use_case: 'workflow' }),
    );
    expect(result.current.chatListFilter.search).toBe('Email Templates');
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-1']);
  });

  it('editing chat details refreshes with the term instead of reloading everything', async () => {
    const { result } = renderChat();
    graph.listConversations.mockResolvedValue([row('email-1')]);

    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });

    graph.listConversations.mockClear();

    await act(async () => {
      await result.current.updateChatData('email-1', { title: 'Edited' } as any);
    });

    expect(graph.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Email Templates', use_case: 'workflow' }),
    );
    expect(result.current.chatListFilter.search).toBe('Email Templates');
  });

  it('clearing the term drops `search` from the request', async () => {
    const { result } = renderChat();

    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });
    graph.listConversations.mockClear();

    await act(async () => {
      await result.current.commitChatSearch('');
    });

    expect(result.current.chatListFilter.search).toBe('');
    const sent = graph.listConversations.mock.calls[0][0];
    expect('search' in sent).toBe(false);
  });
});

describe('useChatFactory — stale responses never win', () => {
  it('applies only the newest response when an earlier query resolves last', async () => {
    const { result } = renderChat();

    const slowPrefix = deferred<ChatState[]>();
    const fastFinal = deferred<ChatState[]>();

    graph.listConversations
      .mockReturnValueOnce(slowPrefix.promise)
      .mockReturnValueOnce(fastFinal.promise);

    let first: Promise<any>;
    let second: Promise<any>;
    act(() => {
      first = result.current.commitChatSearch('Email');
    });
    act(() => {
      // The user has settled on a different, newer term before "Email" returned.
      second = result.current.commitChatSearch('Email Templates');
    });

    // The newest request answers first...
    await act(async () => {
      fastFinal.resolve([row('final-1', 'Email Templates rollout')]);
      await Promise.resolve();
    });

    // ...and the older, slower one answers afterwards. It must be discarded:
    // "last response wins" is what rendered a prefix's rows under the final term.
    await act(async () => {
      slowPrefix.resolve([row('prefix-1', 'Email digests'), row('prefix-2', 'Email routing')]);
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(result.current.chatListFilter.search).toBe('Email Templates');
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['final-1']);
  });

  it('ignores a stale APPEND that lands after a newer search result', async () => {
    const { result } = renderChat();

    // Seed a settled page so paging has somewhere to append.
    graph.listConversations.mockResolvedValueOnce(rows('page1', CHAT_LIST_PAGE_SIZE));
    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });
    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE);

    // The user starts a "load more", then searches before the page returns.
    const slowAppend = deferred<ChatState[]>();
    const fastSearch = deferred<ChatState[]>();
    graph.listConversations
      .mockReturnValueOnce(slowAppend.promise)
      .mockReturnValueOnce(fastSearch.promise);

    let more: Promise<any>;
    let search: Promise<any>;
    act(() => {
      more = result.current.loadMoreChats();
    });
    act(() => {
      search = result.current.commitChatSearch('Email Templates');
    });

    // The search answers first...
    await act(async () => {
      fastSearch.resolve([row('email-1', 'Email Templates rollout')]);
      await Promise.resolve();
    });
    // ...then the older append lands. It belongs to the previous query, so it
    // must not be appended to the new result set.
    await act(async () => {
      slowAppend.resolve(rows('page2', CHAT_LIST_PAGE_SIZE));
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.all([more, search]);
    });

    expect(result.current.chatListFilter.search).toBe('Email Templates');
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-1']);
  });
});

describe('useChatFactory — real paging', () => {
  it('loads the first page, appends the next one and stops on a short page', async () => {
    const { result } = renderChat();

    graph.listConversations
      .mockResolvedValueOnce(rows('page1', CHAT_LIST_PAGE_SIZE))
      .mockResolvedValueOnce(rows('page2', CHAT_LIST_PAGE_SIZE))
      .mockResolvedValueOnce(rows('page3', 3));

    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });

    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE);
    expect(result.current.chatListStatus.offset).toBe(CHAT_LIST_PAGE_SIZE);
    expect(result.current.chatListStatus.exhausted).toBe(false);

    await act(async () => {
      await result.current.loadMoreChats();
    });

    // Conversation #26 and beyond are reachable.
    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE * 2);
    expect(result.current.chats[CHAT_LIST_PAGE_SIZE].id).toBe('page2-0');
    expect(graph.listConversations).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: CHAT_LIST_PAGE_SIZE, limit: CHAT_LIST_PAGE_SIZE }),
    );
    expect(result.current.chatListStatus.exhausted).toBe(false);

    await act(async () => {
      await result.current.loadMoreChats();
    });

    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE * 2 + 3);
    // Explicit terminal state after the short page.
    expect(result.current.chatListStatus.exhausted).toBe(true);

    // Further calls are inert: there is nothing more to fetch.
    graph.listConversations.mockClear();
    await act(async () => {
      await result.current.loadMoreChats();
    });
    expect(graph.listConversations).not.toHaveBeenCalled();
  });

  it('de-duplicates a row the server repeated across the page boundary', async () => {
    const { result } = renderChat();

    const page1 = rows('page1', CHAT_LIST_PAGE_SIZE);
    const page2 = [page1[page1.length - 1], ...rows('page2', 4)];

    graph.listConversations
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });
    await act(async () => {
      await result.current.loadMoreChats();
    });

    const ids = result.current.chats.map((c: any) => c.id);
    expect(ids).toHaveLength(CHAT_LIST_PAGE_SIZE + 4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a background refresh keeps the loaded window instead of collapsing to page 1', async () => {
    const { result } = renderChat();

    graph.listConversations
      .mockResolvedValueOnce(rows('page1', CHAT_LIST_PAGE_SIZE))
      .mockResolvedValueOnce(rows('page2', CHAT_LIST_PAGE_SIZE))
      .mockResolvedValueOnce([...rows('page1', CHAT_LIST_PAGE_SIZE), ...rows('page2', CHAT_LIST_PAGE_SIZE)]);

    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });
    await act(async () => {
      await result.current.loadMoreChats();
    });
    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE * 2);

    await act(async () => {
      await result.current.refreshChatList();
    });

    // The refresh asks for the rows already loaded in one window, so the user
    // does not lose page 2 by closing and re-opening the panel.
    expect(graph.listConversations).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0, limit: CHAT_LIST_PAGE_SIZE * 2 }),
    );
    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE * 2);
  });
});

/**
 * B1 — the failed-replace window, pinned end to end.
 *
 * Why: after a REPLACE fails (the user's search), the rows still on screen
 * belong to the PREVIOUS query while `chatListStatus.offset` describes the new
 * one. Two things must therefore be true, and they are the same invariant seen
 * from both ends:
 *
 *   1. `loadMoreChats` must NOT issue a request — appending a page of the new
 *      query onto the old rows would splice two different result sets
 *      together, and page one of the new query was never fetched.
 *   2. `retryChatList` must REPLACE at offset 0 (the window that actually
 *      failed), not continue from the stale offset.
 *
 * The panel mirrors (1) by hiding "Load more" while `status.error` is set; see
 * `chatHistoryPanel.test.tsx` › 'hides "Load more" after a failed replace'.
 * Falsification: drop `|| status.error` from `loadMoreChatsImpl` and the first
 * half fails; retry from `status.offset` instead of `status.retry` and the
 * second half fails.
 */
describe('useChatFactory — B1: a failed replace blocks paging and Retry replaces', () => {
  it('does not page onto stale rows and replaces them on retry', async () => {
    const { result } = renderChat();

    // 25 rows of the previous (unfiltered) query are on screen.
    graph.listConversations.mockResolvedValueOnce(rows('old', CHAT_LIST_PAGE_SIZE));
    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });
    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE);

    // The search fails — e.g. the server's regex rejects the raw term.
    graph.listConversations.mockRejectedValueOnce(new Error('invalid regex'));
    await act(async () => {
      await result.current.commitChatSearch('(Email');
    });
    expect(result.current.chatListStatus.error).toBe('invalid regex');
    expect(result.current.chatListFilter.search).toBe('(Email');

    // (1) Load more is INERT: no request, and the stale rows are untouched.
    graph.listConversations.mockClear();
    // Deliberately no queued result: the assertion is that NO request is
    // issued. A queued `mockResolvedValueOnce` here would (a) weaken that into
    // "the call happened but was ignored" and (b) leak into the retry below,
    // which then consumes the wrong page.
    await act(async () => {
      await result.current.loadMoreChats();
    });
    expect(graph.listConversations).not.toHaveBeenCalled();
    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE);
    expect(result.current.chats[0].id).toBe('old-0');

    // (2) Retry replays the FAILED window: the first page of the committed
    // search, at offset 0 — a replacement, not an append.
    graph.listConversations.mockClear();
    graph.listConversations.mockResolvedValueOnce([row('email-1', 'Email Templates rollout')]);
    await act(async () => {
      await result.current.retryChatList();
    });

    expect(graph.listConversations).toHaveBeenCalledTimes(1);
    expect(graph.listConversations).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: '(Email', limit: CHAT_LIST_PAGE_SIZE, offset: 0 }),
    );
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-1']);
    expect(result.current.chatListStatus.error).toBeNull();
  });
});

describe('useChatFactory — load failures', () => {
  it('surfaces an error state and keeps the rows already loaded', async () => {
    const { result } = renderChat();

    graph.listConversations.mockResolvedValueOnce(rows('page1', 3));
    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });
    expect(result.current.chats).toHaveLength(3);

    graph.listConversations.mockRejectedValueOnce(new Error('network is down'));
    await act(async () => {
      await result.current.refreshChatList();
    });

    // The error is reported as an error, and the list is NOT collapsed to empty
    // (which used to render as the generic "No chats found").
    expect(result.current.chatListStatus.error).toBe('network is down');
    expect(result.current.chats).toHaveLength(3);
    expect(result.current.chatListStatus.loading).toBe(false);
  });

  it('retries from the window that failed', async () => {
    const { result } = renderChat();

    graph.listConversations
      .mockResolvedValueOnce(rows('page1', CHAT_LIST_PAGE_SIZE))
      .mockRejectedValueOnce(new Error('network is down'))
      .mockResolvedValueOnce(rows('page2', 2));

    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });
    await act(async () => {
      await result.current.loadMoreChats();
    });
    expect(result.current.chatListStatus.error).toBe('network is down');

    await act(async () => {
      await result.current.retryChatList();
    });

    expect(graph.listConversations).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: CHAT_LIST_PAGE_SIZE }),
    );
    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE + 2);
    expect(result.current.chatListStatus.error).toBeNull();
    expect(result.current.chatListStatus.exhausted).toBe(true);
  });

  it('retries a failed search as a replacement, not as an append', async () => {
    const { result } = renderChat();

    // A page is already on screen when the user searches and the search fails.
    graph.listConversations.mockResolvedValueOnce(rows('page1', CHAT_LIST_PAGE_SIZE));
    await act(async () => {
      await result.current.refreshChatList(undefined, { preserveWindow: false });
    });
    expect(result.current.chats).toHaveLength(CHAT_LIST_PAGE_SIZE);

    graph.listConversations.mockRejectedValueOnce(new Error('network is down'));
    await act(async () => {
      await result.current.commitChatSearch('Email Templates');
    });
    expect(result.current.chatListStatus.error).toBe('network is down');

    graph.listConversations.mockResolvedValueOnce([row('email-1', 'Email Templates rollout')]);
    await act(async () => {
      await result.current.retryChatList();
    });

    // Retry replays the FIRST page of the committed search: offset 0 replaces
    // the stale rows. Retrying at the previous offset would have appended a
    // later page to them and never shown page one of the result set.
    expect(graph.listConversations).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Email Templates', offset: 0 }),
    );
    expect(result.current.chats.map((c: any) => c.id)).toEqual(['email-1']);
    expect(result.current.chatListStatus.error).toBeNull();
  });
});
