import { FileFormat } from './types';

const EXTENSION_TO_FORMAT: Record<string, FileFormat> = {
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  md: 'markdown',
  markdown: 'markdown',
  txt: 'text',
  log: 'text',
};

/**
 * Derive the editor format from a filename or bare extension.
 * Falls back to `text` for unknown extensions.
 */
export function formatFromExtension(pathOrExt: string): FileFormat {
  const raw = pathOrExt.includes('.')
    ? pathOrExt.split('.').pop() ?? ''
    : pathOrExt;
  return EXTENSION_TO_FORMAT[raw.toLowerCase()] ?? 'text';
}

/**
 * Deterministic short identifier derived from `(partnerKey, path)`.
 *
 * NOTE: This does NOT necessarily match the server's sessionId — the server
 * resolves the input path to an absolute path under APP_DATA_ROOT before
 * hashing, which the client can't reproduce without knowing that root.
 * The authoritative sessionId is always the one returned by
 * `ReactoryOpenFileSession`. This utility is for log correlation and as a
 * stable React key, not for session resolution.
 */
export async function pathHash(path: string, partnerKey: string): Promise<string> {
  const canonical = `${partnerKey}::${path.replace(/\\/g, '/').replace(/\/+$/, '')}`;
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest)).slice(0, 16);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Classic trailing-edge debounce.
 * Returns a function that delays calling `fn` until `ms` has elapsed
 * since the last invocation. Cancel by calling `.cancel()`.
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = ((...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  }) as T & { cancel: () => void };
  wrapped.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return wrapped;
}

/**
 * SHA-256 hex (first 16 chars) of a utf-8 string. Used for local dirty-state
 * detection — matches the server's content-revision algorithm, so if content
 * round-trips unchanged, hashes agree.
 */
export async function contentHash(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest)).slice(0, 16);
}
