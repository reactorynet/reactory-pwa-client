# `pathHash.test.ts` — TDD Plan

**Target:** `src/components/shared/File/utils.ts` — `pathHash`, `formatFromExtension`, `debounce`, `contentHash`

## Scope

Pure-function unit tests. No React, no SDK, no SSE.

## Test cases

### `pathHash`

1. **Returns 16-character lowercase hex**
2. **Deterministic for same input**
3. **Differs for different paths**
4. **Differs for different partner keys** (tenant isolation)
5. **Normalizes Windows-style backslashes to forward slashes**
6. **Strips trailing slashes**

### `formatFromExtension`

7. **Maps known extensions** (`yaml`/`yml` → yaml, `ts`/`tsx` → typescript, etc.)
8. **Accepts bare extensions without a dot**
9. **Falls back to `text` for unknown extensions**
10. **Case-insensitive**

### `contentHash`

11. **Produces 16-char hex** — matches server's `sha256(content).slice(0,16)` contract
12. **Empty string returns the stable sha256 prefix of ''**
13. **Deterministic for the same content**

### `debounce`

14. **Calls fn once after `ms` elapsed**
15. **Coalesces rapid calls — latest args win**
16. **`.cancel()` prevents pending call**

## Environment

- jsdom (default from jest config).
- `crypto.subtle` available via jsdom (node 20+ exposes it in global scope; jsdom runs in Node so it's accessible via `globalThis.crypto.subtle`).
