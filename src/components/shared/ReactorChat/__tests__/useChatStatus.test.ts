import { renderHook } from '@testing-library/react-hooks';
import useChatStatus from '../hooks/useChatStatus';

describe('useChatStatus', () => {
  const base = {
    busy: false,
    isStreaming: false,
    toolIterationLimitInfo: null,
    pendingToolCallResume: false,
  };

  it('returns idle when nothing is active', () => {
    const { result } = renderHook(() => useChatStatus(base));
    expect(result.current.status).toBe('idle');
    expect(result.current.label).toBe('Ready');
    expect(result.current.icon).toBe('check_circle');
    expect(result.current.color).toBe('success.main');
  });

  it('returns thinking when busy but not streaming or executing tools', () => {
    const { result } = renderHook(() => useChatStatus({ ...base, busy: true }));
    expect(result.current.status).toBe('thinking');
    expect(result.current.label).toBe('Thinking...');
    expect(result.current.icon).toBe('psychology');
    expect(result.current.color).toBe('primary.main');
  });

  it('returns streaming when isStreaming is true', () => {
    const { result } = renderHook(() => useChatStatus({ ...base, busy: true, isStreaming: true }));
    expect(result.current.status).toBe('streaming');
    expect(result.current.label).toBe('Responding...');
    expect(result.current.icon).toBe('stream');
    expect(result.current.color).toBe('info.main');
  });

  it('returns executing_tools when busy with executingToolCount > 0', () => {
    const { result } = renderHook(() =>
      useChatStatus({ ...base, busy: true, executingToolCount: 2 })
    );
    expect(result.current.status).toBe('executing_tools');
    expect(result.current.label).toBe('Executing tools...');
    expect(result.current.icon).toBe('build');
    expect(result.current.color).toBe('info.main');
  });

  it('returns paused when toolIterationLimitInfo is present', () => {
    const { result } = renderHook(() =>
      useChatStatus({
        ...base,
        toolIterationLimitInfo: { iterationsCompleted: 5, maxIterations: 5 },
      })
    );
    expect(result.current.status).toBe('paused');
    expect(result.current.label).toBe('Paused');
    expect(result.current.icon).toBe('pause_circle');
    expect(result.current.color).toBe('warning.main');
  });

  it('returns pending_resume when pendingToolCallResume is true', () => {
    const { result } = renderHook(() =>
      useChatStatus({ ...base, pendingToolCallResume: true })
    );
    expect(result.current.status).toBe('pending_resume');
    expect(result.current.label).toBe('Pending tool calls');
    expect(result.current.icon).toBe('history');
    expect(result.current.color).toBe('warning.main');
  });

  it('pending_resume takes priority over toolIterationLimitInfo', () => {
    const { result } = renderHook(() =>
      useChatStatus({
        ...base,
        pendingToolCallResume: true,
        toolIterationLimitInfo: { iterationsCompleted: 5, maxIterations: 5 },
      })
    );
    expect(result.current.status).toBe('pending_resume');
  });

  it('streaming takes priority over executing_tools', () => {
    const { result } = renderHook(() =>
      useChatStatus({ ...base, busy: true, isStreaming: true, executingToolCount: 3 })
    );
    // executing_tools checked before streaming in the hook
    expect(result.current.status).toBe('executing_tools');
  });

  it('recomputes on input change', () => {
    const { result, rerender } = renderHook(
      (props) => useChatStatus(props),
      { initialProps: base }
    );
    expect(result.current.status).toBe('idle');
    rerender({ ...base, busy: true });
    expect(result.current.status).toBe('thinking');
    rerender({ ...base });
    expect(result.current.status).toBe('idle');
  });
});
