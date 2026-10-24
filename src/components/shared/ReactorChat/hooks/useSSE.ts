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
  START= 'start',
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
  /** Called when the SSE connection drops and a reconnect attempt begins */
  onReconnecting?: (attempt: number, maxAttempts: number, delayMs: number) => void;
  /** Called when a dropped SSE connection is successfully re-established */
  onReconnected?: () => void;
  /** Called when the reconnect budget is exhausted and the transport gives up */
  onReconnectFailed?: (totalAttempts: number) => void;
  /** Called whenever an SSE data event (start, token, tool_call, reasoning) is received.
   *  Useful for detecting server activity on reconnect when no explicit busy signal exists. */
  onStreamActivity?: () => void;
  /** Called for every transport keepalive: a `heartbeat`/`keepalive` event frame,
   *  or the connection opening. Proves the socket is alive without claiming the
   *  model produced anything, which is what lets a long silent tool step be
   *  told apart from a dead stream. */
  onHeartbeat?: () => void;
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
 * Silence (ms) after which an open stream is treated as dead even if the
 * browser never fired `onerror` — the failure mode behind an idle-socket or
 * proxy drop. Any frame (data or keepalive) resets it. This is a backstop, not
 * the primary detector: `onerror` and the recovery hook's server resync usually
 * get there first. A server-side heartbeat would make it exact; until then a
 * genuinely silent stream is recycled at most this often.
 */
export const SSE_LIVENESS_TIMEOUT_MS = 5 * 60 * 1000;

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
  onReconnecting,
  onReconnected,
  onReconnectFailed,
  onStreamActivity,
  onHeartbeat,
  sessionLogger,
}: UseSSEOptions): UseSSEResult => {
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
  const onReconnectingRef = React.useRef(onReconnecting);
  const onReconnectedRef = React.useRef(onReconnected);
  const onReconnectFailedRef = React.useRef(onReconnectFailed);
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
  const onStreamActivityRef = React.useRef(onStreamActivity);
  onReconnectingRef.current = onReconnecting;
  onReconnectedRef.current = onReconnected;
  onReconnectFailedRef.current = onReconnectFailed;
  onStreamActivityRef.current = onStreamActivity;
  const onHeartbeatRef = React.useRef(onHeartbeat);
  onHeartbeatRef.current = onHeartbeat;

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
  /** Backstop for a stream that dies without firing `onerror`. */
  const livenessTimerRef = React.useRef<number | null>(null);
  // Refs to the latest reconnect functions, to break circular deps and prevent
  // stale closures.
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
      if (data.type === 'start' || data.type === 'token' || data.type === 'tool_call' || data.type === 'reasoning') {
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
        case 'heartbeat':
        case 'keepalive': {
          // Transport keepalive: proves the stream is alive without claiming the
          // model produced anything.
          if (onHeartbeatRef.current) onHeartbeatRef.current();
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
   * Note that the transport produced *something* — a content frame, a keepalive,
   * or a connection open — and re-arm the dead-stream backstop.
   *
   * The backstop exists because an SSE connection can die without the browser
   * ever firing `onerror`: an idle socket reaped by a proxy, or a machine that
   * slept. `SSE_LIVENESS_TIMEOUT_MS` of total silence on a stream we believe is
   * open is treated as dead — the stream is closed and the reconnect policy
   * takes over, rather than watching a socket that will never deliver again.
   * A server-side heartbeat makes this precise; without one it is a backstop.
   */
  const noteFrame = () => {
    if (hasCompletedRef.current) return;
    clearLivenessTimer();
    livenessTimerRef.current = window.setTimeout(() => {
      livenessTimerRef.current = null;
      if (hasCompletedRef.current) return;
      sessionLogger?.warn?.('SSE stream silent; recycling connection', { silenceMs: SSE_LIVENESS_TIMEOUT_MS }, 'useSSE');
      reactory.log('useSSE: stream silent, recycling connection', 'warning');
      setConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      attemptReconnectRef.current();
    }, SSE_LIVENESS_TIMEOUT_MS);
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
      giveUp(reconnectAttemptsRef.current);
      if (onErrorRef.current) onErrorRef.current({ message: 'Session token has expired', type: 'SESSION_EXPIRED' });
      return;
    }

    if (reconnectStartedAtRef.current === null) reconnectStartedAtRef.current = Date.now();
    const elapsedMs = Date.now() - reconnectStartedAtRef.current;
    const nextAttempt = reconnectAttemptsRef.current + 1;

    if (elapsedMs >= RECONNECT_MAX_ELAPSED_MS || nextAttempt > RECONNECT_MAX_ATTEMPTS) {
      sessionLogger?.error('SSE reconnect budget exhausted', { attempts: nextAttempt - 1, elapsedMs, budgetMs: RECONNECT_MAX_ELAPSED_MS }, 'useSSE');
      giveUp(nextAttempt - 1);
      if (onErrorRef.current) onErrorRef.current({ message: 'Streaming connection error', type: 'SSE_ERROR' });
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
    // Keepalives are handled directly rather than through `handleMessage`: they
    // may carry a bare token (`ping`, `:keepalive` is invisible to EventSource)
    // and must never be parsed as a streaming event.
    const onKeepalive = () => {
      noteFrame();
      if (onHeartbeatRef.current) onHeartbeatRef.current();
    };
    es.addEventListener('heartbeat', onKeepalive);
    es.addEventListener('keepalive', onKeepalive);
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
