import { ShellEventData } from './shellApi';

/**
 * Process-wide bus for `shell` events that arrive on a CHAT conversation
 * channel (the one-shot `shell` macro the LLM runs, source `'macro'`).
 *
 * The chat's SSE hook (useSSE) receives these via `onShell` and pushes them
 * here; a read-only terminal (ChatShellTerminal) mounted in the side panel
 * subscribes and renders them. Because the terminal mounts slightly AFTER the
 * `start` event that triggered its creation, the bus keeps a small per-terminal
 * replay buffer so no early output is lost.
 *
 * This is intentionally decoupled (a module singleton) so useChatFactory does
 * not need a reference to the side-panel actions, and vice-versa.
 *
 * ## Conversation scoping
 *
 * Events are bucketed by the conversation that produced them, and reads only
 * ever see the *active* conversation. Previously there was no conversation
 * dimension at all: `sessions()` returned every shell run seen since page load,
 * so switching chats left the previous agent's terminals in the console — and
 * `loadChat` synthesising historical shell output into the bus piled more on
 * with every chat visited.
 *
 * The active conversation lives here rather than being passed in because the
 * console is mounted through the component registry with no props, and a prop
 * would go stale the moment the user switched chats. Readers therefore keep
 * their original signatures and are scoped automatically.
 */

type Listener = (event: ShellEventData) => void;
type ConversationListener = (conversationId: string | null) => void;

const MAX_EVENTS_PER_SESSION = 2000;
const PRUNE_AFTER_EXIT_MS = 60_000;
/** Conversations whose shell history is retained, most-recently-used first. */
const MAX_RETAINED_CONVERSATIONS = 5;

const listeners = new Set<Listener>();
const conversationListeners = new Set<ConversationListener>();

/** conversationId -> shellSessionId -> events */
const buffers = new Map<string, Map<string, ShellEventData[]>>();
const pruneTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Most-recently-used conversation ids, front = newest. */
let recency: string[] = [];

let activeConversationId: string | null = null;

const touch = (conversationId: string): void => {
  recency = [conversationId, ...recency.filter((id) => id !== conversationId)];
  while (recency.length > MAX_RETAINED_CONVERSATIONS) {
    const evicted = recency.pop();
    if (evicted && evicted !== activeConversationId) buffers.delete(evicted);
  }
};

const bucket = (conversationId: string): Map<string, ShellEventData[]> => {
  let entry = buffers.get(conversationId);
  if (!entry) {
    entry = new Map<string, ShellEventData[]>();
    buffers.set(conversationId, entry);
  }
  touch(conversationId);
  return entry;
};

const activeBucket = (): Map<string, ShellEventData[]> | undefined =>
  activeConversationId ? buffers.get(activeConversationId) : undefined;

function buffer(conversationId: string, event: ShellEventData): void {
  const id = event.shellSessionId;
  if (!id) return;
  const chatBucket = bucket(conversationId);
  let entry = chatBucket.get(id);
  if (!entry) { entry = []; chatBucket.set(id, entry); }
  entry.push(event);
  if (entry.length > MAX_EVENTS_PER_SESSION) {
    entry.splice(0, entry.length - MAX_EVENTS_PER_SESSION);
  }
  // Schedule cleanup once a session has exited so buffers don't leak.
  if (event.phase === 'exit' && event.source !== 'macro') {
    const timerKey = `${conversationId}::${id}`;
    const existing = pruneTimers.get(timerKey);
    if (existing) clearTimeout(existing);
    pruneTimers.set(timerKey, setTimeout(() => {
      buffers.get(conversationId)?.delete(id);
      pruneTimers.delete(timerKey);
    }, PRUNE_AFTER_EXIT_MS));
  }
}

export const chatShellBus = {
  /**
   * Point the bus at the conversation currently on screen. Reads are scoped to
   * it, and subscribers are told so a console can re-seed its list.
   */
  setActiveConversation(conversationId: string | null): void {
    if (activeConversationId === conversationId) return;
    activeConversationId = conversationId;
    if (conversationId) touch(conversationId);
    conversationListeners.forEach((l) => {
      try { l(conversationId); } catch { /* isolate listener errors */ }
    });
  },

  activeConversation(): string | null {
    return activeConversationId;
  },

  /**
   * Publish a shell event for a conversation (called from useChatFactory's
   * `onShell`). Buffered regardless of which conversation is active, so
   * switching back to a chat still replays its output; only delivery to live
   * subscribers is gated on it being the active one.
   */
  push(conversationId: string, event: ShellEventData): void {
    if (!conversationId) return;
    buffer(conversationId, event);
    if (conversationId !== activeConversationId) return;
    listeners.forEach((l) => {
      try { l(event); } catch { /* isolate listener errors */ }
    });
  },

  /** Subscribe to live events for the active conversation. */
  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  /** Be told when the active conversation changes, to re-seed a view. */
  subscribeToConversationChange(cb: ConversationListener): () => void {
    conversationListeners.add(cb);
    return () => { conversationListeners.delete(cb); };
  },

  /** Buffered events for one terminal in the active conversation. */
  getBuffer(shellSessionId: string): ShellEventData[] {
    const entry = activeBucket()?.get(shellSessionId);
    return entry ? [...entry] : [];
  },

  /**
   * Buffered events for a terminal in a named conversation.
   *
   * `loadChat` needs this while replaying a chat's historical shell output: at
   * that point the bus may still be pointed at the chat being left, so an
   * active-scoped read would look in the wrong bucket and the de-duplication
   * guard would replay everything again.
   */
  getConversationBuffer(conversationId: string, shellSessionId: string): ShellEventData[] {
    const entry = buffers.get(conversationId)?.get(shellSessionId);
    return entry ? [...entry] : [];
  },

  /** Summary of the active conversation's buffered sessions, to seed a console. */
  sessions(): Array<{ shellSessionId: string; source?: string; command?: string; exited: boolean; exitCode?: number }> {
    const entry = activeBucket();
    if (!entry) return [];
    return [...entry.entries()].map(([shellSessionId, events]) => {
      const start = events.find((e) => e.phase === 'start');
      const exit = [...events].reverse().find((e) => e.phase === 'exit');
      return {
        shellSessionId,
        source: events[0]?.source,
        command: start?.command,
        exited: !!exit,
        exitCode: exit?.exitCode,
      };
    });
  },

  /** Forget one conversation's shell history. */
  clearConversation(conversationId: string): void {
    buffers.delete(conversationId);
    recency = recency.filter((id) => id !== conversationId);
    for (const key of Array.from(pruneTimers.keys())) {
      if (!key.startsWith(`${conversationId}::`)) continue;
      clearTimeout(pruneTimers.get(key)!);
      pruneTimers.delete(key);
    }
  },

  /** Test seam. */
  __resetForTests(): void {
    listeners.clear();
    conversationListeners.clear();
    buffers.clear();
    pruneTimers.forEach((t) => clearTimeout(t));
    pruneTimers.clear();
    recency = [];
    activeConversationId = null;
  },
};
