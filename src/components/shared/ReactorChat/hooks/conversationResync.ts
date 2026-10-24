import { UXChatMessage } from '../types';

/**
 * Reconciling the transcript with the persisted conversation.
 *
 * The SSE stream is an *optimisation*: it makes a live turn feel live. The
 * persisted conversation is the record of what actually happened. Whenever the
 * transport is in doubt — it dropped, it gave up, the tab was asleep, a tool
 * step was silent for a long time — the client must be able to ask the server
 * "what do you have?" and fold the answer into what is on screen.
 *
 * Folding is the delicate part. A naive "server history replaces local history"
 * would:
 *   - erase the assistant message currently being streamed (the server has not
 *     persisted it yet), and
 *   - duplicate anything the client rendered with a locally-generated id, most
 *     visibly the extra assistant bubble created when a completion follows a
 *     message that carried tool calls.
 *
 * `mergeServerHistory` is the pure function that gets this right, and is
 * idempotent: merging the same server snapshot twice yields the same history
 * and reports zero changes the second time. Recovery code can therefore re-run
 * it freely (on reconnect, on give-up, on focus, on a stall poll) without
 * needing to track what it has already applied.
 */

export interface HistoryMergeResult {
  /** The reconciled transcript. */
  history: UXChatMessage[];
  /** Messages that existed only on the server and were appended. */
  added: number;
  /** Existing local messages replaced by their (newer) server copy. */
  updated: number;
  /** Server messages that matched a local message exactly and changed nothing. */
  unchanged: number;
}

/** Ids may arrive as strings or Mongo ObjectIds; normalise to a comparable key. */
const idOf = (message: any): string => {
  const id = message?.id;
  if (id === undefined || id === null) return '';
  if (typeof id === 'object' && typeof id.toString === 'function') return String(id.toString());
  return String(id);
};

/**
 * A content fingerprint used to recognise a locally-rendered message that the
 * server has since persisted under a different id. Restricted to user and
 * assistant messages with real text: tool messages carry ids the server issued,
 * and empty content carries no identity at all.
 */
const contentSignature = (message: any): string | null => {
  if (message?.role !== 'assistant' && message?.role !== 'user') return null;
  const content = typeof message?.content === 'string' ? message.content.trim() : '';
  if (!content) return null;
  return `${message.role}\u0000${content}`;
};

/**
 * Fields that affect what the user sees. Timestamps and transient client state
 * are deliberately excluded — a server copy that only re-stamps `timestamp`
 * is not a change worth re-rendering for.
 */
const RENDER_FIELDS = [
  'id',
  'role',
  'content',
  'thinking',
  'images',
  'tool_calls',
  'tool_results',
  'tool_errors',
  'archived',
  'archivedReason',
  'isActivity',
] as const;

const renderShape = (message: any): Record<string, unknown> => {
  const shape: Record<string, unknown> = {};
  for (const field of RENDER_FIELDS) {
    const value = message?.[field];
    shape[field] = value === undefined ? null : value;
  }
  return shape;
};

const sameRenderedMessage = (a: any, b: any): boolean => {
  try {
    return JSON.stringify(renderShape(a)) === JSON.stringify(renderShape(b));
  } catch {
    return false;
  }
};

/**
 * Merge the authoritative server history into the locally rendered history.
 *
 * Rules, in order of precedence:
 *   1. A server message whose id already exists locally *replaces* the local
 *      copy — the server's version wins, because it is the persisted record
 *      (this is how final content that arrived while the stream was down lands).
 *   2. A server message with no local id-match is matched to a local-only
 *      message with the same role and identical text, if that local message
 *      comes after the previous match. The local message keeps its position and
 *      adopts the server copy, which removes the duplicate a locally-generated
 *      id would otherwise create.
 *   3. Anything else is appended, in server order.
 *
 * Local messages the server does not know about are preserved: they are the
 * in-flight turn (and the persona greeting), which has not been persisted yet.
 */
export function mergeServerHistory(
  local: UXChatMessage[] | undefined | null,
  server: UXChatMessage[] | undefined | null,
): HistoryMergeResult {
  const localList: UXChatMessage[] = Array.isArray(local) ? [...local] : [];
  if (!Array.isArray(server) || server.length === 0) {
    return { history: localList, added: 0, updated: 0, unchanged: 0 };
  }

  // Index the local transcript: by id (first occurrence wins, later duplicates
  // are dropped) and by content signature.
  const localIndexById = new Map<string, number>();
  const localIndexBySignature = new Map<string, number[]>();
  const droppedDuplicates = new Set<number>();

  localList.forEach((message, index) => {
    const id = idOf(message);
    if (id) {
      if (localIndexById.has(id)) {
        // A duplicate id already in the transcript: keep the first, drop this
        // one. This is the shape a double-append bug produces, and a resync is
        // exactly the moment to heal it.
        droppedDuplicates.add(index);
        return;
      }
      localIndexById.set(id, index);
    }
    const signature = contentSignature(message);
    if (signature) {
      const bucket = localIndexBySignature.get(signature);
      if (bucket) bucket.push(index);
      else localIndexBySignature.set(signature, [index]);
    }
  });

  const serverIds = new Set<string>();
  server.forEach((message) => {
    const id = idOf(message);
    if (id) serverIds.add(id);
  });

  const history: UXChatMessage[] = localList.filter((_, index) => !droppedDuplicates.has(index));
  // `history` no longer matches local indices, so map original index -> new index.
  const originalToNew = new Map<number, number>();
  let cursor = 0;
  localList.forEach((_, originalIndex) => {
    if (droppedDuplicates.has(originalIndex)) return;
    originalToNew.set(originalIndex, cursor);
    cursor += 1;
  });

  const matchedLocalIndices = new Set<number>();
  let lastMatchedNewIndex = -1;
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const serverMessage of server) {
    const serverId = idOf(serverMessage);

    // Rule 1 — same id.
    if (serverId && localIndexById.has(serverId)) {
      const newIndex = originalToNew.get(localIndexById.get(serverId)!);
      if (newIndex === undefined) continue;
      matchedLocalIndices.add(newIndex);
      lastMatchedNewIndex = Math.max(lastMatchedNewIndex, newIndex);
      if (sameRenderedMessage(history[newIndex], serverMessage)) {
        unchanged += 1;
      } else {
        history[newIndex] = { ...history[newIndex], ...serverMessage } as UXChatMessage;
        updated += 1;
      }
      continue;
    }

    // Rule 2 — same role and text, local id the server does not know.
    const signature = contentSignature(serverMessage);
    let matchedIndex: number | undefined;
    if (signature) {
      const candidates = localIndexBySignature.get(signature) ?? [];
      for (const originalIndex of candidates) {
        const newIndex = originalToNew.get(originalIndex);
        if (newIndex === undefined) continue;
        if (matchedLocalIndices.has(newIndex)) continue;
        if (newIndex <= lastMatchedNewIndex) continue;
        const localId = idOf(history[newIndex]);
        if (localId && serverIds.has(localId)) continue;
        matchedIndex = newIndex;
        break;
      }
    }

    if (matchedIndex !== undefined) {
      matchedLocalIndices.add(matchedIndex);
      lastMatchedNewIndex = Math.max(lastMatchedNewIndex, matchedIndex);
      history[matchedIndex] = { ...history[matchedIndex], ...serverMessage } as UXChatMessage;
      updated += 1;
      continue;
    }

    // Rule 3 — append.
    history.push(serverMessage);
    added += 1;
    lastMatchedNewIndex = history.length - 1;
  }

  return { history, added, updated, unchanged };
}
