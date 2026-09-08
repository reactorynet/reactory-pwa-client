// jsdom's test env doesn't expose TextEncoder/crypto.subtle globally — polyfill
// from Node's util/crypto before importing the unit under test.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TextEncoder, TextDecoder } = require('util');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeCrypto = require('crypto');
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = TextEncoder;
  (globalThis as any).TextDecoder = TextDecoder;
}
// jsdom provides a `crypto` object but without `subtle`. Force-install
// Node's webcrypto so `crypto.subtle.digest(...)` works in tests.
if (nodeCrypto.webcrypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: nodeCrypto.webcrypto,
    configurable: true,
    writable: true,
  });
}

import {
  pathHash,
  formatFromExtension,
  contentHash,
  debounce,
  detectFileType,
  isPreviewableType,
} from '../utils';

describe('utils', () => {
  describe('pathHash', () => {
    it('returns 16-character lowercase hex', async () => {
      const h = await pathHash('files/a.txt', 'reactory');
      expect(h).toMatch(/^[0-9a-f]{16}$/);
    });

    it('is deterministic for same input', async () => {
      const a = await pathHash('files/a.txt', 'reactory');
      const b = await pathHash('files/a.txt', 'reactory');
      expect(a).toBe(b);
    });

    it('differs for different paths', async () => {
      const a = await pathHash('files/a.txt', 'reactory');
      const b = await pathHash('files/b.txt', 'reactory');
      expect(a).not.toBe(b);
    });

    it('differs for different partner keys (tenant isolation)', async () => {
      const a = await pathHash('files/a.txt', 'reactory');
      const b = await pathHash('files/a.txt', 'other');
      expect(a).not.toBe(b);
    });

    it('normalizes backslashes to forward slashes', async () => {
      const a = await pathHash('files\\a.txt', 'reactory');
      const b = await pathHash('files/a.txt', 'reactory');
      expect(a).toBe(b);
    });

    it('strips trailing slashes', async () => {
      const a = await pathHash('files/dir/', 'reactory');
      const b = await pathHash('files/dir', 'reactory');
      expect(a).toBe(b);
    });
  });

  describe('formatFromExtension', () => {
    it('maps known extensions from full filenames', () => {
      expect(formatFromExtension('foo.yaml')).toBe('yaml');
      expect(formatFromExtension('foo.yml')).toBe('yaml');
      expect(formatFromExtension('app.ts')).toBe('typescript');
      expect(formatFromExtension('app.tsx')).toBe('typescript');
      expect(formatFromExtension('app.js')).toBe('javascript');
      expect(formatFromExtension('data.json')).toBe('json');
      expect(formatFromExtension('README.md')).toBe('markdown');
      expect(formatFromExtension('notes.txt')).toBe('text');
    });

    it('accepts bare extensions without a dot', () => {
      expect(formatFromExtension('yaml')).toBe('yaml');
      expect(formatFromExtension('tsx')).toBe('typescript');
    });

    it('falls back to text for unknown extensions', () => {
      expect(formatFromExtension('archive.tar')).toBe('text');
      expect(formatFromExtension('mystery')).toBe('text');
    });

    it('is case-insensitive', () => {
      expect(formatFromExtension('foo.YAML')).toBe('yaml');
      expect(formatFromExtension('app.TSX')).toBe('typescript');
    });
  });

  describe('contentHash', () => {
    it('produces 16-char hex', async () => {
      const h = await contentHash('hello');
      expect(h).toMatch(/^[0-9a-f]{16}$/);
    });

    it('stable sha256 prefix for empty string', async () => {
      // sha256("") = e3b0c44298fc1c149afbf4c8996fb924...
      const h = await contentHash('');
      expect(h).toBe('e3b0c44298fc1c14');
    });

    it('is deterministic', async () => {
      const a = await contentHash('hello world');
      const b = await contentHash('hello world');
      expect(a).toBe(b);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('calls fn once after ms elapsed', () => {
      const fn = jest.fn();
      const wrapped = debounce(fn, 100);
      wrapped('a');
      expect(fn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(99);
      expect(fn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2);
      expect(fn).toHaveBeenCalledWith('a');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('coalesces rapid calls — latest args win', () => {
      const fn = jest.fn();
      const wrapped = debounce(fn, 100);
      wrapped('a'); wrapped('b'); wrapped('c');
      jest.advanceTimersByTime(101);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
    });

    it('.cancel() prevents pending call', () => {
      const fn = jest.fn();
      const wrapped = debounce(fn, 100);
      wrapped('a');
      wrapped.cancel();
      jest.advanceTimersByTime(200);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('detectFileType and isPreviewableType', () => {
    it('detects markdown by extension, mimetype, and format', () => {
      expect(detectFileType({ path: 'doc.md' })).toEqual({ type: 'markdown', isPreviewable: true });
      expect(detectFileType({ path: 'install.md', mimetype: 'application/octet-stream' })).toEqual({ type: 'markdown', isPreviewable: true });
      expect(detectFileType({ path: 'spec.markdown' })).toEqual({ type: 'markdown', isPreviewable: true });
      expect(detectFileType({ path: 'unknown', mimetype: 'text/markdown' })).toEqual({ type: 'markdown', isPreviewable: true });
      expect(detectFileType({ path: 'unknown', format: 'markdown' })).toEqual({ type: 'markdown', isPreviewable: true });
      expect(isPreviewableType({ path: 'doc.md' })).toBe(true);
    });

    it('detects html by extension, mimetype, and format', () => {
      expect(detectFileType({ path: 'index.html' })).toEqual({ type: 'html', isPreviewable: true });
      expect(detectFileType({ path: 'page.htm' })).toEqual({ type: 'html', isPreviewable: true });
      expect(detectFileType({ path: 'unknown', mimetype: 'text/html' })).toEqual({ type: 'html', isPreviewable: true });
      expect(detectFileType({ path: 'unknown', format: 'html' })).toEqual({ type: 'html', isPreviewable: true });
      expect(isPreviewableType({ path: 'index.html' })).toBe(true);
    });

    it('detects plain text and code files as text', () => {
      expect(detectFileType({ path: 'notes.txt' })).toEqual({ type: 'text', isPreviewable: true });
      expect(detectFileType({ path: 'config.json' })).toEqual({ type: 'text', isPreviewable: true });
      expect(detectFileType({ path: 'workflow.yaml' })).toEqual({ type: 'text', isPreviewable: true });
      expect(detectFileType({ path: 'script.js' })).toEqual({ type: 'text', isPreviewable: true });
      expect(detectFileType({ path: 'unknown', mimetype: 'text/plain' })).toEqual({ type: 'text', isPreviewable: true });
      expect(detectFileType({ path: 'unknown', mimetype: 'text/csv' })).toEqual({ type: 'text', isPreviewable: true });
      expect(isPreviewableType({ path: 'notes.txt' })).toBe(true);
    });

    it('identifies non-text files as other and not previewable', () => {
      expect(detectFileType({ path: 'image.png', mimetype: 'image/png' })).toEqual({ type: 'other', isPreviewable: false });
      expect(detectFileType({ path: 'file.pdf', mimetype: 'application/pdf' })).toEqual({ type: 'other', isPreviewable: false });
      expect(detectFileType({ path: 'binary.bin', mimetype: 'application/octet-stream' })).toEqual({ type: 'other', isPreviewable: false });
      expect(isPreviewableType({ path: 'image.png', mimetype: 'image/png' })).toBe(false);
    });
  });
});
