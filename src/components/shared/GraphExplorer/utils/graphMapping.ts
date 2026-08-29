/**
 * graphMapping — the single seam between the GraphQL wire shape and the
 * GraphExplorer model.
 *
 * Normalizes edge endpoints to numeric ids whether the server returns raw
 * ints (sourceId/targetId), nested node objects (source/target), or the
 * legacy malformed mix the old D3 widget suffered from; synthesizes CONTAINS
 * edges from parentId when the server sends only nodes; maps perspectives in
 * both directions; and normalizes host overlays (chat agent graphs).
 */

import {
  ALL_LINK_TYPES,
  ALL_NODE_TYPES,
  GraphCameraState,
  GraphEdge,
  GraphLayoutKind,
  GraphLinkType,
  GraphNode,
  GraphNodeType,
  GraphOverlay,
  GraphPerspective,
  GraphViewMode,
} from '../types';

const NODE_TYPES = new Set<GraphNodeType>(ALL_NODE_TYPES.filter((t) => t !== 'UNKNOWN'));
const LINK_TYPES = new Set<GraphLinkType>(ALL_LINK_TYPES.filter((t) => t !== 'UNKNOWN'));
const LAYOUTS: GraphLayoutKind[] = ['radial', 'force', 'hierarchical'];

/**
 * Node types that can expand into children in the lazy tree. DOCUMENT expands
 * into its sections; SECTION/TOPIC/RESOURCE are leaves.
 */
const EXPANDABLE_TYPES = new Set<GraphNodeType>([
  'SYSTEM', 'FOLDER', 'FILE', 'DOCUMENT', 'DATASTORE', 'CONTAINER',
]);

export const toNodeType = (value: unknown): GraphNodeType => {
  const type = String(value ?? '').toUpperCase() as GraphNodeType;
  return NODE_TYPES.has(type) ? type : 'UNKNOWN';
};

export const toLinkType = (value: unknown): GraphLinkType => {
  const type = String(value ?? '').toUpperCase() as GraphLinkType;
  return LINK_TYPES.has(type) ? type : 'UNKNOWN';
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
  // `id` (ID!) and `index`/`nodeId` (Int) carry the same deterministic hash;
  // prefer the numeric fields when present so string ids never mis-parse.
  const id = toEndpointId(raw?.index ?? raw?.nodeId ?? raw?.id);
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
    origin: 'graph',
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
    // Server-synthesized CONTAINS edges carry real ids but are not rows.
    synthetic: types.length === 1 && types[0] === 'CONTAINS' ? true : undefined,
    origin: 'graph',
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
      origin: node.origin,
    });
  }
  return synthesized;
};

// ============================================================================
// Overlays (host-injected fragments, e.g. the chat agent's touched nodes)
// ============================================================================

export const mapOverlay = (overlay: GraphOverlay | null | undefined): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  if (!overlay) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [];
  for (const raw of overlay.nodes ?? []) {
    const mapped = mapNode(raw);
    if (mapped) nodes.push({ ...mapped, origin: 'overlay' });
  }
  const edges: GraphEdge[] = [];
  for (const raw of overlay.edges ?? []) {
    const mapped = mapEdge({ sourceId: raw.source, targetId: raw.target, types: raw.types ?? ['CONNECTION'] });
    if (mapped) edges.push({ ...mapped, origin: 'overlay', synthetic: true });
  }
  return { nodes, edges: [...edges, ...synthesizeContainment(nodes, edges)] };
};

// ============================================================================
// Perspectives
// ============================================================================

export const DEFAULT_CAMERA: GraphCameraState = { target: { x: 0, y: 0, z: 0 }, zoom: 1 };

const toViewMode = (value: unknown): GraphViewMode =>
  value === 'THREE_D' || value === '3d' ? '3d' : '2d';

const toLayout = (value: unknown): GraphLayoutKind =>
  LAYOUTS.includes(value as GraphLayoutKind) ? (value as GraphLayoutKind) : 'radial';

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const mapPerspective = (raw: any): GraphPerspective | null => {
  if (!raw || typeof raw !== 'object' || !raw.name) return null;
  const viewport = raw.viewport ?? {};
  const hasCamera = [viewport.cameraX, viewport.cameraY, viewport.cameraZ].some(
    (v: unknown) => typeof v === 'number'
  );
  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : undefined,
    name: String(raw.name),
    owner: raw.owner !== undefined && raw.owner !== null ? String(raw.owner) : undefined,
    isOwner: raw.isOwner !== false,
    catalogNodeId: toEndpointId(raw.rootNodeId ?? raw.catalogNodeId),
    projectId: raw.projectId ?? undefined,
    positions: (raw.nodePositions ?? raw.positions ?? [])
      .map((p: any) => {
        const nodeId = toEndpointId(p?.nodeId);
        if (nodeId === null) return null;
        const position: { nodeId: number; x: number; y: number; z?: number } = {
          nodeId,
          x: finite(p.x, 0),
          y: finite(p.y, 0),
        };
        if (typeof p.z === 'number' && Number.isFinite(p.z)) position.z = p.z;
        return position;
      })
      .filter(Boolean),
    expanded: (raw.expandedKeys ?? raw.expanded ?? [])
      .map((v: unknown) => Number(v))
      .filter((v: number) => Number.isFinite(v)),
    hiddenNodeIds: (raw.hiddenNodeIds ?? []).map(Number).filter(Number.isFinite),
    filters: {
      nodeTypes: Array.isArray(raw.filters?.nodeTypes) && raw.filters.nodeTypes.length > 0
        ? raw.filters.nodeTypes.map(toNodeType)
        : null,
      linkTypes: Array.isArray(raw.filters?.linkTypes) && raw.filters.linkTypes.length > 0
        ? raw.filters.linkTypes.map(toLinkType)
        : null,
    },
    layout: toLayout(raw.layout),
    viewMode: toViewMode(raw.viewMode),
    depth: Math.min(Math.max(Math.round(finite(raw.depth, 1)), 1), 5),
    viewport: {
      target: {
        x: finite(viewport.targetX, 0),
        y: finite(viewport.targetY, 0),
        z: finite(viewport.targetZ, 0),
      },
      camera: hasCamera
        ? { x: finite(viewport.cameraX, 0), y: finite(viewport.cameraY, 0), z: finite(viewport.cameraZ, 0) }
        : undefined,
      zoom: finite(viewport.zoom, 1),
    },
    share: raw.share === true,
    isDefault: raw.isDefault === true,
    updated: raw.updated ? String(raw.updated) : undefined,
  };
};

/** GraphPerspective -> ReactorGraphPerspectiveInput (wire shape). */
export const toPerspectiveInput = (perspective: GraphPerspective): Record<string, unknown> => ({
  id: perspective.id,
  name: perspective.name,
  projectId: perspective.projectId,
  rootNodeId: perspective.catalogNodeId ?? undefined,
  nodePositions: perspective.positions.map((p) =>
    p.z !== undefined ? { nodeId: p.nodeId, x: p.x, y: p.y, z: p.z } : { nodeId: p.nodeId, x: p.x, y: p.y }
  ),
  expandedKeys: perspective.expanded.map(String),
  hiddenNodeIds: perspective.hiddenNodeIds,
  filters: {
    nodeTypes: perspective.filters.nodeTypes?.filter((t) => t !== 'UNKNOWN') ?? null,
    linkTypes: perspective.filters.linkTypes?.filter((t) => t !== 'UNKNOWN') ?? null,
  },
  layout: perspective.layout,
  viewMode: perspective.viewMode === '3d' ? 'THREE_D' : 'TWO_D',
  depth: perspective.depth,
  viewport: {
    targetX: perspective.viewport.target.x,
    targetY: perspective.viewport.target.y,
    targetZ: perspective.viewport.target.z,
    cameraX: perspective.viewport.camera?.x,
    cameraY: perspective.viewport.camera?.y,
    cameraZ: perspective.viewport.camera?.z,
    zoom: perspective.viewport.zoom,
  },
  share: perspective.share,
  isDefault: perspective.isDefault,
});
