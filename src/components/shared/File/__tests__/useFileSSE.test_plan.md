# `useFileSSE.test.ts` — TDD Plan

**Target:** `src/components/shared/File/hooks/useFileSSE.ts`

## Scope

Hook-level unit tests using `@testing-library/react-hooks`. Validate:
- Connect / disconnect lifecycle
- Event routing by `type`
- Reconnect-with-backoff matches the chat hook's contract
- Token rides as a query param (no Authorization header — browsers forbid it on EventSource)

`EventSource` is a global in jsdom; we replace it with a `MockEventSource` class
the test controls. Reactory SDK is a bare-minimum stub (only `log`/`debug`/`error`
are called).

## Fakes

### `MockEventSource`

```ts
class MockEventSource {
  url: string;
  listeners: Record<string, Array<(e: any) => void>> = {};
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  close = jest.fn();
  constructor(url: string) { MockEventSource.instances.push(this); this.url = url; }
  addEventListener(type: string, fn: any) { (this.listeners[type] ||= []).push(fn); }
  // Test helpers:
  static instances: MockEventSource[] = [];
  emit(type: string, data: any) { this.listeners[type]?.forEach(fn => fn({ data: JSON.stringify(data) })); }
  triggerOpen() { this.onopen?.(); }
  triggerError() { this.onerror?.(); }
}
```

## Test cases

1. **`connect` opens EventSource with `?token=...` query param appended**
2. **`opened` event routes to `onOpened` callback with parsed data**
3. **`file_changed` event routes to `onFileChanged`**
4. **`file_deleted` event routes to `onFileDeleted`**
5. **`error` event routes to `onError`**
6. **`onopen` sets `connected` to true**
7. **`onerror` schedules a reconnect with exponential backoff (1000ms first attempt)**
8. **Successful reconnect fires `onReconnected` and resets attempt counter**
9. **5 consecutive failures fire `onReconnectFailed`**
10. **Expired token aborts reconnect and fires `onError({ code: 'TOKEN_EXPIRED' })`**
11. **`disconnect()` prevents any pending reconnect**
12. **Unmount cleans up the EventSource**

## Out of scope

- Error event bubbling through native `error` listener vs `onerror` — both are
  wired; we only test the callback-level outcomes.
- Stream activity events — not part of the file channel (chat-specific).
