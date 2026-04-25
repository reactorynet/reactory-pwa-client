# `<File />` Implementation Plan

**Companion to:** [SPEC.md](./SPEC.md)
**Status:** Ready to implement
**Last updated:** 2026-04-18

Resolved open questions (from SPEC §15) flowing into this plan:
- Revision = content hash, specifically `crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)` — stateless, no persistence layer. (The weak 32-bit `Hash()` in `utils/hash.ts` used for file-IDs is too collision-prone for revision comparisons.)
- Watcher = **chokidar** — already present transitively in `reactory-express-server`
  via yarn.lock (`chokidar ^3.x`); promote to a direct dependency. Reasons: de-dupes
  macOS `fs.watch` double-fires, handles atomic-write patterns (editors that rename
  temp files on save), native debounce via `awaitWriteFinish`.
- SSE token scope = user + partner (mirrors `StreamingSessionManager`).
- Size cap = 2 MB editable; larger files render the preview-only placeholder.

---

## Ordering rationale

Backend first → GraphQL surface → client hooks → component → tests/polish.
This keeps each phase landable on its own and lets us validate the SSE channel
end-to-end before the UI exists (via `curl`/integration tests).

---

## Phase 1 — Server: `ReactoryFileService` content I/O ✅ COMPLETE

**Repo:** `reactory-express-server`
**Branch:** `feat/file-component-backend`
**Landed:**
- `ReactoryFileService.readFileContent` / `writeFileContent` + `resolveContentPath` helper.
- Constant `MAX_EDITABLE_BYTES = 2 * 1024 * 1024`.
- Error codes via `ApiError.meta.code`: `ACCESS_DENIED`, `FILE_NOT_FOUND`, `INVALID_PATH`, `STALE_REVISION`, `FILE_TOO_LARGE`.
- 15/15 tests pass (`__tests__/ReactoryFileService.content.test.ts`).
- Methods NOT added to `IReactoryFileService` yet — avoids a `reactory-core` rebuild/tarball bump. Promote to the interface when the GraphQL resolvers land in Phase 3.

### 1.1 Extend `ReactoryFileService` *(file: `src/modules/reactory-core/services/ReactoryFileService.ts`)*

Add two role-gated methods (`ADMIN` / `DEVELOPER`, consistent with `getServerFiles`):

```ts
async readFileContent(path: string): Promise<{
  content: string; revision: string; mimetype: string;
  bytes: number; modified: Date;
}>

async writeFileContent(
  path: string,
  content: string,
  baseRevision?: string,
  force?: boolean,
): Promise<{ revision: string; savedAt: Date; bytesWritten: number }>
```

Implementation notes:
- Resolve `${APP_DATA_ROOT}` / template variables exactly like `getServerFiles`.
- Reject paths that escape the allowed roots (`path.resolve` + `startsWith` guard).
- `revision = Hash(content)` — `Hash` from `@reactory/server-core/utils/hash`.
- On write: if `baseRevision` provided and current on-disk `Hash` differs → throw
  `ApiError('STALE_REVISION', { currentRevision })` unless `force === true`.
- Enforce 2 MB write cap — throw `ApiError('FILE_TOO_LARGE')` above threshold.
- mimetype via `mime-types` (already in the dep tree).

### 1.2 Unit tests

`src/modules/reactory-core/services/__tests__/ReactoryFileService.content.test.ts`
- `readFileContent` returns `{ content, revision, mimetype, bytes }` for a fixture file.
- `writeFileContent` with matching `baseRevision` succeeds.
- `writeFileContent` with stale revision throws `STALE_REVISION`.
- `writeFileContent` with `force: true` bypasses revision check.
- Path-traversal attempt (`../../etc/passwd`) throws.
- Oversized content (>2 MB) throws.

Author `ReactoryFileService.content.test_plan.md` alongside, per workspace convention.

---

## Phase 2 — Server: `FileSSETransportManager` ✅ COMPLETE

**Landed:**
- `reactory-core/services/FileSSETransportManager.ts` — singleton, in-memory session map, chokidar watcher per `(partner, path)` pair, 2s echo-suppression window via `noteLocalWrite`, 60s zero-subscriber eviction, 15s heartbeat.
- `reactory-core/routes/FileSSEEndpoints.ts` — `GET /reactory/files/sse/:sessionId` + `POST /reactory/files/sse/:sessionId/close`.
- `reactory-core/middleware/FileSSEMiddleware.ts` — registered in `reactory-core/middleware/index.ts`.
- `FileSSETransportManagerDefinition` added to `reactory-core/services/index.ts` so `context.getService('core.FileSSETransportManager@1.0.0')` resolves.
- 18/18 tests pass (`__tests__/FileSSETransportManager.test.ts`).
- `chokidar ^3.6.0` promoted from transitive to a direct dependency in `package.json`.

**Deviation from spec §10:** v1 uses an **in-memory token store** (not Redis). Rationale: SSE connections require sticky process affinity anyway, so a distributed token table buys nothing. Swap to Redis later if/when we go multi-process for the file channel.

**Deferred:** Phase 3's `ReactoryWriteFile` resolver should call `manager.noteLocalWrite(sessionId, revision)` immediately before `ReactoryFileService.writeFileContent` so the originator doesn't see its own save as an external change. The mechanism is in place and tested; the hook-up happens at the resolver layer to keep services decoupled.

**Original plan (for reference):**

**New file:** `src/modules/reactory-core/services/FileSSETransportManager.ts`

### 2.1 Service shape

```ts
@service({
  id: "core.FileSSETransportManager@1.0.0",
  nameSpace: "core",
  name: "FileSSETransportManager",
  version: "1.0.0",
  lifeCycle: 'singleton',
})
export class FileSSETransportManager { … }
```

Internal state:
- `sessions: Map<sessionId, FileSession>` — each session keyed by `pathHash(partnerKey, canonicalPath)`.
- `FileSession = { path, partnerKey, watcher: FSWatcher, subscribers: Set<SSEConnection>, lastRevision, evictTimer }`.
- One chokidar watcher per unique `path` (NOT per subscriber) — watchers are shared across subscribers on the same session ID.

### 2.2 Public methods

```ts
openSession(path: string, user: User, partner: Partner): Promise<{
  sessionId: string; token: string; expiry: Date;
  endpoint: string; currentRevision: string;
}>

attachTransport(sessionId: string, token: string, res: express.Response): Promise<SSEConnection>
closeSession(sessionId: string): Promise<void>
```

Lifecycle:
1. `openSession` computes `sessionId = Hash(partner.key + '::' + canonicalPath).slice(0,16)`, persists `{ user, partner, path, expiry }` in Redis under `file-sse:session:${sessionId}` (mirrors `StreamingSessionManager` token pattern, same TTL of 1h).
2. `attachTransport` validates token, establishes the SSE response stream, subscribes to the shared chokidar watcher for that path, sends initial `opened` event with `currentRevision`.
3. chokidar `change` handler: compute `newRevision = Hash(file)` — if equal to `lastRevision`, drop (de-duped echo from our own write). Otherwise broadcast `file_changed` event to every subscriber with `{ revision, summary, actor }`.
4. Subscriber disconnect (`res.on('close')`) removes from `subscribers`. When `subscribers.size === 0`, start a 60 s eviction timer that closes the watcher and drops the session.
5. Heartbeat every 15 s (same cadence as `StreamingTransport`).

### 2.3 Echo suppression

`ReactoryFileService.writeFileContent` registers the originator's `sessionId` + resulting `revision` with `FileSSETransportManager.noteLocalWrite(sessionId, revision)` before the write. When the watcher fires with matching `revision`, suppress broadcast and clear the note. TTL on the note = 2 s to prevent stale suppressions.

### 2.4 HTTP routes

New file: `src/modules/reactory-core/routes/FileSSEEndpoints.ts` — mirrors `StreamingEndpoints`:

```
GET  /reactory/files/sse/:sessionId                    # attach transport
POST /reactory/files/sse/:sessionId/close              # explicit close
```

Register in whichever bootstrap calls `StreamingEndpoints.setupRoutes(app)` (find via grep; same registration point).

### 2.5 Tests

`src/modules/reactory-core/services/__tests__/FileSSETransportManager.test.ts`
- Opening a session returns a deterministic `sessionId` for the same `(partner, path)`.
- Two subscribers on the same path share a single watcher (assert `openSession` twice → `sessions.size === 1`).
- External `fs.writeFile` triggers `file_changed` events for all subscribers with matching `revision`.
- `writeFileContent` through the service does NOT trigger `file_changed` for the originator (echo suppression).
- Subscriber disconnect then reconnect within 60 s reuses the watcher.
- Last subscriber disconnect then no reconnect → watcher closes after 60 s.
- Heartbeat fires at 15 s interval.

### 2.6 Dependency bump

Add `chokidar: ^3.6.0` to `reactory-express-server/package.json` (promotion from transitive).

---

## Phase 3 — Server: GraphQL surface ✅ COMPLETE

**Landed:**
- `reactory-core/graph/types/System/File.graphql` — new types (`ReactoryFileContent`, `ReactoryFileWriteSuccess`, `ReactoryFileSession`, `ReactoryFileSessionCloseSuccess`, `ReactoryFileError`), input (`ReactoryWriteFileInput`), unions, one new query (`ReactoryReadFile`), three new mutations (`ReactoryWriteFile`, `ReactoryOpenFileSession`, `ReactoryCloseFileSession`).
- `reactory-core/resolvers/ReactoryFile/ReactoryFile.ts` — four resolver methods + `toFileError` mapper that surfaces `currentRevision` on `STALE_REVISION` and `maxBytes` on `FILE_TOO_LARGE`.
- `FileSSETransportManager.sessionIdFor(partnerKey, path)` public method — lets the write resolver call `noteLocalWrite` without reaching into private state.
- Echo suppression wired: `ReactoryWriteFile` computes the post-write revision and calls `noteLocalWrite(sessionId, revision)` **before** `writeFileContent`. If `sessionIdFor` throws (e.g. no active session), the write still proceeds — the miss just means the originator receives their own change event, which is harmless on a clean buffer.
- 13/13 resolver tests pass (`resolvers/ReactoryFile/__tests__/ReactoryFile.content.test.ts`).
- Cross-phase regression check: **46/46 tests green** across Phase 1 + 2 + 3.

**Original plan (for reference):**

### 3.1 Type / resolver additions

In the reactory-core module's GraphQL types directory:

```graphql
type ReactoryFileContent { path mimetype content revision bytes modified }
type ReactoryFileSession { sessionId endpoint token expiry currentRevision }
type ReactoryFileWriteSuccess { path revision savedAt bytesWritten }
type ReactoryFileSessionCloseSuccess { sessionId }
type ReactoryFileError { code message details }

union ReactoryReadFileResult = ReactoryFileContent | ReactoryFileError
union ReactoryOpenFileSessionResult = ReactoryFileSession | ReactoryFileError
union ReactoryWriteFileResult = ReactoryFileWriteSuccess | ReactoryFileError
union ReactoryCloseFileSessionResult = ReactoryFileSessionCloseSuccess | ReactoryFileError

input ReactoryWriteFileInput {
  path: String!
  content: String!
  baseRevision: String
  encoding: String = "utf-8"
  force: Boolean = false
}
```

Resolvers delegate to `ReactoryFileService` (read/write) and `FileSSETransportManager` (openSession/closeSession). Error-union mapping pattern copied from `ReactoryDeleteFile` resolver.

### 3.2 Tests

Resolver-level tests using the existing GraphQL test harness — one happy-path and one error-path per operation.

---

## Phase 4 — Client: hooks ✅ COMPLETE

**Landed in `reactory-pwa-client/src/components/shared/File/`:**
- `types.ts` — all public types from SPEC §4 + SSE event shapes + GraphQL result shapes + `isFileError` narrowing helper.
- `utils.ts` — `pathHash`, `contentHash` (sha256 hex-16, matches server revision algorithm), `formatFromExtension`, `debounce`.
- `graphql/` — `ReactoryReadFile.graphql`, `ReactoryWriteFile.graphql`, `ReactoryOpenFileSession.graphql`, `ReactoryCloseFileSession.graphql`.
- `hooks/useFileSSE.ts` — `EventSource` wrapper with the full chat reconnect contract (5 attempts, `[1000,2000,4000,8000,16000]` backoff, token-expiry abort, unmount cleanup). Token rides as `?token=` query param — browsers forbid custom headers on `EventSource`.
- `hooks/useFileContent.ts` — thin async wrappers for read / write / openSession / closeFileSession. `FileOperationError` carries `code`, `currentRevision`, `maxBytes` for the UI to act on.
- `hooks/useFileSession.ts` — orchestrator: openSession + readFile in parallel, SSE connect, conflict resolution (`keep-local` / `take-remote` / `prompt`), hash-based dirty detection.
- `hooks/useSaveShortcut.ts` — scoped `Cmd/Ctrl+S` + optional `Cmd/Ctrl+Shift+R` reload, `preventDefault` on save so the browser dialog never appears.
- Tests — **28/28 pass** (`pathHash.test.ts` 16 cases, `useFileSSE.test.ts` 12 cases).

**Deviation from SPEC §6 (pathHash):**
- Client `pathHash` does NOT match the server's sessionId byte-for-byte. The server hashes the *resolved absolute path* (under APP_DATA_ROOT), which the client can't reconstruct without knowing APP_DATA_ROOT. The authoritative sessionId always comes from `ReactoryOpenFileSession`. Client `pathHash` is kept as a stable short identifier for log correlation / React keys — documented in the utils.ts JSDoc.

**Test env note:**
- jsdom doesn't expose `TextEncoder` or `crypto.subtle` globally. `pathHash.test.ts` polyfills both from Node's `util` and `crypto.webcrypto` at the top of the file — contained to this test, no shared-setup pollution.

**Original plan (for reference):**

**Repo:** `reactory-pwa-client`
**Branch:** `feat/file-component`

### 4.1 `utils.ts`

```ts
export async function pathHash(path: string, partnerKey: string): Promise<string>
export function formatFromExtension(pathOrExt: string): FileProps['format']
export function debounce<T>(fn: (v: T) => void, ms: number): (v: T) => void
```

`pathHash` uses `crypto.subtle.digest('SHA-256', …)` → hex → first 16 chars — matches server algorithm byte-for-byte.

### 4.2 `hooks/useFileSSE.ts`

Copy-reduce of `ReactorChat/hooks/useSSE.ts`:
- Drop: tool-call, reasoning, completion, compaction, drip-feed logic.
- Keep: connect/disconnect, reconnect-with-backoff (5 attempts), callback refs pattern.
- Event types: `opened`, `file_changed`, `file_deleted`, `error`, `heartbeat`.

```ts
interface UseFileSSEOptions {
  reactory: Reactory.Client.ReactorySDK;
  onOpened?: (e: FileOpenedEvent) => void;
  onFileChanged?: (e: FileChangedEvent) => void;
  onFileDeleted?: (e: FileDeletedEvent) => void;
  onError?: (e: FileErrorEvent) => void;
  onReconnecting?: (attempt: number, max: number, delay: number) => void;
  onReconnected?: () => void;
}
```

### 4.3 `hooks/useFileContent.ts`

Two async functions plus cached state:
- `read(path)` → executes `ReactoryReadFile` query.
- `write(path, content, baseRevision, force)` → executes `ReactoryWriteFile` mutation, returns `{ revision, savedAt, bytesWritten }` or throws typed errors (`STALE_REVISION`, `FILE_TOO_LARGE`, `PERMISSION_DENIED`).

### 4.4 `hooks/useFileSession.ts`

Orchestrator composing the three hooks above:

```ts
function useFileSession({ path, onExternalChange, onFileDeleted }) {
  // 1. pathHash + openSession mutation
  // 2. readFile → seed editor state
  // 3. useFileSSE.connect()
  // 4. on file_changed: dispatch to caller (dirty-aware conflict logic)
  // 5. on unmount: disconnect + closeSession (fire-and-forget)

  return {
    content, setContent, dirty, revision,
    save, reload, connectionState, sessionId,
  };
}
```

### 4.5 `hooks/useSaveShortcut.ts`

`useSaveShortcut(containerRef, { enabled, onSave, onReload })` — attaches `keydown`
to the container, matches `(metaKey || ctrlKey) && key === 's'`, calls
`preventDefault()` then `onSave()`. Tests: Mac + Windows key combos, respects `enabled`, scoped (doesn't fire when focus is elsewhere).

---

## Phase 5 — Client: `File.tsx`

### 5.1 Component structure

```tsx
export const File = React.forwardRef<FileHandle, FileProps>((props, ref) => {
  const reactory = useReactory();
  const session = useFileSession(props);
  const containerRef = useRef<HTMLDivElement>(null);
  useSaveShortcut(containerRef, { ... });
  useImperativeHandle(ref, () => ({ save, reload, getContent, isDirty, focus }));

  return (
    <StyledFileContainer ref={containerRef}>
      <FileStatusBar … />
      <RichEditor
        format={props.format ?? formatFromExtension(props.path)}
        formData={session.content}
        onChange={session.setContent}
        readonly={props.readOnly || session.readOnlyReason !== null}
        height={props.height}
      />
      {session.conflict && <FileConflictBanner onResolve={session.resolveConflict} />}
    </StyledFileContainer>
  );
});
```

### 5.2 Subcomponents (colocated in `File.tsx` or `components/`)

- `FileStatusBar` — stateless, renders path tail, format badge, dirty dot, connection pill, last-saved.
- `FileConflictBanner` — stateless; two buttons, `role="alert"`.

### 5.3 `index.ts`

```ts
export { default } from './File';
export * from './types';
```

Register in `src/components/shared/COMPONENT_INDEX.yaml` under FQN `core.File@1.0.0`.

---

## Phase 6 — Tests

Follow workspace convention: write `<testfile>_plan.md` first, then the test.

- `__tests__/pathHash.test.ts` — stability, platform-independence, collision smoke.
- `__tests__/useFileSSE.test.ts` — mocks `EventSource`; connect/disconnect/reconnect.
- `__tests__/File.test.tsx` — React Testing Library:
  - renders `RichEditor` with content from query
  - `Cmd+S` fires mutation with correct `baseRevision`
  - SSE `file_changed` with clean buffer replaces content silently
  - SSE `file_changed` with dirty buffer invokes `onExternalChange`
  - `STALE_REVISION` on save invokes `onSaveError` + opens conflict banner
  - unmount during in-flight save aborts (no callbacks fired)

---

## Phase 7 — Integration into `ServerFileExplorer`

Touch file: `src/components/shared/ServerFileExplorer/ServerFileExplorer.tsx`.

- Replace the existing preview panel with `<File path={selected.fullPath} readOnly={!selected.permissions.write} />` when the selected item is a file under the editable size cap.
- Size gate: if `selected.size > 2 * 1024 * 1024`, render the existing read-only preview instead.
- No API changes exposed to callers of `ServerFileExplorer`.

Smoke test in the browser (per CLAUDE.md UI-change rule): open a text file, edit,
`Cmd+S`, trigger an external change via `echo "x" >> file`, observe reload.

---

## Phase 8 — Docs + rollout

- Update `COMPONENT_INDEX.yaml` with FQN + description.
- Short `README.md` in `shared/File/` with usage snippet (SPEC stays as the canonical contract).
- Tag a pre-release version of `@reactorynet/reactory-core` only if new public types were added to the Reactory namespace — in the current plan we do NOT add types to reactory-core (the types live inside the component), so no core bump required.

---

## Risk register

| Risk | Mitigation |
| ---- | ---------- |
| macOS double-fire on `fs.watch` | chokidar with `awaitWriteFinish: { stabilityThreshold: 100 }` |
| Atomic-write editors (rename temp → target) | chokidar handles by default; verified in unit test |
| Watcher leak on crash | 60 s zero-subscriber eviction + process-exit hook closes all watchers |
| Echo loop (our save → watcher → our SSE → we re-apply → dirty again) | `noteLocalWrite(sessionId, revision)` with 2 s TTL |
| Token leak via URL | Token in `Authorization` header if client supports; browsers force EventSource into query — accept scope is already user+partner bound and expires in 1 h |
| Concurrent tabs racing saves | Last-write-wins with `STALE_REVISION`; UI surfaces via conflict banner — no silent overwrites |

---

## Merge sequence

1. Phase 1 + 2 + 3 together → one PR to `reactory-express-server`. Gated on tests + manual `curl` SSE verification.
2. Phase 4 + 5 + 6 together → one PR to `reactory-pwa-client`. Gated on unit/component tests + storybook smoke.
3. Phase 7 → separate PR (UI integration; small enough to review independently).
4. Phase 8 → last, rides along with Phase 7 or its own small PR.
