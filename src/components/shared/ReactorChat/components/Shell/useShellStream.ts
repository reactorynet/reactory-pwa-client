import { useCallback, useEffect, useRef, useState } from 'react';
import { createStreamingSession, ShellEventData } from './shellApi';

type ReactorySDK = Reactory.Client.ReactorySDK & {
  API_ROOT: string;
  CLIENT_KEY: string;
  getAuthToken: () => string | null;
};

export interface UseShellStreamResult {
  /** True once the EventSource for this channel is open. */
  connected: boolean;
  /** Subscribe to every `shell` event on this channel; returns an unsubscribe fn. */
  subscribe: (cb: (event: ShellEventData) => void) => () => void;
  /** Manually (re)connect the channel. */
  connect: () => Promise<void>;
  /** Close the channel. */
  disconnect: () => void;
}

/**
 * Opens and maintains a dedicated SSE channel for shell output, independent of
 * the ReactorChat conversation stream (using the chat's own conversation id
 * here would evict the chat transport). Consumers subscribe to `shell` events
 * and filter by `shellSessionId`.
 *
 * A single channel multiplexes many terminals — the one-shot macro, an
 * interactive PTY, and workflow steps can all publish onto the same channelId.
 */
export function useShellStream(
  reactory: ReactorySDK,
  opts: { channelId: string; autoConnect?: boolean },
): UseShellStreamResult {
  const { channelId, autoConnect = true } = opts;
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Set<(event: ShellEventData) => void>>(new Set());
  const connectingRef = useRef(false);

  const subscribe = useCallback((cb: (event: ShellEventData) => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (esRef.current || connectingRef.current || !channelId) return;
    connectingRef.current = true;
    try {
      const { endpoint } = await createStreamingSession(reactory, channelId);
      // Guard against a disconnect/unmount that happened while awaiting.
      if (connectingRef.current.valueOf() === false) return;
      const es = new EventSource(endpoint);
      es.onopen = () => setConnected(true);
      es.addEventListener('shell', (ev: MessageEvent) => {
        try {
          const frame = JSON.parse(ev.data);
          const data = (frame?.data ?? frame) as ShellEventData;
          listenersRef.current.forEach((l) => l(data));
        } catch (err) {
          reactory.log('[useShellStream] failed to parse shell event', { err }, 'warning');
        }
      });
      es.onerror = () => setConnected(false);
      esRef.current = es;
    } catch (err) {
      reactory.log('[useShellStream] connect failed', { err }, 'error');
    } finally {
      connectingRef.current = false;
    }
  }, [reactory, channelId]);

  useEffect(() => {
    if (autoConnect) void connect();
    return () => {
      connectingRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  return { connected, subscribe, connect, disconnect };
}
