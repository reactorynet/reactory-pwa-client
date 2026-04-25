import React from 'react';
import Reactory from '@reactorynet/reactory-core';
import {
  AnyFileSseEvent,
  FileChangedEvent,
  FileDeletedEvent,
  FileErrorEvent,
  FileOpenedEvent,
} from '../types';

/**
 * EventSource wrapper for the `<File />` SSE channel.
 * Reduced clone of `ReactorChat/hooks/useSSE.ts` — keeps the reconnect/backoff
 * contract, drops the chat-specific event handling.
 */

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];

export interface UseFileSSEOptions {
  reactory: Reactory.Client.ReactorySDK;
  onOpened?: (event: FileOpenedEvent) => void;
  onFileChanged?: (event: FileChangedEvent) => void;
  onFileDeleted?: (event: FileDeletedEvent) => void;
  onError?: (event: FileErrorEvent | { code: string; message: string }) => void;
  onReconnecting?: (attempt: number, max: number, delayMs: number) => void;
  onReconnected?: () => void;
  onReconnectFailed?: (totalAttempts: number) => void;
}

export interface UseFileSSEResult {
  connect: (opts: {
    endpoint: string;
    sessionId: string;
    token?: string;
    expiry?: Date;
  }) => void;
  disconnect: () => void;
  connected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  eventSource: EventSource | null;
}

const useFileSSE = ({
  reactory,
  onOpened,
  onFileChanged,
  onFileDeleted,
  onError,
  onReconnecting,
  onReconnected,
  onReconnectFailed,
}: UseFileSSEOptions): UseFileSSEResult => {
  const [connected, setConnected] = React.useState(false);
  const [isReconnecting, setIsReconnecting] = React.useState(false);
  const [reconnectAttempt, setReconnectAttempt] = React.useState(0);

  const esRef = React.useRef<EventSource | null>(null);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const reconnectAttemptsRef = React.useRef(0);
  const closedIntentionallyRef = React.useRef(false);
  const lastOptsRef = React.useRef<{
    endpoint: string; sessionId: string; token?: string; expiry?: Date;
  } | null>(null);

  // Callback refs — always point at the latest callback so bound-once SSE
  // listeners never go stale.
  const onOpenedRef = React.useRef(onOpened);
  const onFileChangedRef = React.useRef(onFileChanged);
  const onFileDeletedRef = React.useRef(onFileDeleted);
  const onErrorRef = React.useRef(onError);
  const onReconnectingRef = React.useRef(onReconnecting);
  const onReconnectedRef = React.useRef(onReconnected);
  const onReconnectFailedRef = React.useRef(onReconnectFailed);
  onOpenedRef.current = onOpened;
  onFileChangedRef.current = onFileChanged;
  onFileDeletedRef.current = onFileDeleted;
  onErrorRef.current = onError;
  onReconnectingRef.current = onReconnecting;
  onReconnectedRef.current = onReconnected;
  onReconnectFailedRef.current = onReconnectFailed;

  const attemptReconnectRef = React.useRef<() => void>(() => { /* set below */ });
  const reconnectNowRef = React.useRef<() => void>(() => { /* set below */ });

  const handleMessage = React.useCallback((evt: MessageEvent) => {
    let parsed: AnyFileSseEvent;
    try {
      parsed = JSON.parse(evt.data);
    } catch (err) {
      reactory.error?.('useFileSSE: bad SSE payload', err);
      return;
    }
    switch (parsed.type) {
      case 'opened':
        onOpenedRef.current?.(parsed);
        break;
      case 'file_changed':
        onFileChangedRef.current?.(parsed);
        break;
      case 'file_deleted':
        onFileDeletedRef.current?.(parsed);
        break;
      case 'error':
        onErrorRef.current?.(parsed);
        break;
      default:
        reactory.debug?.('useFileSSE: unknown event', (parsed as any)?.type);
    }
  }, [reactory]);

  const attachListeners = React.useCallback((es: EventSource) => {
    es.addEventListener('opened',       (e) => handleMessage(e as MessageEvent));
    es.addEventListener('file_changed', (e) => handleMessage(e as MessageEvent));
    es.addEventListener('file_deleted', (e) => handleMessage(e as MessageEvent));
    es.addEventListener('error',        (e) => handleMessage(e as MessageEvent));
    es.onmessage = (e) => handleMessage(e);
  }, [handleMessage]);

  const attemptReconnect = React.useCallback(() => {
    if (closedIntentionallyRef.current) return;
    if (!lastOptsRef.current) return;

    const { expiry } = lastOptsRef.current;
    if (expiry && new Date() >= expiry) {
      setIsReconnecting(false);
      onReconnectFailedRef.current?.(reconnectAttemptsRef.current);
      onErrorRef.current?.({ code: 'TOKEN_EXPIRED', message: 'SSE session token expired' });
      return;
    }

    const nextAttempt = reconnectAttemptsRef.current + 1;
    if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      setReconnectAttempt(0);
      onReconnectFailedRef.current?.(MAX_RECONNECT_ATTEMPTS);
      onErrorRef.current?.({ code: 'SSE_ERROR', message: 'Streaming connection error' });
      return;
    }

    reconnectAttemptsRef.current = nextAttempt;
    const delay = RECONNECT_BACKOFF_MS[Math.min(nextAttempt - 1, RECONNECT_BACKOFF_MS.length - 1)];
    setIsReconnecting(true);
    setReconnectAttempt(nextAttempt);
    onReconnectingRef.current?.(nextAttempt, MAX_RECONNECT_ATTEMPTS, delay);

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!closedIntentionallyRef.current && lastOptsRef.current) {
        reconnectNowRef.current();
      }
    }, delay);
  }, []);

  const reconnectNow = React.useCallback(() => {
    const opts = lastOptsRef.current;
    if (!opts) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    try {
      const url = buildSseUrl(opts.endpoint, opts.token);
      const es = new EventSource(url);

      es.onopen = () => {
        reactory.log?.('useFileSSE: reconnected', 'info');
        reconnectAttemptsRef.current = 0;
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setConnected(true);
        onReconnectedRef.current?.();
      };

      attachListeners(es);

      es.onerror = () => {
        setConnected(false);
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        attemptReconnectRef.current();
      };

      esRef.current = es;
    } catch (err) {
      reactory.error?.('useFileSSE: reconnect failed', err);
      attemptReconnectRef.current();
    }
  }, [attachListeners, reactory]);

  // Keep refs synced every render so timers never hold stale closures.
  attemptReconnectRef.current = attemptReconnect;
  reconnectNowRef.current = reconnectNow;

  const connect = React.useCallback((opts: {
    endpoint: string; sessionId: string; token?: string; expiry?: Date;
  }) => {
    closedIntentionallyRef.current = false;
    lastOptsRef.current = opts;
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsReconnecting(false);
    setReconnectAttempt(0);

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    try {
      const url = buildSseUrl(opts.endpoint, opts.token);
      const es = new EventSource(url);

      es.onopen = () => {
        reactory.log?.('useFileSSE: connected', 'info');
        setConnected(true);
      };

      attachListeners(es);

      es.onerror = () => {
        setConnected(false);
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        attemptReconnectRef.current();
      };

      esRef.current = es;
    } catch (err) {
      reactory.error?.('useFileSSE: connect failed', err);
      onErrorRef.current?.({ code: 'CONNECT_ERROR', message: (err as Error)?.message ?? 'connect failed' });
    }
  }, [attachListeners, reactory]);

  const disconnect = React.useCallback(() => {
    closedIntentionallyRef.current = true;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setIsReconnecting(false);
    setReconnectAttempt(0);
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
  }, []);

  React.useEffect(() => () => disconnect(), [disconnect]);

  return {
    connect,
    disconnect,
    connected,
    isReconnecting,
    reconnectAttempt,
    eventSource: esRef.current,
  };
};

/**
 * EventSource can't set headers, so the token rides as a query param.
 * Scope is already user+partner bound and the session expires in 1h, matching
 * the chat channel's posture.
 */
function buildSseUrl(endpoint: string, token?: string): string {
  if (!token) return endpoint;
  const sep = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${sep}token=${encodeURIComponent(token)}`;
}

export default useFileSSE;
