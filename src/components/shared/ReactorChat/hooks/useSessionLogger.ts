import { useRef, useCallback, useEffect, useState } from 'react';
import Reactory from '@reactorynet/reactory-core';
import {
  SessionLogLevel,
  SessionLogEntry,
  SessionLoggerOptions,
  SessionLogger,
} from '../types';

const SESSION_LOG_MUTATION = `
  mutation ReactorSessionLog($input: ReactorSessionLogInput!) {
    ReactorSessionLog(input: $input) {
      accepted
      dropped
    }
  }
`;

const NOOP_LOGGER: SessionLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  flush: async () => {},
  bufferedCount: 0,
  totalSent: 0,
  enabled: false,
  lastFlushError: null,
};

/**
 * useSessionLogger — sends client-side logs to the server's ChatSessionResourceManager.
 *
 * Buffers entries and flushes them in batches via the ReactorSessionLog GraphQL
 * mutation. When disabled, all methods are no-ops with zero overhead.
 */
const useSessionLogger = (
  reactory: Reactory.Client.ReactorySDK,
  options: SessionLoggerOptions,
): SessionLogger => {
  const { enabled, chatSessionId, flushInterval = 3000, bufferSize = 50 } = options;

  const bufferRef = useRef<SessionLogEntry[]>([]);
  const totalSentRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFlushing = useRef(false);
  const [lastFlushError, setLastFlushError] = useState<string | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  // Stable ref for reactory so flush doesn't depend on render cycles
  const reactoryRef = useRef(reactory);
  reactoryRef.current = reactory;

  const chatSessionIdRef = useRef(chatSessionId);
  chatSessionIdRef.current = chatSessionId;

  const flush = useCallback(async () => {
    const sessionId = chatSessionIdRef.current;
    const buffer = bufferRef.current;
    if (!sessionId || buffer.length === 0 || isFlushing.current) {
      console.debug('[useSessionLogger] flush skipped:', { sessionId: !!sessionId, bufferLen: buffer.length, isFlushing: isFlushing.current });
      return;
    }

    isFlushing.current = true;
    const entries = buffer.splice(0);

    // Serialize entries for transport: convert Date → ISO string
    const serialized = entries.map(e => ({
      ...e,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
      meta: e.meta ?? undefined,
    }));

    try {
      const response = await reactoryRef.current.graphqlMutation<
        { ReactorSessionLog: { accepted: number; dropped: number } },
        { input: { chatSessionId: string; entries: typeof serialized } }
      >(SESSION_LOG_MUTATION as any, { input: { chatSessionId: sessionId, entries: serialized } });
      const result = response?.data?.ReactorSessionLog ?? { accepted: 0, dropped: 0 };
      totalSentRef.current += result.accepted;
      setLastFlushError(null);
      setRenderTick(t => t + 1);
    } catch (err: any) {
      console.error('[useSessionLogger] flush failed:', err);
      setLastFlushError(err?.message || String(err));
      // Put entries back for next attempt (at the front)
      bufferRef.current.unshift(...entries);
    } finally {
      isFlushing.current = false;
    }
  }, []);  // Stable — reads current values from refs

  // Set up interval timer when enabled
  useEffect(() => {
    if (!enabled || !chatSessionId) {
      // Clear timer when disabled
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      return;
    }

    flushTimerRef.current = setInterval(flush, flushInterval);

    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // Flush remaining entries on cleanup
      if (bufferRef.current.length > 0 && chatSessionId) {
        flush();
      }
    };
  }, [enabled, chatSessionId, flushInterval, flush]);

  const log = useCallback(
    (level: SessionLogLevel, message: string, meta?: Record<string, unknown>, source?: string) => {
      if (!enabled || !chatSessionIdRef.current) return;

      bufferRef.current.push({
        level,
        message,
        meta,
        timestamp: new Date(),
        source,
      });

      // Auto-flush when buffer is full
      if (bufferRef.current.length >= bufferSize) {
        flush();
      }
    },
    [enabled, bufferSize, flush],
  );

  // Return no-op logger when disabled to avoid object allocations per render
  if (!enabled || !chatSessionId) {
    return NOOP_LOGGER;
  }

  return {
    debug: (msg, meta, src) => log('debug', msg, meta, src),
    info: (msg, meta, src) => log('info', msg, meta, src),
    warn: (msg, meta, src) => log('warn', msg, meta, src),
    error: (msg, meta, src) => log('error', msg, meta, src),
    flush,
    get bufferedCount() {
      return bufferRef.current.length;
    },
    get totalSent() {
      return totalSentRef.current;
    },
    enabled: true,
    lastFlushError,
  };
};

export default useSessionLogger;
