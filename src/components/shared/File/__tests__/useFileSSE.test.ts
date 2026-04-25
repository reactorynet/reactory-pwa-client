import { renderHook, act } from '@testing-library/react-hooks';
import useFileSSE from '../hooks/useFileSSE';

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  listeners: Record<string, Array<(e: any) => void>> = {};
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: any) {
    (this.listeners[type] ||= []).push(fn);
  }
  removeEventListener(type: string, fn: any) {
    this.listeners[type] = (this.listeners[type] || []).filter(l => l !== fn);
  }

  emit(type: string, data: any) {
    const evt = { data: JSON.stringify(data) };
    this.listeners[type]?.forEach(fn => fn(evt));
  }
  triggerOpen() { this.onopen?.(); }
  triggerError() { this.onerror?.(); }
}

const fakeReactory: any = {
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

describe('useFileSSE', () => {
  let originalEventSource: any;

  beforeEach(() => {
    MockEventSource.instances = [];
    originalEventSource = (global as any).EventSource;
    (global as any).EventSource = MockEventSource;
  });

  afterEach(() => {
    (global as any).EventSource = originalEventSource;
    jest.useRealTimers();
  });

  const latest = () => MockEventSource.instances[MockEventSource.instances.length - 1];

  it('connect opens EventSource with ?token=... query param', () => {
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory }));
    act(() => {
      result.current.connect({
        endpoint: '/reactory/files/sse/abc',
        sessionId: 'abc',
        token: 'tok-123',
      });
    });
    expect(latest().url).toBe('/reactory/files/sse/abc?token=tok-123');
  });

  it('routes opened event to onOpened with parsed data', () => {
    const onOpened = jest.fn();
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory, onOpened }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });

    act(() => {
      latest().emit('opened', {
        type: 'opened', sessionId: 's', revision: 'r1', timestamp: '2026-04-18T00:00:00Z',
      });
    });
    expect(onOpened).toHaveBeenCalledWith(expect.objectContaining({
      type: 'opened', sessionId: 's', revision: 'r1',
    }));
  });

  it('routes file_changed to onFileChanged', () => {
    const onFileChanged = jest.fn();
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory, onFileChanged }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });

    act(() => {
      latest().emit('file_changed', {
        type: 'file_changed', sessionId: 's', revision: 'r2',
        summary: { bytesBefore: 1, bytesAfter: 2 }, timestamp: 't',
      });
    });
    expect(onFileChanged).toHaveBeenCalledWith(expect.objectContaining({
      type: 'file_changed', revision: 'r2',
    }));
  });

  it('routes file_deleted to onFileDeleted', () => {
    const onFileDeleted = jest.fn();
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory, onFileDeleted }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });

    act(() => {
      latest().emit('file_deleted', { type: 'file_deleted', sessionId: 's', timestamp: 't' });
    });
    expect(onFileDeleted).toHaveBeenCalled();
  });

  it('routes error to onError', () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory, onError }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });

    act(() => {
      latest().emit('error', {
        type: 'error', sessionId: 's', code: 'WATCHER_ERROR', message: 'boom', timestamp: 't',
      });
    });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'WATCHER_ERROR' }));
  });

  it('onopen sets connected to true', () => {
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });
    expect(result.current.connected).toBe(false);
    act(() => { latest().triggerOpen(); });
    expect(result.current.connected).toBe(true);
  });

  it('onerror schedules reconnect with 1000ms backoff on first attempt', () => {
    jest.useFakeTimers();
    const onReconnecting = jest.fn();
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory, onReconnecting }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });
    expect(MockEventSource.instances.length).toBe(1);

    act(() => { latest().triggerError(); });
    expect(onReconnecting).toHaveBeenCalledWith(1, 5, 1000);
    expect(result.current.isReconnecting).toBe(true);

    // Before backoff elapses, still no new EventSource
    act(() => { jest.advanceTimersByTime(999); });
    expect(MockEventSource.instances.length).toBe(1);

    act(() => { jest.advanceTimersByTime(2); });
    expect(MockEventSource.instances.length).toBe(2);
  });

  it('successful reconnect fires onReconnected and resets counter', () => {
    jest.useFakeTimers();
    const onReconnected = jest.fn();
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory, onReconnected }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });

    act(() => { latest().triggerError(); });
    act(() => { jest.advanceTimersByTime(1001); });
    act(() => { latest().triggerOpen(); });

    expect(onReconnected).toHaveBeenCalled();
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.reconnectAttempt).toBe(0);
  });

  it('fires onReconnectFailed after 5 consecutive failures', () => {
    jest.useFakeTimers();
    const onReconnectFailed = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() => useFileSSE({
      reactory: fakeReactory, onReconnectFailed, onError,
    }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });

    for (let i = 0; i < 5; i++) {
      act(() => { latest().triggerError(); });
      act(() => { jest.advanceTimersByTime(30_000); });
    }
    // One more error to exceed the limit
    act(() => { latest().triggerError(); });

    expect(onReconnectFailed).toHaveBeenCalledWith(5);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'SSE_ERROR' }));
  });

  it('aborts reconnect when token has expired', () => {
    jest.useFakeTimers();
    const onReconnectFailed = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() => useFileSSE({
      reactory: fakeReactory, onReconnectFailed, onError,
    }));
    act(() => {
      result.current.connect({
        endpoint: '/ep', sessionId: 's', token: 't',
        expiry: new Date(Date.now() - 1000),
      });
    });

    act(() => { latest().triggerError(); });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    expect(onReconnectFailed).toHaveBeenCalled();
  });

  it('disconnect prevents pending reconnect', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useFileSSE({ reactory: fakeReactory }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });
    act(() => { latest().triggerError(); });
    const countBeforeDisconnect = MockEventSource.instances.length;

    act(() => { result.current.disconnect(); });
    act(() => { jest.advanceTimersByTime(60_000); });

    expect(MockEventSource.instances.length).toBe(countBeforeDisconnect);
  });

  it('unmount cleans up the EventSource', () => {
    const { result, unmount } = renderHook(() => useFileSSE({ reactory: fakeReactory }));
    act(() => { result.current.connect({ endpoint: '/ep', sessionId: 's', token: 't' }); });
    const es = latest();
    unmount();
    expect(es.close).toHaveBeenCalled();
  });
});
