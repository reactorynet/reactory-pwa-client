import Reactory from '@reactorynet/reactory-core';
import ReactoryReadFile from '../graphql/queries/ReactoryReadFile.graphql';
import ReactoryWriteFile from '../graphql/mutations/ReactoryWriteFile.graphql';
import ReactoryOpenFileSession from '../graphql/mutations/ReactoryOpenFileSession.graphql';
import ReactoryCloseFileSession from '../graphql/mutations/ReactoryCloseFileSession.graphql';
import {
  FileContentResult,
  FileErrorResult,
  FileScope,
  FileSessionResult,
  FileSessionCloseSuccessResult,
  FileWriteSuccessResult,
  isFileError,
} from '../types';

/**
 * Thin GraphQL wrapper for the <File /> component. Each call resolves to the
 * success typename or throws a `FileOperationError` carrying the server's
 * typed error code (STALE_REVISION, FILE_TOO_LARGE, ACCESS_DENIED, etc.).
 */

export class FileOperationError extends Error {
  code: string;
  details?: string;
  currentRevision?: string;
  maxBytes?: number;
  constructor(err: FileErrorResult) {
    super(err.message);
    this.name = 'FileOperationError';
    this.code = err.code;
    this.details = err.details;
    this.currentRevision = err.currentRevision;
    this.maxBytes = err.maxBytes;
  }
}

const unwrap = <T extends { __typename: string }>(
  result: T | FileErrorResult,
): T => {
  if (isFileError(result)) throw new FileOperationError(result);
  return result;
};

export interface WriteFileInput {
  path: string;
  content: string;
  baseRevision?: string;
  force?: boolean;
  scope?: FileScope;
}

export const readFile = async (
  reactory: Reactory.Client.ReactorySDK,
  path: string,
  scope: FileScope = 'server',
): Promise<FileContentResult> => {
  const { data } = await reactory.graphqlQuery<
    { ReactoryReadFile: FileContentResult | FileErrorResult },
    { path: string; scope: FileScope }
  >(ReactoryReadFile, { path, scope });
  return unwrap(data.ReactoryReadFile);
};

export const writeFile = async (
  reactory: Reactory.Client.ReactorySDK,
  input: WriteFileInput,
): Promise<FileWriteSuccessResult> => {
  const { data } = await reactory.graphqlMutation<
    { ReactoryWriteFile: FileWriteSuccessResult | FileErrorResult },
    { input: WriteFileInput }
  >(ReactoryWriteFile, { input: { scope: 'server', ...input } });
  if (!data) throw new FileOperationError({
    __typename: 'ReactoryFileError', code: 'NO_RESPONSE', message: 'No data from server',
  });
  return unwrap(data.ReactoryWriteFile);
};

export const openFileSession = async (
  reactory: Reactory.Client.ReactorySDK,
  path: string,
  scope: FileScope = 'server',
): Promise<FileSessionResult> => {
  const { data } = await reactory.graphqlMutation<
    { ReactoryOpenFileSession: FileSessionResult | FileErrorResult },
    { path: string; scope: FileScope }
  >(ReactoryOpenFileSession, { path, scope });
  if (!data) throw new FileOperationError({
    __typename: 'ReactoryFileError', code: 'NO_RESPONSE', message: 'No data from server',
  });
  return unwrap(data.ReactoryOpenFileSession);
};

export const closeFileSession = async (
  reactory: Reactory.Client.ReactorySDK,
  sessionId: string,
): Promise<FileSessionCloseSuccessResult> => {
  const { data } = await reactory.graphqlMutation<
    { ReactoryCloseFileSession: FileSessionCloseSuccessResult | FileErrorResult },
    { sessionId: string }
  >(ReactoryCloseFileSession, { sessionId });
  if (!data) throw new FileOperationError({
    __typename: 'ReactoryFileError', code: 'NO_RESPONSE', message: 'No data from server',
  });
  return unwrap(data.ReactoryCloseFileSession);
};
