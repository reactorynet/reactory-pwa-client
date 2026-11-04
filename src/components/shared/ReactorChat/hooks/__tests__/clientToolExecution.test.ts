import {
  executeClientToolCalls,
  isClientRoutedMacro,
  clientToolResultContent,
  shouldAdmitClientToolCallToBatch,
  shouldResumePausedTurn,
  ClientToolExecutionDeps,
} from '../clientToolExecution';
import { ToolApprovalMode } from '../../types';

/**
 * Regression coverage for the defect where a client-side tool call arriving
 * while the browser window was unfocused was parked in an in-memory queue
 * instead of being answered.
 *
 * Focus is faked explicitly here. The rule under test is precisely the one the
 * production bug violated: `isFocused() === false` must not change the outcome
 * of a call the server is blocked on.
 */
describe('executeClientToolCalls — focus is never a gate', () => {
  const sidePanelMacro: any = {
    name: 'sidePanelState',
    alias: 'side_panel_state',
    nameSpace: 'reactor-macros',
    version: '1.0.0',
    runat: 'client',
    component: jest.fn(),
  };

  const buildDeps = (overrides: Partial<ClientToolExecutionDeps> = {}) => {
    const reportResults = jest.fn().mockResolvedValue(null);
    const executeMacro = jest.fn().mockImplementation(async () => ({ content: '{"mounted":true}' }));

    const deps: ClientToolExecutionDeps = {
      findMacro: (name: string) => (name === 'side_panel_state' ? sidePanelMacro : null),
      executeMacro,
      reportResults,
      requestContinuation: true,
      isFocused: () => false,
      chatSessionId: 'sess-1',
      log: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
      ...overrides,
    };

    return { deps, executeMacro, reportResults };
  };

  const call = { toolCallId: 'call_00_81jh', toolName: 'side_panel_state', args: { open: true } };

  it('still executes and reports a result when the window is unfocused', async () => {
    const { deps, executeMacro, reportResults } = buildDeps({ isFocused: () => false });

    const summary = await executeClientToolCalls([call], deps);

    // Executed, not queued.
    expect(executeMacro).toHaveBeenCalledTimes(1);
    expect(executeMacro).toHaveBeenCalledWith(
      sidePanelMacro,
      { open: true },
      'auto',
      call.toolCallId,
      // The batch submits the results, so the executor must not submit as well.
      { reportResult: false },
    );

    // ONE submission for the batch (result), then ONE continuation.
    expect(reportResults).toHaveBeenCalledTimes(2);
    const [results, continueProcessing] = reportResults.mock.calls[0];
    expect(continueProcessing).toBe(false);
    expect(results).toEqual([
      { toolCallId: call.toolCallId, toolName: 'side_panel_state', result: '{"mounted":true}' },
    ]);
    expect(reportResults).toHaveBeenCalledWith([], true);

    expect(summary.executed).toBe(1);
    expect(summary.reported).toBe(1);
    expect(summary.continued).toBe(true);
    expect(summary.outcomes).toEqual([{ toolCallId: call.toolCallId, status: 'success' }]);
  });

  it('submits the results BEFORE the continuation it depends on', async () => {
    const order: string[] = [];
    const { deps } = buildDeps({
      isFocused: () => false,
      reportResults: jest.fn().mockImplementation(async (results: any[], cont: boolean) => {
        order.push(cont ? 'continuation' : `results:${results.length}`);
        return null;
      }),
    });

    await executeClientToolCalls([call], deps);

    // The old code fired onClientToolComplete without awaiting it and then
    // dispatched the continuation, so the two mutations raced.
    expect(order).toEqual(['results:1', 'continuation']);
  });

  it('logs the unfocused execution at warning with tool name, call id and session', async () => {
    const warn = jest.fn();
    const { deps } = buildDeps({ isFocused: () => false, log: { warn, info: jest.fn(), error: jest.fn() } });

    await executeClientToolCalls([call], deps);

    expect(warn).toHaveBeenCalledTimes(1);
    const [message, meta] = warn.mock.calls[0];
    expect(message).toContain('side_panel_state');
    expect(message).toContain('call_00_81jh');
    expect(message).toContain('sess-1');
    expect(message).toContain('unfocused');
    expect(meta).toMatchObject({ toolName: 'side_panel_state', toolCallId: 'call_00_81jh', chatSessionId: 'sess-1' });
  });

  it('behaves identically when focused, without the warning', async () => {
    const warn = jest.fn();
    const { deps, executeMacro, reportResults } = buildDeps({
      isFocused: () => true,
      log: { warn, info: jest.fn(), error: jest.fn() },
    });

    await executeClientToolCalls([call], deps);

    expect(executeMacro).toHaveBeenCalledTimes(1);
    expect(reportResults).toHaveBeenCalledWith([], true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('answers an unroutable call with an explicit error instead of leaving it unanswered', async () => {
    const { deps, executeMacro, reportResults } = buildDeps({ isFocused: () => false });

    const summary = await executeClientToolCalls(
      [{ toolCallId: 'call_missing', toolName: 'not_a_client_macro' }],
      deps,
    );

    expect(executeMacro).not.toHaveBeenCalled();
    const submitted = (reportResults.mock.calls[0][0] as any[]).find((r) => r.toolCallId === 'call_missing');
    expect(submitted).toMatchObject({
      toolCallId: 'call_missing',
      toolName: 'not_a_client_macro',
      isError: true,
    });
    expect(submitted.error).toContain('not_a_client_macro');
    expect(summary.missing).toBe(1);
    // The turn still progresses: one continuation is requested.
    expect(reportResults).toHaveBeenCalledWith([], true);
  });

  it('reports a thrown executor as an error result and still continues', async () => {
    const { deps, reportResults } = buildDeps({
      isFocused: () => false,
      executeMacro: jest.fn().mockRejectedValue(new Error('mount failed')),
    });

    const summary = await executeClientToolCalls([call], deps);

    const submitted = (reportResults.mock.calls[0][0] as any[]).find((r) => r.toolCallId === call.toolCallId);
    expect(submitted).toMatchObject({ isError: true, error: 'mount failed' });
    expect(summary.failed).toBe(1);
    expect(summary.outcomes[0]).toMatchObject({ status: 'error' });
    expect(reportResults).toHaveBeenCalledWith([], true);
  });

  it('answers a toolCallId once even when the call is delivered twice', async () => {
    const { deps, executeMacro, reportResults } = buildDeps({ isFocused: () => false });

    // A `tool_call` replay plus an `awaiting_client_tool` batch listing the same call.
    await executeClientToolCalls([call, { ...call }], deps);

    expect(executeMacro).toHaveBeenCalledTimes(1);
    expect((reportResults.mock.calls[0][0] as any[])).toHaveLength(1);
    expect(reportResults.mock.calls.filter((c) => c[1] === true)).toHaveLength(1);
  });

  // ── Continuation is for a paused turn only (review F1) ──────────────────

  it('does not request a continuation when the caller says the server is not paused', async () => {
    const info = jest.fn();
    const { deps, reportResults } = buildDeps({
      isFocused: () => true,
      requestContinuation: false,
      log: { warn: jest.fn(), info, error: jest.fn() },
    });

    const summary = await executeClientToolCalls([call], deps);

    // Results are still reported — the call is answered — but nothing resumes.
    expect(reportResults).toHaveBeenCalledTimes(1);
    expect(reportResults).toHaveBeenCalledWith(
      [{ toolCallId: call.toolCallId, toolName: 'side_panel_state', result: '{"mounted":true}' }],
      false,
    );
    expect(summary.continued).toBe(false);
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('no continuation requested'),
      expect.objectContaining({ chatSessionId: 'sess-1' }),
    );
  });

  // ── Failure branches (previously uncovered) ─────────────────────────────

  it('does not resume a turn when the result submission was rejected', async () => {
    const reportResults = jest
      .fn()
      .mockRejectedValueOnce(new Error('duplicate result rejected'))
      .mockResolvedValue(null);
    const error = jest.fn();
    const { deps } = buildDeps({ isFocused: () => false, reportResults, log: { warn: jest.fn(), info: jest.fn(), error } });

    const summary = await executeClientToolCalls([call], deps);

    expect(summary.reportFailed).toBe(true);
    expect(summary.reported).toBe(0);
    // No continuation: resuming now would resume a turn whose result is missing.
    expect(reportResults).toHaveBeenCalledTimes(1);
    expect(summary.continued).toBe(false);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to report'),
      expect.objectContaining({ chatSessionId: 'sess-1' }),
    );
  });

  it('reports a failed continuation without throwing', async () => {
    const reportResults = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('turn already resumed'));
    const error = jest.fn();
    const { deps } = buildDeps({ isFocused: () => false, reportResults, log: { warn: jest.fn(), info: jest.fn(), error } });

    const summary = await executeClientToolCalls([call], deps);

    expect(summary.reported).toBe(1);
    expect(summary.continued).toBe(false);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to resume the turn'),
      expect.objectContaining({ chatSessionId: 'sess-1' }),
    );
  });

  it('works with no logger, no focus probe and no session id', async () => {
    // Every logging and focus hook is optional in the contract; a caller that
    // supplies none must still get the same guarantee (answer, then continue).
    const reportResults = jest.fn().mockResolvedValue(null);
    const executeMacro = jest.fn().mockResolvedValue('ok');
    const deps: ClientToolExecutionDeps = {
      findMacro: (name: string) => (name === 'side_panel_state' ? sidePanelMacro : null),
      executeMacro,
      reportResults,
      // isFocused, chatSessionId, requestContinuation and log deliberately absent.
    };

    const summary = await executeClientToolCalls(
      [
        // An id-less frame cannot be answered and must be skipped, not crash.
        { toolCallId: '', toolName: 'side_panel_state' } as any,
        call,
        { toolCallId: 'call_missing', toolName: 'not_a_client_macro' },
      ],
      deps,
    );

    expect(executeMacro).toHaveBeenCalledTimes(1);
    expect(summary.executed).toBe(1);
    expect(summary.missing).toBe(1);
    // Results (success + explicit error) in one submission, then the default
    // continuation — `requestContinuation` is optional and defaults to true.
    expect(reportResults).toHaveBeenCalledTimes(2);
    expect(reportResults.mock.calls[0][0]).toHaveLength(2);
    expect(reportResults).toHaveBeenCalledWith([], true);
    expect(summary.continued).toBe(true);
  });

  it('returns without doing anything for an empty batch', async () => {
    const { deps, reportResults } = buildDeps();
    const summary = await executeClientToolCalls([], deps);
    expect(reportResults).not.toHaveBeenCalled();
    expect(summary.executed).toBe(0);
  });

  it('formats a macro result the same way the executor used to', () => {
    expect(clientToolResultContent({ content: 'done' }, 'chart')).toBe('done');
    expect(clientToolResultContent('literal', 'chart')).toBe('literal');
    expect(clientToolResultContent({ mounted: true }, 'chart')).toBe('{"mounted":true}');
    expect(clientToolResultContent(null, 'chart')).toBe(
      'Client tool "chart" executed successfully (no content returned).',
    );
  });
});

describe('isClientRoutedMacro', () => {
  it('treats an explicit client macro and an unspecified runat as client-routed', () => {
    expect(isClientRoutedMacro({ runat: 'client' } as any)).toBe(true);
    expect(isClientRoutedMacro({} as any)).toBe(true);
    expect(isClientRoutedMacro({ runat: undefined } as any)).toBe(true);
  });

  it('rejects server macros and a missing macro', () => {
    expect(isClientRoutedMacro({ runat: 'server' } as any)).toBe(false);
    expect(isClientRoutedMacro(null)).toBe(false);
    expect(isClientRoutedMacro(undefined)).toBe(false);
  });
});

/**
 * Review F1: the implicit batch must not bypass the client tool-approval mode.
 *
 * A `tool_call` frame is streamed for every tool the model emits, before the
 * server runs it and irrespective of approval mode, so the frame alone must not
 * be treated as "the server is waiting on the client".
 */
describe('shouldAdmitClientToolCallToBatch', () => {
  const clientMacro: any = { runat: 'client', alias: 'side_panel_state' };
  const serverMacro: any = { runat: 'server', alias: 'some_server_tool' };

  it('admits a client tool call announced by the server, whatever the mode', () => {
    for (const mode of [
      ToolApprovalMode.PROMPT,
      ToolApprovalMode.SAFE_AUTO,
      ToolApprovalMode.PLAN,
      ToolApprovalMode.AUTO,
    ]) {
      expect(
        shouldAdmitClientToolCallToBatch({
          macro: clientMacro,
          toolApprovalMode: mode,
          announcedByServer: true,
        }),
      ).toBe(true);
    }
  });

  it('admits an unannounced call in AUTO mode only', () => {
    expect(
      shouldAdmitClientToolCallToBatch({
        macro: clientMacro,
        toolApprovalMode: ToolApprovalMode.AUTO,
        announcedByServer: false,
      }),
    ).toBe(true);

    for (const mode of [
      ToolApprovalMode.PROMPT,
      ToolApprovalMode.SAFE_AUTO,
      ToolApprovalMode.PLAN,
    ]) {
      expect(
        shouldAdmitClientToolCallToBatch({
          macro: clientMacro,
          toolApprovalMode: mode,
          announcedByServer: false,
        }),
      ).toBe(false);
    }
  });

  it('never admits a server-executed tool or an unknown one', () => {
    expect(
      shouldAdmitClientToolCallToBatch({
        macro: serverMacro,
        toolApprovalMode: ToolApprovalMode.AUTO,
        announcedByServer: true,
      }),
    ).toBe(false);
    expect(
      shouldAdmitClientToolCallToBatch({
        macro: null,
        toolApprovalMode: ToolApprovalMode.AUTO,
        announcedByServer: false,
      }),
    ).toBe(false);
  });
});

describe('shouldResumePausedTurn', () => {
  it('resumes only for an announced pause or AUTO mode', () => {
    expect(shouldResumePausedTurn({ announcedByServer: true })).toBe(true);
    expect(shouldResumePausedTurn({ toolApprovalMode: ToolApprovalMode.AUTO })).toBe(true);
    expect(shouldResumePausedTurn({ announcedByServer: false, toolApprovalMode: ToolApprovalMode.PROMPT })).toBe(false);
    expect(shouldResumePausedTurn({ announcedByServer: false, toolApprovalMode: ToolApprovalMode.SAFE_AUTO })).toBe(false);
    expect(shouldResumePausedTurn({ announcedByServer: false, toolApprovalMode: ToolApprovalMode.PLAN })).toBe(false);
    expect(shouldResumePausedTurn({})).toBe(false);
  });
});
