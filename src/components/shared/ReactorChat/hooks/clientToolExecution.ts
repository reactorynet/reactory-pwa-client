import { MacroComponentDefinition, ToolApprovalMode } from '../types';

/**
 * Event-driven execution of client-routed tool calls.
 *
 * WHY THIS EXISTS
 * ---------------
 * A client-side tool call is not optional work *once the server has paused on
 * it*. The server forwards the call, pauses the turn and blocks on the result
 * (45 s by default, `REACTOR_CLIENT_TOOL_TIMEOUT_MS`). Until it arrives, nothing
 * in the conversation progresses; when it never arrives, the server synthesises
 * a placeholder result and the model is told a tool it asked for produced
 * nothing.
 *
 * The client used to gate that execution on `document.hasFocus()` — an *OS
 * window focus* check — and queue the call until the window was refocused. A
 * user waiting 20–60 s for a turn routinely switches windows, which is exactly
 * when the call lands, so the queued call was answered only if the window
 * regained focus in the same page lifetime. That is a correctness failure driven
 * by a UI heuristic.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT DO
 * -----------------------------------------
 * It does not decide *whether* a call should run without approval. That decision
 * belongs to the caller, because it depends on the session's tool-approval mode
 * (`shouldAdmitClientToolCallToBatch` below expresses the rule). In
 * PROMPT / SAFE_AUTO / PLAN the same `tool_call` frame still has to go through
 * the approval prompt, and executing it here would run the tool unapproved — and
 * then again when the user approved it.
 *
 * SUBMISSION ORDER
 * ----------------
 * This module submits the whole batch itself (`reportResult: false` is passed to
 * the executor, so nothing is reported twice) and awaits that submission before
 * it dispatches the continuation. Two concurrent mutations race, and a
 * continuation that wins resumes a turn whose result is still outstanding.
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
   * Called with `{ reportResult: false }`: this module submits a batch
   * submission for the whole set, so the executor must not report the same call
   * as well. A thrown error is turned into an explicit error result — a broken
   * executor must not leave a call unanswered.
   */
  executeMacro: (
    macro: MacroComponentDefinition<unknown>,
    args: any,
    calledBy: 'auto' | 'user',
    callId: string,
    options?: { reportResult?: boolean },
  ) => Promise<any>;
  /** Submit results / request the continuation. Must reject on failure. */
  reportResults: (
    results: ClientToolResultSubmission[],
    continueProcessing: boolean,
  ) => Promise<any>;
  /**
   * Whether to ask the server to resume after reporting.
   *
   * Must be `false` unless the server is actually paused on this batch:
   * `awaiting_client_tool` is the authoritative signal, and AUTO mode is the
   * only mode in which the send path pauses on a client tool. A continuation
   * for a turn that was never paused resumes nothing and can duplicate a
   * provider turn.
   */
  requestContinuation?: boolean;
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
  /** Results (successes and errors) accepted by the server. */
  reported: number;
  /** Whether the result submission was rejected. */
  reportFailed: boolean;
  /** Whether a continuation was requested AND accepted. */
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
 * Is this call the implicit batch's to run?
 *
 * A `tool_call` frame is streamed for every tool the model emits, *before* the
 * server executes anything and irrespective of approval mode. So the frame alone
 * proves nothing about whether the server is waiting on the client. Two
 * conditions make a call ours:
 *
 *  - **The server announced it as paused** (`awaiting_client_tool`). Authoritative:
 *    the turn is blocked on exactly these calls, and answering is mandatory.
 *  - **The session is in AUTO mode.** AUTO is the only mode whose send path
 *    forwards client tools instead of asking the user, so a forwarded client call
 *    there is ours to run.
 *
 * In PROMPT / SAFE_AUTO / PLAN the same call must stay on the approval path
 * (`processToolCallsRef` → `ToolPrompt`). Running it here would execute the tool
 * without consent *and* again when the user approves it — twice for a
 * side-effecting macro such as `amq`, `login` or `host_field_update`.
 */
export const shouldAdmitClientToolCallToBatch = (params: {
  macro: MacroComponentDefinition<unknown> | null | undefined;
  toolApprovalMode?: string | null;
  announcedByServer?: boolean;
}): boolean => {
  if (!isClientRoutedMacro(params.macro)) return false;
  if (params.announcedByServer === true) return true;
  return params.toolApprovalMode === ToolApprovalMode.AUTO;
};

/**
 * May we ask the server to resume after reporting?
 *
 * Only when it is actually paused: an announcement, or AUTO mode, where the send
 * path pauses on client tools by construction. Anything else would despatch a
 * continuation for a turn that is still running server-side (PROMPT waits for
 * the approval round-trip, so it is not paused at this point).
 */
export const shouldResumePausedTurn = (params: {
  announcedByServer?: boolean;
  toolApprovalMode?: string | null;
}): boolean =>
  params.announcedByServer === true || params.toolApprovalMode === ToolApprovalMode.AUTO;

/** The string form of a macro result, matching what `useMacros` reports. */
export const clientToolResultContent = (result: any, toolName: string): string =>
  result?.content
  || (result != null ? (typeof result === 'string' ? result : JSON.stringify(result)) : null)
  || `Client tool "${toolName}" executed successfully (no content returned).`;

/**
 * Execute a batch of client-routed tool calls and ensure every one is answered.
 *
 * Each call gets exactly one outcome — a result, or an explicit structured error
 * naming the tool — and the batch produces at most one submission and at most one
 * continuation. Never throws: reporting failures are logged and reported in the
 * summary, and the server's deadline reconciler remains the backstop.
 */
export const executeClientToolCalls = async (
  calls: ClientToolCallRef[],
  deps: ClientToolExecutionDeps,
): Promise<ClientToolExecutionSummary> => {
  const summary: ClientToolExecutionSummary = {
    executed: 0,
    failed: 0,
    missing: 0,
    reported: 0,
    reportFailed: false,
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
  const submissions: ClientToolResultSubmission[] = [];

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
      submissions.push({
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
      const result = await deps.executeMacro(macro, call.args, 'auto', call.toolCallId, {
        reportResult: false,
      });
      summary.executed += 1;
      summary.outcomes.push({ toolCallId: call.toolCallId, status: 'success' });
      submissions.push({
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        result: clientToolResultContent(result, call.toolName),
      });
    } catch (error: any) {
      summary.failed += 1;
      summary.outcomes.push({
        toolCallId: call.toolCallId,
        status: 'error',
        error: error?.message || String(error),
      });
      submissions.push({
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

  // One submission for the whole batch, awaited. This is what guarantees the
  // results are persisted before the continuation below is despatched.
  if (submissions.length > 0) {
    try {
      await deps.reportResults(submissions, false);
      summary.reported = submissions.length;
    } catch (error: any) {
      summary.reportFailed = true;
      deps.log?.error?.(
        `Failed to report ${submissions.length} client tool result(s); the server will reconcile them at the turn boundary`,
        { chatSessionId: deps.chatSessionId, error: error?.message || String(error) },
      );
    }
  }

  // One continuation for the batch, and only for a turn the server is paused on.
  //
  // Skipped when the submission failed: resuming a turn whose results did not
  // land is the exact race that produces an unattributed result. Skipped when
  // `requestContinuation` is false: a turn that was never paused must not be
  // resumed. Not retried here on purpose — a retry loop on a paused turn is how
  // a client turns one failure into a storm; the pending-call reconciler and the
  // server deadline are the backstops.
  if (deps.requestContinuation !== false && !summary.reportFailed) {
    try {
      await deps.reportResults([], true);
      summary.continued = true;
    } catch (error: any) {
      deps.log?.error?.(
        'Failed to resume the turn after reporting client tool results; the pending-call reconciler will retry at the turn boundary',
        { chatSessionId: deps.chatSessionId, error: error?.message || String(error) },
      );
    }
  } else if (deps.requestContinuation === false) {
    deps.log?.info?.(
      'Client tool results reported; no continuation requested because the server has not paused this turn',
      { chatSessionId: deps.chatSessionId, toolCallIds: submissions.map((s) => s.toolCallId) },
    );
  }

  return summary;
};

export default executeClientToolCalls;
