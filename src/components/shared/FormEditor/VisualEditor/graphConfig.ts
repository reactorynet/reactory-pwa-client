/**
 * Pure helpers + constants for the GraphQL graph-definition editor.
 *
 * Models Reactory's IFormGraphDefinition and its graph elements
 * (IReactoryFormQuery / IReactoryFormMutation) for a visual editor:
 *   IFormGraphDefinition = { query, queries{}, mutation{new,edit,delete,...}, clientResolvers }
 *
 * `variables` / `resultMap` / `dataMap` are ObjectMaps ({ sourceKey: targetKey }).
 * The value can also be a transform object; those are edited via a raw-JSON toggle
 * in the UI, while simple string maps use the visual row editor.
 */

export const ACTION_HANDLER_TYPES = [
  'redirect',
  'notification',
  'function',
  'refresh',
  'none',
  'component',
  'event',
];

export const MERGE_STRATEGIES = ['merge', 'replace', 'function', 'none'];

export const FETCH_POLICIES = [
  'cache-first',
  'cache-and-network',
  'network-only',
  'cache-only',
  'no-cache',
  'standby',
];

export const RESULT_TYPES = ['object', 'array', 'string', 'number', 'date'];

export const NOTIFICATION_TYPES = ['success', 'info', 'warning', 'danger'];

export const MUTATION_HANDLED_BY = ['onChange', 'onSubmit'];

/** The reserved / conventional mutation keys, in display order. */
export const STANDARD_MUTATION_KEYS = ['new', 'edit', 'delete'];

// ── ObjectMap <-> rows ───────────────────────────────────────────────────────

export interface MapRow {
  source: string;
  target: string;
}

/** True when every value in the map is a plain string (safe for the row editor). */
export const isSimpleObjectMap = (map: any): boolean => {
  if (!map || typeof map !== 'object') return true;
  return Object.values(map).every((v) => typeof v === 'string');
};

export const objectMapToRows = (map: any): MapRow[] => {
  if (!map || typeof map !== 'object') return [];
  return Object.entries(map)
    .filter(([, v]) => typeof v === 'string')
    .map(([source, target]) => ({ source, target: target as string }));
};

export const rowsToObjectMap = (rows: MapRow[]): Record<string, string> => {
  const out: Record<string, string> = {};
  rows.forEach((r) => {
    if (r.source) out[r.source] = r.target;
  });
  return out;
};

// ── Pruning ──────────────────────────────────────────────────────────────────

/**
 * Recursively drop "empty" values (undefined, null, '', {}, []) so the saved
 * graph config stays tidy. Booleans (incl. false) and numbers (incl. 0) are
 * preserved because they can be meaningful (e.g. throttle: 0, useWebsocket:false).
 */
export const pruneEmpty = (value: any): any => {
  if (Array.isArray(value)) {
    const arr = value.map(pruneEmpty).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    Object.keys(value).forEach((k) => {
      const pv = pruneEmpty(value[k]);
      if (pv !== undefined) out[k] = pv;
    });
    return Object.keys(out).length ? out : undefined;
  }
  if (value === '' || value === null) return undefined;
  return value;
};

/** Prune a graph element but always keep it a valid object with name + text. */
export const cleanGraphElement = (element: any): any => {
  const pruned = pruneEmpty(element) || {};
  return {
    name: element?.name || '',
    text: element?.text || '',
    ...pruned,
  };
};

// ── Factories ────────────────────────────────────────────────────────────────

export const emptyQuery = (name = 'query'): any => ({ name, text: '' });
export const emptyMutation = (name = 'mutation'): any => ({ name, text: '' });
export const emptyEvent = (): any => ({ name: '' });
export const emptyNotification = (): any => ({ title: '', type: 'info' });
