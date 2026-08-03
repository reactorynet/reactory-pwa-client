/**
 * GraphExplorer — first-class three.js explorer for the Reactor system graph.
 *
 * Replaces the D3-based reactor.ReactorGraphExplorerWidget form widget:
 * WebGL-instanced node/edge rendering (thousands of nodes), lazy expansion of
 * the cataloged tree, edge traversal (dependencies/dependents/symlinks),
 * search-jump with ancestry hydration, edge CRUD and saved perspectives.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Divider, Drawer, Snackbar } from '@mui/material';
import { useReactory } from '@reactory/client-core/api';
import { GraphExplorerProps, GraphLinkType, GraphNode, GraphPerspective } from './types';
import { useGraphExplorer } from './hooks/useGraphExplorer';
import { useGraphWebGLCanvas } from './hooks/useGraphWebGLCanvas';
import {
  BreadcrumbBar,
  CatalogPicker,
  EdgeEditorDialog,
  FilterPanel,
  GraphToolbar,
  InspectorPanel,
  LoadPerspectiveDialog,
  SavePerspectiveDialog,
  SearchPanel,
} from './components/Panels';
import { BOARD_BACKGROUND } from './constants';

const boardCss = `#${BOARD_BACKGROUND.toString(16).padStart(6, '0')}`;

const LEFT_PANEL_WIDTH = 280;
const RIGHT_PANEL_WIDTH = 320;

export default function GraphExplorer(props: GraphExplorerProps) {
  const { catalogNodeId, nodeKey, readOnly = false, height = '100%', onNodeSelect } = props;
  const reactory = useReactory();

  const explorer = useGraphExplorer();
  const { store, data } = explorer;
  const { state, dispatch, positions, visibleNodes, visibleEdges } = store;

  const [catalogs, setCatalogs] = useState<GraphNode[]>([]);
  const [leftOpen, setLeftOpen] = useState(true);
  const [edgeDialog, setEdgeDialog] = useState<{ from: GraphNode | null; to: GraphNode | null }>({
    from: null,
    to: null,
  });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialog, setLoadDialog] = useState<{
    open: boolean;
    loading: boolean;
    perspectives: GraphPerspective[];
  }>({ open: false, loading: false, perspectives: [] });
  const [notice, setNotice] = useState<string | null>(null);

  const selectedNode = useMemo(() => {
    const first = Array.from(state.selection.nodeIds)[0];
    return first !== undefined ? state.nodes.get(first) ?? null : null;
  }, [state.selection.nodeIds, state.nodes]);

  const selectedNodeEdges = useMemo(() => {
    if (!selectedNode) return [];
    const edgeIds = state.adjacency.get(selectedNode.id);
    if (!edgeIds) return [];
    return Array.from(edgeIds, (id) => state.edges.get(id)).filter(
      (e): e is NonNullable<typeof e> => e !== undefined
    );
  }, [selectedNode, state.adjacency, state.edges]);

  // -- Canvas ------------------------------------------------------------------

  const canvas = useGraphWebGLCanvas({
    nodes: visibleNodes,
    edges: visibleEdges,
    positions,
    animator: store.animator,
    selection: state.selection,
    focusNodeId: state.focusNodeId,
    expanded: state.expanded,
    events: {
      onNodeClick: (nodeId, event) => {
        // Edge-creation mode: clicking a second node completes the edge.
        if (edgeDialog.from && !edgeDialog.to) {
          const target = state.nodes.get(nodeId);
          if (target && target.id !== edgeDialog.from.id) {
            setEdgeDialog((current) => ({ ...current, to: target }));
            canvas.setEdgePreview(null);
            return;
          }
        }
        dispatch({
          type: 'SET_SELECTION',
          nodeIds: [nodeId],
          additive: event.modifiers.shift || event.modifiers.meta,
        });
      },
      onNodeDoubleClick: (nodeId) => {
        const node = state.nodes.get(nodeId);
        if (node) void explorer.toggleNode(node);
      },
      onNodeContextMenu: (nodeId) => {
        const node = state.nodes.get(nodeId);
        if (node) void explorer.showRelated(node, 'dependencies');
      },
      onNodeDrag: (nodeId, _position, phase) => {
        if (phase === 'end') {
          dispatch({ type: 'PIN_NODES', nodeIds: [nodeId] });
          // If the dropped node has children on canvas, they follow via a
          // force-directed animation around the new position.
          explorer.realignChildren(nodeId);
        }
      },
      onEdgeClick: (edgeId) => dispatch({ type: 'SET_SELECTION', edgeIds: [edgeId] }),
      onCanvasClick: () => {
        if (edgeDialog.from && !edgeDialog.to) {
          setEdgeDialog({ from: null, to: null });
          canvas.setEdgePreview(null);
          return;
        }
        dispatch({ type: 'SET_SELECTION', nodeIds: [], edgeIds: [] });
        dispatch({ type: 'SET_FOCUS', nodeId: null });
      },
      onMarqueeSelect: (bounds) => {
        const hit = visibleNodes
          .filter((node) => {
            const p = positions.get(node.id);
            return (
              p &&
              p.x >= bounds.x &&
              p.x <= bounds.x + bounds.width &&
              p.y >= bounds.y &&
              p.y <= bounds.y + bounds.height
            );
          })
          .map((node) => node.id);
        dispatch({ type: 'SET_SELECTION', nodeIds: hit });
      },
    },
  });

  // -- Bootstrapping -------------------------------------------------------------

  useEffect(() => {
    if (!data.capabilitiesResolved) return;
    let cancelled = false;
    data
      .getCatalogNodes()
      .then((nodes) => {
        if (!cancelled) setCatalogs(nodes);
      })
      .catch((err) => reactory.log('GraphExplorer: failed to load catalogs', { err }, 'error'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.capabilitiesResolved]);

  const openCatalog = useCallback(
    async (node: GraphNode) => {
      try {
        await explorer.loadRoot(node.id, node.key);
        const perspective = await explorer.restorePerspective(node.id);
        if (perspective) {
          canvas.setViewport({
            ...canvas.viewport,
            zoom: perspective.viewport.zoom,
            panX: perspective.viewport.panX,
            panY: perspective.viewport.panY,
          });
        } else {
          canvas.fitToContent();
        }
      } catch (err) {
        reactory.log('GraphExplorer: failed to open catalog', { err }, 'error');
        setNotice('Failed to open project graph');
      }
    },
    [explorer, canvas, reactory]
  );

  useEffect(() => {
    if (!data.capabilitiesResolved || catalogNodeId === undefined || catalogNodeId === null) return;
    const id = Number(catalogNodeId);
    if (!Number.isFinite(id)) return;
    void openCatalog({ id, key: nodeKey ?? `${id}` } as GraphNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.capabilitiesResolved, catalogNodeId]);

  useEffect(() => {
    onNodeSelect?.(selectedNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  // -- Actions ---------------------------------------------------------------------

  const handleSearch = useCallback((term: string) => data.searchByTerm(term), [data]);

  const handleSearchResult = useCallback(
    async (node: GraphNode) => {
      const resolved = await explorer.jumpToSearchResult(node);
      const position = resolved ? positions.get(resolved.id) : undefined;
      if (position) canvas.focusOn(position);
    },
    [explorer, canvas, positions]
  );

  const handleCrumbClick = useCallback(
    (node: GraphNode) => {
      dispatch({ type: 'SET_SELECTION', nodeIds: [node.id] });
      const position = positions.get(node.id);
      if (position) canvas.focusOn(position);
    },
    [dispatch, positions, canvas]
  );

  const handleSavePerspective = useCallback(
    async (name: string) => {
      setSaveDialogOpen(false);
      try {
        const saved = await explorer.saveCurrentPerspective(name, {
          zoom: canvas.viewport.zoom,
          panX: canvas.viewport.panX,
          panY: canvas.viewport.panY,
        });
        setNotice(saved ? `Perspective "${name}" saved` : 'Failed to save perspective');
      } catch (err) {
        // Surface the real cause (auth, validation, schema) — not a generic
        // failure — so server-side problems are diagnosable from the UI.
        const message = err instanceof Error ? err.message : 'Failed to save perspective';
        reactory.log('GraphExplorer: perspective save failed', { err }, 'error');
        setNotice(`Save failed: ${message}`);
      }
    },
    [explorer, canvas.viewport, reactory]
  );

  const openLoadDialog = useCallback(async () => {
    setLoadDialog({ open: true, loading: true, perspectives: [] });
    try {
      const perspectives = await explorer.listPerspectives(state.rootId);
      setLoadDialog({ open: true, loading: false, perspectives });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list perspectives';
      reactory.log('GraphExplorer: perspective list failed', { err }, 'error');
      setLoadDialog({ open: false, loading: false, perspectives: [] });
      setNotice(`Load failed: ${message}`);
    }
  }, [explorer, state.rootId, reactory]);

  const handleLoadPerspective = useCallback(
    async (perspective: GraphPerspective) => {
      setLoadDialog((d) => ({ ...d, open: false }));
      try {
        await explorer.applyPerspective(perspective);
        canvas.setViewport({
          ...canvas.viewport,
          zoom: perspective.viewport.zoom,
          panX: perspective.viewport.panX,
          panY: perspective.viewport.panY,
        });
        setNotice(`Perspective "${perspective.name}" loaded`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load perspective';
        reactory.log('GraphExplorer: perspective load failed', { err }, 'error');
        setNotice(`Load failed: ${message}`);
      }
    },
    [explorer, canvas, reactory]
  );

  const handleDeletePerspective = useCallback(
    async (perspective: GraphPerspective) => {
      try {
        await explorer.deletePerspective(perspective);
        setLoadDialog((d) => ({
          ...d,
          perspectives: d.perspectives.filter((p) => p !== perspective),
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete perspective';
        setNotice(`Delete failed: ${message}`);
      }
    },
    [explorer]
  );

  const handleRemoveFromView = useCallback(
    (nodeIds: number[]) => {
      if (nodeIds.length === 0) return;
      explorer.removeNodes(nodeIds);
    },
    [explorer]
  );

  // Delete/Backspace removes the selected nodes from the canvas (view only).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      // Never hijack typing in inputs/dialogs.
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      const selected = Array.from(state.selection.nodeIds);
      if (selected.length > 0) {
        e.preventDefault();
        handleRemoveFromView(selected);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.selection.nodeIds, handleRemoveFromView]);

  const handleConfirmEdge = useCallback(
    async (types: GraphLinkType[], title?: string) => {
      const { from, to } = edgeDialog;
      setEdgeDialog({ from: null, to: null });
      if (!from || !to) return;
      try {
        await explorer.createEdge(from.id, to.id, types, title);
        setNotice('Edge created');
      } catch (err) {
        reactory.log('GraphExplorer: edge creation failed', { err }, 'error');
        setNotice('Failed to create edge');
      }
    },
    [edgeDialog, explorer, reactory]
  );

  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      try {
        await explorer.deleteEdge(edgeId);
        setNotice('Edge deleted');
      } catch (err) {
        reactory.log('GraphExplorer: edge deletion failed', { err }, 'error');
        setNotice('Failed to delete edge');
      }
    },
    [explorer, reactory]
  );

  const nodeName = useCallback(
    (id: number) => state.nodes.get(id)?.name ?? `#${id}`,
    [state.nodes]
  );

  // -- Render -----------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', height, minHeight: 480, position: 'relative', overflow: 'hidden' }}>
      <Drawer
        variant="persistent"
        open={leftOpen}
        sx={{
          width: leftOpen ? LEFT_PANEL_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: LEFT_PANEL_WIDTH, position: 'relative' },
        }}
      >
        <SearchPanel onSearch={handleSearch} onResultClick={handleSearchResult} />
        <Divider />
        <CatalogPicker
          catalogs={catalogs}
          selectedId={state.rootId}
          loading={data.loading}
          onSelect={openCatalog}
        />
        <Divider />
        <FilterPanel
          filters={state.filters}
          onChange={(filters) => dispatch({ type: 'SET_FILTERS', filters })}
        />
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <GraphToolbar
          zoom={canvas.viewport.zoom}
          readOnly={readOnly}
          onFit={canvas.fitToContent}
          onTidy={canvas.runForceLayout}
          onSavePerspective={() => setSaveDialogOpen(true)}
          onLoadPerspective={() => void openLoadDialog()}
          onToggleLeftPanel={() => setLeftOpen((open) => !open)}
        />
        <BreadcrumbBar
          node={selectedNode}
          resolveNodes={data.getNodes}
          onCrumbClick={handleCrumbClick}
        />
        <Box
          ref={canvas.containerRef}
          sx={{
            flex: 1,
            position: 'relative',
            minHeight: 0,
            // PCB board green regardless of MUI light/dark mode.
            bgcolor: boardCss,
          }}
        />
      </Box>

      <Drawer
        variant="persistent"
        anchor="right"
        open={selectedNode !== null}
        sx={{
          width: selectedNode ? RIGHT_PANEL_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: RIGHT_PANEL_WIDTH, position: 'relative' },
        }}
      >
        <InspectorPanel
          node={selectedNode}
          edges={selectedNodeEdges}
          nodeName={nodeName}
          expanded={selectedNode ? state.expanded.has(selectedNode.id) : false}
          readOnly={readOnly}
          onToggleExpand={(node) => void explorer.toggleNode(node)}
          onShowRelated={(node, direction) => void explorer.showRelated(node, direction)}
          onStartEdge={(node) => setEdgeDialog({ from: node, to: null })}
          onDeleteEdge={(edgeId) => void handleDeleteEdge(edgeId)}
          onRemoveFromView={(node) => handleRemoveFromView([node.id])}
        />
      </Drawer>

      <EdgeEditorDialog
        open={Boolean(edgeDialog.from && edgeDialog.to)}
        from={edgeDialog.from}
        to={edgeDialog.to}
        onConfirm={(types, title) => void handleConfirmEdge(types, title)}
        onCancel={() => setEdgeDialog({ from: null, to: null })}
      />

      <SavePerspectiveDialog
        open={saveDialogOpen}
        defaultName={
          state.rootId !== null ? `${state.nodes.get(state.rootId)?.name ?? 'graph'} view` : 'graph view'
        }
        onConfirm={(name) => void handleSavePerspective(name)}
        onCancel={() => setSaveDialogOpen(false)}
      />

      <LoadPerspectiveDialog
        open={loadDialog.open}
        loading={loadDialog.loading}
        perspectives={loadDialog.perspectives}
        onLoad={(perspective) => void handleLoadPerspective(perspective)}
        onDelete={(perspective) => void handleDeletePerspective(perspective)}
        onCancel={() => setLoadDialog((d) => ({ ...d, open: false }))}
      />

      <Snackbar
        open={notice !== null}
        autoHideDuration={2500}
        onClose={() => setNotice(null)}
        message={notice ?? ''}
      />
    </Box>
  );
}

/**
 * Co-located registration definition (D3Chart pattern) — listed in
 * src/components/index.tsx componentRegistery. FQN: core.GraphExplorer@1.0.0.
 */
export const GraphExplorerComponentDefinition: Reactory.IReactoryComponentDefinition<typeof GraphExplorer> = {
  nameSpace: 'core',
  name: 'GraphExplorer',
  version: '1.0.0',
  component: GraphExplorer,
  description:
    'WebGL (three.js) explorer for the Reactor system graph — walk cataloged projects, traverse edges, search, and manage graph links and saved perspectives.',
  tags: ['graph', 'visualization', 'webgl', 'three', 'reactor', 'explorer', 'shared'],
};
