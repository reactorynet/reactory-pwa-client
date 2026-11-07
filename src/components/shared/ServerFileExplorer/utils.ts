import { ServerFolderItem } from './types';

/**
 * Builds the `ServerFolderItem` that represents the folder currently being
 * browsed, so a consumer can persist it without re-reading the directory.
 *
 * `fullPath` is copied verbatim from the path the resolver produced. That is
 * deliberate: the `ReactoryServerFiles` resolver is the only party that knows
 * how a server path maps to a filesystem path, and joining here would repeat
 * the very mistake this component exists to remove.
 */
export const folderItemFromPath = (path: string): ServerFolderItem => {
  const raw = typeof path === 'string' ? path : '';
  // Strip trailing separators but keep '/' intact.
  const normalised = raw.replace(/\/+$/, '') || '/';
  const segments = normalised.split('/').filter(Boolean);
  const name = segments.length > 0 ? segments[segments.length - 1] : '/';

  return {
    name,
    // `path` is the relative name, matching what the resolver returns for a
    // directory entry (`dirent.name`).
    path: name,
    type: 'folder',
    fullPath: raw,
  };
};

export default folderItemFromPath;
