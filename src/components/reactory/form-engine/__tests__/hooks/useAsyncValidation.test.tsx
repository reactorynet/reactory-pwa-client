/**
 * @jest-environment jsdom
 *
 * Uses real timers with short debounce values to avoid the fake-timer +
 * React 17 + renderHook interaction that hangs `act`. Each test waits a
 * deterministic interval longer than the configured debounce.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useAsyncValidation, type AsyncValidator } from '../../hooks/useAsyncValidation';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('useAsyncValidation', () => {
  it('does not fire the validator before the debounce elapses', async () => {
    const validate = jest.fn(async () => ({}));
    renderHook(() => useAsyncValidation({ validate, formData: { x: 1 }, debounceMs: 50 }));
    await act(async () => {
      await wait(20);
    });
    expect(validate).not.toHaveBeenCalled();
  });

  it('fires the validator after the debounce elapses', async () => {
    const validate: AsyncValidator = jest.fn(
      async () => ({ x: { __errors: ['bad'] } } as unknown as Awaited<ReturnType<AsyncValidator>>),
    );
    const { result } = renderHook(() =>
      useAsyncValidation({ validate, formData: { x: 1 }, debounceMs: 20 }),
    );
    await act(async () => {
      await wait(40);
    });
    expect(validate).toHaveBeenCalledTimes(1);
    expect(result.current.extraErrors).toEqual({ x: { __errors: ['bad'] } });
  });

  it('debounces rapid formData changes into a single validator call', async () => {
    const validate: AsyncValidator = jest.fn(async () => ({}));
    const { rerender } = renderHook(
      ({ data }) => useAsyncValidation({ validate, formData: data, debounceMs: 30 }),
      { initialProps: { data: { x: 1 } } },
    );
    await act(async () => {
      await wait(10);
    });
    rerender({ data: { x: 2 } });
    await act(async () => {
      await wait(10);
    });
    rerender({ data: { x: 3 } });
    await act(async () => {
      await wait(60);
    });
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledWith(
      { x: 3 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('aborts an in-flight request when newer formData arrives', async () => {
    const seenSignals: AbortSignal[] = [];
    let firstResolve: ((value: Record<string, never>) => void) | null = null;
    const validate: AsyncValidator = jest.fn((_data, { signal }) => {
      seenSignals.push(signal);
      return new Promise((res) => {
        if (!firstResolve) firstResolve = res;
        else res({});
      });
    });

    const { rerender } = renderHook(
      ({ data }) => useAsyncValidation({ validate, formData: data, debounceMs: 10 }),
      { initialProps: { data: { x: 1 } } },
    );
    await act(async () => {
      await wait(30);
    });
    expect(seenSignals.length).toBe(1);
    expect(seenSignals[0].aborted).toBe(false);

    rerender({ data: { x: 2 } });
    await act(async () => {
      await wait(30);
    });
    expect(seenSignals[0].aborted).toBe(true);
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('exposes a flush() that fires immediately', async () => {
    const validate: AsyncValidator = jest.fn(async () => ({}));
    const { result } = renderHook(() =>
      useAsyncValidation({ validate, formData: { x: 1 }, debounceMs: 1000 }),
    );
    await act(async () => {
      result.current.flush();
      await wait(5);
    });
    expect(validate).toHaveBeenCalledTimes(1);
  });

  it('reports running=true between fire and resolve', async () => {
    let resolveOne: ((value: Record<string, never>) => void) | null = null;
    const validate: AsyncValidator = () =>
      new Promise((res) => {
        resolveOne = res;
      });

    const { result } = renderHook(() =>
      useAsyncValidation({ validate, formData: { x: 1 }, debounceMs: 10 }),
    );
    expect(result.current.running).toBe(false);
    await act(async () => {
      await wait(30);
    });
    expect(result.current.running).toBe(true);
    await act(async () => {
      resolveOne!({});
      await wait(5);
    });
    expect(result.current.running).toBe(false);
  });

  it('clears extraErrors on a non-abort failure', async () => {
    const validate: AsyncValidator = jest
      .fn()
      .mockResolvedValueOnce({ x: { __errors: ['first'] } })
      .mockRejectedValueOnce(new Error('network'));

    const { result, rerender } = renderHook(
      ({ data }) => useAsyncValidation({ validate, formData: data, debounceMs: 10 }),
      { initialProps: { data: { x: 1 } } },
    );
    await act(async () => {
      await wait(30);
    });
    expect(result.current.extraErrors).toEqual({ x: { __errors: ['first'] } });

    rerender({ data: { x: 2 } });
    await act(async () => {
      await wait(30);
    });
    expect(result.current.extraErrors).toEqual({});
  });

  it('returns empty extraErrors and pending=false when no validator is supplied', async () => {
    const { result } = renderHook(() => useAsyncValidation({ formData: { x: 1 } }));
    await act(async () => {
      await wait(5);
    });
    expect(result.current.extraErrors).toEqual({});
    expect(result.current.pending).toBe(false);
  });

  it('respects enabled=false (no fire)', async () => {
    const validate = jest.fn(async () => ({}));
    renderHook(() =>
      useAsyncValidation({ validate, formData: { x: 1 }, enabled: false, debounceMs: 10 }),
    );
    await act(async () => {
      await wait(50);
    });
    expect(validate).not.toHaveBeenCalled();
  });

  it('aborts any in-flight request on unmount', async () => {
    let seenSignal: AbortSignal | null = null;
    const validate: AsyncValidator = (_data, { signal }) => {
      seenSignal = signal;
      return new Promise(() => {
        /* never resolves */
      });
    };

    const { unmount } = renderHook(() =>
      useAsyncValidation({ validate, formData: { x: 1 }, debounceMs: 10 }),
    );
    await act(async () => {
      await wait(30);
    });
    expect(seenSignal!.aborted).toBe(false);
    unmount();
    expect(seenSignal!.aborted).toBe(true);
  });
});
