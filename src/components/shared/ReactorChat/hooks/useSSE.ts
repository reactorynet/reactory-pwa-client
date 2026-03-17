import React from 'react';
import Reactory from '@reactorynet/reactory-core';
import { UXChatMessage } from '@reactory/client-core/components/shared/ReactorChat/types';

export enum StreamingEventType {
  TOKEN = 'token',
  REASONING = 'reasoning',
  TOOL_CALL = 'tool_call',
  COMPLETE = 'complete',
  ERROR = 'error',
  TOOL_ITERATION_LIMIT = 'tool_iteration_limit'
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
  };
}

export interface CompletionStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.COMPLETE;
  data: {
    content: string;
    finishReason: 'stop' | 'error';
    thinking?: string;
  };
}

export interface ErrorStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.ERROR;
  data: {
    message: string;
    error: Error;
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

export interface UseSSEOptions {
  reactory: Reactory.Client.ReactorySDK;
  onToken?: (token: TokenStreamingEvent) => void;
  onReasoning?: (reasoning: ReasoningStreamingEvent) => void;
  onMessage?: (message: CompletionStreamingEvent) => void;
  onError?: (error: any) => void;
  onToolCall?: (toolCall: ToolCallStreamingEvent) => void;
  onToolIterationLimit?: (event: ToolIterationLimitStreamingEvent) => void;
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

const useSSE = ({ reactory, onToken, onReasoning, onMessage, onError, onToolCall, onToolIterationLimit }: UseSSEOptions): UseSSEResult => {
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = React.useState('');
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
  onTokenRef.current = onToken;
  onReasoningRef.current = onReasoning;
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  onToolCallRef.current = onToolCall;
  onToolIterationLimitRef.current = onToolIterationLimit;

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
          if (tokenQueueRef.current.length > 0 || dripTimerRef.current !== null) {
            // Drip queue is still running — park the completion event and let
            // the queue drain naturally; flushQueue's tick() will fire it once empty.
            pendingCompleteRef.current = data as CompletionStreamingEvent;
          } else {
            // Queue already empty — complete immediately
            setIsStreaming(false);
            if (onMessageRef.current) onMessageRef.current(data as CompletionStreamingEvent);
          }
          break;
        }
        case 'error': {
          setIsStreaming(false);
          if (onErrorRef.current) onErrorRef.current(data as ErrorStreamingEvent);
          break;
        }
        case 'start': {
          setIsStreaming(true);
          break;
        }
        case 'tool_call': {
          if (onToolCallRef.current) {
            void onToolCallRef.current(data as ToolCallStreamingEvent);
          }
          break;
        }
        case 'tool_iteration_limit': {
          setIsStreaming(false);
          if (onToolIterationLimitRef.current) {
            onToolIterationLimitRef.current(data as ToolIterationLimitStreamingEvent);
          }
          break;
        }
        default:
          reactory.debug('useSSE: unknown event', data.type);
      }
    } catch (err) {
      reactory.error('useSSE: parse error', err);
      if (onErrorRef.current) onErrorRef.current({ message: 'Failed to parse streaming data', type: 'PARSE_ERROR' });
    }
  }, [enqueueTokenDrip, reactory]);

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
      reactory.log(`useSSE: connecting to ${sseUrl.toString()}`, 'info');
      const es = new EventSource(sseUrl.toString());

      es.onopen = () => {
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

      // Also listen for generic message events as fallback
      es.onmessage = (event) => handleMessage(event);

      es.onerror = (err) => {
        reactory.error('useSSE: EventSource error', err);
        setIsStreaming(false);
        setConnected(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        if (onErrorRef.current) onErrorRef.current({ message: 'Streaming connection error', type: 'SSE_ERROR' });
      };

      eventSourceRef.current = es;
    } catch (err) {
      reactory.error('useSSE: connect failed', err);
      setIsStreaming(false);
      if (onErrorRef.current) onErrorRef.current(err);
    }
  }, [handleMessage, reactory]);

  const disconnect = React.useCallback(() => {
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

  return { connect, disconnect, isStreaming, currentStreamingMessage, connected, eventSource: eventSourceRef.current };
};

export default useSSE;
