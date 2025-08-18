import React from 'react';
import Reactory from '@reactory/reactory-core';
import { UXChatMessage } from '@reactory/client-core/components/shared/ReactorChat/types';

export enum StreamingEventType {
  TOKEN = 'token',
  TOOL_CALL = 'tool_call',
  COMPLETE = 'complete',
  ERROR = 'error'
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
  };
}

export interface ErrorStreamingEvent extends StreamingEventBase {
  type: StreamingEventType.ERROR;
  data: {
    message: string;
    error: Error;
  };
}

export interface UseSSEOptions {
  reactory: Reactory.Client.ReactorySDK;
  onToken?: (token: TokenStreamingEvent) => void;
  onMessage?: (message: CompletionStreamingEvent) => void;
  onError?: (error: any) => void;
  onToolCall?: (toolCall: ToolCallStreamingEvent) => void;
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

const useSSE = ({ reactory, onToken, onMessage, onError, onToolCall }: UseSSEOptions): UseSSEResult => {
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = React.useState('');
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const sessionRef = React.useRef<string | null>(null);

  const handleMessage = React.useCallback((event: MessageEvent) => {
    try {
      console.log('🔍 [useSSE] handleMessage called with event:', {
        type: event.type,
        data: event.data,
        lastEventId: event.lastEventId,
        origin: event.origin,        
      });
      
      const data = JSON.parse(event.data);
      console.log('🔍 [useSSE] parsed data:', data);
      
      if (data.type !== 'token') {
        reactory.debug('useSSE: event', data);
      }

      switch (data.type) {
        case 'token': {
          console.log('🔍 [useSSE] processing token event, token:', data.content);          
          if (onToken) onToken( data as TokenStreamingEvent );
          break;
        }
        case 'complete': {
          console.log('🔍 [useSSE] processing complete event');
          setIsStreaming(false);                  
          if (onMessage) onMessage(data as CompletionStreamingEvent);
          break;
        }
        case 'error': {
          console.log('🔍 [useSSE] processing error event:', data.data);
          setIsStreaming(false);          
          if (onError) onError(data as ErrorStreamingEvent);
          break;
        }
        case 'start': {
          console.log('🔍 [useSSE] processing start event:', data.data);
          setIsStreaming(true);
          break;
        }
        case 'tool_call': {
          console.log('🔍 [useSSE] processing tool_call event:', data.data);
          console.log('🔍 [useSSE] tool_call data structure:', {
            hasData: !!data.data,
            dataKeys: data.data ? Object.keys(data.data) : [],
            dataType: typeof data.data,
            fullData: data.data
          });
          
          if (onToolCall) {           
            console.log('🔍 [useSSE] calling onToolCall with:', data);
            void onToolCall(data as ToolCallStreamingEvent);
          } else {
            console.warn('⚠️ [useSSE] onToolCall callback not provided for tool_call event');
          }
          break;
        }
        default:
          console.log('🔍 [useSSE] unknown event type:', data.type);
          reactory.debug('useSSE: unknown event', data.type);
      }
    } catch (err) {
      console.error('❌ [useSSE] parse error', err, 'event data:', event.data);
      reactory.error('useSSE: parse error', err);
      if (onError) onError({ message: 'Failed to parse streaming data', type: 'PARSE_ERROR' });
    }
  }, [currentStreamingMessage, onError, onMessage, onToken, onToolCall, reactory]);

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
    console.log('🔌 [useSSE] connect called with:', {
      endpoint,
      sessionId,
      hasToken: !!token,
      hasHeaders: !!headers,
      expiry
    });
    
    // Close previous
    if (eventSourceRef.current) {
      console.log('🔌 [useSSE] closing previous EventSource');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setCurrentStreamingMessage('');
    sessionRef.current = sessionId;
    setConnected(true);

    try {
      const sseUrl = new URL(endpoint);
      console.log('🔌 [useSSE] connecting to SSE URL:', sseUrl.toString());
      reactory.log(`useSSE: connecting to ${sseUrl.toString()}`, 'info');
      const es = new EventSource(sseUrl.toString());            
      
      es.onopen = () => {        
        console.log('🔌 [useSSE] EventSource connection opened');
        reactory.log('useSSE: connected', 'info');
        if (onConnectionOpened) onConnectionOpened();
      };
      
      // Listen for custom events with specific types
      es.addEventListener('token', (event) => {
        console.log('🔍 [useSSE] token event received:', event);
        handleMessage(event as MessageEvent);
      });
      
      es.addEventListener('complete', (event) => {
        console.log('🔍 [useSSE] complete event received:', event);
        handleMessage(event as MessageEvent);
      });
      
      es.addEventListener('error', (event) => {
        console.log('🔍 [useSSE] error event received:', event);
        handleMessage(event as MessageEvent);
      });
      
      es.addEventListener('tool_call', (event) => {
        console.log('🔍 [useSSE] tool_call event received:', event);
        console.log('🔍 [useSSE] tool_call event details:', {
          data: event.data,
          lastEventId: event.lastEventId,
          origin: event.origin,
          type: event.type
        });
        handleMessage(event as MessageEvent);
      });
      
      es.addEventListener('start', (event) => {
        console.log('🔍 [useSSE] start event received:', event);
        handleMessage(event as MessageEvent);
      });
      
      // Also listen for generic message events as fallback
      es.onmessage = (event) => {
        console.log('🔍 [useSSE] generic message event received:', event);
        handleMessage(event);
      };
      
      es.onerror = (err) => {
        console.error('❌ [useSSE] EventSource error:', err);
        reactory.error('useSSE: error', err);
        setIsStreaming(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        if (onError) onError({ message: 'Streaming connection error', type: 'SSE_ERROR' });
      };
      
      eventSourceRef.current = es;
      console.log('🔌 [useSSE] EventSource created and configured');
    } catch (err) {
      console.error('❌ [useSSE] connect failed:', err);
      reactory.error('useSSE: connect failed', err);
      setIsStreaming(false);
      if (onError) onError(err);
    }
  }, [handleMessage, onError, reactory]);

  const disconnect = React.useCallback(() => {
    console.log('🔌 [useSSE] disconnect called');
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

