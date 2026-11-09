/**
 * The chat-history list query contract, shared by the ONE producer
 * (`useChatFactory`) and the ONE consumer (`ChatHistoryPanel`).
 *
 * The defect this module exists to prevent: the history list used to be fetched
 * by several ad-hoc call sites (`listChats({})`, `listChats({ personaId })`,
 * `listChats({ search })`, …) each with its own partial filter, while the term
 * shown in the search field lived only in the panel's local state. A background
 * refresh therefore replaced the filtered rows with an unfiltered set while the
 * field kept displaying the term — the visible query and the visible list came
 * from two different sources of truth.
 *
 * Here there is exactly one filter shape, one builder for the GraphQL filter
 * input and one pure merge for a page of results. Every refresh path (panel
 * open, persona switch, search, delete, chat-data edit) passes the same filter
 * object through `buildConversationFilter`, so a term can never be dropped
 * silently, and paging can never be confused with filtering.
 */
import { ChatState, ReactorConversationEdge } from './types';

/**
 * Rows requested per page. The server defaults to 50 when `limit` is omitted,
 * which is why older conversations were unreachable; the client now always
 * sends an explicit page size.
 */
export const CHAT_LIST_PAGE_SIZE = 25;

/**
 * Upper bound on rows held in memory for the history list. Paging is bounded
 * rather than unbounded so a user with thousands of conversations cannot make
 * the panel unusable; when the cap is reached the UI says so instead of
 * pretending there is nothing older.
 */
export const CHAT_LIST_MAX_ROWS = 500;

/**
 * Typing settles for this long before the term is committed. The panel also
 * commits immediately on Enter, which is the gesture users actually expect.
 */
export const CHAT_SEARCH_DEBOUNCE_MS = 300;

/** The committed state of the history list query. */
export interface ChatListFilter {
  /** Committed search term. Empty string means "no search". */
  search: string;
  /** Persona the authoring chat is bound to, when the panel is persona-scoped. */
  personaId?: string;
  /** Host use case (e.g. 'workflow'). Passed through to every list call. */
  use_case?: string;
  /** Host edges. Passed through to every list call. */
  edges?: ReactorConversationEdge[];
  /** Rows per page. Always explicit. */
  pageSize: number;
}

/**
 * Non-committed / partial form used by patches from call sites.
 *
 * `undefined` means "leave this member alone" (a persona switch must never
 * clear the search term by omission). `null` is the explicit request to CLEAR a
 * scope — the history panel uses it to list conversations across every agent
 * while still honouring the committed term:
 *
 *   refreshChatList({ personaId: null })   // all personas, same search
 */
export type ChatListFilterPatch = Partial<{
  search: string;
  personaId: string | null;
  use_case: string | null;
  edges: ReactorConversationEdge[] | null;
  pageSize: number;
}>;

/** Observable status of the history list, rendered by the panel. */
export interface ChatListStatus {
  /** A first-page request is in flight (the list is being replaced). */
  loading: boolean;
  /** An append request ("load more") is in flight. */
  loadingMore: boolean;
  /** Human readable failure of the last request, or null. */
  error: string | null;
  /** No further pages exist (short page, cap reached, or nothing left). */
  exhausted: boolean;
  /** The in-memory row cap was hit; older rows still exist on the server. */
  capped: boolean;
  /** Offset to request for the next page. */
  offset: number;
  /**
   * The window the last failed request asked for, or null when nothing failed.
   *
   * Retry must replay THAT request: a failed first page (offset 0, replace)
   * retried at the current `offset` would be an append, mixing the rows still on
   * screen with a later page of the new query and never fetching its page one.
   */
  retry: ChatListRequestWindow | null;
}

/** The window a request asked for, so Retry can replay exactly that request. */
export interface ChatListRequestWindow {
  offset: number;
  pageSize: number;
  /**
   * Present when the request was a re-validation of an already-loaded window
   * (see `ChatListPageOptions.keep`). Retried verbatim so the replay derives
   * the same terminal state as the request that failed.
   */
  keep?: number;
}

export const initialChatListStatus = (): ChatListStatus => ({
  loading: false,
  loadingMore: false,
  error: null,
  exhausted: false,
  capped: false,
  offset: 0,
  retry: null,
});

/**
 * Normalise a seed/patch into a complete filter. Absent optional members are
 * omitted (not set to undefined) so the GraphQL variables stay clean, and the
 * page size always resolves to a positive number.
 */
export const createChatListFilter = (seed: ChatListFilterPatch = {}): ChatListFilter => {
  const pageSize =
    typeof seed.pageSize === 'number' && seed.pageSize > 0 ? Math.floor(seed.pageSize) : CHAT_LIST_PAGE_SIZE;

  return {
    search: typeof seed.search === 'string' ? seed.search.trim() : '',
    ...(seed.personaId ? { personaId: seed.personaId } : {}),
    ...(seed.use_case ? { use_case: seed.use_case } : {}),
    ...(Array.isArray(seed.edges) && seed.edges.length > 0 ? { edges: seed.edges } : {}),
    pageSize,
  };
};

/** Stable identity for a filter, so patches that change nothing do not refetch. */
export const chatListFilterKey = (filter: ChatListFilter): string =>
  JSON.stringify({
    search: filter.search || '',
    personaId: filter.personaId ?? '',
    use_case: filter.use_case ?? '',
    edges: filter.edges ?? [],
    pageSize: filter.pageSize,
  });

/**
 * Merge a patch into the committed filter.
 *
 * `undefined` members are ignored so a caller cannot accidentally clear the
 * search term by spreading an object with an explicit `undefined`; an explicit
 * `null` removes a member (an unscoped refresh).
 */
export const patchChatListFilter = (
  current: ChatListFilter,
  patch: ChatListFilterPatch = {},
): ChatListFilter => {
  const merged: ChatListFilterPatch = { ...current };
  (Object.keys(patch) as (keyof ChatListFilterPatch)[]).forEach((key) => {
    const value = patch[key];
    if (value === null) {
      delete (merged as any)[key];
      return;
    }
    if (value !== undefined) {
      (merged as any)[key] = value;
    }
  });
  return createChatListFilter(merged);
};

/**
 * Build the `ReactorConversationFilter` input sent to the server.
 *
 * `search`, `use_case` and `edges` are always forwarded together with the paging
 * window: the search request must be scoped exactly like every other list call,
 * otherwise a scoped host would search across unrelated conversations.
 */
export const buildConversationFilter = (
  filter: ChatListFilter,
  offset: number = 0,
): Record<string, any> => ({
  ...(filter.search ? { search: filter.search } : {}),
  ...(filter.personaId ? { personaId: filter.personaId } : {}),
  ...(filter.use_case ? { use_case: filter.use_case } : {}),
  ...(Array.isArray(filter.edges) && filter.edges.length > 0 ? { edges: filter.edges } : {}),
  limit: filter.pageSize,
  offset: Math.max(0, Math.floor(offset) || 0),
});

export interface ChatListPageOptions {
  /** Offset this page was requested at. `0` replaces, `> 0` appends. */
  offset: number;
  /** Page size that was requested (a short page means "end of list"). */
  pageSize: number;
  /** Row cap for the in-memory list. */
  maxRows?: number;
  /**
   * Set when this page RE-VALIDATES an already-loaded window instead of
   * fetching a new one.
   *
   * The caller requests `keep + 1` rows and passes `keep` here: the one extra
   * row is a SENTINEL that proves at least one more conversation exists, and is
   * never rendered. Only `keep` rows are kept, so a background refresh
   * re-checks the visible set without growing or shrinking it.
   *
   * This is what makes the terminal state survive a refresh. Requesting exactly
   * the rows already loaded instead would always come back as a FULL page, so
   * the short-page rule could not fire and `exhausted`/`capped` were reset to
   * false on every panel re-open (B2) — the user was told 'Load more' about a
   * list that could not grow.
   */
  keep?: number;
}

export interface ChatListPageResult {
  /** The list to render: replaced for offset 0, appended and de-duped otherwise. */
  chats: ChatState[];
  /** Status to publish alongside the list. */
  status: ChatListStatus;
  /** Rows actually added by this page (after de-duplication). */
  added: number;
}

/**
 * Fold one page of results into the list.
 *
 * - `offset === 0` REPLACES the list (a new term or a refresh of the first page).
 * - `offset > 0` APPENDS, de-duplicating by conversation id so a row that moved
 *   between pages (the server orders by `updated desc`) is not rendered twice.
 * - A short page, or a page that added nothing, ends the list: that is the
 *   explicit terminal state, not a silent ceiling.
 * - Crossing the row cap also ends the list and reports `capped` so the UI can
 *   say that older conversations exist but are not loaded.
 */
export const mergeChatListPage = (
  existing: ChatState[],
  page: ChatState[],
  options: ChatListPageOptions,
): ChatListPageResult => {
  const maxRows = options.maxRows && options.maxRows > 0 ? options.maxRows : CHAT_LIST_MAX_ROWS;
  const offset = Math.max(0, Math.floor(options.offset) || 0);
  const pageSize = options.pageSize > 0 ? options.pageSize : CHAT_LIST_PAGE_SIZE;
  const append = offset > 0;
  const base = append ? existing || [] : [];
  const incomingRows = page || [];

  // A re-validation page may carry ONE row beyond the window being re-checked
  // (see `ChatListPageOptions.keep`). That row is evidence, not content: it is
  // dropped here so the visible set stays exactly what the user already had,
  // while `shortPage` below still measures the FULL response.
  const keep = typeof options.keep === 'number' && Number.isFinite(options.keep)
    ? Math.max(0, Math.floor(options.keep))
    : undefined;
  const windowRows = keep === undefined ? incomingRows : incomingRows.slice(0, keep);

  const seen = new Set<string>();
  base.forEach((chat) => {
    const id = chat?.id ? String(chat.id) : '';
    if (id) seen.add(id);
  });

  const added: ChatState[] = [];
  windowRows.forEach((chat) => {
    const id = chat?.id ? String(chat.id) : '';
    if (id) {
      if (seen.has(id)) return;
      seen.add(id);
    }
    added.push(chat);
  });

  const requestedTotal = base.length + added.length;
  const crossedCap = requestedTotal > maxRows;
  const shortPage = incomingRows.length < pageSize;

  // A window that already fills the row cap cannot be re-validated: the extra
  // row that would prove "more exist" is the row the cap forbids fetching. A
  // response that fills such a window therefore carries no new evidence, and
  // reporting the cap is the only honest option — the client cannot show more
  // than this, and cannot verify that nothing older exists.
  const capBounded = keep !== undefined && keep >= maxRows;
  const capped = crossedCap || (capBounded && !shortPage);

  const chats = requestedTotal > maxRows
    ? [...base, ...added].slice(0, maxRows)
    : [...base, ...added];

  // The next window starts after the rows we actually HOLD. For an append that
  // is every row the server returned (de-duplication must not shift the window
  // and re-fetch rows); for a re-validation it is the window itself, so
  // "Load more" continues at the sentinel row rather than past it.
  const nextOffset = offset + windowRows.length;
  // Defensive: a full page that contributes nothing new would make "Load more"
  // loop forever. Treat it as the end of the list.
  const stalled = append && !shortPage && added.length === 0;
  const exhausted = shortPage || capped || stalled;

  return {
    chats,
    added: added.length,
    status: {
      loading: false,
      loadingMore: false,
      error: null,
      exhausted,
      capped,
      offset: nextOffset,
      // A successful page clears any pending retry window.
      retry: null,
    },
  };
};
