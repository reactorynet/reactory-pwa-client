/**
 * useGraphData — GraphQL access for the GraphExplorer (both renderers).
 *
 * Typed inline queries via reactory.graphqlQuery/graphqlMutation with a
 * shared loading/error wrapper. Every mutation checks `response.errors`
 * (graphqlMutation does not throw on GraphQL errors) so failures surface to
 * the UI as real messages rather than silent no-ops.
 *
 * A one-shot capability probe gates the traversal/persistence API so the
 * component still works against servers that only expose per-node children
 * expansion — perspectives then fall back to localStorage.
 *
 * The probe asks the system graph about its own fields (a validated
 * field-presence document, see CAPABILITY_PROBE_QUERY). It deliberately does
 * not introspect the GraphQL schema: `__type`/`__schema` is a different
 * capability, served only in development by the express graph middleware
 * (`introspection: NODE_ENV === 'development'`), so an introspection probe is
 * answered with HTTP 400 in production and surfaces as an error on mount.
 * Validation of the real graph fields, by contrast, is always performed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  GraphEdge,
  GraphLinkType,
  GraphNode,
  GraphNodeType,
  GraphPerspective,
} from '../types';
import {
  mapEdges,
  mapNode,
  mapNodes,
  mapPerspective,
  synthesizeContainment,
  toPerspectiveInput,
} from '../utils/graphMapping';
import {
  deleteLocalPerspective,
  listLocalPerspectives,
  saveLocalPerspective,
} from '../utils/perspective';

const NODE_FIELDS = `
  id
  key
  name
  nameSpace
  version
  type
  description
  parentId
  providerId
  data
  attributes { key value }
`;

const LINK_FIELDS = `
  id
  sourceId
  targetId
  types
  title
  description
  data
`;

const PERSPECTIVE_FIELDS = `
  id
  name
  owner
  isOwner
  projectId
  rootNodeId
  nodePositions { nodeId x y z }
  expandedKeys
  hiddenNodeIds
  filters { nodeTypes linkTypes }
  layout
  viewMode
  depth
  viewport { cameraX cameraY cameraZ targetX targetY targetZ zoom }
  share
  isDefault
  updated
`;

export interface GraphCapabilities {
  subgraphQuery: boolean;
  batchNodes: boolean;
  nodeLinks: boolean;
  savePerspective: boolean;
  graphPath: boolean;
}

export interface SubgraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}

export interface LinkInput {
  from: number;
  to: number;
  types: GraphLinkType[];
  title?: string;
  description?: string;
}

export interface NeighborhoodOptions {
  linkTypes?: GraphLinkType[];
  nodeTypes?: GraphNodeType[];
  limit?: number;
  materialize?: boolean;
  direction?: 'IN' | 'OUT' | 'BOTH';
  includeContainment?: boolean;
}

export interface UseGraphDataReturn {
  loading: boolean;
  error: string | null;
  capabilities: GraphCapabilities;
  capabilitiesResolved: boolean;
  getCatalogNodes(): Promise<GraphNode[]>;
  getNode(id: number, key?: string): Promise<GraphNode | null>;
  getChildren(id: number, key?: string, filter?: string): Promise<SubgraphResult>;
  getNeighborhood(rootId: number, depth?: number, opts?: NeighborhoodOptions): Promise<SubgraphResult>;
  getNodes(ids: number[]): Promise<GraphNode[]>;
  getDependencies(nodeId: number): Promise<SubgraphResult>;
  getDependents(nodeId: number): Promise<SubgraphResult>;
  /** Persisted edges whose BOTH endpoints are in `ids` (perspective restore). */
  getEdgesAmong(ids: number[]): Promise<GraphEdge[]>;
  /** Bounded shortest path between two nodes (server BFS). */
  findPath(sourceId: number, targetId: number, maxDepth?: number): Promise<SubgraphResult & { found: boolean }>;
  searchByTerm(term: string): Promise<GraphNode[]>;
  /** Graph root node id for a project (ObjectId / fqn / name). */
  getProjectRootNodeId(projectId: string): Promise<number | null>;
  /** Graph node representing a chat conversation. */
  getConversationNode(conversationId: string): Promise<GraphNode | null>;
  createLink(input: LinkInput): Promise<GraphEdge | null>;
  updateLink(input: LinkInput): Promise<GraphEdge | null>;
  deleteLink(edgeId: string): Promise<boolean>;
  updateNodeData(nodeId: number, data: Record<string, unknown>): Promise<GraphNode | null>;
  savePerspective(perspective: GraphPerspective): Promise<GraphPerspective | null>;
  duplicatePerspective(perspective: GraphPerspective, name: string): Promise<GraphPerspective | null>;
  listPerspectives(scope: { catalogNodeId?: number | null; projectId?: string }): Promise<GraphPerspective[]>;
  getPerspective(id: string): Promise<GraphPerspective | null>;
  deletePerspective(perspective: GraphPerspective): Promise<boolean>;
}

const DEFAULT_CAPABILITIES: GraphCapabilities = {
  subgraphQuery: false,
  batchNodes: false,
  nodeLinks: false,
  savePerspective: false,
  graphPath: false,
};

const FULL_CAPABILITIES: GraphCapabilities = {
  subgraphQuery: true,
  batchNodes: true,
  nodeLinks: true,
  savePerspective: true,
  graphPath: true,
};

/**
 * Capability probe document.
 *
 * Every selection is gated behind `@include(if: false)`: validation still
 * type-checks the field and its arguments — which is the signal we want — but
 * the field is dropped before execution, so a valid probe runs no resolvers
 * and costs one empty round trip. Fields the server does not define come back
 * as `GRAPHQL_VALIDATION_FAILED` errors naming the offending field.
 */
const CAPABILITY_PROBE_QUERY = `query GraphExplorerCapabilities {
  ReactorSubgraph(rootId: 0, limit: 1) @include(if: false) { truncated }
  ReactorNodes(ids: [0]) @include(if: false) { id }
  ReactorNodeLinks @include(if: false) { paging { hasNext } }
  ReactorGraphPath(sourceId: 0, targetId: 0) @include(if: false) { found }
  ReactorGraphPerspectives @include(if: false) { id }
}`;

/** The Query field each capability is gated on — mirrors the probe above. */
const CAPABILITY_FIELDS: Array<[keyof GraphCapabilities, string]> = [
  ['subgraphQuery', 'ReactorSubgraph'],
  ['batchNodes', 'ReactorNodes'],
  ['nodeLinks', 'ReactorNodeLinks'],
  ['graphPath', 'ReactorGraphPath'],
  ['savePerspective', 'ReactorGraphPerspectives'],
];

const CANNOT_QUERY_FIELD = /Cannot query field "([^"]+)"/;
const UNKNOWN_FIELD_NAMES = /Cannot query field "([^"]+)"/g;

/**
 * `Query` field names the server reported as unknown.
 *
 * Accepts every shape the failure can take: a resolved result carrying
 * `errors` (the client's default `errorPolicy: 'all'`), or a thrown
 * ApolloError — an unknown field is a validation error, which Apollo Server
 * answers with HTTP 400, so it arrives on `networkError.result.errors`.
 */
const missingQueryFields = (value: any): Set<string> => {
  const errors: any[] = [
    ...(Array.isArray(value?.errors) ? value.errors : []),
    ...(Array.isArray(value?.graphQLErrors) ? value.graphQLErrors : []),
    ...(Array.isArray(value?.networkError?.result?.errors) ? value.networkError.result.errors : []),
  ];
  const missing = new Set<string>();
  for (const error of errors) {
    const message = typeof error?.message === 'string' ? error.message : '';
    const isUnknownField =
      error?.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' || CANNOT_QUERY_FIELD.test(message);
    if (!message || !isUnknownField) continue;
    UNKNOWN_FIELD_NAMES.lastIndex = 0;
    let match = UNKNOWN_FIELD_NAMES.exec(message);
    while (match) {
      missing.add(match[1]);
      match = UNKNOWN_FIELD_NAMES.exec(message);
    }
  }
  return missing;
};

/** Everything the probe did not report as unknown is present. */
const capabilitiesFromMissingFields = (missing: Set<string>): GraphCapabilities => {
  const capabilities: GraphCapabilities = { ...FULL_CAPABILITIES };
  for (const [capability, field] of CAPABILITY_FIELDS) {
    if (missing.has(field)) capabilities[capability] = false;
  }
  return capabilities;
};

/** graphqlQuery/graphqlMutation resolve with `errors` instead of throwing. */
const assertNoErrors = (response: any, fallback: string): void => {
  const errors = response?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(errors[0]?.message ?? fallback);
  }
};

export function useGraphData(): UseGraphDataReturn {
  const reactory = useReactory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<GraphCapabilities>(DEFAULT_CAPABILITIES);
  const [capabilitiesResolved, setCapabilitiesResolved] = useState(false);
  const capabilitiesRef = useRef(capabilities);
  capabilitiesRef.current = capabilities;
  // Concurrent requests share one flag; count them so the first completion
  // does not clear `loading` while others are still in flight.
  const inFlightRef = useRef(0);

  const handleRequest = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    inFlightRef.current += 1;
    setLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      throw err;
    } finally {
      inFlightRef.current -= 1;
      if (inFlightRef.current <= 0) {
        inFlightRef.current = 0;
        setLoading(false);
      }
    }
  }, []);

  // One-shot capability probe — against the graph API, never the schema
  // (see CAPABILITY_PROBE_QUERY for why introspection is the wrong tool).
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      let resolved: GraphCapabilities = FULL_CAPABILITIES;
      try {
        const response = await reactory.graphqlQuery<any, any>(CAPABILITY_PROBE_QUERY, {});
        const missing = missingQueryFields(response);
        if (missing.size > 0) {
          resolved = capabilitiesFromMissingFields(missing);
          reactory.log(
            'GraphExplorer: server is missing graph traversal fields — using compatibility paths',
            { missing: Array.from(missing) },
            'warn'
          );
        }
      } catch (err) {
        const missing = missingQueryFields(err);
        if (missing.size > 0) {
          resolved = capabilitiesFromMissingFields(missing);
          reactory.log(
            'GraphExplorer: server is missing graph traversal fields — using compatibility paths',
            { missing: Array.from(missing) },
            'warn'
          );
        } else {
          // A transport, auth or server fault says nothing about which graph
          // fields exist — assume the full surface rather than silently
          // degrading to localStorage perspectives.
          reactory.log('GraphExplorer capability probe failed — assuming full API', { err }, 'warn');
        }
      }
      if (cancelled) return;
      setCapabilities(resolved);
      setCapabilitiesResolved(true);
    };
    probe();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Reads -----------------------------------------------------------------

  const getCatalogNodes = useCallback(
    async () =>
      handleRequest(async () => {
        const query = `query ReactorCatalogNodes($paging: PagingRequest) {
          ReactorCatalogNodes(paging: $paging) {
            nodes { ${NODE_FIELDS} }
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, {
          paging: { page: 1, pageSize: 500 },
        });
        return mapNodes(response.data?.ReactorCatalogNodes?.nodes ?? []);
      }),
    [reactory, handleRequest]
  );

  const getNode = useCallback(
    async (id: number, key?: string) =>
      handleRequest(async () => {
        const query = `query ReactorNode($id: Int!, $key: String) {
          ReactorNode(id: $id, key: $key) { ${NODE_FIELDS} }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, { id, key });
        return mapNode(response.data?.ReactorNode);
      }),
    [reactory, handleRequest]
  );

  const getChildren = useCallback(
    async (id: number, key?: string, filter?: string) =>
      handleRequest(async () => {
        const query = `query ReactorNodeChildren($id: Int!, $key: String, $filter: String) {
          ReactorNode(id: $id, key: $key) {
            ${NODE_FIELDS}
            children(filter: $filter) { ${NODE_FIELDS} }
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, { id, key, filter });
        const parentRaw = response.data?.ReactorNode;
        const parent = mapNode(parentRaw);
        const children = mapNodes(parentRaw?.children ?? []);
        const nodes = parent ? [parent, ...children] : children;
        return {
          nodes,
          edges: synthesizeContainment(nodes),
          truncated: false,
        };
      }),
    [reactory, handleRequest]
  );

  const getNodes = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return [];
      if (!capabilitiesRef.current.batchNodes) {
        // Fallback: resolve individually (bounded — callers keep lists small).
        const nodes = await Promise.all(ids.slice(0, 50).map((id) => getNode(id).catch(() => null)));
        return nodes.filter((n): n is GraphNode => n !== null);
      }
      return handleRequest(async () => {
        const query = `query ReactorNodes($ids: [Int!]!) {
          ReactorNodes(ids: $ids) { ${NODE_FIELDS} }
        }`;
        // Server caps a batch at 500.
        const batches: number[][] = [];
        for (let i = 0; i < ids.length; i += 500) batches.push(ids.slice(i, i + 500));
        const results = await Promise.all(
          batches.map((batch) => reactory.graphqlQuery<any, any>(query, { ids: batch }))
        );
        return mapNodes(results.flatMap((r) => r.data?.ReactorNodes ?? []));
      });
    },
    [reactory, handleRequest, getNode]
  );

  const getNeighborhood = useCallback(
    async (rootId: number, depth = 1, opts: NeighborhoodOptions = {}): Promise<SubgraphResult> => {
      if (!capabilitiesRef.current.subgraphQuery) {
        // Fallback: one level of children via the classic API.
        return getChildren(rootId);
      }
      return handleRequest(async () => {
        const query = `query ReactorSubgraph($rootId: Int!, $depth: Int, $direction: ReactorLinkDirection, $nodeTypes: [ReactorNodeType!], $linkTypes: [ReactorLinkType!], $limit: Int, $includeContainment: Boolean, $materialize: Boolean) {
          ReactorSubgraph(rootId: $rootId, depth: $depth, direction: $direction, nodeTypes: $nodeTypes, linkTypes: $linkTypes, limit: $limit, includeContainment: $includeContainment, materialize: $materialize) {
            truncated
            nodes { ${NODE_FIELDS} }
            links { ${LINK_FIELDS} }
          }
        }`;
        const clean = <T extends string>(values?: T[]) =>
          values?.filter((v) => v !== 'UNKNOWN') as T[] | undefined;
        const response = await reactory.graphqlQuery<any, any>(query, {
          rootId,
          depth: Math.min(Math.max(depth, 1), 5),
          direction: opts.direction ?? 'BOTH',
          nodeTypes: clean(opts.nodeTypes),
          linkTypes: clean(opts.linkTypes),
          limit: opts.limit ?? 500,
          includeContainment: opts.includeContainment ?? true,
          materialize: opts.materialize ?? true,
        });
        const subgraph = response.data?.ReactorSubgraph;
        const nodes = mapNodes(subgraph?.nodes ?? []);
        const edges = mapEdges(subgraph?.links ?? []);
        return {
          nodes,
          edges: [...edges, ...synthesizeContainment(nodes, edges)],
          truncated: subgraph?.truncated === true,
        };
      });
    },
    [reactory, handleRequest, getChildren]
  );

  const relatedNodes = useCallback(
    async (nodeId: number, field: 'dependencies' | 'dependents'): Promise<SubgraphResult> =>
      handleRequest(async () => {
        const query = `query ReactorNodeRelated($id: Int!) {
          ReactorNode(id: $id) {
            ${NODE_FIELDS}
            ${field} { ${NODE_FIELDS} }
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, { id: nodeId });
        const parentRaw = response.data?.ReactorNode;
        const related = mapNodes(parentRaw?.[field] ?? []);
        // Derived edges — the server does not return the link rows here, so
        // these are view-only and must never be sent to the delete mutation.
        const edges: GraphEdge[] = related.map((node) => ({
          id: field === 'dependencies' ? `${nodeId}->${node.id}` : `${node.id}->${nodeId}`,
          source: field === 'dependencies' ? nodeId : node.id,
          target: field === 'dependencies' ? node.id : nodeId,
          types: ['DEPENDENCY'] as GraphLinkType[],
          synthetic: true,
        }));
        const parent = mapNode(parentRaw);
        return { nodes: parent ? [parent, ...related] : related, edges, truncated: false };
      }),
    [reactory, handleRequest]
  );

  const getDependencies = useCallback(
    (nodeId: number) => relatedNodes(nodeId, 'dependencies'),
    [relatedNodes]
  );
  const getDependents = useCallback(
    (nodeId: number) => relatedNodes(nodeId, 'dependents'),
    [relatedNodes]
  );

  const getEdgesAmong = useCallback(
    async (ids: number[]): Promise<GraphEdge[]> => {
      if (ids.length === 0 || !capabilitiesRef.current.nodeLinks) return [];
      return handleRequest(async () => {
        const query = `query ReactorNodeLinks($sources: [Int!], $targets: [Int!], $paging: PagingRequest) {
          ReactorNodeLinks(sources: $sources, targets: $targets, paging: $paging) {
            links { ${LINK_FIELDS} }
            paging { hasNext }
          }
        }`;
        const idSet = new Set(ids);
        const sources = ids.slice(0, 500);
        const collected: GraphEdge[] = [];
        let page = 1;
        let hasNext = true;
        while (hasNext && page <= 10) {
          const response = await reactory.graphqlQuery<any, any>(query, {
            sources,
            targets: sources,
            paging: { page, pageSize: 500 },
          });
          const result = response.data?.ReactorNodeLinks;
          collected.push(...mapEdges(result?.links ?? []));
          hasNext = result?.paging?.hasNext === true && (result?.links?.length ?? 0) > 0;
          page += 1;
        }
        return collected.filter((e) => idSet.has(e.source) && idSet.has(e.target));
      });
    },
    [reactory, handleRequest]
  );

  const findPath = useCallback(
    async (sourceId: number, targetId: number, maxDepth = 6) => {
      if (!capabilitiesRef.current.graphPath) {
        return { nodes: [], edges: [], truncated: false, found: false };
      }
      return handleRequest(async () => {
        const query = `query ReactorGraphPath($sourceId: Int!, $targetId: Int!, $maxDepth: Int) {
          ReactorGraphPath(sourceId: $sourceId, targetId: $targetId, maxDepth: $maxDepth) {
            found
            nodes { ${NODE_FIELDS} }
            links { ${LINK_FIELDS} }
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, {
          sourceId,
          targetId,
          maxDepth: Math.min(Math.max(maxDepth, 1), 10),
        });
        const path = response.data?.ReactorGraphPath;
        const nodes = mapNodes(path?.nodes ?? []);
        const edges = mapEdges(path?.links ?? []);
        return { nodes, edges, truncated: false, found: path?.found === true };
      });
    },
    [reactory, handleRequest]
  );

  const searchByTerm = useCallback(
    async (term: string) =>
      handleRequest(async () => {
        const query = `query ReactorNodesByTerm($term: String!) {
          ReactorNodesByTerm(term: $term) { ${NODE_FIELDS} }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, { term });
        return mapNodes(response.data?.ReactorNodesByTerm ?? []).slice(0, 100);
      }),
    [reactory, handleRequest]
  );

  const getProjectRootNodeId = useCallback(
    async (projectId: string): Promise<number | null> =>
      handleRequest(async () => {
        const query = `query ReactorProjectGraphRoot($id: String!) {
          ReactorProject(id: $id) { id graphNodeId }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, { id: projectId });
        const id = response.data?.ReactorProject?.graphNodeId;
        return typeof id === 'number' && Number.isFinite(id) ? id : null;
      }),
    [reactory, handleRequest]
  );

  const getConversationNode = useCallback(
    async (conversationId: string): Promise<GraphNode | null> =>
      handleRequest(async () => {
        const query = `query ReactorConversationNode($conversationId: String!) {
          ReactorConversationNode(conversationId: $conversationId) { ${NODE_FIELDS} }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, { conversationId });
        return mapNode(response.data?.ReactorConversationNode);
      }),
    [reactory, handleRequest]
  );

  // -- Mutations -------------------------------------------------------------

  const linkMutation = useCallback(
    async (
      mutationName: 'ReactorCreateNodeLink' | 'ReactorUpdateNodeLink',
      input: LinkInput
    ): Promise<GraphEdge | null> =>
      handleRequest(async () => {
        const successType =
          mutationName === 'ReactorCreateNodeLink'
            ? 'ReactorCreateNodeLinkSuccess'
            : 'ReactorNodeLinkUpdateSuccess';
        const failureType =
          mutationName === 'ReactorCreateNodeLink'
            ? 'ReactorCreateNodeLinkFailure'
            : 'ReactorNodeLinkUpdateFailure';
        const mutation = `mutation ${mutationName}($input: ReactoryNodeLinkInput!) {
          ${mutationName}(input: $input) {
            __typename
            ... on ${successType} { link { ${LINK_FIELDS} } message }
            ... on ${failureType} { error }
          }
        }`;
        const response = await reactory.graphqlMutation<any, any>(mutation, {
          input: { ...input, types: input.types.filter((t) => t !== 'UNKNOWN') },
        });
        assertNoErrors(response, 'Link mutation failed');
        const result = response.data?.[mutationName];
        if (result?.__typename === failureType) {
          throw new Error(result.error || 'Link mutation failed');
        }
        const [edge] = mapEdges(result?.link ? [result.link] : []);
        return edge ?? null;
      }),
    [reactory, handleRequest]
  );

  const createLink = useCallback(
    (input: LinkInput) => linkMutation('ReactorCreateNodeLink', input),
    [linkMutation]
  );
  const updateLink = useCallback(
    (input: LinkInput) => linkMutation('ReactorUpdateNodeLink', input),
    [linkMutation]
  );

  const deleteLink = useCallback(
    async (edgeId: string) =>
      handleRequest(async () => {
        const id = Number(edgeId);
        if (!Number.isFinite(id)) return false; // synthetic edges are local-only
        const mutation = `mutation ReactorDeleteNodeLink($id: Int!) {
          ReactorDeleteNodeLink(id: $id) {
            __typename
            ... on ReactorDeleteNodeLinkSuccess { id message }
            ... on ReactorDeleteNodeLinkFailure { error }
          }
        }`;
        const response = await reactory.graphqlMutation<any, any>(mutation, { id });
        assertNoErrors(response, 'Failed to delete link');
        const result = response.data?.ReactorDeleteNodeLink;
        if (result?.__typename === 'ReactorDeleteNodeLinkFailure') {
          throw new Error(result.error || 'Failed to delete link');
        }
        return true;
      }),
    [reactory, handleRequest]
  );

  const updateNodeData = useCallback(
    async (nodeId: number, data: Record<string, unknown>) =>
      handleRequest(async () => {
        const mutation = `mutation ReactorUpdateNode($id: Int!, $data: Any!) {
          ReactorUpdateNode(id: $id, data: $data) { ${NODE_FIELDS} }
        }`;
        const response = await reactory.graphqlMutation<any, any>(mutation, { id: nodeId, data });
        assertNoErrors(response, 'Failed to update node');
        return mapNode(response.data?.ReactorUpdateNode);
      }),
    [reactory, handleRequest]
  );

  // -- Perspectives ----------------------------------------------------------

  const savePerspective = useCallback(
    async (perspective: GraphPerspective): Promise<GraphPerspective | null> => {
      if (!capabilitiesRef.current.savePerspective) {
        return saveLocalPerspective(perspective);
      }
      return handleRequest(async () => {
        const mutation = `mutation ReactorSaveGraphPerspective($perspective: ReactorGraphPerspectiveInput!) {
          ReactorSaveGraphPerspective(perspective: $perspective) { ${PERSPECTIVE_FIELDS} }
        }`;
        const response = await reactory.graphqlMutation<any, any>(mutation, {
          perspective: toPerspectiveInput(perspective),
        });
        assertNoErrors(response, 'Failed to save perspective');
        return mapPerspective(response.data?.ReactorSaveGraphPerspective);
      });
    },
    [reactory, handleRequest]
  );

  const duplicatePerspective = useCallback(
    async (perspective: GraphPerspective, name: string): Promise<GraphPerspective | null> => {
      if (!capabilitiesRef.current.savePerspective || !perspective.id) {
        return saveLocalPerspective({ ...perspective, id: undefined, name, isOwner: true, share: false, isDefault: false });
      }
      return handleRequest(async () => {
        const mutation = `mutation ReactorDuplicateGraphPerspective($id: String!, $name: String!) {
          ReactorDuplicateGraphPerspective(id: $id, name: $name) { ${PERSPECTIVE_FIELDS} }
        }`;
        const response = await reactory.graphqlMutation<any, any>(mutation, { id: perspective.id, name });
        assertNoErrors(response, 'Failed to duplicate perspective');
        return mapPerspective(response.data?.ReactorDuplicateGraphPerspective);
      });
    },
    [reactory, handleRequest]
  );

  const listPerspectives = useCallback(
    async (scope: { catalogNodeId?: number | null; projectId?: string }): Promise<GraphPerspective[]> => {
      if (!capabilitiesRef.current.savePerspective) {
        return listLocalPerspectives(scope.catalogNodeId ?? null);
      }
      return handleRequest(async () => {
        const query = `query ReactorGraphPerspectives($projectId: String, $rootNodeId: Int, $paging: PagingRequest) {
          ReactorGraphPerspectives(projectId: $projectId, rootNodeId: $rootNodeId, paging: $paging) { ${PERSPECTIVE_FIELDS} }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, {
          projectId: scope.projectId,
          rootNodeId: scope.catalogNodeId ?? undefined,
          paging: { page: 1, pageSize: 200 },
        });
        assertNoErrors(response, 'Failed to list perspectives');
        return (response.data?.ReactorGraphPerspectives ?? [])
          .map(mapPerspective)
          .filter((p: GraphPerspective | null): p is GraphPerspective => p !== null);
      });
    },
    [reactory, handleRequest]
  );

  const getPerspective = useCallback(
    async (id: string): Promise<GraphPerspective | null> => {
      if (!capabilitiesRef.current.savePerspective) {
        return listLocalPerspectives(null).find((p) => p.id === id) ?? null;
      }
      return handleRequest(async () => {
        const query = `query ReactorGraphPerspective($id: String!) {
          ReactorGraphPerspective(id: $id) { ${PERSPECTIVE_FIELDS} }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, { id });
        assertNoErrors(response, 'Failed to load perspective');
        return mapPerspective(response.data?.ReactorGraphPerspective);
      });
    },
    [reactory, handleRequest]
  );

  const deletePerspective = useCallback(
    async (perspective: GraphPerspective): Promise<boolean> => {
      if (!capabilitiesRef.current.savePerspective) {
        deleteLocalPerspective(perspective);
        return true;
      }
      if (!perspective.id) return false;
      return handleRequest(async () => {
        const mutation = `mutation ReactorDeleteGraphPerspective($id: String!) {
          ReactorDeleteGraphPerspective(id: $id)
        }`;
        const response = await reactory.graphqlMutation<any, any>(mutation, { id: perspective.id });
        assertNoErrors(response, 'Failed to delete perspective');
        return response.data?.ReactorDeleteGraphPerspective === true;
      });
    },
    [reactory, handleRequest]
  );

  return {
    loading,
    error,
    capabilities,
    capabilitiesResolved,
    getCatalogNodes,
    getNode,
    getChildren,
    getNeighborhood,
    getNodes,
    getDependencies,
    getDependents,
    getEdgesAmong,
    findPath,
    searchByTerm,
    getProjectRootNodeId,
    getConversationNode,
    createLink,
    updateLink,
    deleteLink,
    updateNodeData,
    savePerspective,
    duplicatePerspective,
    listPerspectives,
    getPerspective,
    deletePerspective,
  };
}
