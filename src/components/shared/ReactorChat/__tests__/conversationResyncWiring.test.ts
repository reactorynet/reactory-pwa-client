import {
  selectHistoryWindow,
  resyncConversationFromServer,
  ConversationResyncDeps,
} from '../hooks/conversationResync';
import { ChatState, UXChatMessage } from '../types';

/**
 * The seam between the chat hook and the transport: which conversation is
 * queried, where the answer is merged, and what happens when the user switches
 * conversation while the fetch is in flight.
 *
 * `resyncConversationFromServer` takes its collaborators as plain functions, so
 * this exercises the real orchestration rather than a reimplementation of it.
 */

const msg = (id: string, content: string, role: UXChatMessage['role'] = 'assistant'): UXChatMessage => ({
  id,
  role,
  content,
  sessionId: 'A',
  timestamp: new Date('2026-10-24T10:00:00.000Z'),
} as UXChatMessage);

const makeState = (overrides: Partial<ChatState> & { id: string }): ChatState => ({
  id: overrides.id,
  history: [],
  vars: {},
  sendMessage: async () => {},
  ...overrides,
} as ChatState);

/** A tiny stand-in for React's `setChatState`, so the updater runs for real. */
const harness = (initial: ChatState) => {
  let state = initial;
  const updates: ChatState[] = [];
  const deps = {
    activeSessionId: initial.id as string | null,
    agentBusy: false,
    applied: 0,
  };

  const api: ConversationResyncDeps & { state: () => ChatState; updates: ChatState[]; deps: typeof deps } = {
    deps,
    updates,
    state: () => state,
    getActiveSessionId: () => deps.activeSessionId,
    fetchConversation: jest.fn(),
    getChatState: () => state,
    updateChatState: (updater) => {
      const next = updater(state);
      if (next !== state) {
        state = next;
        api.updates.push(next);
        deps.applied += 1;
      }
    },
    isAgentBusy: () => deps.agentBusy,
    setAgentBusy: (busy) => {
      deps.agentBusy = busy;
    },
  };

  return api;
};

describe('resyncConversationFromServer', () => {
  it('queries the active conversation and merges the gap exactly once', async () => {
    const h = harness(makeState({
      id: 'A',
      history: [msg('m1', 'run the long job', 'user')],
      processing: true,
    }));
    (h.fetchConversation as jest.Mock).mockResolvedValue({
      __typename: 'ReactorChatState',
      id: 'A',
      processing: true,
      history: [
        msg('m1', 'run the long job', 'user'),
        msg('m2', 'step one finished'),
      ],
    });

    const outcome = await resyncConversationFromServer('reconnected', h);

    expect(h.fetchConversation).toHaveBeenCalledTimes(1);
    expect(h.fetchConversation).toHaveBeenCalledWith('A');
    expect(h.state().history.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(outcome).toMatchObject({ processing: true, added: 1, updated: 0, sessionId: 'A' });

    // A second reconcile of the same snapshot is a no-op, so a reconnect that
    // happens to fire twice cannot duplicate the gap message.
    await resyncConversationFromServer('reconnected', h);
    expect(h.state().history.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('writes processing to chat state and re-asserts agentBusy while the turn runs', async () => {
    const h = harness(makeState({ id: 'A', history: [] }));
    (h.fetchConversation as jest.Mock).mockResolvedValue({
      id: 'A',
      processing: true,
      history: [msg('m1', 'working')],
    });

    await resyncConversationFromServer('stalled', h);

    expect(h.state().processing).toBe(true);
    expect(h.deps.agentBusy).toBe(true);
  });

  it('reports settled only when the transcript proves the turn ended', async () => {
    // `processing: false` is NOT evidence (see the F7 note in conversationResync):
    // the server clears it in every attempt's catch and only sets it after the
    // provider call returns. The transcript is the evidence.
    const h = harness(makeState({ id: 'A', history: [msg('m1', 'working')], processing: true }));
    h.deps.agentBusy = true;
    (h.fetchConversation as jest.Mock).mockResolvedValue({
      id: 'A',
      processing: false,
      history: [
        msg('m1', 'run the long job', 'user'),
        msg('m2', 'Done — the report is written.'),
      ],
    });

    const outcome = await resyncConversationFromServer('stalled', h);

    expect(outcome.settled).toBe(true);
    expect(h.state().processing).toBe(false);
    expect(h.state().history[1].content).toBe('Done — the report is written.');
    // The recovery hook settles on `settled`, so the wiring does not need to
    // clear busy itself; it must not re-assert it either.
    expect(h.deps.agentBusy).toBe(true);
  });

  it('does not report settled when processing is false but the transcript is not terminal', async () => {
    // The exact F7 case: the first provider call of a turn. The user message is
    // persisted, the answer is not, and `processing` reads false.
    const h = harness(makeState({ id: 'A', history: [msg('m1', 'working')], processing: true }));
    h.deps.agentBusy = true;
    (h.fetchConversation as jest.Mock).mockResolvedValue({
      id: 'A',
      processing: false,
      history: [msg('m1', 'run the long job', 'user')],
    });

    const outcome = await resyncConversationFromServer('stalled', h);

    expect(outcome.settled).toBe(false);
    expect(outcome.processing).toBe(false);
  });

  it('does not report settled while a tool call is unanswered', async () => {
    const h = harness(makeState({ id: 'A', history: [], processing: true }));
    h.deps.agentBusy = true;
    (h.fetchConversation as jest.Mock).mockResolvedValue({
      id: 'A',
      processing: false,
      history: [
        msg('m1', 'run it', 'user'),
        {
          ...msg('m2', ''),
          tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'shell', arguments: '{}' }, status: 'running' }],
        } as UXChatMessage,
      ],
    });

    const outcome = await resyncConversationFromServer('stalled', h);

    expect(outcome.settled).toBe(false);
  });

  it('discards an answer that resolves after the user switched conversation', async () => {
    // The failure this guards: a stall fires for A, `loadChat` commits B while
    // the query is in flight, A's response resolves and is merged into B. Because
    // the merge preserves messages the server does not know about, A's transcript
    // would then live in B permanently.
    const h = harness(makeState({ id: 'A', history: [msg('a1', 'A only')], processing: true }));

    let resolveFetch: (value: any) => void = () => {};
    (h.fetchConversation as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));

    const pending = resyncConversationFromServer('stalled', h);

    // The user opens B, and the hook commits it, before A's query returns.
    h.deps.activeSessionId = 'B';
    h.updateChatState(() => makeState({ id: 'B', history: [msg('b1', 'B only')], processing: false }));

    resolveFetch({
      id: 'A',
      processing: true,
      history: [msg('a1', 'A only'), msg('a2', 'A result')],
    });
    const outcome = await pending;

    expect(outcome.discarded).toBe(true);
    // B is untouched: no A messages, no A processing flag, no history rewrite.
    expect(h.state().id).toBe('B');
    expect(h.state().history.map((m) => m.id)).toEqual(['b1']);
    expect(h.state().processing).toBe(false);
    expect(h.updates).toHaveLength(1); // only the explicit switch above
    // And the busy indicator is not re-armed by A's answer.
    expect(h.deps.agentBusy).toBe(false);
  });

  it('still refuses to merge inside the updater if only the state has moved on', async () => {
    // Belt and braces: even if `getActiveSessionId` lags behind the commit (it is
    // written from an effect), `prevState.id` is what React is about to render
    // and must win.
    const h = harness(makeState({ id: 'A', history: [msg('a1', 'A only')] }));
    (h.fetchConversation as jest.Mock).mockResolvedValue({
      id: 'A',
      processing: true,
      history: [msg('a1', 'A only'), msg('a2', 'A result')],
    });

    const stale = h.state();
    h.updateChatState(() => makeState({ id: 'B', history: [msg('b1', 'B only')] }));
    // Keep reporting A as active, as a lagging ref would.
    h.deps.activeSessionId = 'A';

    await resyncConversationFromServer('stalled', h);

    expect(stale.id).toBe('A');
    expect(h.state().id).toBe('B');
    expect(h.state().history.map((m) => m.id)).toEqual(['b1']);
  });

  it('treats a failed or empty fetch as "no answer", leaving the view alone', async () => {
    const h = harness(makeState({ id: 'A', history: [msg('a1', 'A only')] }));
    (h.fetchConversation as jest.Mock).mockRejectedValue(new Error('offline'));

    const outcome = await resyncConversationFromServer('reconnect-failed', h);

    expect(outcome.processing).toBeUndefined();
    expect(h.state().history.map((m) => m.id)).toEqual(['a1']);
    expect(h.updates).toHaveLength(0);
  });

  it('does nothing at all when no conversation is open', async () => {
    const h = harness(makeState({ id: 'A' }));
    h.deps.activeSessionId = null;

    const outcome = await resyncConversationFromServer('focus', h);

    expect(h.fetchConversation).not.toHaveBeenCalled();
    // Unknown, not "finished": with no conversation open there is no evidence
    // either way, and `processing: false` used to be read as "the turn ended".
    expect(outcome).toEqual({});
    expect(outcome.settled).toBeUndefined();
  });
});

describe('selectHistoryWindow', () => {
  it('adopts the server window when the local list is the same size', () => {
    const local = { history: [msg('a', '1'), msg('b', '2')], historyWindow: { total: 2, returned: 2, hasMoreBefore: false, oldestId: 'a' } };
    const incoming = { total: 2, returned: 2, hasMoreBefore: false, oldestId: 'a' };

    expect(selectHistoryWindow(local as any, incoming)).toEqual(incoming);
  });

  it('keeps the older paging cursor when the user has paged back', () => {
    // The server read is a bounded window. With 120 messages on screen and a
    // 100-message window returned, adopting `oldestId` from the window would move
    // the cursor forward and make the next "show earlier" re-fetch a page already
    // on screen.
    const local = {
      history: Array.from({ length: 120 }, (_, i) => msg(`m${i}`, `row ${i}`)),
      historyWindow: { total: 400, returned: 120, hasMoreBefore: true, oldestId: 'm0' },
    };
    const incoming = { total: 400, returned: 100, hasMoreBefore: true, oldestId: 'm20' };

    const result = selectHistoryWindow(local as any, incoming);

    expect(result?.oldestId).toBe('m0');
    expect(result?.hasMoreBefore).toBe(true);
    expect(result?.returned).toBe(100);
  });

  it('keeps the existing window when the response carries none', () => {
    const local = { history: [], historyWindow: { total: 5, returned: 5, hasMoreBefore: false, oldestId: 'x' } };
    expect(selectHistoryWindow(local as any, null)).toBe(local.historyWindow);
  });
});
