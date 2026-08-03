/**
 * graphMapping — the single seam between the GraphQL wire shape and the
 * GraphExplorer model.
 *
 * Normalizes edge endpoints to numeric ids whether the server returns raw
 * ints (sourceId/targetId), nested node objects (source/target), or the
 * legacy malformed mix the old D3 widget suffered from; synthesizes CONTAINS
 * edges from parentId when the server sends only nodes.
 */

import { GraphEdge, GraphLinkType, GraphNode, GraphNodeType } from '../types';

const NODE_TYPES: GraphNodeType[] = [
  'INPUT', 'OUTPUT', 'PROCESS', 'SYSTEM', 'DATASTORE', 'CHILD', 'CONNECTION',
  'DEPENDENCY', 'CONTAINER', 'CLOUD', 'CONSUMER', 'CONFIG', 'FOLDER', 'FILE',
  'FUNCTION', 'ENDPOINT',
];

const LINK_TYPES: GraphLinkType[] = [
  'INPUT', 'OUTPUT', 'DEPENDENCY', 'CONNECTION', 'INFERRED', 'DIRECT', 'CALL',
  'INHERITS', 'IMPLEMENTS', 'REFERENCE', 'SYMLINK', 'CONTAINS',
];

/** Node types that can expand into children in the lazy tree. */
const EXPANDABLE_TYPES = new Set<GraphNodeType>(['SYSTEM', 'FOLDER', 'FILE', 'DATASTORE', 'CONTAINER']);

export const toNodeType = (value: unknown): GraphNodeType => {
  const type = String(value ?? '').toUpperCase() as GraphNodeType;
  return NODE_TYPES.includes(type) ? type : 'UNKNOWN';
};

export const toLinkType = (value: unknown): GraphLinkType => {
  const type = String(value ?? '').toUpperCase() as GraphLinkType;
  return LINK_TYPES.includes(type) ? type : 'UNKNOWN';
};

/**
 * Normalizes an edge endpoint that may be a raw id, a stringified id, or a
 * nested node object ({ id }). Returns null when unresolvable.
 */
export const toEndpointId = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'object') {
    return toEndpointId((value as { id?: unknown }).id);
  }
  return null;
};

/** Attribute array [{key, value}] -> record; tolerates missing/object input. */
const toAttributeRecord = (attributes: unknown): Record<string, unknown> | undefined => {
  if (!attributes) return undefined;
  if (Array.isArray(attributes)) {
    const record: Record<string, unknown> = {};
    for (const attr of attributes) {
      if (attr && typeof attr === 'object' && 'key' in attr) {
        record[String((attr as { key: unknown }).key)] = (attr as { value?: unknown }).value;
      }
    }
    return record;
  }
  if (typeof attributes === 'object') return attributes as Record<string, unknown>;
  return undefined;
};

export const mapNode = (raw: any): GraphNode | null => {
  const id = toEndpointId(raw?.id);
  if (id === null) return null;
  const type = toNodeType(raw?.type);
  const data = raw?.data && typeof raw.data === 'object' ? raw.data : undefined;
  const noExpand = data?.noExpand === true;
  const childCount = Array.isArray(raw?.children) && raw.children.length > 0 ? raw.children.length : null;
  return {
    id,
    key: typeof raw?.key === 'string' && raw.key.length > 0 ? raw.key : `${id}`,
    parentId: toEndpointId(raw?.parentId),
    type,
    name: String(raw?.name ?? `#${id}`),
    nameSpace: raw?.nameSpace ?? undefined,
    version: raw?.version ?? undefined,
    description: raw?.description ?? undefined,
    providerId: raw?.providerId ?? undefined,
    attributes: toAttributeRecord(raw?.attributes),
    data,
    hasChildren: !noExpand && EXPANDABLE_TYPES.has(type),
    childCount,
  };
};

export const mapNodes = (raw: any[]): GraphNode[] =>
  (raw ?? []).map(mapNode).filter((n): n is GraphNode => n !== null);

export const mapEdge = (raw: any): GraphEdge | null => {
  // Prefer the scalar id fields; fall back to (possibly nested) endpoints.
  const source = toEndpointId(raw?.sourceId ?? raw?.source);
  const target = toEndpointId(raw?.targetId ?? raw?.target);
  if (source === null || target === null) return null;
  const types = Array.isArray(raw?.types) && raw.types.length > 0
    ? raw.types.map(toLinkType)
    : raw?.type
      ? [toLinkType(raw.type)]
      : (['UNKNOWN'] as GraphLinkType[]);
  return {
    id: raw?.id !== undefined && raw?.id !== null ? String(raw.id) : `${source}->${target}`,
    source,
    target,
    types,
    title: raw?.title ?? undefined,
    description: raw?.description ?? undefined,
    projectId: raw?.projectId ?? undefined,
    data: raw?.data && typeof raw.data === 'object' ? raw.data : undefined,
    synthetic: types.length === 1 && types[0] === 'CONTAINS' ? true : undefined,
  };
};

export const mapEdges = (raw: any[]): GraphEdge[] =>
  (raw ?? []).map(mapEdge).filter((e): e is GraphEdge => e !== null);

/**
 * Synthesizes CONTAINS edges from parentId for nodes whose parent is present,
 * skipping pairs already connected by a CONTAINS edge.
 */
export const synthesizeContainment = (
  nodes: GraphNode[],
  existingEdges: GraphEdge[] = []
): GraphEdge[] => {
  const present = new Set(nodes.map((n) => n.id));
  const covered = new Set(
    existingEdges
      .filter((e) => e.types.includes('CONTAINS'))
      .map((e) => `${e.source}->${e.target}`)
  );
  const synthesized: GraphEdge[] = [];
  for (const node of nodes) {
    if (node.parentId === null || !present.has(node.parentId)) continue;
    const key = `${node.parentId}->${node.id}`;
    if (covered.has(key)) continue;
    covered.add(key);
    synthesized.push({
      id: key,
      source: node.parentId,
      target: node.id,
      types: ['CONTAINS'],
      title: 'contains',
      synthetic: true,
    });
  }
  return synthesized;
};
