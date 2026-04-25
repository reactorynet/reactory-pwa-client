import React from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  ConflictResolution,
  FileChangedEvent,
  FileConnectionState,
  FileExternalChangeEvent,
  FileSavePayload,
  FileSaveOverride,
  FileSavedResult,
  FileScope,
} from '../types';
import {
  FileOperationError,
  closeFileSession,
  openFileSession,
  readFile,
  writeFile,
} from './useFileContent';
import useFileSSE from './useFileSSE';
import { contentHash } from '../utils';

/**
 * Quill's code-block cannot represent a trailing empty line: on mount it
 * silently drops any trailing `\n` from the input text. We therefore compare
 * buffer content *ignoring trailing newlines* for dirty detection, and
 * restore the original trailing whitespace on save if the caller hasn't
 * otherwise edited the file.
 */
const stripTrailingNewlines = (s: string) => s.replace(/\n+$/, '');

/**
 * Session orchestrator: opens an SSE session, seeds the editor buffer, connects
 * the SSE transport, and exposes save/reload + conflict signals to the UI layer.
 *
 * Consumers are expected to be `<File />`; lower-level hooks (`useFileSSE`,
 * `useFileContent`) are usable directly for bespoke integrations.
 */

export interface UseFileSessionOptions {
  path: string;
  /** Defaults to 'server'. Use 'user' to address the caller's home folder. */
  scope?: FileScope;
  onExternalChange?: (
    event: FileExternalChangeEvent,
  ) => ConflictResolution | Promise<ConflictResolution>;
  onSave?: (payload: FileSavePayload) => FileSaveOverride | Promise<FileSaveOverride>;
  onSaved?: (result: FileSavedResult) => void;
  onSaveError?: (error: Error, payload: FileSavePayload) => void;
  onFileDeleted?: () => void;
}

export interface FileConflict {
  event: FileExternalChangeEvent;
  /** Resolve the conflict. Called by the banner UI. */
  resolve: (choice: 'keep-local' | 'take-remote') => Promise<void>;
}

export interface UseFileSessionResult {
  /** Editor buffer content. */
  content: string;
  setContent: (next: string) => void;
  /** True when buffer hash !== last-saved content hash. */
  dirty: boolean;
  /** Last revision seen from the server (read, saved, or SSE-pushed). */
  baseRevision: string | null;
  /** Stable sessionId once openFileSession resolves. */
  sessionId: string | null;
  connectionState: FileConnectionState;
  /** Non-null when the buffer is dirty AND an external change arrived. */
  conflict: FileConflict | null;
  /** If set, the component should render in read-only mode. */
  readOnlyReason: 'loading' | 'session-error' | 'permission-denied' | 'deleted' | null;
  /** Informative message for the read-only reason. */
  readOnlyMessage: string | null;
  loading: boolean;
  save: () => Promise<FileSavedResult | null>;
  reload: () => Promise<void>;
}

export default function useFileSession(
  options: UseFileSessionOptions,
): UseFileSessionResult {
  const reactory = useReactory();
  const {
    path,
    scope = 'server',
    onExternalChange,
    onSave,
    onSaved,
    onSaveError,
    onFileDeleted,
  } = options;

  const [content, setContentState] = React.useState<string>('');
  const [lastSavedHash, setLastSavedHash] = React.useState<string>('');
  const [baseRevision, setBaseRevision] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [connectionState, setConnectionState] = React.useState<FileConnectionState>('idle');
  const [conflict, setConflict] = React.useState<FileConflict | null>(null);
  const [readOnlyReason, setReadOnlyReason] =
    React.useState<UseFileSessionResult['readOnlyReason']>('loading');
  const [readOnlyMessage, setReadOnlyMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Refs used by the SSE callbacks + save flow so we don't stale-close.
  const contentRef = React.useRef(content);
  const lastSavedHashRef = React.useRef(lastSavedHash);
  const baseRevisionRef = React.useRef(baseRevision);
  const sessionIdRef = React.useRef<string | null>(null);
  // The canonical on-disk content from the last successful read/save. Lets us
  // restore trailing whitespace that Quill's code-block normalises away on
  // initial render, so dirty-state doesn't false-trigger and saves remain
  // byte-faithful.
  const lastSavedContentRef = React.useRef<string>('');
  contentRef.current = content;
  lastSavedHashRef.current = lastSavedHash;
  baseRevisionRef.current = baseRevision;
  sessionIdRef.current = sessionId;

  const onExternalChangeRef = React.useRef(onExternalChange);
  const onSaveRef = React.useRef(onSave);
  const onSavedRef = React.useRef(onSaved);
  const onSaveErrorRef = React.useRef(onSaveError);
  const onFileDeletedRef = React.useRef(onFileDeleted);
  onExternalChangeRef.current = onExternalChange;
  onSaveRef.current = onSave;
  onSavedRef.current = onSaved;
  onSaveErrorRef.current = onSaveError;
  onFileDeletedRef.current = onFileDeleted;

  const applyRemoteContent = React.useCallback(async (
    nextContent: string,
    revision: string,
  ) => {
    setContentState(nextContent);
    lastSavedContentRef.current = nextContent;
    const hash = await contentHash(stripTrailingNewlines(nextContent));
    setLastSavedHash(hash);
    setBaseRevision(revision);
  }, []);

  const fileSse = useFileSSE({
    reactory,
    onOpened: () => setConnectionState('connected'),
    onReconnecting: () => setConnectionState('reconnecting'),
    onReconnected: () => setConnectionState('connected'),
    onReconnectFailed: () => setConnectionState('offline'),
    onError: (err) => {
      if ('code' in err && err.code === 'TOKEN_EXPIRED') setConnectionState('expired');
    },
    onFileDeleted: () => {
      setReadOnlyReason('deleted');
      setReadOnlyMessage('File was deleted on the server.');
      onFileDeletedRef.current?.();
    },
    onFileChanged: async (evt: FileChangedEvent) => {
      // Fetch the latest content from the server — the SSE event carries the
      // revision but not the body (avoids blowing SSE frame size on big files).
      let latest;
      try {
        latest = await readFile(reactory, path, scope);
      } catch (err) {
        reactory.error?.('useFileSession: readFile after SSE failed', err);
        return;
      }

      const buffer = contentRef.current;
      const isDirty = (await contentHash(buffer)) !== lastSavedHashRef.current;

      if (!isDirty) {
        await applyRemoteContent(latest.content, latest.revision);
        return;
      }

      const externalEvent: FileExternalChangeEvent = {
        path,
        revision: evt.revision,
        source: 'sse',
        actor: evt.actor,
        summary: evt.summary,
      };

      const decision =
        (await onExternalChangeRef.current?.(externalEvent)) ?? { strategy: 'prompt' };

      if (decision.strategy === 'take-remote') {
        await applyRemoteContent(latest.content, latest.revision);
      } else if (decision.strategy === 'prompt') {
        setConflict({
          event: externalEvent,
          resolve: async (choice) => {
            if (choice === 'take-remote') {
              await applyRemoteContent(latest.content, latest.revision);
            } else {
              // keep-local — advance baseRevision so next save forces
              setBaseRevision(latest.revision);
            }
            setConflict(null);
          },
        });
      } else {
        // keep-local — advance so a subsequent save doesn't STALE_REVISION
        setBaseRevision(latest.revision);
      }
    },
  });

  // Session bootstrap: open session → read file → connect SSE.
  // Re-runs when `path` changes.
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReadOnlyReason('loading');
    setReadOnlyMessage(null);
    setConflict(null);
    setConnectionState('connecting');

    (async () => {
      try {
        const [session, file] = await Promise.all([
          openFileSession(reactory, path, scope),
          readFile(reactory, path, scope),
        ]);
        if (cancelled) return;

        setSessionId(session.sessionId);
        setContentState(file.content);
        lastSavedContentRef.current = file.content;
        const hash = await contentHash(stripTrailingNewlines(file.content));
        if (cancelled) return;
        setLastSavedHash(hash);
        setBaseRevision(file.revision);
        setReadOnlyReason(null);
        setReadOnlyMessage(null);

        fileSse.connect({
          endpoint: session.endpoint,
          sessionId: session.sessionId,
          token: session.token,
          expiry: new Date(session.expiry),
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof FileOperationError) {
          if (err.code === 'FILE_NOT_FOUND') {
            setReadOnlyReason('deleted');
            setReadOnlyMessage('File not found on the server.');
          } else if (err.code === 'ACCESS_DENIED') {
            setReadOnlyReason('permission-denied');
            setReadOnlyMessage(err.message);
          } else {
            setReadOnlyReason('session-error');
            setReadOnlyMessage(err.message);
          }
        } else {
          setReadOnlyReason('session-error');
          setReadOnlyMessage((err as Error)?.message ?? 'Failed to open file');
        }
        setConnectionState('offline');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      fileSse.disconnect();
      const sid = sessionIdRef.current;
      if (sid) {
        // Best-effort close — don't await.
        closeFileSession(reactory, sid).catch(() => { /* ignore */ });
      }
    };
    // fileSse is stable across renders (callback refs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, scope, reactory]);

  const setContent = React.useCallback((next: string) => {
    setContentState(next);
  }, []);

  const save = React.useCallback(async (): Promise<FileSavedResult | null> => {
    // If the editor buffer matches the last-saved content modulo trailing
    // newlines (Quill quirk), restore the original trailing whitespace so
    // round-tripping through the editor doesn't silently rewrite the file.
    const editorBuf = contentRef.current;
    const lastSaved = lastSavedContentRef.current;
    const faithful =
      stripTrailingNewlines(editorBuf) === stripTrailingNewlines(lastSaved)
        ? lastSaved
        : editorBuf;

    const payload: FileSavePayload = {
      path,
      content: faithful,
      sessionId: sessionIdRef.current ?? '',
      hash: await contentHash(faithful),
      baseRevision: baseRevisionRef.current ?? undefined,
    };

    let effectiveContent = payload.content;
    try {
      const override = await onSaveRef.current?.(payload);
      if (override === false || (override && typeof override === 'object' && 'cancel' in override && override.cancel)) {
        return null;
      }
      if (override && typeof override === 'object' && 'content' in override) {
        effectiveContent = override.content;
      }
    } catch (err) {
      onSaveErrorRef.current?.(err as Error, payload);
      throw err;
    }

    try {
      const result = await writeFile(reactory, {
        path,
        content: effectiveContent,
        baseRevision: payload.baseRevision,
        scope,
      });
      const saved: FileSavedResult = {
        path: result.path,
        revision: result.revision,
        savedAt: new Date(result.savedAt),
        bytesWritten: result.bytesWritten,
      };
      setContentState(effectiveContent);
      lastSavedContentRef.current = effectiveContent;
      const hash = await contentHash(stripTrailingNewlines(effectiveContent));
      setLastSavedHash(hash);
      setBaseRevision(result.revision);
      onSavedRef.current?.(saved);
      return saved;
    } catch (err) {
      onSaveErrorRef.current?.(err as Error, payload);
      throw err;
    }
  }, [path, scope, reactory]);

  const reload = React.useCallback(async () => {
    try {
      const file = await readFile(reactory, path, scope);
      await applyRemoteContent(file.content, file.revision);
    } catch (err) {
      reactory.error?.('useFileSession: reload failed', err);
    }
  }, [path, scope, reactory, applyRemoteContent]);

  // Dirty tracking is hash-based — cleared automatically when SSE content
  // replacement produces a hash equal to the last-saved hash. Trailing
  // newlines are ignored so a freshly-mounted buffer (which Quill strips
  // once on first render) doesn't appear dirty.
  const [dirty, setDirty] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    contentHash(stripTrailingNewlines(content)).then((h) => {
      if (!cancelled) setDirty(h !== lastSavedHash);
    });
    return () => { cancelled = true; };
  }, [content, lastSavedHash]);

  return {
    content,
    setContent,
    dirty,
    baseRevision,
    sessionId,
    connectionState,
    conflict,
    readOnlyReason,
    readOnlyMessage,
    loading,
    save,
    reload,
  };
}
