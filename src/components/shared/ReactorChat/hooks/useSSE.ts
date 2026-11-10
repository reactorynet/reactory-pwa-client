import React from 'react';
import Reactory from '@reactorynet/reactory-core';
import { UXChatMessage, SessionLogger } from '@reactory/client-core/components/shared/ReactorChat/types';

export enum StreamingEventType {
  TOKEN = 'token',
  REASONING = 'reasoning',
  TOOL_CALL = 'tool_call',
  COMPLETE = 'complete',
  ERROR = 'error',
  TOOL_ITERATION_LIMIT = 'tool_iteration_limit',
  INTERRUPTED = 'interrupted',
  RETRY = 'retry',
  COMPACTION = 'compaction',
  SHELL = 'shell',
  /**
   * The server could not replay the requested id: the client asked to resume
   * from a `Last-Event-ID` that has already been evicted from the server's
   * bounded replay buffer. The stream is alive, but the gap is unobservable, so
   * the client must re-fetch conversation state instead of resuming from an
   * unknown point.
   */
  RESYNC = 'resync',
  START= 'start',
  /**
   * The turn is PAUSED, not finished: a client-routed tool call was forwarded
   * and its result is still outstanding.
   *
   * Emitted where the server used to emit `COMPLETE` while a client tool was
   * unanswered. It must do the terminal *UI* work `COMPLETE` did — stop the
   * streaming indicator, finalise the buffered assistant text — without
   * claiming the turn is over. The turn resumes when the browser reports the
   * result through `ReactorCompleteClientToolCalls`.
   */
  AWAITING_CLIENT_TOOL = 'awaiting_client_tool',
}

/**
 * Base streaming event interface
 */
export interface StreamingEventBase {
  /** Event type discriminator */
  type: StreamingEventType;
  /** Session ID this event belongs to */
  sessionId: string;
  /** Conversation ID this event belongs to */
  conversationId: string;
  /** Message ID this event belongs to */
  messageId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event-specific data */
  data: any;
}

/**
 * Token streaming event
 */
export interface TokenStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.TOKEN;
  data: {
    content: string;
    delta: string;
    position: number;
    isComplete: boolean;
  };
}

/**
 * Tool call streaming event
 */
export interface ToolCallStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.TOOL_CALL;
  data: {
    name: string;           // Changed from toolName to match server
    arguments: any;
    id: string;             // Changed from callId to match server
    isComplete: boolean;     // Changed from status to match server
    /** The execution result, included when isComplete is true */
    result?: any;
  };
}

export interface CompletionStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.COMPLETE;
  data: {
    content: string;
    finishReason: 'stop' | 'error';
    thinking?: string;
    images?: Array<{ b64_json?: string; url?: string; mimeType?: string }>;
  };
}

export interface ErrorStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.ERROR;
  data: {
    /** Error code from the server (e.g. 'STREAM_ERROR', 'CONNECTION_ERROR') */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Optional additional error details */
    details?: any;
  };
}

/**
 * Reasoning/thinking streaming event
 */
export interface ReasoningStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.REASONING;
  data: {
    content: string;
    delta: string;
    position: number;
    isComplete: boolean;
  };
}

export interface ToolIterationLimitStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.TOOL_ITERATION_LIMIT;
  data: {
    iterationsCompleted: number;
    maxIterations: number;
    partialContent: string;
    componentFqn?: string;
    componentProps?: any;
  };
}

export interface InterruptedStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.INTERRUPTED;
  data: {
    iterationsCompleted: number;
    reason?: string;
  };
}

/**
 * Retry streaming event — the provider hit a retryable error and will
 * automatically retry after a backoff period.
 */
export interface RetryStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.RETRY;
  data: {
    /** Current retry attempt (1-based) */
    attempt: number;
    /** Maximum number of retries that will be attempted */
    maxAttempts: number;
    /** Backoff delay in milliseconds before the next attempt */
    retryAfterMs: number;
    /** Human-readable reason for the retry */
    reason: string;
  };
}

/**
 * Shell streaming event — incremental stdout/stderr and lifecycle from a shell
 * process. `shellSessionId` groups all events for one terminal; `source`
 * distinguishes an LLM macro run, an interactive widget PTY, or a workflow step.
 */
export interface ShellStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.SHELL;
  data: {
    shellSessionId: string;
    phase: 'start' | 'stdout' | 'stderr' | 'exit';
    source: 'macro' | 'widget' | 'workflow';
    chunk?: string;
    command?: string;
    cwd?: string;
    pid?: number;
    exitCode?: number;
    timedOut?: boolean;
  };
}

export interface CompactionStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.COMPACTION;
  data: {
    phase: 'start' | 'progress' | 'complete' | 'error';
    reason?: string;
    tokensBefore?: number;
    maxTokens?: number;
    percentageUsed?: number;
    messagesArchived?: number;
    tokensAfter?: number;
    percentageAfter?: number;
    errorMessage?: string;
    usedFallback?: boolean;
  };
}

/**
 * The turn paused on an outstanding client-tool result.
 *
 * Carries the calls the browser owes a result for, so the client resumes exactly
 * those calls instead of inferring them from the transcript. Shape mirrors the
 * server's `AwaitingClientToolStreamingEvent`.
 */
export interface AwaitingClientToolStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.AWAITING_CLIENT_TOOL;
  data: {
    /** The calls the turn is paused on — the browser must run these and report back. */
    pendingToolCalls: Array<{ toolCallId: string; toolName: string }>;
  };
}

/**
 * The server could not replay the requested id: the client asked to resume from
 * a `Last-Event-ID` that has already been evicted from the server's bounded
 * replay buffer. The stream is alive, but the gap is unobservable, so the client
 * must re-fetch conversation state instead of resuming from an unknown point.
 */
export interface ResyncStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.RESYNC;
  data: {
    /** Why the server could not resume, e.g. `evicted` / `unknown-id`. */
    reason?: string;
    /** The id the client asked to resume from, when the server reports it. */
    requestedId?: string;
    /** The oldest id the server can still replay, when the server reports it. */
    oldestAvailableId?: string;
  };
}

/**
 * Payload carried by a `resync` frame, normalised.
 *
 * The frame may be a full streaming-event envelope (`{ type, data }`), a bare
 * JSON object, or even a plain token — the contract only says "tell the client
 * to resync", so nothing here should be trusted to have a particular shape.
 */
export interface ResyncSignal {
  reason?: string;
  requestedId?: string;
  oldestAvailableId?: string;
}

export interface UseSSEOptions {
  reactory: Reactory.Client.ReactorySDK;
  onToken?: (token: TokenStreamingEvent) => void;
  onReasoning?: (reasoning: ReasoningStreamingEvent) => void;
  onMessage?: (message: CompletionStreamingEvent) => void;
  onError?: (error: any) => void;
  onToolCall?: (toolCall: ToolCallStreamingEvent) => void;
  onToolIterationLimit?: (event: ToolIterationLimitStreamingEvent) => void;
  onInterrupted?: (event: InterruptedStreamingEvent) => void;
  onRetry?: (event: RetryStreamingEvent) => void;
  onCompaction?: (event: CompactionStreamingEvent) => void;
  /** Called for each shell stream event (stdout/stderr/lifecycle from a shell process) */
  onShell?: (event: ShellStreamingEvent) => void;
  /**
   * Called when the server pauses the turn on an outstanding client-tool
   * result. The consumer must execute (or explicitly fail) the listed calls and
   * report them back; it must not treat the turn as finished.
   */
  onAwaitingClientTool?: (event: AwaitingClientToolStreamingEvent) => void;
  /** Called when the SSE connection drops and a reconnect attempt begins */
  onReconnecting?: (attempt: number, maxAttempts: number, delayMs: number) => void;
  /** Called when a dropped SSE connection is successfully re-established */
  onReconnected?: () => void;
  /** Called when the reconnect budget is exhausted and the transport gives up */
  onReconnectFailed?: (totalAttempts: number) => void;
  /**
   * Called when the streaming session behind the endpoint can no longer be
   * revived, because it has outlived the server's streaming-session TTL.
   *
   * Distinct from `onReconnectFailed`: retrying is pointless, and the caller
   * should resync the conversation and then obtain a *fresh* stream via
   * `ReactorInitiateSSE`. See `STREAM_SESSION_MAX_AGE_MS`.
   */
  onSessionExpired?: () => void;
  /** Called whenever an SSE data event (start, token, tool_call, reasoning) is received.
   *  Useful for detecting server activity on reconnect when no explicit busy signal exists. */
  onStreamActivity?: () => void;
  /** Called for every transport keepalive: a `heartbeat`/`keepalive` event frame,
   *  or the connection opening. Proves the socket is alive without claiming the
   *  model produced anything, which is what lets a long silent tool step be
   *  told apart from a dead stream. */
  onHeartbeat?: () => void;
  /**
   * Called when the server signals that the stream could not be resumed from
   * the requested `Last-Event-ID` (the id was evicted from its bounded replay
   * buffer). The socket is alive but the gap is unobservable: the caller must
   * re-fetch conversation state rather than resume from an unknown point.
   *
   * Wire this to `useStreamRecovery`'s resync path — it is the same reconcile
   * every other recovery reason uses, not a second recovery mechanism.
   */
  onResync?: (signal: ResyncSignal) => void;
  /**
   * Operator override for the dead-stream window (ms).
   *
   * When omitted the window is derived from the observed heartbeat cadence (see
   * `deriveLivenessTimeoutMs`), falling back to `SSE_LIVENESS_TIMEOUT_MS` while
   * no heartbeat has ever been seen. Read at arm time, so a changed override
   * takes effect on the next frame rather than needing a reconnect.
   */
  livenessTimeoutMs?: number;
  /**
   * Whether a turn is currently in flight.
   *
   * The dead-stream backstop only applies while a turn is running. An open but
   * idle chat has nothing to prove: the next message re-establishes the stream
   * anyway, so treating an idle stream's silence as failure closed and reopened
   * a perfectly healthy connection every five minutes — re-arming the timer,
   * flashing 'Reconnecting...'/'Reconnected' and forcing a conversation fetch
   * each cycle. That is the same untruthful status this ticket exists to remove.
   */
  turnActive?: boolean;
  /** Optional session logger for client-to-server debug logging */
  sessionLogger?: SessionLogger;
}

export interface UseSSEResult {
  connect: (opts: {
    endpoint: string;
    sessionId: string;
    token?: string;
    headers?: Record<string, string>;
    expiry?: Date;
    onConnectionOpened?: () => void;
  }) => void;
  disconnect: () => void;
  isStreaming: boolean;
  connected: boolean;
  eventSource: EventSource | null;
  currentStreamingMessage: string;
  /** True while automatic reconnection attempts are in progress */
  isReconnecting: boolean;
  /** The current reconnection attempt number (0 = not reconnecting) */
  reconnectAttempt: number;
  /**
   * Revive the transport on demand: restart a stream that gave up, or skip the
   * remaining backoff of one that is still retrying. No-op (returns false) when
   * no stream was ever opened, the stream already completed, or it is healthy.
   * Called on focus/visibilitychange so returning to the tab always recovers.
   */
  rearm: () => boolean;
}

/**
 * Minimum chunk size (in characters) below which we emit tokens immediately.
 * Chunks larger than this are split into word-level segments and drip-fed
 * to simulate smooth token-by-token streaming.
 *
 * NOTE: The server already batches tokens into small chunks (≤8 chars) before
 * sending via SSE, so the client drip-feed is effectively disabled by setting
 * a high threshold. Tokens are passed straight through for instant rendering.
 */
const DRIP_THRESHOLD = 80;

/**
 * Interval between drip-fed word emissions (ms).
 * Only used when a chunk exceeds DRIP_THRESHOLD (currently never).
 */
const DRIP_INTERVAL_MS = 20;

/**
 * Reconnect policy.
 *
 * The previous policy was five attempts with fixed delays (1 s, 2 s, 4 s, 8 s,
 * 16 s) — a 31-second budget in total — after which the transport gave up
 * permanently. A single agent turn routinely outlives that: tool steps of 13–14
 * minutes were observed in the field, and an idle-socket/proxy drop or a machine
 * sleep of more than half a minute would exhaust the budget long before the turn
 * finished. The client then watched a stream that no longer existed and never
 * learned the run had completed.
 *
 * The budget is now expressed in *time*, not attempts: keep trying for
 * `RECONNECT_MAX_ELAPSED_MS`, with exponential backoff that jitters and is
 * capped per delay. Retrying is cheap (one TCP connect every ≤30 s) and the
 * visible "reconnecting" state tells the user what is happening.
 */
const RECONNECT_BASE_DELAY_MS = 1_000;
/** Ceiling for a single backoff delay — the budget is long, not each wait. */
const RECONNECT_MAX_DELAY_MS = 30_000;
/** Delay jitter, as a fraction of the computed delay (±25%). */
const RECONNECT_JITTER_RATIO = 0.25;
/**
 * How long the transport keeps trying before declaring the stream lost.
 * Four hours comfortably covers the longest expected turn; after that the
 * conversation is resynced from the server and the user can re-arm by
 * interacting (or by returning to the tab).
 */
export const RECONNECT_MAX_ELAPSED_MS = 4 * 60 * 60 * 1000;
/** Hard stop for a pathological timer loop; at the 30 s cap this far exceeds
 *  the elapsed budget, so it is a safety valve rather than the real limit. */
const RECONNECT_MAX_ATTEMPTS = 1_000;

/**
 * How long a reconnect may keep retrying the *same* streaming session.
 *
 * The budget above is about the turn; this is about the transport that carries
 * it. `ReactorInitiateSSE` returns an endpoint containing a streaming-session
 * uuid, and the server keeps that session for one hour
 * (StreamingSessionManager.DEFAULT_EXPIRY_HOURS = 1, plus an `expiresAt` check in
 * getSession). Reconnecting re-opens the same URL, so once the hour has passed
 * every attempt is answered with "session not found" and can never succeed — the
 * client cannot see that status (EventSource hides it) and the `expiry` the
 * server returns is 24 h, so the old guard never fired. Retrying for the rest of
 * a 4 h budget would leave the pill on "Reconnecting…" for hours after a run had
 * visibly finished.
 *
 * Slightly under an hour so the last attempt lands while the session is still
 * valid. When this elapses the transport stops and tells the caller, which can
 * resync and ask the server for a fresh streaming session.
 */
export const STREAM_SESSION_MAX_AGE_MS = 55 * 60 * 1000;

/**
 * Silence (ms) after which an open stream is treated as dead even if the
 * browser never fired `onerror` — the failure mode behind an idle-socket or
 * proxy drop. Any frame (data or keepalive) resets it. This is a backstop, not
 * the primary detector: `onerror` and the recovery hook's server resync usually
 * get there first.
 *
 * When the server sends *named* heartbeats the window is derived from their
 * measured cadence instead (see `deriveLivenessTimeoutMs`); this value is then
 * only the fallback used until a cadence has been observed — i.e. exactly the
 * behaviour of an older server that never sends the named frame. Keeping it at
 * five minutes matters for that case: without a heartbeat, silence is the only
 * signal there is, and a shorter guess would recycle healthy-but-quiet streams.
 */
export const SSE_LIVENESS_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * The server's default heartbeat cadence (`REACTORY_STREAMING_HEARTBEAT_MS`,
 * 25 s in `StreamingTransportManager`). Documented, not assumed: the client
 * measures what actually arrives.
 */
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * How many heartbeat intervals of silence are tolerated before the stream is
 * presumed dead.
 *
 * Three, not two: a single missed heartbeat is a scheduling hiccup, not a dead
 * socket, and the window must still comfortably exceed a legitimate pause
 * between tokens. With the default 25 s cadence this yields a 75 s window —
 * faster than the five-minute guess by a factor of four, and still four times
 * longer than a 20 s token pause.
 */
export const HEARTBEAT_TIMEOUT_MULTIPLIER = 3;

/** Floor for the derived window (ms) — also covers the server's 15 s per-turn
 *  cadence, where 3× would leave no room for a slow-but-alive token stream. */
export const SSE_LIVENESS_MIN_TIMEOUT_MS = 60_000;

/** Ceiling for the derived window (ms) — detection latency must stay bounded
 *  even if the server's configured cadence is very long. */
export const SSE_LIVENESS_MAX_TIMEOUT_MS = 3 * 60 * 1000;

/** Heartbeat samples below this are frame noise (duplicates), not cadence. */
export const MIN_OBSERVED_HEARTBEAT_INTERVAL_MS = 1_000;

/** A sample above this is an outage, not the cadence; cap what it can imply. */
export const MAX_OBSERVED_HEARTBEAT_INTERVAL_MS = 120_000;

/**
 * Derive the dead-stream window from the cadence the server actually beats at.
 *
 * `observedHeartbeatIntervalMs` is the measured gap between two named
 * heartbeat/keepalive frames. With no measurement there is nothing to derive
 * from, so the legacy five-minute fallback is returned unchanged — that is what
 * keeps an older server (comment-only keepalive, invisible to `EventSource`)
 * degrading gracefully instead of being watchdog-hammered.
 */
export const deriveLivenessTimeoutMs = (
  observedHeartbeatIntervalMs?: number | null,
): number => {
  if (
    typeof observedHeartbeatIntervalMs !== 'number'
    || !Number.isFinite(observedHeartbeatIntervalMs)
    || observedHeartbeatIntervalMs <= 0
  ) {
    return SSE_LIVENESS_TIMEOUT_MS;
  }
  const derived = observedHeartbeatIntervalMs * HEARTBEAT_TIMEOUT_MULTIPLIER;
  return Math.min(
    SSE_LIVENESS_MAX_TIMEOUT_MS,
    Math.max(SSE_LIVENESS_MIN_TIMEOUT_MS, Math.round(derived)),
  );
};

/**
 * Resolve the window actually used to arm the watchdog: an explicit operator
 * override wins, otherwise the cadence-derived value, otherwise the fallback.
 */
export const resolveLivenessTimeoutMs = (
  overrideMs: number | null | undefined,
  observedHeartbeatIntervalMs?: number | null,
): number => {
  if (typeof overrideMs === 'number' && Number.isFinite(overrideMs) && overrideMs > 0) {
    return overrideMs;
  }
  return deriveLivenessTimeoutMs(observedHeartbeatIntervalMs);
};

/**
 * Normalise a `resync` frame into `ResyncSignal`.
 *
 * Deliberately tolerant: the frame is a *signal*, and a client that throws
 * because it could not parse the reason would ignore the one message it must
 * never ignore.
 */
export const parseResyncSignal = (event: MessageEvent): ResyncSignal => {
  const raw = typeof (event as MessageEvent)?.data === 'string'
    ? (event as MessageEvent).data
    : undefined;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const payload = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed;
    if (!payload || typeof payload !== 'object') return { reason: String(payload) };
    return {
      reason: typeof payload.reason === 'string' ? payload.reason : undefined,
      requestedId: typeof payload.requestedId === 'string' ? payload.requestedId : undefined,
      oldestAvailableId: typeof payload.oldestAvailableId === 'string'
        ? payload.oldestAvailableId
        : undefined,
    };
  } catch {
    return { reason: raw };
  }
};

/**
 * Compute the backoff delay for an attempt (1-based).
 * Exponential from `RECONNECT_BASE_DELAY_MS`, capped at `RECONNECT_MAX_DELAY_MS`,
 * with ±25% jitter so a fleet of tabs does not reconnect in lockstep.
 */
export const computeReconnectDelay = (
  attempt: number,
  random: () => number = Math.random,
): number => {
  const exponent = Math.max(0, attempt - 1);
  const exponential = RECONNECT_BASE_DELAY_MS * Math.pow(2, exponent);
  const capped = Math.min(exponential, RECONNECT_MAX_DELAY_MS);
  const jitter = 1 + RECONNECT_JITTER_RATIO * (random() * 2 - 1);
  const jittered = capped * jitter;
  // The floor is a sanity bound, not the base delay: jitter may legitimately
  // make the first retry come sooner than the base.
  return Math.max(250, Math.min(RECONNECT_MAX_DELAY_MS, Math.round(jittered)));
};

/**
 * Identity for an SSE connection, so the server can say *who* is subscribed.
 *
 * Two live transports on one conversation is legitimate — the transport manager
 * supports it deliberately — but nothing in the logs distinguished "two browser
 * tabs" from "two chat components mounted in one tab" from "a leaked stream",
 * which cost a lot of forensics to rule out one at a time. The tab half comes
 * from sessionStorage (per-tab, survives reload); the suffix is per hook
 * instance. Same tab id with different suffixes means two mounted components;
 * different tab ids mean different tabs.
 */
const CLIENT_INSTANCE_KEY = 'reactory.sse.clientInstanceId';
let hookInstanceCounter = 0;

const tabInstanceId = (): string => {
  try {
    let id = sessionStorage.getItem(CLIENT_INSTANCE_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(CLIENT_INSTANCE_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
};

const useSSE = ({
  reactory,
  onToken,
  onReasoning,
  onMessage,
  onError,
  onToolCall,
  onToolIterationLimit,
  onInterrupted,
  onRetry,
  onCompaction,
  onShell,
  onAwaitingClientTool,
  onReconnecting,
  onReconnected,
  onReconnectFailed,
  onSessionExpired,
  onStreamActivity,
  onHeartbeat,
  onResync,
  livenessTimeoutMs,
  turnActive,
  sessionLogger,
}: UseSSEOptions): UseSSEResult => {
  /** Whether a turn is in flight, readable from timers that were bound once. */
  const turnActiveRef = React.useRef<boolean>(!!turnActive);
  turnActiveRef.current = !!turnActive;
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = React.useState('');
  const [isReconnecting, setIsReconnecting] = React.useState(false);
  const [reconnectAttempt, setReconnectAttempt] = React.useState(0);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  /** `<tab>:<mount>` — see tabInstanceId. */
  const clientInstanceRef = React.useRef<string>(`${tabInstanceId()}:${++hookInstanceCounter}`);

  /** Build the connection URL, tagging it so the server can log who connected. */
  const streamUrl = React.useCallback((endpoint: string): string => {
    const url = new URL(endpoint);
    url.searchParams.set('client-instance', clientInstanceRef.current);
    return url.toString();
  }, []);
  const sessionRef = React.useRef<string | null>(null);

  // Callback refs — always point to the latest callback so SSE event
  // listeners (which are bound once on connect) never go stale.
  const onTokenRef = React.useRef(onToken);
  const onReasoningRef = React.useRef(onReasoning);
  const onMessageRef = React.useRef(onMessage);
  const onErrorRef = React.useRef(onError);
  const onToolCallRef = React.useRef(onToolCall);
  const onToolIterationLimitRef = React.useRef(onToolIterationLimit);
  const onInterruptedRef = React.useRef(onInterrupted);
  const onRetryRef = React.useRef(onRetry);
  const onCompactionRef = React.useRef(onCompaction);
  const onShellRef = React.useRef(onShell);
  const onAwaitingClientToolRef = React.useRef(onAwaitingClientTool);
  const onReconnectingRef = React.useRef(onReconnecting);
  const onReconnectedRef = React.useRef(onReconnected);
  const onReconnectFailedRef = React.useRef(onReconnectFailed);
  const onSessionExpiredRef = React.useRef(onSessionExpired);
  onTokenRef.current = onToken;
  onReasoningRef.current = onReasoning;
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  onToolCallRef.current = onToolCall;
  onToolIterationLimitRef.current = onToolIterationLimit;
  onInterruptedRef.current = onInterrupted;
  onRetryRef.current = onRetry;
  onCompactionRef.current = onCompaction;
  onShellRef.current = onShell;
  onAwaitingClientToolRef.current = onAwaitingClientTool;
  const onStreamActivityRef = React.useRef(onStreamActivity);
  onReconnectingRef.current = onReconnecting;
  onReconnectedRef.current = onReconnected;
  onReconnectFailedRef.current = onReconnectFailed;
  onStreamActivityRef.current = onStreamActivity;
  const onHeartbeatRef = React.useRef(onHeartbeat);
  onHeartbeatRef.current = onHeartbeat;
  const onResyncRef = React.useRef(onResync);
  onResyncRef.current = onResync;
  onSessionExpiredRef.current = onSessionExpired;

  // Reconnection state refs
  const lastConnectOptsRef = React.useRef<{
    endpoint: string; sessionId: string; token?: string;
    headers?: Record<string, string>; expiry?: Date; onConnectionOpened?: () => void;
  } | null>(null);
  const hasCompletedRef = React.useRef<boolean>(false);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const reconnectAttemptsRef = React.useRef<number>(0);
  /** Start of the current run of reconnect attempts — the budget is elapsed time. */
  const reconnectStartedAtRef = React.useRef<number | null>(null);
  /** When the current streaming session (the URL we reconnect to) was opened. */
  const streamOpenedAtRef = React.useRef<number | null>(null);
  /** Backstop for a stream that dies without firing `onerror`. */
  const livenessTimerRef = React.useRef<number | null>(null);
  /** When the last named heartbeat/keepalive frame arrived (ms since epoch). */
  const lastHeartbeatAtRef = React.useRef<number | null>(null);
  /**
   * Measured gap between two named heartbeat frames, in ms — the "server
   * cadence" the dead-stream window is derived from. `null` until a cadence
   * has actually been observed, which is what makes an older server (no named
   * frame at all) fall back instead of being judged against a guess.
   */
  const heartbeatIntervalRef = React.useRef<number | null>(null);
  /**
   * Latest operator override. Held in a ref because `noteFrame` is bound into
   * `noteFrameRef` and into EventSource listeners on the first render: reading
   * a captured constant would silently ignore a later override.
   */
  const livenessTimeoutMsRef = React.useRef<number | undefined>(livenessTimeoutMs);
  livenessTimeoutMsRef.current = livenessTimeoutMs;
  const reconnectNowRef = React.useRef<() => void>(() => {});
  const attemptReconnectRef = React.useRef<() => void>(() => {});
  const noteFrameRef = React.useRef<() => void>(() => {});

  // Token drip-feed queue: words waiting to be emitted
  const tokenQueueRef = React.useRef<{ segments: string[]; template: TokenStreamingEvent }[]>([]);
  const dripTimerRef = React.useRef<number | null>(null);
  // Holds a complete event that arrived while the drip queue was still running.
  // It will be fired once the queue fully drains.
  const pendingCompleteRef = React.useRef<CompletionStreamingEvent | null>(null);

  /**
   * Flush the drip-feed queue: emit one segment per interval tick.
   * When the queue empties, fire any deferred completion event.
   */
  const flushQueue = React.useCallback(() => {
    if (dripTimerRef.current !== null) return; // already running

    const tick = () => {
      const queue = tokenQueueRef.current;
      if (queue.length === 0) {
        dripTimerRef.current = null;
        // Fire deferred completion now that every word has been rendered
        if (pendingCompleteRef.current) {
          const evt = pendingCompleteRef.current;
          pendingCompleteRef.current = null;
          hasCompletedRef.current = true;
          setIsStreaming(false);
          if (onMessageRef.current) onMessageRef.current(evt);
        }
        return;
      }

      const front = queue[0];
      const segment = front.segments.shift();
      if (segment && onTokenRef.current) {
        onTokenRef.current({
          ...front.template,
          data: {
            ...front.template.data,
            content: segment,
            delta: segment,
          },
        });
      }

      if (front.segments.length === 0) {
        queue.shift();
      }

      dripTimerRef.current = window.setTimeout(tick, DRIP_INTERVAL_MS);
    };

    dripTimerRef.current = window.setTimeout(tick, 0);
  }, []);

  /**
   * Enqueue a large token chunk by splitting into word-level segments.
   */
  const enqueueTokenDrip = React.useCallback(
    (event: TokenStreamingEvent) => {
      reactory.debug('[useSSE]: enqueueTokenDrip', event);
      const text = String(event?.data?.content ?? event?.data?.delta ?? '');
      if (text.length <= DRIP_THRESHOLD) {
        // Small enough — emit immediately
        if (onTokenRef.current) onTokenRef.current(event);
        return;
      }

      // Split on word boundaries, preserving whitespace with the preceding word
      const segments: string[] = [];
      const words = text.split(/(\s+)/);
      let buf = '';
      for (const w of words) {
        buf += w;
        // Emit after each whitespace-terminated word (or at end)
        if (/\s$/.test(buf) || w === words[words.length - 1]) {
          if (buf) segments.push(buf);
          buf = '';
        }
      }
      if (buf) segments.push(buf);

      if (segments.length <= 1) {
        // Only one segment — emit directly
        if (onTokenRef.current) onTokenRef.current(event);
        return;
      }

      tokenQueueRef.current.push({ segments, template: event });
      flushQueue();
    },
    [flushQueue]
  );

  /**
   * Dispatch an SSE MessageEvent. Uses callback refs so the handler
   * never goes stale even though event listeners are bound once.
   */
  const handleMessage = React.useCallback((event: MessageEvent) => {
    // EventSource dispatches its own transport failures as an `error` event
    // that carries no `data`. Because we also subscribe to server-sent
    // `event: error` frames under the same name, those transport events land
    // here too. Ignore them — `es.onerror` owns reconnection. Without this
    // guard `JSON.parse(undefined)` throws and we raise a phantom PARSE_ERROR,
    // which the consumer treats as a real stream failure and uses to clear the
    // agent-busy state mid-run.
    if (typeof event?.data !== 'string') return;

    // Any frame proves the socket is alive: content, keepalive, or completion.
    noteFrameRef.current();

    try {
      const data = JSON.parse(event.data);

      if (data.type !== 'token') {
        reactory.debug('useSSE: event', data);
      }

      // Notify consumer of server-side activity for any data-bearing event.
      // This allows the consumer to re-activate busy indicators on reconnect.
      // `awaiting_client_tool` belongs here too: the turn is paused, not ended,
      // so it is still activity (it keeps the busy indicator honest and stops a
      // stall timer from treating the pause as silence).
      if (
        data.type === 'start'
        || data.type === 'token'
        || data.type === 'tool_call'
        || data.type === 'reasoning'
        || data.type === 'awaiting_client_tool'
      ) {
        if (onStreamActivityRef.current) onStreamActivityRef.current();
      }

      switch (data.type) {
        case 'token': {
          setIsStreaming(true);
          enqueueTokenDrip(data as TokenStreamingEvent);
          break;
        }
        case 'reasoning': {          
          setIsStreaming(true);
          if (onReasoningRef.current) onReasoningRef.current(data as ReasoningStreamingEvent);
          break;
        }
        case 'complete': {
          hasCompletedRef.current = true;
          clearLivenessTimer();
          sessionLogger?.info('SSE complete event received', { finishReason: (data as CompletionStreamingEvent).data?.finishReason, contentLength: (data as CompletionStreamingEvent).data?.content?.length || 0 }, 'useSSE');

          // If the drip queue is still running, flush all remaining segments
          // immediately rather than waiting for word-by-word dripping. This
          // prevents multi-second delays when re-renders are expensive (e.g.
          // complex tool call histories in AUTO mode).
          if (dripTimerRef.current !== null) {
            clearTimeout(dripTimerRef.current);
            dripTimerRef.current = null;
          }
          const queue = tokenQueueRef.current;
          if (queue.length > 0) {
            // Emit all remaining queued content as a single token per entry
            for (const entry of queue) {
              const remaining = entry.segments.join('');
              if (remaining && onTokenRef.current) {
                onTokenRef.current({
                  ...entry.template,
                  data: {
                    ...entry.template.data,
                    content: remaining,
                    delta: remaining,
                  },
                });
              }
            }
            tokenQueueRef.current = [];
          }
          pendingCompleteRef.current = null;

          // Now fire the completion immediately
          setIsStreaming(false);
          if (onMessageRef.current) onMessageRef.current(data as CompletionStreamingEvent);
          break;
        }
        case 'error': {
          const errEvt = data as ErrorStreamingEvent;
          sessionLogger?.error(`SSE error event: ${errEvt.data?.code}`, { code: errEvt.data?.code, message: errEvt.data?.message }, 'useSSE');
          setIsStreaming(false);
          if (onErrorRef.current) onErrorRef.current(errEvt);
          break;
        }
        case 'start': {
          sessionLogger?.info('SSE stream started', { sessionId: data.sessionId }, 'useSSE');
          setIsStreaming(true);
          break;
        }
        case 'tool_call': {
          const tc = data as ToolCallStreamingEvent;
          sessionLogger?.info(`SSE tool_call: ${tc.data?.name}`, { toolName: tc.data?.name, callId: tc.data?.id, isComplete: tc.data?.isComplete }, 'useSSE');
          if (onToolCallRef.current) {
            void onToolCallRef.current(tc);
          }
          break;
        }
        case 'tool_iteration_limit': {
          const limitEvt = data as ToolIterationLimitStreamingEvent;
          sessionLogger?.warn('SSE tool iteration limit reached', { iterationsCompleted: limitEvt.data?.iterationsCompleted, maxIterations: limitEvt.data?.maxIterations }, 'useSSE');
          setIsStreaming(false);
          if (onToolIterationLimitRef.current) {
            onToolIterationLimitRef.current(limitEvt);
          }
          break;
        }
        case 'interrupted': {
          const intEvt = data as InterruptedStreamingEvent;
          sessionLogger?.info('SSE interrupted by user', { iterationsCompleted: intEvt.data?.iterationsCompleted, reason: intEvt.data?.reason }, 'useSSE');
          setIsStreaming(false);
          if (onInterruptedRef.current) {
            onInterruptedRef.current(intEvt);
          }
          break;
        }
        case 'retry': {
          const retryEvt = data as RetryStreamingEvent;
          sessionLogger?.info(`SSE retry: ${retryEvt.data?.reason}`, { reason: retryEvt.data?.reason }, 'useSSE');
          if (onRetryRef.current) {
            onRetryRef.current(retryEvt);
          }
          break;
        }
        case 'compaction': {
          const compactionEvt = data as CompactionStreamingEvent;
          sessionLogger?.info(`SSE compaction: ${compactionEvt.data?.phase}`, {
            phase: compactionEvt.data?.phase,
            messagesArchived: compactionEvt.data?.messagesArchived,
          }, 'useSSE');
          if (onCompactionRef.current) {
            onCompactionRef.current(compactionEvt);
          }
          break;
        }
        case 'shell': {
          const shellEvt = data as ShellStreamingEvent;
          if (onShellRef.current) {
            onShellRef.current(shellEvt);
          }
          break;
        }
        case 'awaiting_client_tool': {
          const awaitingEvt = data as AwaitingClientToolStreamingEvent;
          const pending = awaitingEvt.data?.pendingToolCalls ?? [];

          // A call is blocking the turn: this is not a routine unknown event.
          sessionLogger?.warn(
            `SSE awaiting_client_tool: turn paused, ${pending.length} client tool result(s) outstanding`,
            { pendingToolCalls: pending, sessionId: awaitingEvt.sessionId },
            'useSSE',
          );
          reactory.log(
            `useSSE: turn paused awaiting client tool result(s): ${pending.map((c) => `${c.toolName} (${c.toolCallId})`).join(', ') || '(none listed)'}`,
            { pendingToolCalls: pending },
            'warning',
          );

          // No `complete` is coming for this turn, so do the terminal UI work
          // here: stop the streaming indicator and flush any drip-fed content
          // still queued, so the assistant message reflects everything the
          // model produced before the pause. `hasCompletedRef` deliberately
          // stays false — the turn resumes server-side when the result arrives.
          hasCompletedRef.current = false;
          setIsStreaming(false);

          if (dripTimerRef.current !== null) {
            clearTimeout(dripTimerRef.current);
            dripTimerRef.current = null;
          }
          const pendingQueue = tokenQueueRef.current;
          tokenQueueRef.current = [];
          for (const entry of pendingQueue) {
            const remaining = entry.segments.join('');
            if (remaining && onTokenRef.current) {
              onTokenRef.current({
                ...entry.template,
                data: { ...entry.template.data, content: remaining, delta: remaining },
              });
            }
          }
          // Any deferred completion is stale: the turn is paused, not complete.
          pendingCompleteRef.current = null;

          if (onAwaitingClientToolRef.current) {
            onAwaitingClientToolRef.current(awaitingEvt);
          }
          break;
        }
        case 'heartbeat':
        case 'keepalive': {
          // Transport keepalive: proves the stream is alive without claiming the
          // model produced anything.
          recordHeartbeatSample();
          if (onHeartbeatRef.current) onHeartbeatRef.current();
          break;
        }
        case 'resync': {
          // The server could not replay from the requested id. Delivered here
          // only if it arrived as an unnamed data frame; the named form is
          // handled by the dedicated listener in `addStreamListeners`.
          const resyncEvt = data as ResyncStreamingEvent;
          const signal: ResyncSignal = resyncEvt?.data ?? {};
          sessionLogger?.warn('SSE resync signalled; conversation state must be re-fetched', {
            reason: signal.reason,
            requestedId: signal.requestedId,
          }, 'useSSE');
          if (onResyncRef.current) onResyncRef.current(signal);
          break;
        }
        default:
          reactory.debug('useSSE: unknown event', data.type);
      }
    } catch (err) {
      sessionLogger?.error('SSE message parse error', { error: (err as Error)?.message }, 'useSSE');
      reactory.error('useSSE: parse error', err);
      if (onErrorRef.current) onErrorRef.current({ message: 'Failed to parse streaming data', type: 'PARSE_ERROR' });
    }
  }, [enqueueTokenDrip, reactory]);

  /** Stop the dead-stream backstop. */
  const clearLivenessTimer = () => {
    if (livenessTimerRef.current !== null) {
      clearTimeout(livenessTimerRef.current);
      livenessTimerRef.current = null;
    }
  };

  /**
   * Record the cadence of a named heartbeat frame.
   *
   * Only the *last* measured gap is kept: a delayed frame inflates it, which
   * can only lengthen the derived window (a slower recycle), never shorten it —
   * the safe direction, because a healthy-but-quiet stream must not look dead.
   * Samples below 1 s are duplicate/noise frames and are ignored; samples above
   * two minutes are an outage and are capped so they cannot disable the
   * watchdog for good.
   */
  const recordHeartbeatSample = () => {
    const now = Date.now();
    const previous = lastHeartbeatAtRef.current;
    lastHeartbeatAtRef.current = now;
    if (previous === null) return;
    const delta = now - previous;
    if (!Number.isFinite(delta) || delta < MIN_OBSERVED_HEARTBEAT_INTERVAL_MS) return;
    heartbeatIntervalRef.current = Math.min(delta, MAX_OBSERVED_HEARTBEAT_INTERVAL_MS);
  };

  /**
   * Note that the transport produced *something* — a content frame, a keepalive,
   * or a connection open — and re-arm the dead-stream backstop.
   *
   * The backstop exists because an SSE connection can die without the browser
   * ever firing `onerror`: an idle socket reaped by a proxy, or a machine that
   * slept. Total silence on a stream we believe is open is treated as dead —
   * the stream is closed and the reconnect policy takes over, rather than
   * watching a socket that will never deliver again.
   *
   * The window is *measured*, not guessed: it is derived from the cadence of
   * the named heartbeat the server sends (3× the observed interval, 60 s floor,
   * 3 min ceiling), and falls back to `SSE_LIVENESS_TIMEOUT_MS` while no
   * heartbeat has been seen. The value is resolved at arm time through refs, so
   * an operator override (`livenessTimeoutMs`) and a newly observed cadence both
   * take effect on the next frame.
   */
  const noteFrame = () => {
    if (hasCompletedRef.current) return;
    clearLivenessTimer();
    // Only an in-flight turn needs its stream proven alive. An idle open chat
    // re-establishes its transport before the next message, so silence here is
    // normal rather than suspicious.
    if (!turnActiveRef.current) return;
    const timeoutMs = resolveLivenessTimeoutMs(
      livenessTimeoutMsRef.current,
      heartbeatIntervalRef.current,
    );
    livenessTimerRef.current = window.setTimeout(() => {
      livenessTimerRef.current = null;
      if (hasCompletedRef.current || !turnActiveRef.current) return;
      sessionLogger?.warn?.('SSE stream silent; recycling connection', {
        silenceMs: timeoutMs,
        heartbeatIntervalMs: heartbeatIntervalRef.current,
      }, 'useSSE');
      reactory.log('useSSE: stream silent, recycling connection', 'warning');
      setConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      attemptReconnectRef.current();
    }, timeoutMs);
  };
  noteFrameRef.current = noteFrame;

  /**
   * Declare the transport lost: stop retrying, surface the failure to the
   * consumer (which reconciles from the server), and leave the connect options
   * in place so `rearm()` can revive the stream on focus.
   */
  const giveUp = (nextAttempt: number) => {
    reconnectAttemptsRef.current = 0;
    reconnectStartedAtRef.current = null;
    clearLivenessTimer();
    setIsReconnecting(false);
    setReconnectAttempt(0);
    if (onReconnectFailedRef.current) onReconnectFailedRef.current(nextAttempt);
  };

  /**
   * Schedule a reconnect.
   *
   * The budget is elapsed time, not an attempt count: a turn can legitimately
   * run for hours, and the transport must not declare it lost after 31 seconds.
   * Delays are exponential with jitter and capped per delay, so a long outage
   * costs one connect attempt every ≤30 s.
   */
  const attemptReconnect = () => {
    if (hasCompletedRef.current) return; // Natural server close — not an error
    if (!lastConnectOptsRef.current) return;

    const expiry = lastConnectOptsRef.current.expiry;
    if (expiry && new Date() >= expiry) {
      sessionLogger?.error('SSE reconnect aborted: session token expired', { attempts: reconnectAttemptsRef.current }, 'useSSE');
      // `giveUp` is the *only* report for a terminal stop. Firing `onError`
      // (type SESSION_EXPIRED) after it used to be the last write, and the
      // caller maps that type to the dismissible `error` pill — so the terminal,
      // non-dismissible "connection lost / reconnect" state this ticket requires
      // was overwritten microseconds after being set.
      giveUp(reconnectAttemptsRef.current);
      return;
    }

    if (reconnectStartedAtRef.current === null) reconnectStartedAtRef.current = Date.now();
    const elapsedMs = Date.now() - reconnectStartedAtRef.current;
    const nextAttempt = reconnectAttemptsRef.current + 1;

    // The streaming session behind the URL has its own lifetime (one hour on the
    // server), so a retry past that point can never succeed. Stop and tell the
    // caller to obtain a fresh session, rather than leaving the pill on
    // "Reconnecting…" for the rest of a four-hour budget.
    const sessionAgeMs = streamOpenedAtRef.current === null
      ? 0
      : Date.now() - streamOpenedAtRef.current;
    if (sessionAgeMs >= STREAM_SESSION_MAX_AGE_MS) {
      sessionLogger?.error('SSE streaming session expired; reconnect abandoned', { sessionAgeMs }, 'useSSE');
      giveUp(nextAttempt - 1);
      if (onSessionExpiredRef.current) onSessionExpiredRef.current();
      return;
    }

    if (elapsedMs >= RECONNECT_MAX_ELAPSED_MS || nextAttempt > RECONNECT_MAX_ATTEMPTS) {
      sessionLogger?.error('SSE reconnect budget exhausted', { attempts: nextAttempt - 1, elapsedMs, budgetMs: RECONNECT_MAX_ELAPSED_MS }, 'useSSE');
      // Terminal. `onReconnectFailed` is the dedicated signal and the caller
      // renders it as a persistent stale state; an additional `SSE_ERROR` here
      // would be the last write and downgrade that to a dismissible pill.
      giveUp(nextAttempt - 1);
      return;
    }

    reconnectAttemptsRef.current = nextAttempt;
    const delay = computeReconnectDelay(nextAttempt);
    sessionLogger?.info(`SSE reconnecting (attempt ${nextAttempt})`, { attempt: nextAttempt, elapsedMs, delayMs: delay, budgetMs: RECONNECT_MAX_ELAPSED_MS }, 'useSSE');
    setIsReconnecting(true);
    setReconnectAttempt(nextAttempt);
    if (onReconnectingRef.current) onReconnectingRef.current(nextAttempt, RECONNECT_MAX_ATTEMPTS, delay);

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!hasCompletedRef.current && lastConnectOptsRef.current) {
        reactory.log(`useSSE: reconnecting (attempt ${nextAttempt})`, 'info');
        reconnectNowRef.current();
      }
    }, delay);
  };

  /**
   * Bind the stream channels.
   *
   * Shared by `connect` and `reconnectNow` so the two paths cannot drift — the
   * keepalive channels in particular must be bound on both, or a reconnected
   * stream silently loses its only liveness proof and falls back to the
   * dead-stream backstop.
   */
  const addStreamListeners = (es: EventSource) => {
    es.addEventListener('token', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('reasoning', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('complete', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('error', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('tool_call', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('start', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('tool_iteration_limit', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('compaction', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('shell', (event) => handleMessage(event as MessageEvent));
    // These three are dispatched by `handleMessage` below. Registering them is
    // what makes an `event: <name>` frame reach that switch at all: the server
    // sends named SSE events, so a `case` with no listener here is dead code.
    // `awaiting_client_tool` in particular used to be missing on BOTH sides of
    // this seam — no listener, no case — which is why a paused turn delivered
    // no terminal event at all.
    es.addEventListener('awaiting_client_tool', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('retry', (event) => handleMessage(event as MessageEvent));
    es.addEventListener('interrupted', (event) => handleMessage(event as MessageEvent));
    // Keepalives are handled directly rather than through `handleMessage`: they
    // may carry a bare token (`ping`, `:keepalive` is invisible to EventSource)
    // and must never be parsed as a streaming event.
    const onKeepalive = () => {
      // A named keepalive is the only liveness proof `EventSource` surfaces — an
      // SSE comment (`: heartbeat`) never reaches this handler at all. Measuring
      // the gap here is what makes the dead-stream window a measurement rather
      // than a guess; resetting the watchdog is what stops a healthy, quiet turn
      // from being closed and reopened into a lossy gap.
      recordHeartbeatSample();
      noteFrame();
      if (onHeartbeatRef.current) onHeartbeatRef.current();
    };
    es.addEventListener('heartbeat', onKeepalive);
    es.addEventListener('keepalive', onKeepalive);
    // `resync` is a *signal*, not a streaming event: it says the gap cannot be
    // replayed, so the transcript must be re-fetched from the server. Handled
    // directly, like keepalives, because it may carry a bare token rather than a
    // JSON envelope.
    const onResyncFrame = (event: MessageEvent) => {
      noteFrame();
      const signal = parseResyncSignal(event);
      sessionLogger?.warn('SSE resync signalled; conversation state must be re-fetched', {
        reason: signal.reason,
        requestedId: signal.requestedId,
        oldestAvailableId: signal.oldestAvailableId,
      }, 'useSSE');
      reactory.log('useSSE: server signalled resync — re-fetching conversation state', 'warning');
      if (onResyncRef.current) onResyncRef.current(signal);
    };
    es.addEventListener('resync', onResyncFrame);
    es.onmessage = (event) => handleMessage(event);
  };

  /**
   * Create a fresh EventSource for a reconnection attempt.
   * Does NOT invoke onConnectionOpened to avoid resending the original message.
   */
  const reconnectNow = () => {
    const opts = lastConnectOptsRef.current;
    if (!opts) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const es = new EventSource(streamUrl(opts.endpoint));

      es.onopen = () => {
        reactory.log(`useSSE: reconnected (attempt ${reconnectAttemptsRef.current})`, 'info');
        sessionLogger?.info('SSE reconnected successfully', { previousAttempts: reconnectAttemptsRef.current }, 'useSSE');
        reconnectAttemptsRef.current = 0;
        reconnectStartedAtRef.current = null;
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setConnected(true);
        noteFrame();
        if (onHeartbeatRef.current) onHeartbeatRef.current();
        if (onReconnectedRef.current) onReconnectedRef.current();
      };

      addStreamListeners(es);

      es.onerror = () => {
        setIsStreaming(false);
        setConnected(false);
        clearLivenessTimer();
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        attemptReconnectRef.current();
      };

      eventSourceRef.current = es;
    } catch (err) {
      reactory.error('useSSE: reconnect failed', err);
      attemptReconnectRef.current();
    }
  };

  // Keep refs in sync every render to prevent stale closures in timers/callbacks
  reconnectNowRef.current = reconnectNow;
  attemptReconnectRef.current = attemptReconnect;

  /**
   * Arm the dead-stream backstop when a turn starts, and drop it when the turn
   * ends.
   *
   * Arming is driven by the *turn*, not by the connection. `loadChat`
   * re-establishes an SSE transport for every session it loads, so there are
   * open streams with no turn in flight; an idle conversation has nothing to
   * prove, and recycling it for staying quiet would flash the reconnect pill and
   * force a conversation fetch every five minutes, forever. The next message
   * re-establishes the transport anyway.
   */
  React.useEffect(() => {
    if (!turnActive) {
      if (livenessTimerRef.current !== null) {
        clearTimeout(livenessTimerRef.current);
        livenessTimerRef.current = null;
      }
      return;
    }
    noteFrameRef.current();
  }, [turnActive]);

  const connect = React.useCallback(({
    endpoint,
    sessionId,
    token,
    headers,
    expiry,
    onConnectionOpened,
  }: {
    endpoint: string;
    sessionId: string;
    token?: string;
    headers?: Record<string, string>;
    expiry?: Date;
    onConnectionOpened?: () => void;
  }) => {
    // Save opts for auto-reconnect and reset all reconnect state
    lastConnectOptsRef.current = { endpoint, sessionId, token, headers, expiry, onConnectionOpened };
    hasCompletedRef.current = false;
    reconnectAttemptsRef.current = 0;
    reconnectStartedAtRef.current = null;
    clearLivenessTimer();
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsReconnecting(false);
    setReconnectAttempt(0);
    // Every `connect` opens a new streaming session, so the session-age clock
    // restarts here (see STREAM_SESSION_MAX_AGE_MS).
    streamOpenedAtRef.current = Date.now();
    // ... and a new server connection, so a cadence measured on the previous one
    // must not be used to judge this one. Until the new stream beats, the
    // fallback window applies. `reconnectNow` deliberately keeps the measurement:
    // it re-opens the SAME session against the same server.
    lastHeartbeatAtRef.current = null;
    heartbeatIntervalRef.current = null;

    // Close previous
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setCurrentStreamingMessage('');
    sessionRef.current = sessionId;
    setConnected(true);

    try {
      const target = streamUrl(endpoint);
      sessionLogger?.info('SSE connecting', { endpoint: target, sessionId, clientInstance: clientInstanceRef.current }, 'useSSE');
      reactory.log(`useSSE: connecting to ${target}`, 'info');
      const es = new EventSource(target);

      es.onopen = () => {
        sessionLogger?.info('SSE connection opened', { sessionId }, 'useSSE');
        reactory.log('useSSE: connected', 'info');
        noteFrame();
        if (onHeartbeatRef.current) onHeartbeatRef.current();
        if (onConnectionOpened) onConnectionOpened();
      };

      addStreamListeners(es);

      es.onerror = (err) => {
        sessionLogger?.error('SSE connection error', { sessionId }, 'useSSE');
        reactory.error('useSSE: EventSource error', err);
        setIsStreaming(false);
        setConnected(false);
        clearLivenessTimer();
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        // Attempt automatic reconnection. The budget is elapsed time, not a
        // fixed number of attempts — see RECONNECT_MAX_ELAPSED_MS.
        attemptReconnectRef.current();
      };

      eventSourceRef.current = es;
    } catch (err) {
      reactory.error('useSSE: connect failed', err);
      setIsStreaming(false);
      if (onErrorRef.current) onErrorRef.current(err);
    }
  }, [handleMessage, reactory]);

  const disconnect = React.useCallback(() => {
    sessionLogger?.info('SSE disconnect requested', { sessionId: sessionRef.current }, 'useSSE');
    // Signal intentional disconnect — suppresses auto-reconnection
    hasCompletedRef.current = true;

    // Cancel any pending reconnect timer
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    reconnectStartedAtRef.current = null;
    clearLivenessTimer();
    setIsReconnecting(false);
    setReconnectAttempt(0);

    // Clear drip-feed queue and any pending completion
    tokenQueueRef.current = [];
    pendingCompleteRef.current = null;
    if (dripTimerRef.current !== null) {
      clearTimeout(dripTimerRef.current);
      dripTimerRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    // Drop the connect options too. `reconnectNow` rebuilds a stream from them
    // and only its *callers* check `hasCompletedRef`, so leaving them in place
    // left a window where an already-scheduled reconnect could resurrect a
    // stream the caller had explicitly torn down — and a revived stream feeds
    // the previous conversation's events into whatever chat is now on screen.
    lastConnectOptsRef.current = null;
    streamOpenedAtRef.current = null;
    lastHeartbeatAtRef.current = null;
    heartbeatIntervalRef.current = null;
    setIsStreaming(false);
    setCurrentStreamingMessage('');
    sessionRef.current = null;
    setConnected(false);
  }, []);

  /**
   * Revive the transport on demand — used on focus/visibilitychange so a tab
   * that slept through a stream drop (and whose transport gave up) recovers
   * without a reload.
   *
   *  - no stream was ever opened, or it completed naturally → nothing to do;
   *  - a retry is already scheduled → skip the remaining backoff, try now;
   *  - a stream is open and healthy → leave it alone (focus must not churn).
   */
  const rearm = React.useCallback((): boolean => {
    const opts = lastConnectOptsRef.current;
    if (!opts || hasCompletedRef.current) return false;

    const openAndHealthy = eventSourceRef.current !== null
      && eventSourceRef.current.readyState !== 2; // EventSource.CLOSED

    if (openAndHealthy && reconnectTimerRef.current === null) return false;

    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // The user is back: start a fresh budget rather than resuming a clock that
    // expired while the machine was asleep.
    reconnectAttemptsRef.current = 1;
    reconnectStartedAtRef.current = Date.now();
    setIsReconnecting(true);
    setReconnectAttempt(1);
    if (onReconnectingRef.current) onReconnectingRef.current(1, RECONNECT_MAX_ATTEMPTS, 0);
    sessionLogger?.info('SSE transport re-armed on demand', { sessionId: opts.sessionId }, 'useSSE');
    reconnectNowRef.current();
    return true;
  }, []);

  React.useEffect(() => () => disconnect(), [disconnect]);

  return {
    connect,
    disconnect,
    rearm,
    isStreaming,
    currentStreamingMessage,
    connected,
    eventSource: eventSourceRef.current,
    isReconnecting,
    reconnectAttempt,
  };
};

export default useSSE;
