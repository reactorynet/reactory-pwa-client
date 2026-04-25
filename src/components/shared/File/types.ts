/**
 * Public types for the `<File />` component.
 * See SPEC.md §4 for the authoritative contract.
 */

export type FileFormat =
  | 'yaml'
  | 'json'
  | 'javascript'
  | 'typescript'
  | 'markdown'
  | 'text'
  | 'code';

/**
 * File operation scope.
 * - `server`: rooted at the server's APP_DATA_ROOT. Requires ADMIN/DEVELOPER.
 * - `user`: rooted at the caller's home folder. Requires only authentication.
 */
export type FileScope = 'server' | 'user';

export interface FileSavePayload {
  path: string;
  content: string;
  sessionId: string;
  hash: string;
  baseRevision?: string;
}

export type FileSaveOverride =
  | boolean
  | void
  | { cancel: true }
  | { content: string };

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
  | { strategy: 'prompt' };

export type FileConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'expired';

export interface FileProps {
  path: string;
  /** Defaults to `server`. Use `user` to edit files in the caller's home folder. */
  scope?: FileScope;
  format?: FileFormat;
  readOnly?: boolean;
  height?: string;
  onSave?: (payload: FileSavePayload) => FileSaveOverride | Promise<FileSaveOverride>;
  onSaved?: (result: FileSavedResult) => void;
  onSaveError?: (error: Error, payload: FileSavePayload) => void;
  onExternalChange?: (
    event: FileExternalChangeEvent,
  ) => ConflictResolution | Promise<ConflictResolution>;
  onChange?: (content: string, meta: { dirty: boolean }) => void;
  value?: string;
  changeDebounceMs?: number;
}

export interface FileHandle {
  save(): Promise<FileSavedResult | null>;
  reload(): Promise<void>;
  getContent(): string;
  isDirty(): boolean;
  focus(): void;
}

// ─── SSE event shapes (mirror server `FileSseEvent` in FileSSETransportManager.ts) ──

export interface FileOpenedEvent {
  type: 'opened';
  sessionId: string;
  revision: string;
  timestamp: string;
}

export interface FileChangedEvent {
  type: 'file_changed';
  sessionId: string;
  revision: string;
  summary: { bytesBefore: number; bytesAfter: number };
  actor?: { userId?: string; clientId?: string };
  timestamp: string;
}

export interface FileDeletedEvent {
  type: 'file_deleted';
  sessionId: string;
  timestamp: string;
}

export interface FileErrorEvent {
  type: 'error';
  sessionId: string;
  code: string;
  message: string;
  timestamp: string;
}

export type AnyFileSseEvent =
  | FileOpenedEvent
  | FileChangedEvent
  | FileDeletedEvent
  | FileErrorEvent;

// ─── GraphQL result shapes ─────────────────────────────────────────────────

export interface FileContentResult {
  __typename: 'ReactoryFileContent';
  path: string;
  content: string;
  mimetype: string;
  revision: string;
  bytes: number;
  modified: string;
}

export interface FileSessionResult {
  __typename: 'ReactoryFileSession';
  sessionId: string;
  endpoint: string;
  token: string;
  expiry: string;
  currentRevision: string;
}

export interface FileWriteSuccessResult {
  __typename: 'ReactoryFileWriteSuccess';
  path: string;
  revision: string;
  savedAt: string;
  bytesWritten: number;
}

export interface FileSessionCloseSuccessResult {
  __typename: 'ReactoryFileSessionCloseSuccess';
  sessionId: string;
}

export interface FileErrorResult {
  __typename: 'ReactoryFileError';
  code: string;
  message: string;
  details?: string;
  currentRevision?: string;
  maxBytes?: number;
}

/** Runtime-type-narrowing helper. */
export const isFileError = (
  r: { __typename?: string } | null | undefined,
): r is FileErrorResult => r?.__typename === 'ReactoryFileError';
