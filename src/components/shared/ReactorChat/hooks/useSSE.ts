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
  RETRY = 'retry',
  COMPACTION = 'compaction'
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
  onRetry?: (event: RetryStreamingEvent) => void;
  onCompaction?: (event: CompactionStreamingEvent) => void;
  /** Called when the SSE connection drops and a reconnect attempt begins */
  onReconnecting?: (attempt: number, maxAttempts: number, delayMs: number) => void;
  /** Called when a dropped SSE connection is successfully re-established */
  onReconnected?: () => void;
  /** Called when all reconnect attempts have been exhausted */
  onReconnectFailed?: (totalAttempts: number) => void;
  /** Called whenever an SSE data event (start, token, tool_call, reasoning) is received.
   *  Useful for detecting server activity on reconnect when no explicit busy signal exists. */
  onStreamActivity?: () => void;
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

/** Maximum number of automatic reconnect attempts after an SSE connection drops */
const MAX_RECONNECT_ATTEMPTS = 5;

/** Exponential backoff delays (ms) for each reconnect attempt */
const RECONNECT_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];

const useSSE = ({ reactory, onToken, onReasoning, onMessage, onError, onToolCall, onToolIterationLimit, onRetry, onCompaction, onReconnecting, onReconnected, onReconnectFailed, onStreamActivity, sessionLogger }: UseSSEOptions): UseSSEResult => {
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = React.useState('');
  const [isReconnecting, setIsReconnecting] = React.useState(false);
  const [reconnectAttempt, setReconnectAttempt] = React.useState(0);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const sessionRef = React.useRef<string | null>(null);

  // Callback refs — always point to the latest callback so SSE event
  // listeners (which are bound once on connect) never go stale.
  const onTokenRef = React.useRef(onToken);
  const onReasoningRef = React.useRef(onReasoning);
  const onMessageRef = React.useRef(onMessage);
  const onErrorRef = React.useRef(onError);
  const onToolCallRef = React.useRef(onToolCall);
  const onToolIterationLimitRef = React.useRef(onToolIterationLimit);
  const onRetryRef = React.useRef(onRetry);
  const onCompactionRef = React.useRef(onCompaction);
  const onReconnectingRef = React.useRef(onReconnecting);
  const onReconnectedRef = React.useRef(onReconnected);
  const onReconnectFailedRef = React.useRef(onReconnectFailed);
  onTokenRef.current = onToken;
  onReasoningRef.current = onReasoning;
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  onToolCallRef.current = onToolCall;
  onToolIterationLimitRef.current = onToolIterationLimit;
  onRetryRef.current = onRetry;
  onCompactionRef.current = onCompaction;
  const onStreamActivityRef = React.useRef(onStreamActivity);
  onReconnectingRef.current = onReconnecting;
  onReconnectedRef.current = onReconnected;
  onReconnectFailedRef.current = onReconnectFailed;
  onStreamActivityRef.current = onStreamActivity;

  // Reconnection state refs
  const lastConnectOptsRef = React.useRef<{
    endpoint: string; sessionId: string; token?: string;
    headers?: Record<string, string>; expiry?: Date; onConnectionOpened?: () => void;
  } | null>(null);
  const hasCompletedRef = React.useRef<boolean>(false);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const reconnectAttemptsRef = React.useRef<number>(0);
  // Refs to latest reconnect functions to break circular deps and prevent stale closures
  const reconnectNowRef = React.useRef<() => void>(() => {});
  const attemptReconnectRef = React.useRef<() => void>(() => {});

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
      const text = event.data.content || event.data.delta || '';
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
          enqueueTokenDrip(data as TokenStreamingEvent);
          break;
        }
        case 'reasoning': {          
          if (onReasoningRef.current) onReasoningRef.current(data as ReasoningStreamingEvent);
          break;
        }
        case 'complete': {
          hasCompletedRef.current = true;
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
        default:
          reactory.debug('useSSE: unknown event', data.type);
      }
    } catch (err) {
      sessionLogger?.error('SSE message parse error', { error: (err as Error)?.message }, 'useSSE');
      reactory.error('useSSE: parse error', err);
      if (onErrorRef.current) onErrorRef.current({ message: 'Failed to parse streaming data', type: 'PARSE_ERROR' });
    }
  }, [enqueueTokenDrip, reactory]);

  /**
   * Schedule a reconnect with exponential backoff. Guards against:
   * - Natural stream completions (hasCompletedRef)
   * - Expired session tokens
   * - Exceeding MAX_RECONNECT_ATTEMPTS
   */
  const attemptReconnect = () => {
    if (hasCompletedRef.current) return; // Natural server close — not an error
    if (!lastConnectOptsRef.current) return;

    const expiry = lastConnectOptsRef.current.expiry;
    if (expiry && new Date() >= expiry) {
      sessionLogger?.error('SSE reconnect aborted: session token expired', { attempts: reconnectAttemptsRef.current }, 'useSSE');
      setIsReconnecting(false);
      if (onReconnectFailedRef.current) onReconnectFailedRef.current(reconnectAttemptsRef.current);
      if (onErrorRef.current) onErrorRef.current({ message: 'Session token has expired', type: 'SESSION_EXPIRED' });
      return;
    }

    const nextAttempt = reconnectAttemptsRef.current + 1;
    if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      setReconnectAttempt(0);
      if (onReconnectFailedRef.current) onReconnectFailedRef.current(MAX_RECONNECT_ATTEMPTS);
      if (onErrorRef.current) onErrorRef.current({ message: 'Streaming connection error', type: 'SSE_ERROR' });
      return;
    }

    reconnectAttemptsRef.current = nextAttempt;
    const delay = RECONNECT_BACKOFF_MS[Math.min(nextAttempt - 1, RECONNECT_BACKOFF_MS.length - 1)];
    sessionLogger?.info(`SSE reconnecting (attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})`, { attempt: nextAttempt, maxAttempts: MAX_RECONNECT_ATTEMPTS, delayMs: delay }, 'useSSE');
    setIsReconnecting(true);
    setReconnectAttempt(nextAttempt);
    if (onReconnectingRef.current) onReconnectingRef.current(nextAttempt, MAX_RECONNECT_ATTEMPTS, delay);

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!hasCompletedRef.current && lastConnectOptsRef.current) {
        reactory.log(`useSSE: reconnecting (attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})`, 'info');
        reconnectNowRef.current();
      }
    }, delay);
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
      const sseUrl = new URL(opts.endpoint);
      const es = new EventSource(sseUrl.toString());

      es.onopen = () => {
        reactory.log(`useSSE: reconnected (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`, 'info');
        sessionLogger?.info('SSE reconnected successfully', { previousAttempts: reconnectAttemptsRef.current }, 'useSSE');
        reconnectAttemptsRef.current = 0;
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setConnected(true);
        if (onReconnectedRef.current) onReconnectedRef.current();
      };

      es.addEventListener('token', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('reasoning', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('complete', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('error', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('tool_call', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('start', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('tool_iteration_limit', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('compaction', (event) => handleMessage(event as MessageEvent));
      es.onmessage = (event) => handleMessage(event);

      es.onerror = () => {
        setIsStreaming(false);
        setConnected(false);
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
      const sseUrl = new URL(endpoint);
      sessionLogger?.info('SSE connecting', { endpoint: sseUrl.toString(), sessionId }, 'useSSE');
      reactory.log(`useSSE: connecting to ${sseUrl.toString()}`, 'info');
      const es = new EventSource(sseUrl.toString());

      es.onopen = () => {
        sessionLogger?.info('SSE connection opened', { sessionId }, 'useSSE');
        reactory.log('useSSE: connected', 'info');
        if (onConnectionOpened) onConnectionOpened();
      };

      // Listen for custom events with specific types
      es.addEventListener('token', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('reasoning', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('complete', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('error', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('tool_call', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('start', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('tool_iteration_limit', (event) => handleMessage(event as MessageEvent));
      es.addEventListener('compaction', (event) => handleMessage(event as MessageEvent));

      // Also listen for generic message events as fallback
      es.onmessage = (event) => handleMessage(event);

      es.onerror = (err) => {
        sessionLogger?.error('SSE connection error', { sessionId }, 'useSSE');
        reactory.error('useSSE: EventSource error', err);
        setIsStreaming(false);
        setConnected(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        // Attempt automatic reconnection with backoff
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
    setIsStreaming(false);
    setCurrentStreamingMessage('');
    sessionRef.current = null;
    setConnected(false);
  }, []);

  React.useEffect(() => () => disconnect(), [disconnect]);

  return { connect, disconnect, isStreaming, currentStreamingMessage, connected, eventSource: eventSourceRef.current, isReconnecting, reconnectAttempt };
};

export default useSSE;
