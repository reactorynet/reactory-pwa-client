/**
 * useGraphData — GraphQL access for the GraphExplorer.
 *
 * Mirrors the WorkflowDesigner useGraphQL pattern: typed inline queries via
 * reactory.graphqlQuery/graphqlMutation with a shared loading/error wrapper.
 *
 * A one-shot capability probe (schema introspection over Query field names)
 * gates the newer traversal API (ReactorSubgraph, ReactorNodes, perspective
 * persistence) so the component still works against servers that only expose
 * per-node children expansion — perspectives then fall back to localStorage.
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
import { mapEdges, mapNode, mapNodes, synthesizeContainment } from '../utils/graphMapping';
import {
  deleteLocalPerspective,
  loadLocalPerspective,
  saveLocalPerspective,
} from '../utils/perspective';

const NODE_FIELDS = `
  id
  index
  key
  name
  nameSpace
  version
  type
  description
  parentId
  providerId
  data
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

export interface GraphCapabilities {
  subgraphQuery: boolean;
  batchNodes: boolean;
  nodeLinks: boolean;
  savePerspective: boolean;
}

export interface SubgraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}

export interface UseGraphDataReturn {
  loading: boolean;
  error: string | null;
  capabilities: GraphCapabilities;
  capabilitiesResolved: boolean;
  getCatalogNodes(): Promise<GraphNode[]>;
  getNode(id: number, key?: string): Promise<GraphNode | null>;
  getChildren(id: number, key?: string, filter?: string): Promise<SubgraphResult>;
  getNeighborhood(
    rootId: number,
    depth?: number,
    opts?: { linkTypes?: GraphLinkType[]; nodeTypes?: GraphNodeType[]; limit?: number; materialize?: boolean }
  ): Promise<SubgraphResult>;
  getNodes(ids: number[]): Promise<GraphNode[]>;
  getDependencies(nodeId: number): Promise<SubgraphResult>;
  getDependents(nodeId: number): Promise<SubgraphResult>;
  /** Persisted edges whose BOTH endpoints are in `ids` (perspective restore). */
  getEdgesAmong(ids: number[]): Promise<GraphEdge[]>;
  searchByTerm(term: string): Promise<GraphNode[]>;
  searchByName(term: string, name: string, nameSpace: string): Promise<GraphNode[]>;
  createLink(input: { from: number; to: number; types: GraphLinkType[]; title?: string; description?: string }): Promise<GraphEdge | null>;
  updateLink(input: { from: number; to: number; types: GraphLinkType[]; title?: string; description?: string }): Promise<GraphEdge | null>;
  deleteLink(edgeId: string): Promise<boolean>;
  savePerspective(perspective: GraphPerspective): Promise<boolean>;
  listPerspectives(catalogNodeId: number | null): Promise<GraphPerspective[]>;
  loadPerspective(catalogNodeId: number | null): Promise<GraphPerspective | null>;
  deletePerspective(perspective: GraphPerspective): Promise<boolean>;
}

const DEFAULT_CAPABILITIES: GraphCapabilities = {
  subgraphQuery: false,
  batchNodes: false,
  nodeLinks: false,
  savePerspective: false,
};

export function useGraphData(): UseGraphDataReturn {
  const reactory = useReactory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<GraphCapabilities>(DEFAULT_CAPABILITIES);
  const [capabilitiesResolved, setCapabilitiesResolved] = useState(false);
  const capabilitiesRef = useRef(capabilities);
  capabilitiesRef.current = capabilities;

  const handleRequest = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      return await operation();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // One-shot capability probe.
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const response = await reactory.graphqlQuery<
          { __type: { fields: Array<{ name: string }> } | null },
          Record<string, never>
        >(`query GraphExplorerCapabilities { __type(name: "Query") { fields { name } } }`, {});
        const fields = new Set(
          (response.data?.__type?.fields ?? []).map((f) => f.name)
        );
        // Mutations share a probe via the perspective query's presence.
        if (!cancelled) {
          setCapabilities({
            subgraphQuery: fields.has('ReactorSubgraph'),
            batchNodes: fields.has('ReactorNodes'),
            nodeLinks: fields.has('ReactorNodeLinks'),
            savePerspective: fields.has('ReactorGraphPerspectives'),
          });
        }
      } catch (err) {
        reactory.log('GraphExplorer capability probe failed — using fallbacks', { err }, 'warn');
      } finally {
        if (!cancelled) setCapabilitiesResolved(true);
      }
    };
    probe();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCatalogNodes = useCallback(
    async () =>
      handleRequest(async () => {
        const query = `query ReactorCatalogNodes($paging: PagingRequest) {
          ReactorCatalogNodes(paging: $paging) {
            nodes { ${NODE_FIELDS} }
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, {
          paging: { page: 1, pageSize: 200 },
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
        const response = await reactory.graphqlQuery<any, any>(query, { ids });
        return mapNodes(response.data?.ReactorNodes ?? []);
      });
    },
    [reactory, handleRequest, getNode]
  );

  const getNeighborhood = useCallback(
    async (
      rootId: number,
      depth = 2,
      opts: { linkTypes?: GraphLinkType[]; nodeTypes?: GraphNodeType[]; limit?: number; materialize?: boolean } = {}
    ): Promise<SubgraphResult> => {
      if (!capabilitiesRef.current.subgraphQuery) {
        // Fallback: one level of children via the classic API.
        return getChildren(rootId);
      }
      return handleRequest(async () => {
        const query = `query ReactorSubgraph($rootId: Int!, $depth: Int, $nodeTypes: [ReactorNodeType!], $linkTypes: [ReactorLinkType!], $limit: Int, $materialize: Boolean) {
          ReactorSubgraph(rootId: $rootId, depth: $depth, nodeTypes: $nodeTypes, linkTypes: $linkTypes, limit: $limit, materialize: $materialize) {
            truncated
            nodes { ${NODE_FIELDS} }
            links { ${LINK_FIELDS} }
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, {
          rootId,
          depth,
          nodeTypes: opts.nodeTypes,
          linkTypes: opts.linkTypes,
          limit: opts.limit ?? 500,
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
        const edges: GraphEdge[] = related.map((node) => ({
          id: field === 'dependencies' ? `${nodeId}->${node.id}` : `${node.id}->${nodeId}`,
          source: field === 'dependencies' ? nodeId : node.id,
          target: field === 'dependencies' ? node.id : nodeId,
          types: ['DEPENDENCY'] as GraphLinkType[],
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
        const query = `query ReactorNodeLinks($sources: [Int!], $paging: PagingRequest) {
          ReactorNodeLinks(sources: $sources, paging: $paging) {
            links { ${LINK_FIELDS} }
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, {
          sources: ids.slice(0, 500),
          paging: { page: 1, pageSize: 1000 },
        });
        const idSet = new Set(ids);
        return mapEdges(response.data?.ReactorNodeLinks?.links ?? []).filter(
          (e) => idSet.has(e.source) && idSet.has(e.target)
        );
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

  const searchByName = useCallback(
    async (term: string, name: string, nameSpace: string) =>
      handleRequest(async () => {
        const query = `query ReactorNodesByNameAndNameSpace($name: String!, $nameSpace: String!, $term: String, $paging: PagingRequest) {
          ReactorNodesByNameAndNameSpace(name: $name, nameSpace: $nameSpace, term: $term, paging: $paging) {
            nodes { ${NODE_FIELDS} }
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, {
          name,
          nameSpace,
          term,
          paging: { page: 1, pageSize: 50 },
        });
        return mapNodes(response.data?.ReactorNodesByNameAndNameSpace?.nodes ?? []);
      }),
    [reactory, handleRequest]
  );

  const linkMutation = useCallback(
    async (
      mutationName: 'ReactorCreateNodeLink' | 'ReactorUpdateNodeLink',
      input: { from: number; to: number; types: GraphLinkType[]; title?: string; description?: string }
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
        const response = await reactory.graphqlMutation<any, any>(mutation, { input });
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
    (input: { from: number; to: number; types: GraphLinkType[]; title?: string; description?: string }) =>
      linkMutation('ReactorCreateNodeLink', input),
    [linkMutation]
  );
  const updateLink = useCallback(
    (input: { from: number; to: number; types: GraphLinkType[]; title?: string; description?: string }) =>
      linkMutation('ReactorUpdateNodeLink', input),
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
        const result = response.data?.ReactorDeleteNodeLink;
        if (result?.__typename === 'ReactorDeleteNodeLinkFailure') {
          throw new Error(result.error || 'Failed to delete link');
        }
        return true;
      }),
    [reactory, handleRequest]
  );

  const savePerspective = useCallback(
    async (perspective: GraphPerspective): Promise<boolean> => {
      if (!capabilitiesRef.current.savePerspective) {
        return saveLocalPerspective(perspective);
      }
      return handleRequest(async () => {
        const mutation = `mutation ReactorSaveGraphPerspective($perspective: ReactorGraphPerspectiveInput!) {
          ReactorSaveGraphPerspective(perspective: $perspective) { id name updated }
        }`;
        const response = await reactory.graphqlMutation<any, any>(mutation, {
          perspective: {
            id: perspective.id,
            name: perspective.name,
            projectId: perspective.projectId,
            rootNodeId: perspective.catalogNodeId ?? undefined,
            nodePositions: perspective.positions.map((p) => ({ nodeId: p.nodeId, x: p.x, y: p.y })),
            expandedKeys: perspective.expanded.map(String),
            viewport: {
              cameraX: perspective.viewport.panX,
              cameraY: perspective.viewport.panY,
              zoom: perspective.viewport.zoom,
            },
            share: perspective.share ?? false,
          },
        });
        // graphqlMutation does not throw on GraphQL errors — surface them so
        // the UI can show the actual cause instead of a silent false.
        const gqlErrors = (response as any).errors;
        if (gqlErrors?.length) {
          throw new Error(gqlErrors[0]?.message ?? 'Failed to save perspective');
        }
        return Boolean(response.data?.ReactorSaveGraphPerspective?.id);
      });
    },
    [reactory, handleRequest]
  );

  const listPerspectives = useCallback(
    async (catalogNodeId: number | null): Promise<GraphPerspective[]> => {
      if (!capabilitiesRef.current.savePerspective) {
        const local = loadLocalPerspective(catalogNodeId);
        return local ? [local] : [];
      }
      return handleRequest(async () => {
        const query = `query ReactorGraphPerspectives {
          ReactorGraphPerspectives {
            id
            name
            projectId
            rootNodeId
            nodePositions { nodeId x y }
            expandedKeys
            viewport { cameraX cameraY zoom }
            share
          }
        }`;
        const response = await reactory.graphqlQuery<any, any>(query, {});
        const perspectives: any[] = response.data?.ReactorGraphPerspectives ?? [];
        return perspectives
          .filter((p) => catalogNodeId === null || p.rootNodeId === catalogNodeId)
          .map((p) => ({
            id: p.id,
            name: p.name,
            catalogNodeId: p.rootNodeId ?? null,
            projectId: p.projectId ?? undefined,
            positions: (p.nodePositions ?? []).map((pos: any) => ({ nodeId: pos.nodeId, x: pos.x, y: pos.y })),
            expanded: (p.expandedKeys ?? []).map(Number).filter(Number.isFinite),
            viewport: {
              zoom: p.viewport?.zoom ?? 1,
              panX: p.viewport?.cameraX ?? 0,
              panY: p.viewport?.cameraY ?? 0,
            },
            share: p.share ?? false,
          }));
      });
    },
    [reactory, handleRequest]
  );

  const loadPerspective = useCallback(
    async (catalogNodeId: number | null): Promise<GraphPerspective | null> => {
      const perspectives = await listPerspectives(catalogNodeId);
      return perspectives[0] ?? null;
    },
    [listPerspectives]
  );

  const deletePerspective = useCallback(
    async (perspective: GraphPerspective): Promise<boolean> => {
      if (!capabilitiesRef.current.savePerspective || !perspective.id) {
        deleteLocalPerspective(perspective.catalogNodeId);
        return true;
      }
      return handleRequest(async () => {
        const mutation = `mutation ReactorDeleteGraphPerspective($id: String!) {
          ReactorDeleteGraphPerspective(id: $id)
        }`;
        const response = await reactory.graphqlMutation<any, any>(mutation, { id: perspective.id });
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
    searchByTerm,
    searchByName,
    createLink,
    updateLink,
    deleteLink,
    savePerspective,
    listPerspectives,
    loadPerspective,
    deletePerspective,
  };
}
