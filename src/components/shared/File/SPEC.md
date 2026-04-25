# `<File />` Component Specification

**Status:** Draft
**Location:** `reactory-pwa-client/src/components/shared/File/`
**Author:** wweber@zepz.io
**Last updated:** 2026-04-18

---

## 1. Purpose

A lightweight, live file editor for the Reactory PWA. The component loads a file from the
server, renders it in a minimal editor surface (powered by `RichEditor` under the hood),
saves changes back via GraphQL mutations, and stays in sync with out-of-band file changes
through a dedicated Server-Sent Events (SSE) channel.

It is deliberately kept minimal: no file-tree, no tabs, no multi-document state — one
component instance is bound to exactly one file path.

Typical usage sites:

- `ServerFileExplorer` — inline preview / quick edit of a selected file.
- Form widgets where a user edits an on-disk artefact (workflow YAML, plugin source,
  schema JSON, etc.).
- Any future admin surface that needs a live editor for a server-side file.

---

## 2. Goals & Non-Goals

### Goals

- **Live** — show external changes from other users / tools in near real-time.
- **Minimal UI** — the surface should feel like a basic text editor, not an IDE.
- **Resumable** — the SSE session is deterministic per file path, so reloads and lost
  connections re-attach to the same stream.
- **Embeddable** — parent components can intercept the save event and/or react to
  confirmed saves.
- **Keyboard-first** — Save shortcut (`Cmd/Ctrl+S`) is captured inside the editor.

### Non-Goals

- Not a multi-file tab editor.
- Not a binary/media viewer — target is plain-text files (source, markdown, YAML, JSON…).
- Not a diff/merge tool — conflict handling is intentionally simple (see §8).
- Not a replacement for `ReactoryForm` — this is a leaf UI component, not a schema
  renderer.

---

## 3. Directory Layout

```
src/components/shared/File/
├── File.tsx                  # Main component (default export)
├── index.ts                  # Barrel + FQN registration
├── types.ts                  # Public types, props, SSE event types
├── utils.ts                  # pathHash(), mime→format mapping, debounce helpers
├── hooks/
│   ├── useFileContent.ts     # GraphQL read + write
│   ├── useFileSSE.ts         # Thin wrapper around EventSource (mirrors ReactorChat/useSSE)
│   ├── useFileSession.ts     # Orchestrates: open → read → connect SSE → listen
│   └── useSaveShortcut.ts    # Cmd/Ctrl+S capture, scoped to the editor DOM
├── graphql/
│   ├── queries/
│   │   └── ReactoryReadFile.graphql
│   └── mutations/
│       ├── ReactoryWriteFile.graphql
│       └── ReactoryOpenFileSession.graphql
└── __tests__/
    ├── File.test.tsx
    ├── useFileSSE.test.ts
    └── pathHash.test.ts
```

Registered under FQN `core.File@1.0.0` via the shared `COMPONENT_INDEX.yaml`.

---

## 4. Public API

### 4.1 Props

```ts
export interface FileProps {
  /** Absolute server path (template-expandable, e.g. "${APP_DATA_ROOT}/workflows/foo.yaml"). */
  path: string;

  /** Force a specific editor format. Inferred from the file extension if omitted. */
  format?: 'yaml' | 'json' | 'javascript' | 'typescript' | 'markdown' | 'text' | 'code';

  /** Read-only mode. Disables saving + Save shortcut. */
  readOnly?: boolean;

  /** Fixed height for the editor container. Defaults to `auto` (parent sizing). */
  height?: string;

  /**
   * Invoked when the user triggers a save (button, shortcut, programmatic).
   * Return value:
   *   - `false` or `{ cancel: true }` → skip the write mutation entirely.
   *   - `{ content }` → save this content instead of the current editor content.
   *   - `true` / `void`  → proceed with default save.
   * Must be synchronous or return a Promise — the save will `await` it.
   */
  onSave?: (payload: FileSavePayload) => FileSaveOverride | Promise<FileSaveOverride>;

  /** Invoked after the write mutation resolves successfully. */
  onSaved?: (result: FileSavedResult) => void;

  /** Invoked if the write mutation or the pre-save hook throws. */
  onSaveError?: (error: Error, payload: FileSavePayload) => void;

  /** Invoked when an external change arrives over SSE while the buffer is dirty. */
  onExternalChange?: (event: FileExternalChangeEvent) => ConflictResolution | Promise<ConflictResolution>;

  /** Emitted every time the editor buffer changes. */
  onChange?: (content: string, meta: { dirty: boolean }) => void;

  /** Optional controlled-mode value — overrides the live buffer. */
  value?: string;

  /** Debounce (ms) between keystrokes and `onChange` emissions. Default 150. */
  changeDebounceMs?: number;
}

export interface FileSavePayload {
  path: string;
  content: string;
  sessionId: string;
  hash: string;        // content hash of the buffer being saved
  baseRevision?: string; // revision the buffer was derived from (for conflict detection)
}

export type FileSaveOverride = boolean | void | { cancel: true } | { content: string };

export interface FileSavedResult {
  path: string;
  revision: string;
  savedAt: Date;
  bytesWritten: number;
}

export interface FileExternalChangeEvent {
  path: string;
  revision: string;
  source: 'sse';
  actor?: { userId?: string; clientId?: string };
  summary: { bytesBefore: number; bytesAfter: number };
}

export type ConflictResolution =
  | { strategy: 'keep-local' }
  | { strategy: 'take-remote' }
  | { strategy: 'prompt' };   // Component shows a minimal inline banner
```

### 4.2 Imperative handle (optional)

Exposed via `React.forwardRef`:

```ts
export interface FileHandle {
  save(): Promise<FileSavedResult | null>;
  reload(): Promise<void>;
  getContent(): string;
  isDirty(): boolean;
  focus(): void;
}
```

---

## 5. Rendering / UX

The component renders three regions, top to bottom:

1. **Status bar (24px)** — path (tail-truncated), format badge, dirty indicator (`●`),
   SSE connection state (`connected` / `reconnecting (n)` / `offline`), last-saved
   timestamp. No visible toolbar buttons by default.
2. **Editor surface** — `RichEditor` with `format` passed through; in code formats the
   Quill toolbar is restricted to `code-block` + `clean`, matching existing behaviour.
3. **Conflict banner** — only mounted when an unresolved `FileExternalChangeEvent`
   exists while the local buffer is dirty. Two actions: *Keep mine* / *Take theirs*.

No tabs, no tree, no modal dialogs. The component is self-contained and occupies the
space it's given by its parent.

### 5.1 Keyboard shortcuts

Registered via `useSaveShortcut`, scoped to the editor container (no global listener):

| Shortcut        | Action                                           |
| --------------- | ------------------------------------------------ |
| `Cmd/Ctrl + S`  | Trigger save flow (`onSave` → mutation → `onSaved`) |
| `Cmd/Ctrl + Shift + R` | Reload from server (discards local changes after confirm) |

`preventDefault()` is called for `Cmd/Ctrl+S` so the browser's save dialog never appears.

---

## 6. Session Identity — `pathHash`

The file path is the session identity. We deterministically derive a session ID from
the path so that:

- Multiple client instances editing the same file share the same SSE channel.
- Reconnects after a dropped socket re-attach to the same session on the server.
- No client-side ID generation is needed.

Implementation (`utils.ts`):

```ts
// Canonicalize → SHA-256 → first 16 hex chars (enough uniqueness for a per-tenant namespace).
export const pathHash = async (path: string, partnerKey: string): Promise<string> => {
  const canonical = `${partnerKey}::${path.replace(/\\/g, '/').replace(/\/+$/, '')}`;
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};
```

The mirroring server hash uses `@reactory/server-core/utils/hash` (already imported by
`ReactoryFileService`) over the same canonical form. Both sides agree on the session ID
without a round-trip.

---

## 7. Lifecycle

```
mount
  └── pathHash(path, partnerKey)        ─┐
  └── mutation ReactoryOpenFileSession   │  parallel
       → { sessionId, sseEndpoint, token, expiry, currentRevision }
  └── query    ReactoryReadFile          ─┘
       → { content, revision, mimetype }
  └── editor.setContent(content)
  └── useFileSSE.connect({ endpoint, sessionId, token, expiry })

edit
  └── debounce(150ms) → onChange(content, { dirty: true })

save  (Cmd/Ctrl+S | handle.save() | external trigger)
  └── await onSave?(payload)  → may cancel or override content
  └── mutation ReactoryWriteFile({ path, content, baseRevision })
       → { revision, savedAt, bytesWritten }
  └── onSaved?(result)
  └── baseRevision = result.revision

sse event (type: 'file_changed')
  └── if !dirty → silently replace buffer, bump baseRevision
  └── if  dirty → await onExternalChange?(event)
       - keep-local → ignore (server wins on next save or triggers conflict)
       - take-remote → reload & replace buffer
       - prompt     → show conflict banner
  └── onExternalChange may return `{ strategy: 'prompt' }` by default

unmount
  └── useFileSSE.disconnect()
  └── mutation ReactoryCloseFileSession (best-effort, fire-and-forget)
```

### 7.1 Dirty state

`dirty` is true when the current editor content hash !== last-saved-content hash.
Using a hash (not reference equality) lets us clear `dirty` after an SSE-driven reload
if the remote content happens to match.

---

## 8. Conflict handling

Minimum viable strategy — we surface, we do not merge.

1. Every save includes the `baseRevision` the buffer was derived from.
2. Server-side `ReactoryWriteFile` rejects with `STALE_REVISION` if the on-disk revision
   has advanced past `baseRevision`.
3. On `STALE_REVISION`:
   - If buffer is clean → reload silently.
   - If buffer is dirty → fire `onExternalChange` (or show the conflict banner) and let
     the user choose *Keep mine* (force-overwrite via an explicit follow-up mutation) or
     *Take theirs* (reload).
4. A 3-way merge is out of scope. If/when we need it, it will live in a sibling
     `FileMerge` component invoked by the banner action.

---

## 9. GraphQL Contract

### 9.1 Queries

```graphql
query ReactoryReadFile($path: String!) {
  ReactoryReadFile(path: $path) {
    __typename
    ... on ReactoryFileContent {
      path
      content
      mimetype
      revision
      bytes
      modified
    }
    ... on ReactoryFileError {
      code
      message
    }
  }
}
```

### 9.2 Mutations

```graphql
mutation ReactoryOpenFileSession($path: String!) {
  ReactoryOpenFileSession(path: $path) {
    __typename
    ... on ReactoryFileSession {
      sessionId      # sha256(partnerKey::canonicalPath).slice(0,16)
      endpoint       # e.g. /reactory/files/sse/:sessionId
      token
      expiry
      currentRevision
    }
    ... on ReactoryFileError { code message }
  }
}

mutation ReactoryWriteFile($input: ReactoryWriteFileInput!) {
  ReactoryWriteFile(input: $input) {
    __typename
    ... on ReactoryFileWriteSuccess {
      path
      revision
      savedAt
      bytesWritten
    }
    ... on ReactoryFileError {
      code           # e.g. STALE_REVISION, PERMISSION_DENIED
      message
      details
    }
  }
}

mutation ReactoryCloseFileSession($sessionId: String!) {
  ReactoryCloseFileSession(sessionId: $sessionId) {
    __typename
    ... on ReactoryFileSessionCloseSuccess { sessionId }
    ... on ReactoryFileError { code message }
  }
}

input ReactoryWriteFileInput {
  path: String!
  content: String!
  baseRevision: String
  encoding: String = "utf-8"
  force: Boolean = false
}
```

All three follow the existing union-with-`__typename` error pattern established by
`ReactoryCreateFolder`, `ReactoryDeleteFile`, etc.

---

## 10. Server-side — `FileSSETransportManager`

The component depends on a new singleton service sitting alongside `ReactoryFileService`:

```
reactory-express-server/src/modules/reactory-core/services/
  ReactoryFileService.ts         (existing — extend)
  FileSSETransportManager.ts     (new)
```

### 10.1 Responsibilities

- Maintain a `Map<sessionId, Set<SSEConnection>>` of active subscribers per file.
- Watch each subscribed file via `fs.watch` / `chokidar` and emit `file_changed`
  events to every subscriber of that `sessionId`.
- Debounce rapid writes (the component's own save will trigger the watcher — debounce
  short bursts and include `actor.clientId` so we can suppress echo on the originator).
- Evict sessions with zero subscribers after a grace period (default 60s) to avoid
  leaking watchers.
- Mirror the resilience contract of `StreamingTransportManager`: heartbeats, graceful
  transport close, activity timers.

### 10.2 SSE event types

```ts
type FileSseEvent =
  | { type: 'opened';        sessionId: string; revision: string; timestamp: Date }
  | { type: 'file_changed';  sessionId: string; revision: string; actor?: FileActor; summary: FileChangeSummary; timestamp: Date }
  | { type: 'file_deleted';  sessionId: string; timestamp: Date }
  | { type: 'error';         sessionId: string; code: string; message: string; timestamp: Date }
  | { type: 'heartbeat';     sessionId: string; timestamp: Date };
```

### 10.3 Integration with `ReactoryFileService`

Add two methods (permissions: `ADMIN` / `DEVELOPER`, consistent with `getServerFiles`):

```ts
readFileContent(path: string): Promise<{ content: string; revision: string; mimetype: string; bytes: number; modified: Date }>;
writeFileContent(path: string, content: string, baseRevision?: string, force?: boolean): Promise<{ revision: string; savedAt: Date; bytesWritten: number }>;
```

`revision` is `Hash(contentBuffer)` — cheap, deterministic, and already imported.

### 10.4 HTTP route

Mirrors `StreamingEndpoints` shape:

```
GET  /reactory/files/sse/:sessionId        # establish SSE stream (requires token query/header)
POST /reactory/files/sse/:sessionId/close  # best-effort explicit close
```

Route registration goes next to `StreamingEndpoints.setupRoutes(app)` in the same
bootstrap path.

---

## 11. Error Surfaces

| Condition                       | Behaviour                                                    |
| ------------------------------- | ------------------------------------------------------------ |
| File not found on open          | Render empty editor in `readOnly` mode + status-bar warning  |
| Permission denied on read/write | Render read-only banner; disable save; call `onSaveError`    |
| SSE connect fails               | Fall back to polling-free static mode; status bar shows `offline`; retry via `useFileSSE` reconnect (5 attempts, exponential backoff — identical to `useSSE.ts`) |
| `STALE_REVISION` on save        | Conflict flow (§8)                                           |
| Network offline during save     | `onSaveError` with `NETWORK_ERROR`; save button stays enabled |
| Unmount during pending save     | Abort via `AbortController`; `onSaveError` is **not** fired  |

---

## 12. Accessibility

- Editor container has `role="textbox"` and `aria-label` derived from `path`.
- Status bar nodes are `aria-live="polite"` for connection-state changes.
- All shortcuts respect `Cmd` on macOS, `Ctrl` elsewhere (via `navigator.platform`).
- Conflict banner is `role="alert"`.

---

## 13. Testing

- **Unit** — `pathHash()` stability across platforms, `utils.ts` mime→format mapping,
  `useFileSSE` reconnect behaviour (mock EventSource).
- **Component** — mount with a mocked `reactory.graphqlMutation`/`graphqlQuery`,
  simulate SSE events via a mock transport, assert buffer updates and `onSaved` /
  `onExternalChange` invocations.
- **Integration** — end-to-end test under `reactory-express-server/src/modules/reactory-core/services/__tests__/FileSSETransportManager.test.ts` exercising the watcher →
  SSE broadcast path.
- **TDD plans** — For each test file, author `<testfile>_plan.md` first, per the
  workspace convention in `CLAUDE.md`.

---

## 14. Out of scope (future work)

- Binary file preview (images, PDFs) — covered by a distinct `FilePreview` component.
- Operational Transform / CRDT for true collaborative editing.
- Per-line presence / cursor sharing.
- Diff view against a prior revision.

---

## 15. Open questions

1. **Revision storage** — is `Hash(content)` sufficient, or do we want a monotonic
   counter persisted per file? (Hash is simpler and stateless; a counter enables cheap
   ordering.) 

   A: Hash(content) 
2. **Watcher backend** — `chokidar` is already in the dependency tree of some modules;
   confirm before adding vs. raw `fs.watch`.

   A: Use the most optimal approach
3. **Token scope** — does the SSE token need to be partner-scoped, user-scoped, or
   session-scoped only? (Lean toward user + partner, same as chat.)

   A: user+partner same as chat
4. **Large files** — set a hard upper bound for editable size (suggest 2 MB). Anything
   larger renders as a preview-only placeholder with a "Download" link.

   A: acceptable.
