/**
 * perspective — localStorage fallback for saved explorer views.
 *
 * Used when the server does not expose ReactorSaveGraphPerspective;
 * useGraphData swaps to the server mutation transparently when its
 * capability probe finds it. Stores any number of perspectives per root
 * under one key, each with a local id, so the manager UI behaves the same.
 */

import { GraphPerspective } from '../types';

const STORAGE_PREFIX = 'reactory.graph-explorer.perspectives.';

const storageKey = (catalogNodeId: number | string | null): string =>
  `${STORAGE_PREFIX}${catalogNodeId ?? 'default'}`;

const read = (catalogNodeId: number | string | null): GraphPerspective[] => {
  try {
    const raw = window.localStorage.getItem(storageKey(catalogNodeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => p && Array.isArray(p.positions)) : [];
  } catch {
    return [];
  }
};

const write = (catalogNodeId: number | string | null, perspectives: GraphPerspective[]): boolean => {
  try {
    window.localStorage.setItem(storageKey(catalogNodeId), JSON.stringify(perspectives));
    return true;
  } catch {
    return false;
  }
};

const localId = (): string => `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const saveLocalPerspective = (perspective: GraphPerspective): GraphPerspective | null => {
  const list = read(perspective.catalogNodeId);
  const saved: GraphPerspective = {
    ...perspective,
    id: perspective.id ?? localId(),
    isOwner: true,
    updated: new Date().toISOString(),
  };
  const index = list.findIndex((p) => p.id === saved.id || (!perspective.id && p.name === saved.name));
  if (index >= 0) list[index] = { ...saved, id: list[index].id };
  else list.push(saved);
  if (saved.isDefault) {
    for (const p of list) if (p.id !== (index >= 0 ? list[index].id : saved.id)) p.isDefault = false;
  }
  return write(perspective.catalogNodeId, list) ? (index >= 0 ? list[index] : saved) : null;
};

export const listLocalPerspectives = (catalogNodeId: number | string | null): GraphPerspective[] => {
  if (catalogNodeId !== null) return read(catalogNodeId);
  // Unscoped: every root's perspectives.
  const all: GraphPerspective[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        all.push(...read(key.slice(STORAGE_PREFIX.length)));
      }
    }
  } catch {
    // storage unavailable
  }
  return all;
};

export const deleteLocalPerspective = (perspective: GraphPerspective): void => {
  const list = read(perspective.catalogNodeId).filter((p) => p.id !== perspective.id);
  write(perspective.catalogNodeId, list);
};
