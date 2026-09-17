/**
 * Durable, bounded storage for client-side tool results awaiting acknowledgement.
 *
 * WHY THIS EXISTS
 *
 * A client-side tool runs in the browser, so between execution and the server
 * acknowledging the completion the result exists **only** in this tab. If the
 * completion call fails — a dropped connection, a closed tab, a laptop that slept
 * mid-request — the result is gone and the server is left holding an assistant
 * `tool_call` that nothing will ever answer, which makes the transcript
 * permanently malformed.
 *
 * The replay path used to recover by *re-running* the tool, behind an allow-list of
 * macros whose re-execution is harmless. That was the best available option when the
 * result could not be recovered — but re-running is a re-execution, not a replay,
 * and it is simply wrong for anything with an external effect (`amq` publishes an
 * event; `login`/`logout` mutate session state).
 *
 * Keeping the result here turns replay into a real replay: the stored output is
 * re-reported verbatim and the macro is never executed twice. The allow-list
 * survives only as a fallback for a cache miss.
 *
 * FAILURE POLICY — best effort, never load-bearing
 *
 * Every operation is wrapped and every failure is swallowed. Storage can be full,
 * unavailable, disabled by privacy settings, or contain something a previous
 * version wrote. A cache is an optimisation of the recovery path; it must never be
 * the reason a tool fails to run or a completion fails to send. A miss simply
 * degrades to the old fallback behaviour.
 */

/** A client tool result held until the server acknowledges it. */
export interface CachedClientToolResult {
  toolCallId: string;
  toolName: string;
  /**
   * Exactly the value sent to the server as `result`, so a replay reproduces what
   * the original report would have carried. Cached raw rather than normalised:
   * normalising here would risk reporting something subtly different on replay.
   */
  result?: any;
  isError?: boolean;
  error?: string;
  /** Approval outcome, when the "result" is a user decision rather than an output. */
  decision?: string;
  userInstruction?: string;
  /** Epoch ms, used only for oldest-first eviction. */
  cachedAt: number;
}

/** Minimal storage contract, so the cache can be tested without a DOM. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Caps. These exist because the same reasoning that fixed `tool_results` server-side
 * applies here: an unbounded client-side cache is a leak with a UI attached. A
 * reconnecting client writes on every report, so without a ceiling a long-lived tab
 * would grow localStorage until the origin hits its quota — at which point *all*
 * writes for the origin start failing, including ones this code does not own.
 */
export const CACHE_LIMITS = {
  /** Entries retained per conversation. */
  MAX_ENTRIES_PER_CONVERSATION: 50,
  /** Conversations retained, least-recently-touched evicted first. */
  MAX_CONVERSATIONS: 10,
  /** A single serialised entry above this is not cached at all. */
  MAX_ENTRY_BYTES: 256 * 1024,
  /** Serialised entries per conversation above this are evicted oldest-first. */
  MAX_CONVERSATION_BYTES: 1024 * 1024,
} as const;

/** Scope used when no identity is resolvable. Keeping it explicit beats an empty key. */
export const ANONYMOUS_SCOPE = 'anon';

const KEY_PREFIX = 'reactor.toolResults.';

/**
 * Normalise a scope. A blank or missing value collapses to the anonymous scope
 * rather than producing a key like `reactor.toolResults..` that two unrelated
 * callers would share by accident.
 */
const normaliseScope = (scope?: string | null): string => {
  const text = String(scope ?? '').trim();
  return text || ANONYMOUS_SCOPE;
};

const entryKey = (scope: string, conversationId: string): string =>
  `${KEY_PREFIX}${normaliseScope(scope)}::${conversationId}`;

const indexKey = (scope: string): string =>
  `${KEY_PREFIX}${normaliseScope(scope)}::__index`;

/**
 * The storage backing the cache.
 *
 * Resolved through a function rather than captured at module load so that a test can
 * substitute one, and so an environment without `localStorage` (SSR, a locked-down
 * browser, a worker) yields `null` instead of throwing at import time.
 */
let storageOverride: StorageLike | null | undefined;

const defaultStorage = (): StorageLike | null => {
  try {
    if (typeof window === 'undefined') return null;
    const candidate = (window as any).localStorage;
    if (!candidate) return null;
    // Privacy modes expose localStorage but throw on use. Probe once.
    const probe = `${KEY_PREFIX}__probe__`;
    candidate.setItem(probe, '1');
    candidate.removeItem(probe);
    return candidate as StorageLike;
  } catch {
    return null;
  }
};

const resolveStorage = (): StorageLike | null => {
  if (storageOverride !== undefined) return storageOverride;
  return defaultStorage();
};

/**
 * Substitute the backing storage. Pass `null` to simulate an environment without one.
 * Exported for tests only.
 */
export const setToolResultCacheStorage = (storage: StorageLike | null): void => {
  storageOverride = storage;
};

/** Restore the default storage resolution. Exported for tests only. */
export const resetToolResultCacheStorage = (): void => {
  storageOverride = undefined;
};

/** Read and parse a JSON value, returning `null` for anything unusable. */
const readJson = <T>(storage: StorageLike, key: string): T | null => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed ?? null;
  } catch {
    // A corrupt or foreign payload is indistinguishable from an absent one, and
    // treating it as absent is the recoverable direction.
    return null;
  }
};

/** Serialise and write, swallowing quota and availability failures. */
const writeJson = (storage: StorageLike, key: string, value: unknown): boolean => {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

type ConversationIndex = Record<string, number>;

const readIndex = (storage: StorageLike, scope: string): ConversationIndex => {
  const index = readJson<ConversationIndex>(storage, indexKey(scope));
  return index && typeof index === 'object' && !Array.isArray(index) ? index : {};
};

/** Drop whole conversations, oldest touched first, until the index is within cap. */
const pruneConversations = (
  storage: StorageLike,
  scope: string,
  index: ConversationIndex
): void => {
  const ids = Object.keys(index);
  if (ids.length <= CACHE_LIMITS.MAX_CONVERSATIONS) return;

  const ordered = ids.sort((a, b) => Number(index[a] ?? 0) - Number(index[b] ?? 0));
  const excess = ordered.slice(0, ids.length - CACHE_LIMITS.MAX_CONVERSATIONS);
  for (const id of excess) {
    try {
      storage.removeItem(entryKey(scope, id));
    } catch {
      /* best effort */
    }
    delete index[id];
  }
};

const byteLength = (value: string): number => value.length;

/**
 * Store a result, evicting as needed.
 *
 * Returns the number of entries held for the conversation afterwards, or `null` when
 * nothing was stored (unavailable storage, an unserialisable or oversized payload).
 * Callers do not need the value; it exists so the behaviour is observable in a test.
 */
export const cacheClientToolResult = (
  scope: string,
  conversationId: string,
  entry: Omit<CachedClientToolResult, 'cachedAt'> & { cachedAt?: number },
): number | null => {
  if (!conversationId || !entry?.toolCallId) return null;

  const storage = resolveStorage();
  if (!storage) return null;

  let serialised: string;
  try {
    serialised = JSON.stringify({ ...entry, cachedAt: entry.cachedAt ?? Date.now() });
  } catch {
    // Circular or otherwise unserialisable. Skipped rather than thrown: the tool
    // result still goes to the server, it just cannot be replayed from here.
    return null;
  }

  if (byteLength(serialised) > CACHE_LIMITS.MAX_ENTRY_BYTES) return null;

  const existing = readJson<CachedClientToolResult[]>(storage, entryKey(scope, conversationId));
  const list = Array.isArray(existing) ? existing : [];

  // Re-reporting the same call replaces rather than accumulates, mirroring the
  // server-side upsert.
  const withoutDuplicate = list.filter((item) => item?.toolCallId !== entry.toolCallId);
  let next = [...withoutDuplicate, { ...entry, cachedAt: entry.cachedAt ?? Date.now() }];

  // Drop oldest first until the conversation is within both caps.
  const totalBytes = (items: CachedClientToolResult[]): number =>
    items.reduce((sum, item) => {
      try {
        return sum + byteLength(JSON.stringify(item));
      } catch {
        return sum;
      }
    }, 0);

  while (
    next.length > CACHE_LIMITS.MAX_ENTRIES_PER_CONVERSATION &&
    next.length > 1
  ) {
    next = next.slice(1);
  }

  while (totalBytes(next) > CACHE_LIMITS.MAX_CONVERSATION_BYTES && next.length > 1) {
    next = next.slice(1);
  }

  if (!writeJson(storage, entryKey(scope, conversationId), next)) {
    // Quota or availability. Nothing cached, and the caller carries on.
    return null;
  }

  const index = readIndex(storage, scope);
  index[conversationId] = Date.now();
  pruneConversations(storage, scope, index);
  writeJson(storage, indexKey(scope), index);

  return next.length;
};

/** Retrieve a stored result, or `null` on a miss. */
export const getCachedClientToolResult = (
  scope: string,
  conversationId: string,
  toolCallId: string,
): CachedClientToolResult | null => {
  if (!conversationId || !toolCallId) return null;

  const storage = resolveStorage();
  if (!storage) return null;

  const list = readJson<CachedClientToolResult[]>(storage, entryKey(scope, conversationId));
  if (!Array.isArray(list)) return null;

  return list.find((item) => item?.toolCallId === toolCallId) ?? null;
};

/**
 * Drop the given results.
 *
 * Called once the server has acknowledged a completion: at that point the result is
 * durable server-side and holding a copy here would only consume quota. A failed
 * completion must NOT call this, which is the entire reason the entry exists.
 */
export const evictClientToolResults = (
  scope: string,
  conversationId: string,
  toolCallIds: string[],
): void => {
  if (!conversationId || !Array.isArray(toolCallIds) || toolCallIds.length === 0) return;

  const storage = resolveStorage();
  if (!storage) return;

  const drop = new Set(toolCallIds.filter(Boolean));
  const list = readJson<CachedClientToolResult[]>(storage, entryKey(scope, conversationId));
  if (!Array.isArray(list)) return;

  const next = list.filter((item) => !drop.has(item?.toolCallId));

  try {
    if (next.length === 0) {
      storage.removeItem(entryKey(scope, conversationId));
      const index = readIndex(storage, scope);
      delete index[conversationId];
      writeJson(storage, indexKey(scope), index);
      return;
    }
    writeJson(storage, entryKey(scope, conversationId), next);
  } catch {
    /* best effort */
  }
};

/** Forget everything held for a conversation. */
export const clearCachedToolResults = (scope: string, conversationId: string): void => {
  if (!conversationId) return;
  const storage = resolveStorage();
  if (!storage) return;

  try {
    storage.removeItem(entryKey(scope, conversationId));
    const index = readIndex(storage, scope);
    delete index[conversationId];
    writeJson(storage, indexKey(scope), index);
  } catch {
    /* best effort */
  }
};

/** How many entries are held for a conversation. Exported for tests and diagnostics. */
export const cachedToolResultCount = (scope: string, conversationId: string): number => {
  const storage = resolveStorage();
  if (!storage || !conversationId) return 0;
  const list = readJson<CachedClientToolResult[]>(storage, entryKey(scope, conversationId));
  return Array.isArray(list) ? list.length : 0;
};
