import React from 'react';

/**
 * Stream recovery: what to do when the live transport is in doubt.
 *
 * The old client used a 15-second "inactivity watchdog": if no SSE event arrived
 * for 15 seconds it declared the turn finished and cleared the busy indicators.
 * That is wrong for tool-driven turns — a single tool call can legitimately be
 * silent for 13+ minutes — and it is wrong in the other direction too: a dead
 * stream is not evidence that the work stopped.
 *
 * This hook replaces the watchdog with reconciliation:
 *
 *   - Silence is only a *reason to ask the server*, never a conclusion.
 *     When a turn has been silent for `stallTimeoutMs`, the transcript is
 *     resynced from the persisted conversation. Busy is cleared only when the
 *     server says it is no longer processing (`processing === false`).
 *   - Transport events are treated as hints, not truth:
 *       `handleReconnected`  → reconcile the gap opened by the drop
 *       `handleReconnectFailed` → reconcile anyway; a give-up means "stale",
 *                                 not "wrong" (the run may have finished)
 *       `handleFocus`        → re-arm a stream that gave up, and reconcile
 *   - While the turn is still busy, the stall check re-arms itself, so a stream
 *     that died silently is still repaired within a bounded interval even if
 *     `onerror` never fires.
 *
 * A server-side heartbeat (`heartbeat` / `keepalive` SSE frames) sharpens this:
 * `notifyHeartbeat` proves the transport is alive, so the stall timer measures
 * true silence (no content *and* no keepalive) instead of long tool steps.
 */

export type StreamRecoveryReason =
  | 'reconnected'
  | 'reconnect-failed'
  | 'stalled'
  | 'resumed';

export interface StreamRecoveryResyncResult {
  /**
   * The server's `processing` flag, verbatim.
   *
   * DIAGNOSTIC ONLY — it must never end a turn here. The server clears it in
   * every attempt's catch (including attempts that then retry) and only sets it
   * after the provider call returns, so `false` is normal mid-turn. See
   * `conversationResync.ts` and ReactorConversationService.ts:5532-5548.
   */
  processing?: boolean;
  /**
   * Positive evidence that the turn is over: the persisted transcript ends with
   * a final assistant answer that has no unanswered tool call.
   *
   * This is the ONLY signal that may end a turn. Absent means "keep the busy
   * indicators and keep verifying".
   */
  settled?: boolean;
  /** Messages the merge appended (diagnostics only). */
  added?: number;
  /** Messages the merge replaced with a newer server copy (diagnostics only). */
  updated?: number;
}

export interface UseStreamRecoveryOptions {
  /**
   * Reconcile the transcript with the authoritative server record and report
   * whether the conversation is still being processed.
   */
  resync: (
    reason: StreamRecoveryReason,
  ) => Promise<StreamRecoveryResyncResult | void> | StreamRecoveryResyncResult | void;
  /**
   * Clear the agent-busy indicators. Called only on positive evidence that the
   * turn is over — a resync that returned `processing: false`.
   */
  onTurnSettled?: () => void;
  /**
   * Re-arm the transport. Returns true when a stream was actually revived.
   * Used on focus/visibilitychange so returning to the tab always recovers.
   */
  rearm?: () => boolean | void;
  /**
   * Silence (ms) after which the local view is only a guess and is verified
   * against the server. This is a *verification* interval, not a timeout that
   * concludes anything: it must comfortably exceed a normal tool step.
   */
  stallTimeoutMs?: number;
  /** Whether recovery is applicable at all (e.g. a session is loaded). */
  enabled?: boolean;
  /** True while the agent is working. Drives the verification loop. */
  busy: boolean;
}

export interface UseStreamRecoveryResult {
  /** A content-bearing stream event arrived (token, reasoning, tool_call, start). */
  notifyActivity: () => void;
  /** A transport keepalive arrived (heartbeat frame or connection open). */
  notifyHeartbeat: () => void;
  /** The stream was successfully re-established. */
  handleReconnected: () => void;
  /** The stream gave up. The transcript is now stale until reconciled. */
  handleReconnectFailed: () => void;
  /** The tab regained focus/visibility. */
  handleFocus: () => void;
  /** Force a reconcile now (exposed for tests and manual refresh paths). */
  resyncNow: (reason: StreamRecoveryReason) => Promise<StreamRecoveryResyncResult | void>;
  /** Clear timers (call when the transport is deliberately torn down). */
  stop: () => void;
}

/**
 * Two minutes. Long enough that a normal tool step never triggers a redundant
 * round trip, short enough that a silently dead stream is repaired well inside
 * any human's patience for "is it still working?".
 */
export const DEFAULT_STALL_TIMEOUT_MS = 120_000;

/**
 * Multipliers applied to the first stall interval as successive verifications
 * go unanswered.
 *
 * A turn can legitimately stay busy for hours. Polling a busy conversation every
 * two minutes for that whole time is one GraphQL read per tab per two minutes
 * with no ceiling, so the interval widens: 2 m → 5 m → 15 m, then holds at 15 m.
 * Each `stallTimeoutMs` is treated as the base, so a test that passes 1 s gets
 * 1 s → 2.5 s → 7.5 s.
 */
export const STALL_BACKOFF_MULTIPLIERS = [1, 2.5, 7.5] as const;

/** Delay before the *next* verification, given how many have already gone unanswered. */
export const stallDelayFor = (baseMs: number, completedPolls: number): number => {
  const index = Math.min(Math.max(0, completedPolls), STALL_BACKOFF_MULTIPLIERS.length - 1);
  return Math.round(baseMs * STALL_BACKOFF_MULTIPLIERS[index]);
};

const useStreamRecovery = (options: UseStreamRecoveryOptions): UseStreamRecoveryResult => {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = React.useRef<Promise<StreamRecoveryResyncResult | void> | null>(null);
  const stallPollsRef = React.useRef(0);
  /** True once the transport has given up, until a stream is live again. */
  const gaveUpRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Refs to the latest versions of the mutually recursive pieces. Assigned at
  // the end of every render, same pattern as `useSSE`'s reconnect refs.
  const armTimerRef = React.useRef<() => void>(() => {});
  const resyncRef = React.useRef<(reason: StreamRecoveryReason) => Promise<StreamRecoveryResyncResult | void>>(
    async () => undefined,
  );

  /** Ask the server what actually happened, coalescing concurrent requests. */
  const resync = React.useCallback(
    async (reason: StreamRecoveryReason): Promise<StreamRecoveryResyncResult | void> => {
      const current = optionsRef.current;
      if (!current.enabled || typeof current.resync !== 'function') return undefined;
      if (inFlightRef.current) return inFlightRef.current;

      const run = (async () => {
        try {
          return await current.resync(reason);
        } catch {
          // A failed reconcile is not an error state. The stream may still
          // recover, and the next stall tick will try again.
          return undefined;
        } finally {
          inFlightRef.current = null;
        }
      })();

      inFlightRef.current = run;
      return run;
    },
    [],
  );
  resyncRef.current = resync;

  /**
   * Reconcile, then decide what the result means:
   *   - `settled === false` is NOT a conclusion.
   *   - Only a resync that reports `settled: true` — the persisted transcript
   *     ends with a final assistant answer — ends the turn.
   */
  const resyncAndSettle = React.useCallback((reason: StreamRecoveryReason) => {
    void resyncRef.current(reason).then((result) => {
      if (!mountedRef.current) return;
      const current = optionsRef.current;
      if (result && result.settled === true) {
        // Transcript-level evidence the turn is over. Only clear what is still
        // set — a reconcile on an idle conversation has nothing to settle.
        if (current.busy) current.onTurnSettled?.();
        return;
      }
      // No evidence it ended: keep the indicators and keep verifying.
      if (current.busy) armTimerRef.current();
    });
  }, []);

  const handleStall = React.useCallback(() => {
    const current = optionsRef.current;
    if (!current.enabled || !current.busy) return;
    stallPollsRef.current += 1;
    resyncAndSettle('stalled');
  }, [resyncAndSettle]);

  /**
   * (Re)arm the verification timer. Only runs while a turn is in flight: an
   * idle conversation needs no reconciliation, it needs a page that is already
   * correct.
   */
  const armTimer = React.useCallback(() => {
    const current = optionsRef.current;
    clearTimer();
    if (!current.enabled || !current.busy || typeof current.resync !== 'function') return;
    const baseDelay = current.stallTimeoutMs && current.stallTimeoutMs > 0
      ? current.stallTimeoutMs
      : DEFAULT_STALL_TIMEOUT_MS;
    // Widen the interval as unanswered verifications accumulate (F10): a busy
    // turn can run for hours, and a flat 2-minute poll is an unbounded read
    // stream per open tab.
    const delay = stallDelayFor(baseDelay, stallPollsRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      handleStall();
    }, delay);
  }, [clearTimer, handleStall]);
  armTimerRef.current = armTimer;

  const notifyActivity = React.useCallback(() => {
    // Content is flowing: no need to poll, and any previous give-up is moot if
    // the stream is delivering again.
    stallPollsRef.current = 0;
    gaveUpRef.current = false;
    armTimerRef.current();
  }, []);

  const notifyHeartbeat = React.useCallback(() => {
    // The transport proved it is alive. Re-arm rather than reset the poll
    // counter: the only thing a heartbeat rules out is a dead socket.
    if (gaveUpRef.current) return;
    armTimerRef.current();
  }, []);

  const handleReconnected = React.useCallback(() => {
    gaveUpRef.current = false;
    stallPollsRef.current = 0;
    resyncAndSettle('reconnected');
  }, [resyncAndSettle]);

  const handleReconnectFailed = React.useCallback(() => {
    gaveUpRef.current = true;
    stallPollsRef.current = 0;
    resyncAndSettle('reconnect-failed');
  }, [resyncAndSettle]);

  const handleFocus = React.useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const current = optionsRef.current;
    if (!current.enabled) return;
    // Reviving the transport is cheap when it is healthy, so always ask.
    current.rearm?.();
    if (!current.busy && !gaveUpRef.current) return;
    stallPollsRef.current = 0;
    resyncAndSettle('resumed');
  }, [resyncAndSettle]);

  const stop = React.useCallback(() => {
    clearTimer();
    stallPollsRef.current = 0;
  }, [clearTimer]);

  // Arm when a turn starts, disarm when it ends. This is also what arms the
  // loop for a turn whose first event arrived before `busy` was committed.
  React.useEffect(() => {
    if (options.enabled && options.busy) armTimerRef.current();
    else clearTimer();
  }, [options.enabled, options.busy, clearTimer]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  return {
    notifyActivity,
    notifyHeartbeat,
    handleReconnected,
    handleReconnectFailed,
    handleFocus,
    resyncNow: resync,
    stop,
  };
};

export default useStreamRecovery;
