import { renderHook, act } from '@testing-library/react-hooks';
import useStreamRecovery, {
  DEFAULT_STALL_TIMEOUT_MS,
  UseStreamRecoveryOptions,
} from '../hooks/useStreamRecovery';

/**
 * The recovery loop's contract:
 *   - silence is a reason to ask the server, never a conclusion;
 *   - the busy indicators are cleared only on `processing === false`;
 *   - a reconnect, a give-up and a focus all reconcile the transcript.
 */

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setup = (overrides: Partial<UseStreamRecoveryOptions> = {}) => {
  const resync = (overrides.resync as jest.Mock) ?? jest.fn().mockResolvedValue({ processing: true });
  const onTurnSettled = (overrides.onTurnSettled as jest.Mock) ?? jest.fn();
  const rearm = (overrides.rearm as jest.Mock) ?? jest.fn().mockReturnValue(true);

  const props: UseStreamRecoveryOptions = {
    busy: true,
    enabled: true,
    resync,
    onTurnSettled,
    rearm,
    ...overrides,
  };

  const view = renderHook((p: UseStreamRecoveryOptions) => useStreamRecovery(p), {
    initialProps: props,
  });

  return { ...view, resync, onTurnSettled, rearm };
};

describe('useStreamRecovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-24T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not settle a turn after 15 seconds of silence', async () => {
    const { result, resync, onTurnSettled } = setup();

    act(() => {
      result.current.notifyActivity();
    });
    await advance(15_000);

    expect(resync).not.toHaveBeenCalled();
    expect(onTurnSettled).not.toHaveBeenCalled();
  });

  it('verifies with the server after a long silent step but keeps the busy state', async () => {
    const { result, resync, onTurnSettled } = setup();

    act(() => {
      result.current.notifyActivity();
    });
    await advance(DEFAULT_STALL_TIMEOUT_MS);
    await flush();

    // A silent tool step is not evidence of anything: ask, and keep showing busy.
    expect(resync).toHaveBeenCalledTimes(1);
    expect(resync).toHaveBeenCalledWith('stalled');
    expect(onTurnSettled).not.toHaveBeenCalled();

    // ... and keep asking, so a stream that died without firing onerror is
    // still repaired without user action.
    await advance(DEFAULT_STALL_TIMEOUT_MS);
    await flush();
    expect(resync).toHaveBeenCalledTimes(2);
    expect(onTurnSettled).not.toHaveBeenCalled();
  });

  it('a 2+ minute silent tool call never clears the busy indicator', async () => {
    const { result, resync, onTurnSettled } = setup();

    act(() => {
      result.current.notifyActivity();
    });

    for (let elapsed = 0; elapsed < 6 * 60 * 1000; elapsed += 30_000) {
      await advance(30_000);
      await flush();
    }

    expect(resync.mock.calls.length).toBeGreaterThan(0);
    expect(onTurnSettled).not.toHaveBeenCalled();
  });

  it('settles the turn only when the server reports it is no longer processing', async () => {
    const { result, resync, onTurnSettled } = setup({
      resync: jest.fn().mockResolvedValue({ processing: false }),
    });

    act(() => {
      result.current.notifyActivity();
    });
    await advance(DEFAULT_STALL_TIMEOUT_MS);
    await flush();

    expect(resync).toHaveBeenCalledWith('stalled');
    expect(onTurnSettled).toHaveBeenCalledTimes(1);
  });

  it('resyncs after a successful reconnect', async () => {
    const { result, resync } = setup({ busy: false });

    act(() => {
      result.current.handleReconnected();
    });
    await flush();

    expect(resync).toHaveBeenCalledWith('reconnected');
  });

  it('resyncs after the transport gives up and settles a run that already finished', async () => {
    const { result, resync, onTurnSettled } = setup({
      resync: jest.fn().mockResolvedValue({ processing: false }),
    });

    act(() => {
      result.current.handleReconnectFailed();
    });
    await flush();

    expect(resync).toHaveBeenCalledWith('reconnect-failed');
    expect(onTurnSettled).toHaveBeenCalledTimes(1);
  });

  it('keeps the busy state after a give-up when the server is still working', async () => {
    const { result, resync, onTurnSettled } = setup();

    act(() => {
      result.current.handleReconnectFailed();
    });
    await flush();

    expect(resync).toHaveBeenCalledWith('reconnect-failed');
    expect(onTurnSettled).not.toHaveBeenCalled();

    // The loop continues to verify, so the reconnect-less stream is not a
    // dead end: completion is still discovered.
    await advance(DEFAULT_STALL_TIMEOUT_MS);
    await flush();
    expect(resync).toHaveBeenCalledTimes(2);
  });

  it('keeps trying when the reconcile itself fails', async () => {
    const { result, resync, onTurnSettled } = setup({
      resync: jest.fn().mockRejectedValue(new Error('offline')),
    });

    act(() => {
      result.current.notifyActivity();
    });
    await advance(DEFAULT_STALL_TIMEOUT_MS);
    await flush();

    expect(resync).toHaveBeenCalledTimes(1);
    expect(onTurnSettled).not.toHaveBeenCalled();

    await advance(DEFAULT_STALL_TIMEOUT_MS);
    await flush();
    expect(resync).toHaveBeenCalledTimes(2);
  });

  it('treats a heartbeat as transport liveness, not as content', async () => {
    const { result, resync } = setup();

    act(() => {
      result.current.notifyActivity();
    });
    await advance(100_000);
    act(() => {
      result.current.notifyHeartbeat();
    });
    await advance(100_000);

    // Still inside the stall window measured from the heartbeat.
    expect(resync).not.toHaveBeenCalled();

    await advance(30_000);
    await flush();
    expect(resync).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent reconciles', async () => {
    let resolveResync: (value: any) => void = () => {};
    const resync = jest.fn().mockReturnValue(new Promise((resolve) => { resolveResync = resolve; }));
    const { result } = setup({ resync });

    act(() => {
      result.current.handleReconnected();
      result.current.handleReconnectFailed();
      result.current.resyncNow('stalled');
    });

    expect(resync).toHaveBeenCalledTimes(1);

    resolveResync({ processing: true });
    await flush();
  });

  it('re-arms the transport and reconciles when the tab regains focus after a give-up', async () => {
    const { result, resync, rearm } = setup({ busy: false, resync: jest.fn().mockResolvedValue({ processing: true }) });

    act(() => {
      result.current.handleReconnectFailed();
    });
    await flush();
    expect(resync).toHaveBeenCalledWith('reconnect-failed');

    act(() => {
      result.current.handleFocus();
    });
    await flush();

    expect(rearm).toHaveBeenCalled();
    expect(resync).toHaveBeenLastCalledWith('resumed');
  });

  it('does not reconcile on focus when the chat is idle and the stream is healthy', async () => {
    const { result, resync, rearm } = setup({ busy: false });

    act(() => {
      result.current.handleFocus();
    });
    await flush();

    expect(rearm).toHaveBeenCalled();
    expect(resync).not.toHaveBeenCalled();
  });

  it('does nothing when recovery is disabled', async () => {
    const { result, resync } = setup({ enabled: false });

    act(() => {
      result.current.notifyActivity();
    });
    await advance(DEFAULT_STALL_TIMEOUT_MS);
    act(() => {
      result.current.handleReconnected();
      result.current.handleReconnectFailed();
    });
    await flush();

    expect(resync).not.toHaveBeenCalled();
  });

  it('clears its timer on unmount', async () => {
    const { result, resync, unmount } = setup();

    act(() => {
      result.current.notifyActivity();
    });
    unmount();
    await advance(DEFAULT_STALL_TIMEOUT_MS * 2);

    expect(resync).not.toHaveBeenCalled();
  });
});
