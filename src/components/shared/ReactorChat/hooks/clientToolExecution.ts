import { MacroComponentDefinition } from '../types';

/**
 * Event-driven execution of client-routed tool calls.
 *
 * WHY THIS EXISTS
 * ---------------
 * A client-side tool call is not optional work. The server forwards it, pauses
 * the turn and blocks on the result (45 s by default, `REACTOR_CLIENT_TOOL_TIMEOUT_MS`).
 * Until it arrives, nothing in the conversation progresses; when it never
 * arrives, the server synthesises a placeholder result and the model is told a
 * tool it asked for produced nothing.
 *
 * The client used to gate that execution on `document.hasFocus()` — an *OS
 * window focus* check — and queue the call until the window was refocused. A
 * user waiting 20–60 s for a turn routinely switches windows, which is exactly
 * when the call lands, so the queued call was answered only if the window
 * regained focus in the same page lifetime. That is a correctness failure driven
 * by a UI heuristic.
 *
 * `hasFocus()` is a reasonable gate for "is it safe to start an unprompted side
 * effect". It is the wrong gate for "should I answer a call the server is
 * already blocked on". Focus is therefore *observed and logged* here, never
 * consulted before executing: every call handed to this module gets exactly one
 * outcome — a result, or an explicit structured error naming the tool.
 *
 * This module is deliberately free of React and of transport details so the
 * "unfocused still reports" rule can be asserted directly, with the focus state
 * faked, instead of depending on the test runner's window.
 */

/** The minimum a call needs for this module to answer it. */
export interface ClientToolCallRef {
  /** Provider-assigned tool call id — the key the server reconciles on. */
  toolCallId: string;
  /** Tool name as the model issued it (usually a macro alias). */
  toolName: string;
  /** Parsed arguments from the `tool_call` SSE event. */
  args?: any;
}

/** One result as submitted to `ReactorCompleteClientToolCalls`. */
export interface ClientToolResultSubmission {
  toolCallId: string;
  toolName: string;
  result?: any;
  isError?: boolean;
  error?: string;
}

export interface ClientToolExecutionDeps {
  /** Resolve a client macro by the name the model used. */
  findMacro: (toolName: string) => MacroComponentDefinition<unknown> | null;
  /**
   * Run a client macro.
   *
   * Contract, matching `useMacros`: the executor reports its own result through
   * `onClientToolComplete` (so the result is cached before it is submitted), and
   * swallows the error after reporting it as `isError`. This module still
   * handles a thrown error so a broken executor cannot leave a call unanswered.
   */
  executeMacro: (
    macro: MacroComponentDefinition<unknown>,
    args: any,
    calledBy: 'auto' | 'user',
    callId: string,
  ) => Promise<any>;
  /** Submit results / request the continuation. */
  reportResults: (
    results: ClientToolResultSubmission[],
    continueProcessing: boolean,
  ) => Promise<any>;
  /**
   * OS window focus, for the log line only.
   *
   * Read once per call and never used as a gate. Kept as a callback so callers
   * (and tests) can supply the focus state explicitly.
   */
  isFocused?: () => boolean;
  /** Conversation the calls belong to, for the warning log. */
  chatSessionId?: string;
  log?: {
    warn?: (message: string, meta?: Record<string, any>) => void;
    info?: (message: string, meta?: Record<string, any>) => void;
    error?: (message: string, meta?: Record<string, any>) => void;
  };
}

export interface ClientToolCallOutcome {
  toolCallId: string;
  /** Outcome to reflect in the UI: `success` once executed, `error` if answered as an error. */
  status: 'success' | 'error';
  error?: string;
}

export interface ClientToolExecutionSummary {
  /** Calls handed to a macro and executed without throwing. */
  executed: number;
  /** Calls whose macro threw. */
  failed: number;
  /** Calls with no resolvable client macro — answered with an explicit error. */
  missing: number;
  /** Error results submitted to the server. */
  reportedErrors: number;
  /** Whether a continuation was requested for the batch. */
  continued: boolean;
  /** Per-call outcome, for updating the transcript without guessing. */
  outcomes: ClientToolCallOutcome[];
}

/**
 * A macro is client-routed when the browser owns its execution.
 *
 * `runat` is optional in the macro type for historical reasons and an absent
 * value has always meant "client" wherever `executeMacro` decides where to run
 * it — keep that reading here so the two cannot disagree.
 */
export const isClientRoutedMacro = (
  macro: MacroComponentDefinition<unknown> | null | undefined,
): boolean => !!macro && (macro.runat === 'client' || macro.runat === null || macro.runat === undefined);

/**
 * Execute a batch of client-routed tool calls and ensure every one is answered.
 *
 * The batch is executed as a unit and followed by exactly one continuation
 * request: reporting each call with `continueProcessing: true` would start one
 * provider turn per call, and the first of those turns would carry the still
 * unanswered sibling calls — the malformed-transcript failure this whole path
 * exists to prevent.
 *
 * Never throws: a failure to report is logged and returned in the summary, and
 * the server's deadline reconciler remains the backstop.
 */
export const executeClientToolCalls = async (
  calls: ClientToolCallRef[],
  deps: ClientToolExecutionDeps,
): Promise<ClientToolExecutionSummary> => {
  const summary: ClientToolExecutionSummary = {
    executed: 0,
    failed: 0,
    missing: 0,
    reportedErrors: 0,
    continued: false,
    outcomes: [],
  };

  // A call may be delivered more than once (a `tool_call` replay after a
  // reconnect, an `awaiting_client_tool` batch overlapping the event stream).
  // Answer each id once.
  const seen = new Set<string>();
  const batch = (calls || []).filter((call) => {
    if (!call?.toolCallId || seen.has(call.toolCallId)) return false;
    seen.add(call.toolCallId);
    return true;
  });
  if (batch.length === 0) return summary;

  const focused = deps.isFocused ? deps.isFocused() : true;
  const errorResults: ClientToolResultSubmission[] = [];

  for (const call of batch) {
    const meta = {
      toolName: call.toolName,
      toolCallId: call.toolCallId,
      chatSessionId: deps.chatSessionId,
    };

    if (!focused) {
      // Requirement: an unfocused window is *reported*, not obeyed. This is the
      // line that turns the old silent deferral into an auditable decision.
      deps.log?.warn?.(
        `Client tool call "${call.toolName}" (callId: ${call.toolCallId}) arrived while the window was unfocused — ` +
          `executing anyway because the server is waiting on the result` +
          (deps.chatSessionId ? ` (session: ${deps.chatSessionId})` : ''),
        meta,
      );
    } else {
      deps.log?.info?.(
        `Executing client tool call "${call.toolName}" (callId: ${call.toolCallId})`,
        meta,
      );
    }

    const macro = deps.findMacro(call.toolName);
    if (!macro) {
      summary.missing += 1;
      summary.outcomes.push({
        toolCallId: call.toolCallId,
        status: 'error',
        error: `Client macro not found: ${call.toolName}`,
      });
      errorResults.push({
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        isError: true,
        error:
          `The client-side tool "${call.toolName}" is not available in this browser, so it could not be executed. ` +
          `The tool call is answered with this error so the turn can continue; re-issue it only if the tool becomes available.`,
      });
      deps.log?.warn?.(
        `Client tool call "${call.toolName}" (callId: ${call.toolCallId}) could not be routed: no client macro found — reporting an explicit error result`,
        meta,
      );
      continue;
    }

    try {
      await deps.executeMacro(macro, call.args, 'auto', call.toolCallId);
      summary.executed += 1;
      summary.outcomes.push({ toolCallId: call.toolCallId, status: 'success' });
    } catch (error: any) {
      summary.failed += 1;
      summary.outcomes.push({
        toolCallId: call.toolCallId,
        status: 'error',
        error: error?.message || String(error),
      });
      errorResults.push({
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        isError: true,
        error: error?.message || String(error),
      });
      deps.log?.error?.(
        `Client tool "${call.toolName}" (callId: ${call.toolCallId}) threw while executing — reporting the error so the turn can continue`,
        { ...meta, error: error?.message || String(error) },
      );
    }
  }

  if (errorResults.length > 0) {
    try {
      await deps.reportResults(errorResults, false);
      summary.reportedErrors = errorResults.length;
    } catch (error: any) {
      deps.log?.error?.(
        `Failed to report ${errorResults.length} client tool error result(s); the server will reconcile them at the turn boundary`,
        { chatSessionId: deps.chatSessionId, error: error?.message || String(error) },
      );
    }
  }

  // One continuation for the batch. `continueProcessing` with no results means
  // "the results are already persisted — resume the turn".
  try {
    await deps.reportResults([], true);
    summary.continued = true;
  } catch (error: any) {
    // Not retried here on purpose: a retry loop on a paused turn is how a client
    // turns one failure into a storm. The server deadline is the backstop, and
    // the replay path re-queries pending calls on the next reconnect/focus.
    deps.log?.error?.(
      'Failed to resume the turn after reporting client tool results; the pending-call reconciler will retry at the turn boundary',
      { chatSessionId: deps.chatSessionId, error: error?.message || String(error) },
    );
  }

  return summary;
};

export default executeClientToolCalls;
