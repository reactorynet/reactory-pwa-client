import {
  executeClientToolCalls,
  isClientRoutedMacro,
  ClientToolExecutionDeps,
} from '../clientToolExecution';

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
    const executeMacro = jest.fn().mockImplementation(
      async (macro: any, _args: any, _calledBy: string, callId: string) => {
        // Mirrors `useMacros`: the executor reports its own result through
        // `onClientToolComplete` (which caches it, then submits it).
        await reportResults([
          { toolCallId: callId, toolName: macro.alias, result: '{"mounted":true}' },
        ], false);
        return { content: '{"mounted":true}' };
      },
    );

    const deps: ClientToolExecutionDeps = {
      findMacro: (name: string) => (name === 'side_panel_state' ? sidePanelMacro : null),
      executeMacro,
      reportResults,
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
    expect(executeMacro).toHaveBeenCalledWith(sidePanelMacro, { open: true }, 'auto', call.toolCallId);

    // A result for this exact call id reached the server.
    const submitted = reportResults.mock.calls
      .flatMap((c) => c[0] as any[])
      .find((r) => r.toolCallId === call.toolCallId);
    expect(submitted).toBeDefined();
    expect(submitted.result).toBe('{"mounted":true}');

    // Exactly one continuation for the batch, not one per call.
    expect(reportResults).toHaveBeenCalledWith([], true);
    expect(reportResults.mock.calls.filter((c) => c[1] === true)).toHaveLength(1);
    expect(summary.executed).toBe(1);
    expect(summary.continued).toBe(true);
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
    const submitted = reportResults.mock.calls
      .flatMap((c) => c[0] as any[])
      .find((r) => r.toolCallId === 'call_missing');
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

    const submitted = reportResults.mock.calls
      .flatMap((c) => c[0] as any[])
      .find((r) => r.toolCallId === call.toolCallId);
    expect(submitted).toMatchObject({ isError: true, error: 'mount failed' });
    expect(summary.failed).toBe(1);
    expect(reportResults).toHaveBeenCalledWith([], true);
  });

  it('answers a toolCallId once even when the call is delivered twice', async () => {
    const { deps, executeMacro, reportResults } = buildDeps({ isFocused: () => false });

    // A `tool_call` replay plus an `awaiting_client_tool` batch listing the same call.
    await executeClientToolCalls([call, { ...call }], deps);

    expect(executeMacro).toHaveBeenCalledTimes(1);
    const continuations = reportResults.mock.calls.filter((c) => c[1] === true);
    expect(continuations).toHaveLength(1);
  });

  it('never throws when reporting fails; the server deadline is the backstop', async () => {
    const reportResults = jest.fn().mockRejectedValue(new Error('duplicate result rejected'));
    const { deps } = buildDeps({ isFocused: () => false, reportResults });

    const summary = await executeClientToolCalls(
      [{ toolCallId: 'call_missing', toolName: 'not_a_client_macro' }],
      deps,
    );

    expect(summary.reportedErrors).toBe(0);
    expect(summary.continued).toBe(false);
  });

  it('returns without doing anything for an empty batch', async () => {
    const { deps, reportResults } = buildDeps();
    const summary = await executeClientToolCalls([], deps);
    expect(reportResults).not.toHaveBeenCalled();
    expect(summary.executed).toBe(0);
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
