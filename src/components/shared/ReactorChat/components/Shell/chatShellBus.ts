import { ShellEventData } from './shellApi';

/**
 * Process-wide bus for `shell` events that arrive on the CHAT conversation
 * channel (i.e. the one-shot `shell` macro run by the LLM, source `'macro'`).
 *
 * The chat's own SSE hook (useSSE) receives these via `onShell` and pushes them
 * here; a read-only terminal (ChatShellTerminal) mounted in the side panel
 * subscribes and renders them. Because the terminal mounts slightly AFTER the
 * `start` event that triggered its creation, the bus keeps a small per-terminal
 * replay buffer so no early output is lost.
 *
 * This is intentionally decoupled (a module singleton) so useChatFactory does
 * not need a reference to the side-panel actions, and vice-versa.
 */

type Listener = (event: ShellEventData) => void;

const MAX_EVENTS_PER_SESSION = 2000;
const PRUNE_AFTER_EXIT_MS = 60_000;

const listeners = new Set<Listener>();
const buffers = new Map<string, ShellEventData[]>();
const pruneTimers = new Map<string, ReturnType<typeof setTimeout>>();

function buffer(event: ShellEventData): void {
  const id = event.shellSessionId;
  if (!id) return;
  let entry = buffers.get(id);
  if (!entry) { entry = []; buffers.set(id, entry); }
  entry.push(event);
  if (entry.length > MAX_EVENTS_PER_SESSION) {
    entry.splice(0, entry.length - MAX_EVENTS_PER_SESSION);
  }
  // Schedule cleanup once a session has exited so buffers don't leak.
  if (event.phase === 'exit') {
    const existing = pruneTimers.get(id);
    if (existing) clearTimeout(existing);
    pruneTimers.set(id, setTimeout(() => {
      buffers.delete(id);
      pruneTimers.delete(id);
    }, PRUNE_AFTER_EXIT_MS));
  }
}

export const chatShellBus = {
  /** Publish a shell event (called from useChatFactory's onShell). */
  push(event: ShellEventData): void {
    buffer(event);
    listeners.forEach((l) => {
      try { l(event); } catch { /* isolate listener errors */ }
    });
  },

  /** Subscribe to live events; returns an unsubscribe fn. */
  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  /** Buffered events for one terminal, for replay on mount. */
  getBuffer(shellSessionId: string): ShellEventData[] {
    return buffers.get(shellSessionId) ? [...buffers.get(shellSessionId)!] : [];
  },

  /** Summary of every buffered session — used to seed a console on mount. */
  sessions(): Array<{ shellSessionId: string; source?: string; command?: string; exited: boolean; exitCode?: number }> {
    return [...buffers.entries()].map(([shellSessionId, events]) => {
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
};
