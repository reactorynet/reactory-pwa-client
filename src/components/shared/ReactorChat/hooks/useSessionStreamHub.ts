import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Reactory from '@reactorynet/reactory-core';
import { ChatState, IAIPersona, SessionLogger, SubAgentSummary } from '../types';
import { StreamingEventType } from './useSSE';
import { createStreamingSession } from '../components/Shell/shellApi';

export type TrackedSessionStatus = 'idle' | 'thinking' | 'streaming' | 'executing_tools' | 'waiting_focus' | 'completed' | 'error';

export interface TrackedSession {
  sessionId: string;
  personaId: string;
  persona: IAIPersona | null;
  title: string;
  status: TrackedSessionStatus;
  unread: boolean;
  lastMessage?: string;
  lastToolName?: string;
  lastUpdated: Date;
  isSubAgent?: boolean;
  parentSessionId?: string;
  waitingToolCallCount?: number;
  hasWaitingToolCalls?: boolean;
}

export interface UseSessionStreamHubOptions {
  reactory: Reactory.Client.ReactorySDK;
  activeSessionId?: string | null;
  activePersonaId?: string | null;
  /** Persona-scoped conversation list (drives `activePersonaSessionCount`). */
  chats?: ChatState[];
  /**
   * The user's most-recently-updated conversations across every persona, most
   * recent first. This — not `chats` — is what the FAB stack tracks: switching
   * A → B → C should leave C active with B and A behind it, whichever agent
   * owns them.
   */
  recentSessions?: ChatState[];
  subAgents?: SubAgentSummary[];
  getPersona?: (personaId: string) => IAIPersona | null;
  /** Maximum number of sessions tracked and shown in the stack. */
  maxTrackedSessions?: number;
  /** Maximum number of concurrently open background SSE connections */
  maxBackgroundConnections?: number;
  /**
   * Suspend new background connects. Set while the active conversation is
   * loading: those GraphQL calls and a background stream's POST compete for the
   * same six-socket-per-host budget, and the stream wins by holding its socket
   * forever. Existing streams are left alone.
   */
  deferConnections?: boolean;
  /**
   * Live status of the active session. Used to carry a running turn's status
   * over to the background tracker the moment the session is backgrounded, so
   * the FAB shows "busy" during the gap before its background stream connects.
   */
  activeSessionStatus?: TrackedSessionStatus;
  sessionLogger?: SessionLogger;
}

export interface UseSessionStreamHubResult {
  /** All background sessions (excluding the currently active session) */
  backgroundSessions: TrackedSession[];
  /** Number of sessions belonging to the active persona */
  activePersonaSessionCount: number;
  /** Clear unread indicator for a specific session */
  clearUnread: (sessionId: string) => void;
  /** Register or update a session as being active */
  notifySessionActivity: (sessionId: string, status: TrackedSessionStatus, preview?: string) => void;
}

/**
 * Cap on concurrent background streams while they are served from the API's own
 * origin.
 *
 * Browsers pool HTTP/1.1 connections per origin and allow six. An SSE stream
 * holds one for its whole life, and on a default deployment GraphQL, the REST
 * routes and the CDN (`REACT_APP_CDN` defaults to `<api>/cdn`, so every avatar
 * and theme asset too) all share that same six. Add the active session's own
 * stream and there is very little room left, so this stays at one until we can
 * see that streams live on their own origin.
 *
 * Point the server's `SSE_URI_ROOT` at a different origin for the same host
 * (e.g. `http://127.0.0.1:4000` against an API on `http://localhost:4000` —
 * different origins as far as the browser's pool is concerned) and the streams
 * get their own six sockets, at which point `maxBackgroundConnections` applies
 * in full.
 */
const SAME_ORIGIN_STREAM_LIMIT = 1;

/**
 * How long background status updates are coalesced before reaching React state.
 *
 * The hub lives inside ReactorChat, so every `setSessionStates` re-renders that
 * whole tree — and ChatList is not memoised, so the entire message history
 * re-renders with it. Applying an update per streamed token therefore costs a
 * full-tree render per token, per background session; a slow provider does not
 * make that cheaper, it just spreads the same stalls out.
 *
 * Nothing in the stack needs per-token fidelity: a ring colour and a truncated
 * tooltip preview. So token traffic accumulates in a ref and lands at most once
 * per window, while the things a user actually notices — a status change, a
 * finished turn — still flush immediately.
 */
const PREVIEW_FLUSH_MS = 250;

/** Maximum number of connect attempts before a session is left alone. */
const MAX_CONNECT_ATTEMPTS = 4;

/** Backoff (ms) applied before connect attempt N (index = attempts made so far). */
const CONNECT_BACKOFF_MS = [0, 2000, 8000, 30000];

/**
 * How long a session that exhausted its attempts stays parked before it is
 * allowed to try again. Keeps a dead endpoint from being hammered without
 * disabling background feedback for the lifetime of the page.
 */
const EXHAUSTED_COOLDOWN_MS = 5 * 60 * 1000;

interface ConnectAttemptState {
  /** Number of failed attempts so far */
  attempts: number;
  /** Epoch ms before which no further attempt should be made */
  nextAttemptAt: number;
}

/**
 * useSessionStreamHub
 *
 * Manages awareness and background SSE event consumers for non-active sessions
 * and sub-agents. Allows the UI to display reactive status rings, unread badges,
 * and completion notifications so the user is immediately aware when background
 * agents finish tasks or need responses.
 *
 * Connection policy: failures are retried with backoff rather than blacklisted,
 * because the endpoints legitimately go away (server restart, expired streaming
 * session) and background feedback has to recover without a page reload.
 */
export const useSessionStreamHub = ({
  reactory,
  activeSessionId,
  activePersonaId,
  chats = [],
  recentSessions = [],
  subAgents = [],
  getPersona,
  maxTrackedSessions = 5,
  /**
   * Hard ceiling on concurrent background streams, and it has to stay small.
   *
   * Browsers allow six sockets per host over HTTP/1.1 and an SSE stream holds
   * one open indefinitely. The active session's own stream takes one, so a
   * generous cap here starves — then permanently deadlocks — every GraphQL call
   * to the same origin: six live streams means no socket is ever free again.
   * Two leaves three spare. Raise this only against an HTTP/2 API.
   */
  maxBackgroundConnections = 2,
  deferConnections = false,
  activeSessionStatus = 'idle',
  sessionLogger,
}: UseSessionStreamHubOptions): UseSessionStreamHubResult => {
  const [sessionStates, setSessionStates] = useState<Record<string, TrackedSession>>({});
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const connectingRef = useRef<Set<string>>(new Set());
  const attemptsRef = useRef<Map<string, ConnectAttemptState>>(new Map());
  const getPersonaRef = useRef(getPersona);
  getPersonaRef.current = getPersona;
  const sessionLoggerRef = useRef(sessionLogger);
  sessionLoggerRef.current = sessionLogger;

  // `activeSessionId` is read after `await`s inside the connect effect, where the
  // captured value is already stale. The ref always holds the current value.
  const activeSessionIdRef = useRef<string | null | undefined>(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  // Mirror of the tracked session ids, for the same reason: the connect effect
  // has to know after its `await` whether the session is still tracked.
  const trackedIdsRef = useRef<Set<string>>(new Set());

  /** The active session and its last known status, so it can be handed over. */
  const previousActiveRef = useRef<{
    sessionId: string;
    personaId?: string;
    status: TrackedSessionStatus;
  } | null>(null);
  /** Status to seed a session with when it is first ingested as a background session. */
  const carryOverStatusRef = useRef<Map<string, TrackedSessionStatus>>(new Map());

  /**
   * Sessions the user has actually visited this page-session, most recently
   * left first. These outrank the server's recency list: they are the A → B → C
   * trail the user just walked, and they are the sessions most likely to have a
   * turn still running.
   */
  const visitOrderRef = useRef<Array<{ sessionId: string; personaId?: string }>>([]);

  /** Tracked session id → its rank in the ordering above (0 = most relevant). */
  const trackRankRef = useRef<Map<string, number>>(new Map());

  /**
   * Whether the SSE endpoints share the API's origin — and therefore its
   * six-socket pool. `null` until the first endpoint has been seen; treated as
   * "yes" until proven otherwise, because that is the unsafe case.
   *
   * State rather than a ref: the connect effect reads it to size its slot
   * budget, so learning that streams are cross-origin has to re-run that
   * effect. The ref is the write-side guard so we classify only once.
   */
  const [sameOriginStreams, setSameOriginStreams] = useState<boolean | null>(null);
  const originClassifiedRef = useRef(false);

  /** Log to the console and, when available, the chat session log. */
  const log = useCallback((
    level: 'debug' | 'warn',
    message: string,
    meta?: Record<string, unknown>,
  ) => {
    const prefixed = `[useSessionStreamHub] ${message}`;
    try {
      if (level === 'warn') reactory.log?.(prefixed, meta, 'warning');
      else reactory.debug?.(prefixed, meta);
    } catch {
      // never let diagnostics break the hub
    }
    sessionLoggerRef.current?.[level](prefixed, meta, 'useSessionStreamHub');
  }, [reactory]);

  /** Close and forget the background EventSource for a session, if any. */
  const closeStream = useCallback((sessionId: string, reason: string) => {
    const es = eventSourcesRef.current.get(sessionId);
    if (!es) return;
    try {
      es.close();
    } catch {
      // ignore
    }
    eventSourcesRef.current.delete(sessionId);
    log('debug', `Closed background stream for ${sessionId} (${reason})`, { sessionId, reason });
  }, [log]);

  const resolvePersona = useCallback((personaId: string): IAIPersona | null => {
    if (!getPersonaRef.current) return null;
    try {
      return getPersonaRef.current(personaId);
    } catch {
      return null;
    }
  }, []);

  const closeStreamRef = useRef(closeStream);
  closeStreamRef.current = closeStream;

  /**
   * Running accumulator of stream-driven values, and the ids whose accumulated
   * values have not yet been published to React state. `pending` is never
   * cleared on flush — it stays the authoritative base for the next event, so a
   * token arriving between a flush and its commit cannot lose accumulated text.
   */
  const pendingRef = useRef<Map<string, {
    status: TrackedSessionStatus;
    unread: boolean;
    lastMessage?: string;
    lastToolName?: string;
    waitingToolCallCount?: number;
    hasWaitingToolCalls?: boolean;
  }>>(new Map());
  const dirtyRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);
  /** Mirror of the committed state, so event handling can read it without subscribing. */
  const publishedRef = useRef<Record<string, TrackedSession>>({});

  /** Publish accumulated values for every dirty session in one state update. */
  const flushPending = useCallback(() => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (dirtyRef.current.size === 0) return;

    const dirty = Array.from(dirtyRef.current);
    dirtyRef.current.clear();

    setSessionStates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const sessionId of dirty) {
        const curr = prev[sessionId];
        const acc = pendingRef.current.get(sessionId);
        if (!curr || !acc) continue;
        if (
          curr.status === acc.status &&
          curr.unread === acc.unread &&
          curr.lastMessage === acc.lastMessage &&
          curr.lastToolName === acc.lastToolName &&
          curr.waitingToolCallCount === acc.waitingToolCallCount &&
          curr.hasWaitingToolCalls === acc.hasWaitingToolCalls
        ) continue;
        next[sessionId] = {
          ...curr,
          status: acc.status,
          unread: acc.unread,
          lastMessage: acc.lastMessage,
          lastToolName: acc.lastToolName,
          waitingToolCallCount: acc.waitingToolCallCount,
          hasWaitingToolCalls: acc.hasWaitingToolCalls,
          lastUpdated: new Date(),
        };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushPending();
    }, PREVIEW_FLUSH_MS);
  }, [flushPending]);

  /**
   * Whether a session is worth one of the browser's six per-host sockets.
   *
   * A background session only emits events while a turn is actually running in
   * it. Tracking a session in the stack is free; streaming it is not — so this
   * gates both opening a stream and keeping one. A session that stops
   * qualifying has its stream released by the reconciler below, which is what
   * stops the speculative rank-0 streams from occupying every slot forever as
   * the user moves through sessions.
   */
  const needsStream = useCallback((s: TrackedSession): boolean => {
    // A turn was in flight when we navigated away (carried over on handover).
    if (s.status === 'thinking' || s.status === 'streaming' || s.status === 'executing_tools') return true;
    // Sub-agents run in the background by definition.
    if (s.isSubAgent) return true;
    // The session we most recently left, in case the handover missed a turn
    // that had not surfaced a status yet.
    if (trackRankRef.current.get(s.sessionId) === 0) return true;
    return false;
  }, []);

  // Hand the outgoing session's status over to the background tracker. Declared
  // before the ingest effect below so the carried-over status is available when
  // the backgrounded session is first tracked: a turn that was running when the
  // user navigated away must not read as idle while its stream is connecting.
  useEffect(() => {
    const outgoing = previousActiveRef.current;
    if (outgoing && outgoing.sessionId !== activeSessionId && outgoing.status !== 'idle') {
      carryOverStatusRef.current.set(outgoing.sessionId, outgoing.status);
      log('debug', `Carrying over status '${outgoing.status}' for backgrounded session ${outgoing.sessionId}`, {
        sessionId: outgoing.sessionId,
        status: outgoing.status,
      });
    }
    if (outgoing && outgoing.sessionId !== activeSessionId) {
      // Move the session we just left to the front of the visit trail.
      visitOrderRef.current = [
        { sessionId: outgoing.sessionId, personaId: outgoing.personaId },
        ...visitOrderRef.current.filter((v) => v.sessionId !== outgoing.sessionId),
      ].slice(0, maxTrackedSessions);
    }
    previousActiveRef.current = activeSessionId
      ? { sessionId: activeSessionId, personaId: activePersonaId ?? undefined, status: 'idle' }
      : null;
  }, [activeSessionId, activePersonaId, maxTrackedSessions, log]);

  // Build the tracked set: the user's most recently touched sessions, across
  // every persona, ordered visit-trail first.
  useEffect(() => {
    // Until the active session is known every candidate looks like a background
    // session — including the one that is about to become active. Connecting to
    // it would leave an orphan transport on the active conversation, so hold off
    // until `activeSessionId` resolves.
    if (!activeSessionId) return;

    /** Metadata for a session id, from whichever list carries it. */
    const lookup = (sessionId: string): ChatState | undefined =>
      recentSessions.find((c) => c.id === sessionId) || chats.find((c) => c.id === sessionId);

    // Candidate order defines both what is shown and which sessions win a
    // stream slot:
    //   1. sessions this page-session has visited, most recently left first
    //   2. sub-agents of the active session
    //   3. everything else the user touched recently, newest first
    const ordered: Array<{
      sessionId: string;
      personaId: string;
      title?: string;
      updated?: Date;
      isSubAgent: boolean;
    }> = [];
    const seen = new Set<string>([activeSessionId]);

    const push = (entry: typeof ordered[number]) => {
      if (!entry.sessionId || seen.has(entry.sessionId)) return;
      seen.add(entry.sessionId);
      ordered.push(entry);
    };

    visitOrderRef.current.forEach((visit) => {
      const meta = lookup(visit.sessionId);
      push({
        sessionId: visit.sessionId,
        personaId: meta?.personaId || meta?.persona?.id || visit.personaId || 'unknown',
        title: meta?.title,
        updated: meta?.updated ? new Date(meta.updated) : undefined,
        isSubAgent: false,
      });
    });

    (subAgents || []).forEach((sub) => {
      push({
        sessionId: sub.id,
        personaId: sub.personaId,
        title: sub.title,
        updated: sub.updated ? new Date(sub.updated) : undefined,
        isSubAgent: true,
      });
    });

    (recentSessions.length > 0 ? recentSessions : chats).forEach((chat) => {
      push({
        sessionId: chat.id,
        personaId: chat.personaId || chat.persona?.id || 'unknown',
        title: chat.title,
        updated: chat.updated ? new Date(chat.updated) : (chat.created ? new Date(chat.created) : undefined),
        isSubAgent: false,
      });
    });

    const tracked = ordered.slice(0, maxTrackedSessions);
    // Rank is what the connect effect uses to hand out its limited slots.
    const rankById = new Map(tracked.map((t, index) => [t.sessionId, index]));
    trackRankRef.current = rankById;

    setSessionStates((prev) => {
      const next: Record<string, TrackedSession> = {};
      let changed = Object.keys(prev).length !== tracked.length;

      tracked.forEach((entry) => {
        const persona = resolvePersona(entry.personaId);
        const existing = prev[entry.sessionId];
        if (existing) {
          // Keep live status/unread; only fill in metadata that was missing.
          const persona_ = existing.persona || persona;
          const title = existing.title || entry.title || persona_?.name || 'Conversation';
          if (persona_ !== existing.persona || title !== existing.title) {
            next[entry.sessionId] = { ...existing, persona: persona_, title };
            changed = true;
          } else {
            next[entry.sessionId] = existing;
          }
          return;
        }

        next[entry.sessionId] = {
          sessionId: entry.sessionId,
          personaId: entry.personaId,
          persona,
          title: entry.title || persona?.name || (entry.isSubAgent ? 'Sub-agent' : 'Conversation'),
          status: carryOverStatusRef.current.get(entry.sessionId) || 'idle',
          unread: false,
          lastUpdated: entry.updated || new Date(),
          isSubAgent: entry.isSubAgent,
          parentSessionId: entry.isSubAgent ? activeSessionId : undefined,
        };
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [chats, recentSessions, subAgents, activeSessionId, resolvePersona, maxTrackedSessions]);

  // Reconcile the side-effectful bits against the tracked set once it settles.
  // Kept out of the state updater above, which React may invoke more than once
  // per commit and which therefore has to stay pure.
  useEffect(() => {
    // A seeded session owns its status now; the handover has done its job.
    Object.keys(sessionStates).forEach((sessionId) => carryOverStatusRef.current.delete(sessionId));

    // Release streams for sessions that are gone, or that no longer have a
    // reason to hold a socket (an idle session demoted out of rank 0).
    Array.from(eventSourcesRef.current.keys()).forEach((sessionId) => {
      const tracked = sessionStates[sessionId];
      if (!tracked) {
        attemptsRef.current.delete(sessionId);
        closeStream(sessionId, 'session no longer tracked');
        return;
      }
      if (!needsStream(tracked)) {
        closeStream(sessionId, 'session no longer needs a stream');
      }
    });
  }, [sessionStates, closeStream, needsStream]);

  // When activeSessionId changes, clear unread for active session and disconnect any background SSE for it
  useEffect(() => {
    if (!activeSessionId) return;

    closeStream(activeSessionId, 'session became active');
    connectingRef.current.delete(activeSessionId);
    // Give a session that failed while backgrounded a clean slate: the user has
    // just visited it, so the next time it backgrounds it should try again.
    attemptsRef.current.delete(activeSessionId);
    carryOverStatusRef.current.delete(activeSessionId);

    setSessionStates((prev) => {
      if (!prev[activeSessionId] || !prev[activeSessionId].unread) return prev;
      return {
        ...prev,
        [activeSessionId]: {
          ...prev[activeSessionId],
          unread: false,
        },
      };
    });
  }, [activeSessionId, closeStream]);

  // Keep the active session's last known status current. Declared after the
  // effect above so that, on the render where the active session changes, the
  // handover reads the outgoing session's status before it is replaced.
  useEffect(() => {
    if (!activeSessionId) return;
    if (previousActiveRef.current?.sessionId === activeSessionId) {
      previousActiveRef.current.status = activeSessionStatus;
    }
  }, [activeSessionId, activeSessionStatus]);

  const handleSSEEvent = useCallback((sessionId: string, type: string, rawData: any) => {
    // A terminal event means the turn is over: the badge stays, the socket goes
    // back. Holding it would keep one of six per-host sockets tied up for a
    // session that will never emit again until the user opens it.
    const isTurnTerminal = type === StreamingEventType.COMPLETE
      || type === StreamingEventType.ERROR
      || type === StreamingEventType.INTERRUPTED
      || type === StreamingEventType.TOOL_ITERATION_LIMIT;

    const committed = publishedRef.current[sessionId];
    // Not tracked (pruned, or now the active session) — nothing to update.
    if (!committed) return;

    const base = pendingRef.current.get(sessionId) || {
      status: committed.status,
      unread: committed.unread,
      lastMessage: committed.lastMessage,
      lastToolName: committed.lastToolName,
      waitingToolCallCount: committed.waitingToolCallCount,
      hasWaitingToolCalls: committed.hasWaitingToolCalls,
    };

    // Read the live value: listeners are bound once when the stream opens, so a
    // captured `activeSessionId` would be stale for the rest of the stream.
    const currentActiveSessionId = activeSessionIdRef.current;

    let nextStatus = base.status;
    let nextUnread = base.unread;
    let lastMsg = base.lastMessage;
    let lastTool = base.lastToolName;
    let waitingCount = base.waitingToolCallCount || 0;
    let hasWaiting = base.hasWaitingToolCalls || false;

    switch (type) {
      // The server has no turn-level `start` event (its StreamingEventType enum
      // has none) — the first signal of a live turn is a token, a tool call or
      // one of the long-running phases below. `start` is handled anyway in case
      // one is ever added.
      case StreamingEventType.START: {
        nextStatus = 'thinking';
        break;
      }
      case StreamingEventType.TOKEN:
      case StreamingEventType.REASONING: {
        nextStatus = 'streaming';
        if (rawData?.content) {
          lastMsg = (lastMsg || '') + rawData.content;
          if (lastMsg.length > 80) lastMsg = lastMsg.slice(-80);
        }
        break;
      }
      case StreamingEventType.TOOL_CALL: {
        const isWaitingFocus = rawData?.status === 'waiting_focus' || rawData?.waitingFocus === true;
        if (isWaitingFocus) {
          nextStatus = 'waiting_focus';
          waitingCount = (waitingCount || 0) + 1;
          hasWaiting = true;
          nextUnread = sessionId !== currentActiveSessionId;
        } else {
          nextStatus = 'executing_tools';
        }
        lastTool = rawData?.name || 'Tool Execution';
        break;
      }
      // Long-running phases that are emitted with no token traffic around them.
      // Without these a background agent compacting its context, waiting out a
      // provider retry, or streaming shell output reads as idle.
      case StreamingEventType.SHELL: {
        nextStatus = 'executing_tools';
        lastTool = rawData?.command || lastTool || 'Shell';
        break;
      }
      case StreamingEventType.COMPACTION: {
        nextStatus = 'thinking';
        lastTool = 'Compacting context';
        break;
      }
      case StreamingEventType.RETRY: {
        nextStatus = 'thinking';
        lastTool = 'Retrying';
        break;
      }
      case StreamingEventType.COMPLETE: {
        nextStatus = 'completed';
        nextUnread = sessionId !== currentActiveSessionId;
        if (rawData?.content) {
          lastMsg = rawData.content.slice(0, 100);
        }
        break;
      }
      case StreamingEventType.ERROR:
      case StreamingEventType.TOOL_ITERATION_LIMIT:
      case StreamingEventType.INTERRUPTED: {
        nextStatus = type === StreamingEventType.ERROR ? 'error' : 'completed';
        nextUnread = sessionId !== currentActiveSessionId;
        break;
      }
      default:
        return; // nothing this hub reacts to
    }

    pendingRef.current.set(sessionId, {
      status: nextStatus,
      unread: nextUnread,
      lastMessage: lastMsg,
      lastToolName: lastTool,
      waitingToolCallCount: waitingCount,
      hasWaitingToolCalls: hasWaiting,
    });
    dirtyRef.current.add(sessionId);

    // Flush immediately for the things a user perceives — a ring changing
    // colour, a turn finishing. Coalesce the rest, which at token frequency is
    // just preview text nobody is reading character by character.
    const statusChanged = nextStatus !== committed.status;
    const unreadChanged = nextUnread !== committed.unread;
    if (isTurnTerminal || statusChanged || unreadChanged) {
      flushPending();
    } else {
      scheduleFlush();
    }

    if (isTurnTerminal) {
      // Outside the updater: this is an SSE listener, not a render.
      closeStreamRef.current(sessionId, `turn ended (${type})`);
    }
  }, [flushPending, scheduleFlush]);

  // Mirror committed state for the event handler, and drop accumulator entries
  // for sessions that are no longer tracked.
  useEffect(() => {
    publishedRef.current = sessionStates;
    for (const sessionId of Array.from(pendingRef.current.keys())) {
      if (sessionStates[sessionId]) continue;
      pendingRef.current.delete(sessionId);
      dirtyRef.current.delete(sessionId);
    }
  }, [sessionStates]);

  // Never leave a scheduled flush behind.
  useEffect(() => () => {
    if (flushTimerRef.current !== null) window.clearTimeout(flushTimerRef.current);
  }, []);

  // Establish background SSE listeners for background sessions
  useEffect(() => {
    const now = Date.now();
    trackedIdsRef.current = new Set(Object.keys(sessionStates));

    // Let the conversation load have the socket budget to itself.
    if (deferConnections) return;

    /** Sessions eligible for a connect attempt right now. */
    const candidateSessions = Object.values(sessionStates).filter((s) => {
      if (!s.sessionId || s.sessionId === activeSessionId) return false;
      if (eventSourcesRef.current.has(s.sessionId)) return false;
      if (connectingRef.current.has(s.sessionId)) return false;
      const attempt = attemptsRef.current.get(s.sessionId);
      if (attempt && attempt.nextAttemptAt > now) return false;
      if (!needsStream(s)) return false;
      return true;
    });

    if (candidateSessions.length === 0) return;

    // Cap the number of *open* connections, not the number added per pass.
    // Browsers allow only six sockets per host over HTTP/1.1; the active
    // session's own SSE stream needs one of them, as does every GraphQL call.
    // Until we know the streams live on their own origin, assume they do not.
    const effectiveMax = sameOriginStreams === false
      ? maxBackgroundConnections
      : Math.min(maxBackgroundConnections, SAME_ORIGIN_STREAM_LIMIT);
    const openOrPending = eventSourcesRef.current.size + connectingRef.current.size;
    const slots = Math.max(0, effectiveMax - openOrPending);
    if (slots === 0) return;

    // Hand the slots out by tracked rank: the sessions most recently navigated
    // away from come first, since those are the ones with a turn still running.
    const rankOf = (sessionId: string) => trackRankRef.current.get(sessionId) ?? Number.MAX_SAFE_INTEGER;
    const ordered = [...candidateSessions].sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      return rankOf(a.sessionId) - rankOf(b.sessionId);
    });

    /** Record a failed attempt and schedule the next one with backoff. */
    const recordFailure = (sessionId: string, reason: string, detail?: unknown) => {
      const prior = attemptsRef.current.get(sessionId);
      const attempts = (prior?.attempts ?? 0) + 1;
      const exhausted = attempts >= MAX_CONNECT_ATTEMPTS;
      const delay = exhausted
        ? EXHAUSTED_COOLDOWN_MS
        : CONNECT_BACKOFF_MS[Math.min(attempts, CONNECT_BACKOFF_MS.length - 1)];
      attemptsRef.current.set(sessionId, { attempts: exhausted ? 0 : attempts, nextAttemptAt: Date.now() + delay });
      log('warn', `Background stream connect failed for ${sessionId}: ${reason}`, {
        sessionId,
        reason,
        attempts,
        retryInMs: delay,
        exhausted,
        detail: detail instanceof Error ? detail.message : detail,
      });
    };

    ordered.slice(0, slots).forEach(async (session) => {
      const { sessionId } = session;
      connectingRef.current.add(sessionId);

      try {
        let sseEndpoint = '';
        try {
          const sessionData = await createStreamingSession(reactory as any, sessionId);
          sseEndpoint = sessionData?.endpoint;
        } catch (e) {
          recordFailure(sessionId, 'createStreamingSession rejected', e);
          return;
        }

        if (!sseEndpoint) {
          recordFailure(sessionId, 'createStreamingSession returned no endpoint');
          return;
        }

        // Does this stream cost us a socket from the pool everything else uses?
        if (!originClassifiedRef.current) {
          originClassifiedRef.current = true;
          let shared = true; // assume the unsafe case
          try {
            shared = new URL((reactory as any).API_ROOT).origin === new URL(sseEndpoint).origin;
          } catch {
            // keep the safe assumption
          }
          setSameOriginStreams(shared);
          if (shared) {
            log('warn',
              `Background streams share the API origin, so each one costs a socket from the same `
              + `pool as GraphQL and the CDN. Holding background streams to ${SAME_ORIGIN_STREAM_LIMIT}. `
              + `Set the server's SSE_URI_ROOT to a different origin for the same host `
              + `(e.g. http://127.0.0.1:4000) to give streams their own pool.`,
              { apiRoot: (reactory as any).API_ROOT, limit: SAME_ORIGIN_STREAM_LIMIT });
          } else {
            log('debug', 'Background streams are served from their own origin — using the full connection budget', {
              maxBackgroundConnections,
            });
          }
        }

        // Re-check against the live value: while the POST was in flight the user
        // may have switched to this session, in which case its own useSSE stream
        // owns the conversation and a second transport here is an orphan.
        if (sessionId === activeSessionIdRef.current) {
          log('debug', `Abandoning background connect for ${sessionId} — it became the active session`, { sessionId });
          return;
        }

        // Or the session may have been pruned while the POST was in flight.
        if (!trackedIdsRef.current.has(sessionId)) {
          log('debug', `Abandoning background connect for ${sessionId} — no longer tracked`, { sessionId });
          return;
        }

        const es = new EventSource(sseEndpoint);

        const onEvent = (type: string) => (evt: MessageEvent) => {
          if (typeof evt?.data !== 'string') return;
          try {
            const parsed = JSON.parse(evt.data);
            handleSSEEvent(sessionId, parsed.type || type, parsed.data || parsed);
          } catch (err) {
            // ignore malformed frames
          }
        };

        // Attach listeners for all named streaming events
        es.addEventListener('start', onEvent('start'));
        es.addEventListener('token', onEvent('token'));
        es.addEventListener('reasoning', onEvent('reasoning'));
        es.addEventListener('tool_call', onEvent('tool_call'));
        es.addEventListener('complete', onEvent('complete'));
        es.addEventListener('error', onEvent('error'));
        es.addEventListener('tool_iteration_limit', onEvent('tool_iteration_limit'));
        es.addEventListener('interrupted', onEvent('interrupted'));
        es.addEventListener('retry', onEvent('retry'));
        es.addEventListener('compaction', onEvent('compaction'));
        es.addEventListener('shell', onEvent('shell'));
        es.onmessage = onEvent('message');

        es.onopen = () => {
          // A clean connection resets the backoff for this session.
          attemptsRef.current.delete(sessionId);
          log('debug', `Background stream open for ${sessionId}`, { sessionId });
        };

        es.onerror = () => {
          // readyState CONNECTING means the browser is retrying on its own —
          // leave it alone. CLOSED is terminal (HTTP error, CORS, bad content
          // type) and needs our own backoff-driven retry.
          if (es.readyState !== EventSource.CLOSED) return;
          try { es.close(); } catch { /* ignore */ }
          eventSourcesRef.current.delete(sessionId);
          recordFailure(sessionId, 'EventSource closed by browser');
        };

        eventSourcesRef.current.set(sessionId, es);
      } catch (err) {
        recordFailure(sessionId, 'unexpected error while connecting', err);
      } finally {
        connectingRef.current.delete(sessionId);
      }
    });
  }, [sessionStates, activeSessionId, maxBackgroundConnections, deferConnections, sameOriginStreams, reactory, handleSSEEvent, log]);

  // Retry pass: connect attempts are scheduled with backoff, so something has to
  // re-run the effect above once a backoff window elapses. `sessionStates` alone
  // is not enough — a parked session produces no state changes of its own.
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (attemptsRef.current.size === 0) return;
      // No point waking the connect effect while every slot is taken.
      if (eventSourcesRef.current.size + connectingRef.current.size >= maxBackgroundConnections) return;
      const now = Date.now();
      for (const attempt of attemptsRef.current.values()) {
        if (attempt.nextAttemptAt <= now) {
          setRetryTick((t) => t + 1);
          return;
        }
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [maxBackgroundConnections]);

  // Re-run the connect effect when a backoff window elapses.
  useEffect(() => {
    if (retryTick === 0) return;
    setSessionStates((prev) => ({ ...prev }));
  }, [retryTick]);

  // Teardown all background EventSources on unmount
  useEffect(() => {
    const eventSources = eventSourcesRef.current;
    const connecting = connectingRef.current;
    const attempts = attemptsRef.current;
    return () => {
      eventSources.forEach((es) => {
        try {
          es.close();
        } catch (e) {
          // ignore
        }
      });
      eventSources.clear();
      connecting.clear();
      attempts.clear();
    };
  }, []);

  const clearUnread = useCallback((sessionId: string) => {
    setSessionStates((prev) => {
      if (!prev[sessionId]) return prev;
      return {
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          unread: false,
        },
      };
    });
  }, []);

  const notifySessionActivity = useCallback((sessionId: string, status: TrackedSessionStatus, preview?: string) => {
    setSessionStates((prev) => {
      const curr = prev[sessionId];
      if (!curr) return prev;
      return {
        ...prev,
        [sessionId]: {
          ...curr,
          status,
          unread: sessionId !== activeSessionIdRef.current && (status === 'completed' || status === 'error' || status === 'waiting_focus' || curr.unread),
          lastMessage: preview || curr.lastMessage,
          waitingToolCallCount: status === 'waiting_focus' ? (curr.waitingToolCallCount || 1) : curr.waitingToolCallCount,
          hasWaitingToolCalls: status === 'waiting_focus' ? true : curr.hasWaitingToolCalls,
          lastUpdated: new Date(),
        },
      };
    });
  }, []);

  /**
   * Ordered for display: anything unread first, then the tracked order itself —
   * the visit trail, so the session you just left sits closest to the active
   * agent's button. `trackRankRef` only ever changes alongside `sessionStates`,
   * which is what re-runs this memo.
   */
  const backgroundSessions = useMemo(() => {
    const rankOf = (sessionId: string) => trackRankRef.current.get(sessionId) ?? Number.MAX_SAFE_INTEGER;
    return Object.values(sessionStates)
      .filter((s) => s.sessionId !== activeSessionId)
      .sort((a, b) => {
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        const byRank = rankOf(a.sessionId) - rankOf(b.sessionId);
        if (byRank !== 0) return byRank;
        return b.lastUpdated.getTime() - a.lastUpdated.getTime();
      });
  }, [sessionStates, activeSessionId]);

  // Calculate count of other sessions for the active persona
  const activePersonaSessionCount = useMemo(() => {
    if (!activePersonaId) return 0;
    const matchingChats = chats.filter(
      (c) => (c.personaId === activePersonaId || c.persona?.id === activePersonaId)
    );
    return matchingChats.length;
  }, [chats, activePersonaId]);

  return {
    backgroundSessions,
    activePersonaSessionCount,
    clearUnread,
    notifySessionActivity,
  };
};

export default useSessionStreamHub;
