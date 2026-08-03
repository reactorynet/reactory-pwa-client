/**
 * perspective — localStorage fallback for saved explorer views.
 *
 * Used when the server does not (yet) expose ReactorSaveGraphPerspective;
 * useGraphData swaps to the server mutation transparently when its
 * capability probe finds it.
 */

import { GraphPerspective } from '../types';

const STORAGE_PREFIX = 'reactory.graph-explorer.perspective.';

const storageKey = (catalogNodeId: number | string | null): string =>
  `${STORAGE_PREFIX}${catalogNodeId ?? 'default'}`;

export const saveLocalPerspective = (perspective: GraphPerspective): boolean => {
  try {
    window.localStorage.setItem(
      storageKey(perspective.catalogNodeId),
      JSON.stringify(perspective)
    );
    return true;
  } catch {
    return false;
  }
};

export const loadLocalPerspective = (
  catalogNodeId: number | string | null
): GraphPerspective | null => {
  try {
    const raw = window.localStorage.getItem(storageKey(catalogNodeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GraphPerspective;
    if (!Array.isArray(parsed.positions)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const deleteLocalPerspective = (catalogNodeId: number | string | null): void => {
  try {
    window.localStorage.removeItem(storageKey(catalogNodeId));
  } catch {
    // storage unavailable — nothing to delete
  }
};
