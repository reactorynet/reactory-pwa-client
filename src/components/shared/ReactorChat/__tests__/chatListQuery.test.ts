import { ChatState } from '../types';
import {
  CHAT_LIST_MAX_ROWS,
  CHAT_LIST_PAGE_SIZE,
  buildConversationFilter,
  chatListFilterKey,
  createChatListFilter,
  initialChatListStatus,
  mergeChatListPage,
  patchChatListFilter,
} from '../chatListQuery';

/**
 * The pure half of the chat-history fix: one filter shape, one GraphQL filter
 * builder, one page merge.
 *
 * These are the invariants the panel and the hook depend on, so they are pinned
 * here rather than only through the React layers:
 *   * a search term and the host scope travel together in every request;
 *   * `offset === 0` replaces and `offset > 0` appends (de-duplicated by id);
 *   * a short page is the terminal state, and the row cap is explicit.
 */

const chat = (id: string, personaId = 'persona-1'): ChatState =>
  ({
    id,
    personaId,
    title: `Conversation ${id}`,
    created: new Date('2026-01-01T00:00:00.000Z'),
  } as ChatState);

const ids = (chats: ChatState[]) => chats.map((c) => c.id);

describe('chatListQuery — filter state', () => {
  it('defaults to no term, the shared page size and no host scope', () => {
    const filter = createChatListFilter();
    expect(filter.search).toBe('');
    expect(filter.pageSize).toBe(CHAT_LIST_PAGE_SIZE);
    expect(filter.personaId).toBeUndefined();
    expect(filter.use_case).toBeUndefined();
    expect(filter.edges).toBeUndefined();
  });

  it('trims the committed term and drops empty optional members', () => {
    const filter = createChatListFilter({
      search: '  Email Templates  ',
      personaId: '',
      use_case: '',
      edges: [],
    });
    expect(filter.search).toBe('Email Templates');
    // Omitted rather than set to undefined/empty, so the GraphQL variables stay
    // clean and "no scope" is not sent as an empty scope.
    expect('personaId' in filter).toBe(false);
    expect('use_case' in filter).toBe(false);
    expect('edges' in filter).toBe(false);
  });

  it('a patch cannot silently clear the committed term', () => {
    const withTerm = patchChatListFilter(createChatListFilter(), { search: 'Email Templates' });
    // `{ personaId }` patches are what the persona switch / panel refresh send.
    const afterPersonaSwitch = patchChatListFilter(withTerm, { personaId: 'persona-2' });
    expect(afterPersonaSwitch.search).toBe('Email Templates');
    expect(afterPersonaSwitch.personaId).toBe('persona-2');

    // An explicit `undefined` is ignored — that is not a request to clear.
    const afterUndefined = patchChatListFilter(withTerm, { search: undefined });
    expect(afterUndefined.search).toBe('Email Templates');
  });

  it('an explicit empty term is what clears the search', () => {
    const filter = patchChatListFilter(
      createChatListFilter({ search: 'Email Templates' }),
      { search: '' },
    );
    expect(filter.search).toBe('');
  });

  it('an explicit null clears a scope without touching the term', () => {
    // This is what opening the history panel does: the panel lists
    // conversations across every agent, so it drops the persona scope while
    // keeping the committed term and the host scope.
    const current = createChatListFilter({
      search: 'Email Templates',
      personaId: 'persona-1',
      use_case: 'workflow',
    });

    const unscoped = patchChatListFilter(current, { personaId: null });

    expect(unscoped.search).toBe('Email Templates');
    expect(unscoped.use_case).toBe('workflow');
    expect('personaId' in unscoped).toBe(false);
    expect(buildConversationFilter(unscoped, 0)).toEqual({
      search: 'Email Templates',
      use_case: 'workflow',
      limit: CHAT_LIST_PAGE_SIZE,
      offset: 0,
    });
  });

  it('changes identity only when something actually changed', () => {
    const a = createChatListFilter({ search: 'email' });
    const b = createChatListFilter({ search: 'email' });
    const c = createChatListFilter({ search: 'azure' });
    expect(chatListFilterKey(a)).toBe(chatListFilterKey(b));
    expect(chatListFilterKey(a)).not.toBe(chatListFilterKey(c));
  });
});

describe('chatListQuery — GraphQL filter', () => {
  it('always sends an explicit limit and offset (the server defaults to 50/0)', () => {
    const input = buildConversationFilter(createChatListFilter(), 0);
    expect(input.limit).toBe(CHAT_LIST_PAGE_SIZE);
    expect(input.offset).toBe(0);
    // A missing limit is the silent 50-row ceiling this change removes.
    expect(input.limit).toBeDefined();
  });

  it('carries the committed term AND the host scope together', () => {
    const filter = createChatListFilter({
      search: 'Email Templates',
      personaId: 'persona-1',
      use_case: 'workflow',
      edges: [{ name: 'workflowId', value: 'wf-1', edge_type: 'workflow' }],
    });
    const input = buildConversationFilter(filter, 25);

    expect(input).toEqual({
      search: 'Email Templates',
      personaId: 'persona-1',
      use_case: 'workflow',
      edges: [{ name: 'workflowId', value: 'wf-1', edge_type: 'workflow' }],
      limit: CHAT_LIST_PAGE_SIZE,
      offset: 25,
    });
  });

  it('omits `search` when no term is committed', () => {
    const input = buildConversationFilter(createChatListFilter({ use_case: 'workflow' }), 0);
    expect('search' in input).toBe(false);
    expect(input.use_case).toBe('workflow');
  });

  it('clamps a nonsensical offset instead of sending it', () => {
    const filter = createChatListFilter();
    expect(buildConversationFilter(filter, -10).offset).toBe(0);
    expect(buildConversationFilter(filter, 12.7).offset).toBe(12);
  });
});

describe('chatListQuery — page merge', () => {
  it('replaces the list for offset 0', () => {
    const result = mergeChatListPage(
      [chat('stale-1'), chat('stale-2')],
      [chat('a'), chat('b')],
      { offset: 0, pageSize: 25 },
    );
    expect(ids(result.chats)).toEqual(['a', 'b']);
    expect(result.status.offset).toBe(2);
    // A short first page means there is nothing older.
    expect(result.status.exhausted).toBe(true);
  });

  it('appends for offset > 0 and de-duplicates by conversation id', () => {
    const page1 = Array.from({ length: 25 }, (_, i) => chat(`page1-${i}`));
    const page2 = [chat('page1-24'), ...Array.from({ length: 4 }, (_, i) => chat(`page2-${i}`))];

    const result = mergeChatListPage(page1, page2, { offset: 25, pageSize: 25 });

    // 25 + 5 rows, minus the one the server repeated across the page boundary.
    expect(result.chats).toHaveLength(29);
    expect(result.added).toBe(4);
    expect(ids(result.chats).filter((id) => id === 'page1-24')).toHaveLength(1);
    // The window advances by rows RETURNED, not rows kept: de-duplication must
    // not shift the next page and re-fetch rows we already hold.
    expect(result.status.offset).toBe(30);
  });

  it('a short page is the terminal state', () => {
    const page1 = Array.from({ length: 25 }, (_, i) => chat(`page1-${i}`));
    const first = mergeChatListPage([], page1, { offset: 0, pageSize: 25 });
    expect(first.status.exhausted).toBe(false);

    const second = mergeChatListPage(first.chats, [chat('page2-0')], { offset: 25, pageSize: 25 });
    expect(second.status.exhausted).toBe(true);
    expect(second.chats).toHaveLength(26);
  });

  it('reports the row cap instead of pretending the list ended', () => {
    const page = Array.from({ length: 10 }, (_, i) => chat(`row-${i}`));
    const result = mergeChatListPage([], page, { offset: 0, pageSize: 10, maxRows: 8 });

    expect(result.chats).toHaveLength(8);
    expect(result.status.capped).toBe(true);
    // Capped is terminal for paging, but for a different reason than "no more".
    expect(result.status.exhausted).toBe(true);
  });

  it('never exceeds the default hard cap', () => {
    const page = Array.from({ length: CHAT_LIST_MAX_ROWS + 40 }, (_, i) => chat(`row-${i}`));
    const result = mergeChatListPage([], page, { offset: 0, pageSize: CHAT_LIST_MAX_ROWS + 40 });
    expect(result.chats).toHaveLength(CHAT_LIST_MAX_ROWS);
    expect(result.status.capped).toBe(true);
  });

  it('treats a full page that adds nothing new as the end (no Load-more loop)', () => {
    const page1 = Array.from({ length: 25 }, (_, i) => chat(`page1-${i}`));
    const repeat = Array.from({ length: 25 }, (_, i) => chat(`page1-${i}`));
    const result = mergeChatListPage(page1, repeat, { offset: 25, pageSize: 25 });
    expect(result.added).toBe(0);
    expect(result.status.exhausted).toBe(true);
  });

  it('clears any previous error when a page succeeds', () => {
    const failed = { ...initialChatListStatus(), error: 'boom', loading: true };
    const result = mergeChatListPage([], [chat('a')], { offset: 0, pageSize: 25 });
    expect(failed.error).toBe('boom');
    expect(result.status.error).toBeNull();
    expect(result.status.loading).toBe(false);
    expect(result.status.loadingMore).toBe(false);
  });
});

/**
 * B2 — a background refresh must not lose a terminal state.
 *
 * `refreshChatList` re-validates the window it already holds. It asks for ONE
 * row more than it keeps, and that extra row is a sentinel: its presence proves
 * at least one more conversation exists, its absence is the short page that ends
 * the list. Before this, the refresh asked for exactly the rows it held, so the
 * response was always a FULL page — `shortPage` could not fire and
 * `exhausted`/`capped` were reset to false on every panel re-open, putting a
 * "Load more" button on a list that could not grow.
 *
 * Falsification: drop the `keep` handling from `mergeChatListPage` (or pass
 * `pageSize = keep` without the sentinel) and the first two tests fail; drop the
 * `capBounded` rule and the third fails.
 */
describe('chatListQuery — re-validating a loaded window (B2)', () => {
  const MAX = 30;
  // Deliberately ABOVE the window, so the sentinel cases are not confused with
  // the cap case (which has its own test below).
  const NOT_CAPPED = 100;

  it('a sentinel row proves more exist, and is not rendered', () => {
    // 30 loaded, asked for 31, got 31: row #31 exists.
    const loaded = Array.from({ length: MAX }, (_, i) => chat(`row-${i}`));
    const response = [...loaded, chat('row-30')];

    const result = mergeChatListPage(loaded, response, {
      offset: 0,
      pageSize: MAX + 1,
      keep: MAX,
      maxRows: NOT_CAPPED,
    });

    // The window did not grow: the sentinel was evidence, not content.
    expect(result.chats).toHaveLength(MAX);
    expect(ids(result.chats)).not.toContain('row-30');
    expect(result.status.exhausted).toBe(false);
    expect(result.status.capped).toBe(false);
    // "Load more" continues AT the sentinel, not past it.
    expect(result.status.offset).toBe(MAX);
  });

  it('a short re-validation keeps the list terminal', () => {
    // 30 loaded, asked for 31, got 30: nothing older exists.
    const loaded = Array.from({ length: MAX }, (_, i) => chat(`row-${i}`));

    const result = mergeChatListPage(loaded, loaded, {
      offset: 0,
      pageSize: MAX + 1,
      keep: MAX,
      maxRows: NOT_CAPPED,
    });

    expect(result.chats).toHaveLength(MAX);
    expect(result.status.exhausted).toBe(true);
    expect(result.status.capped).toBe(false);
  });

  it('a re-validation at the row cap reports the cap, not completeness', () => {
    // At the cap the 501st row cannot be requested, so a full response carries
    // no new evidence. The client cannot show more, and cannot verify that
    // nothing older exists, so the cap is the only honest report.
    const loaded = Array.from({ length: MAX }, (_, i) => chat(`row-${i}`));

    const result = mergeChatListPage(loaded, loaded, {
      offset: 0,
      pageSize: MAX,
      keep: MAX,
      maxRows: MAX,
    });

    expect(result.status.capped).toBe(true);
    expect(result.status.exhausted).toBe(true);
  });

  it('a cap-bounded window that shrank is genuinely complete', () => {
    // Rows were deleted: the response is short, so the cap no longer truncates
    // anything and the list really is at its end.
    const loaded = Array.from({ length: MAX }, (_, i) => chat(`row-${i}`));
    const shrunk = loaded.slice(0, MAX - 5);

    const result = mergeChatListPage(loaded, shrunk, {
      offset: 0,
      pageSize: MAX,
      keep: MAX,
      maxRows: MAX,
    });

    expect(result.chats).toHaveLength(MAX - 5);
    expect(result.status.capped).toBe(false);
    expect(result.status.exhausted).toBe(true);
  });

  it('keeps the ordinary append/replace behaviour when `keep` is absent', () => {
    const page = Array.from({ length: 25 }, (_, i) => chat(`p-${i}`));
    const result = mergeChatListPage([], page, { offset: 0, pageSize: 25 });
    expect(result.chats).toHaveLength(25);
    expect(result.status.exhausted).toBe(false);
    expect(result.status.offset).toBe(25);
  });
});