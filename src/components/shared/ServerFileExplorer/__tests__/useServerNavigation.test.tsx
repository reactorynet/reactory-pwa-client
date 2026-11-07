import { act, renderHook } from '@testing-library/react-hooks';

import useServerNavigation from '../hooks/useServerNavigation';

/**
 * `reset` is what makes the registered component follow a changed `serverPath`:
 * the explorer is often mounted once and reopened against another root.
 *
 * It has to (a) discard the history stack, because back/forward across roots
 * would be meaningless, and (b) be idempotent, because it is called from an
 * effect on every `serverPath` change and must not churn state when the path is
 * already current.
 */
describe('useServerNavigation.reset', () => {
  it('switches to the new root and discards the history stack', () => {
    const { result } = renderHook(() => useServerNavigation('/base'));

    act(() => {
      result.current.navigate('/base/a');
    });
    act(() => {
      result.current.navigate('/base/a/b');
    });

    expect(result.current.canGoBack).toBe(true);
    expect(result.current.pathHistory).toEqual(['/base', '/base/a', '/base/a/b']);

    act(() => {
      result.current.reset('/other');
    });

    expect(result.current.currentPath).toBe('/other');
    expect(result.current.pathHistory).toEqual(['/other']);
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });

  it('is idempotent: resetting to the current path does not churn state', () => {
    const { result } = renderHook(() => useServerNavigation('/base'));

    act(() => {
      result.current.reset('/other');
    });

    const historyBefore = result.current.pathHistory;

    act(() => {
      result.current.reset('/other');
    });

    // Same array reference: the functional setters returned the previous value,
    // so React bailed out instead of scheduling another render.
    expect(result.current.pathHistory).toBe(historyBefore);
    expect(result.current.currentPath).toBe('/other');
    expect(result.current.canGoBack).toBe(false);
  });

  it('advances history normally after a reset', () => {
    const { result } = renderHook(() => useServerNavigation('/base'));

    act(() => {
      result.current.reset('/other');
    });
    act(() => {
      result.current.navigate('/other/child');
    });

    expect(result.current.currentPath).toBe('/other/child');
    expect(result.current.pathHistory).toEqual(['/other', '/other/child']);
    expect(result.current.canGoBack).toBe(true);

    act(() => {
      result.current.goBack();
    });
    expect(result.current.currentPath).toBe('/other');
  });
});
