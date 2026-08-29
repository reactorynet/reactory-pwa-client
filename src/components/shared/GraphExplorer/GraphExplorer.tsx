/**
 * GraphExplorer — explorer for the Reactor system graph with two renderers
 * (2D PCB board / 3D orbit) over one shared engine.
 *
 * Capabilities: lazy neighbourhood expansion, dependency/dependent traversal,
 * server path finding, search-jump with ancestry hydration, edge create/edit/
 * delete, node data editing, hide/unhide, type filters, three layouts, and a
 * full perspective lifecycle (save / save-as / rename / duplicate / share /
 * default / delete) whose state is renderer independent. Hosts can inject an
 * overlay graph (chat agent context), steer the view, and pin perspectives.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Dialog, DialogContent, Divider, Drawer, IconButton, Snackbar, Typography } from '@mui/material';
import Icon from '@mui/material/Icon';
import { useReactory } from '@reactory/client-core/api';
import File from '@reactory/client-core/components/shared/File';
import {
  GraphCameraState,
  GraphCanvasController,
  GraphEdge,
  GraphExplorerProps,
  GraphLayoutKind,
  GraphLinkType,
  GraphNode,
  GraphPerspective,
  GraphPerspectiveRequest,
  GraphViewMode,
} from './types';
import { useGraphExplorer } from './hooks/useGraphExplorer';
import { useGraphWebGLCanvas } from './hooks/useGraphWebGLCanvas';
import { useGraph3DCanvas } from './hooks/useGraph3DCanvas';
import { GraphCanvasEvents } from './renderers/types';
import {
  BreadcrumbBar,
  CatalogPicker,
  EdgeEditorDialog,
  FilterPanel,
  GraphContextMenu,
  GraphContextMenuState,
  GraphToolbar,
  InspectorPanel,
  NodeDataDialog,
  PerspectiveManagerDialog,
  SavePerspectiveDialog,
  SearchPanel,
} from './components/Panels';
import { BOARD_BACKGROUND, SPACE_BACKGROUND } from './constants';
import { DEFAULT_CAMERA } from './utils/graphMapping';

const boardCss = `#${BOARD_BACKGROUND.toString(16).padStart(6, '0')}`;
const spaceCss = `#${SPACE_BACKGROUND.toString(16).padStart(6, '0')}`;

const LEFT_PANEL_WIDTH = 280;
const RIGHT_PANEL_WIDTH = 320;

type ToolMode =
  | { kind: 'none' }
  | { kind: 'edge'; from: GraphNode }
  | { kind: 'path'; from: GraphNode | null };

const toHex = (color?: string): number | undefined => {
  if (!color) return undefined;
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  return m ? parseInt(m[1], 16) : undefined;
};

export default function GraphExplorer(props: GraphExplorerProps) {
  const {
    catalogNodeId,
    nodeKey,
    projectId,
    nodeId,
    conversationId,
    readOnly = false,
    initialDepth,
    viewMode: initialViewMode,
    chrome = 'full',
    overlay,
    perspective: perspectiveRequest,
    onPinPerspective,
    height,
    onNodeSelect,
    primaryColor,
    secondaryColor,
    backgroundColor,
  } = props;
  const reactory = useReactory();

  const explorer = useGraphExplorer();
  const { store, data } = explorer;
  const { state, dispatch, positions, visibleNodes, visibleEdges } = store;
  const compact = chrome === 'compact';
  // The route wrapper has no definite height, so '100%' would resolve to auto
  // and the drawers' content would stretch the canvas. Full chrome fills the
  // viewport below the app bar; compact hosts (side panels) size us.
  const effectiveHeight = height ?? (compact ? '100%' : 'calc(100vh - 64px)');

  const [catalogs, setCatalogs] = useState<GraphNode[]>([]);
  const [leftOpen, setLeftOpen] = useState(!compact);
  const [mode, setMode] = useState<ToolMode>({ kind: 'none' });
  const [edgeDialog, setEdgeDialog] = useState<{ from: GraphNode; to: GraphNode; edge?: GraphEdge } | null>(null);
  const [nodeDataDialog, setNodeDataDialog] = useState<GraphNode | null>(null);
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; existing: GraphPerspective | null }>({ open: false, existing: null });
  const [manager, setManager] = useState<{ open: boolean; loading: boolean; perspectives: GraphPerspective[] }>({
    open: false,
    loading: false,
    perspectives: [],
  });
  const [contextMenu, setContextMenu] = useState<GraphContextMenuState | null>(null);
  const [filePreview, setFilePreview] = useState<GraphNode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const pendingCameraRef = useRef<GraphCameraState | null>(null);

  // Initial view mode from props (once).
  const initialViewModeApplied = useRef(false);
  useEffect(() => {
    if (initialViewModeApplied.current) return;
    initialViewModeApplied.current = true;
    if (initialViewMode && initialViewMode !== state.viewMode) explorer.setViewMode(initialViewMode);
    if (initialDepth) dispatch({ type: 'SET_DEPTH', depth: Math.min(Math.max(initialDepth, 1), 5) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Derived --------------------------------------------------------------------

  const selectedNode = useMemo(() => {
    const first = Array.from(state.selection.nodeIds)[0];
    return first !== undefined ? state.nodes.get(first) ?? null : null;
  }, [state.selection.nodeIds, state.nodes]);

  const selectedEdge = useMemo(() => {
    const first = Array.from(state.selection.edgeIds)[0];
    return first !== undefined ? state.edges.get(first) ?? null : null;
  }, [state.selection.edgeIds, state.edges]);

  const selectedNodeEdges = useMemo(() => {
    if (!selectedNode) return [];
    const edgeIds = state.adjacency.get(selectedNode.id);
    if (!edgeIds) return [];
    return Array.from(edgeIds, (id) => state.edges.get(id)).filter(
      (e): e is NonNullable<typeof e> => e !== undefined
    );
  }, [selectedNode, state.adjacency, state.edges]);

  const presentTypes = useMemo(() => {
    const nodeTypes = new Set(Array.from(state.nodes.values(), (n) => n.type));
    const linkTypes = new Set(Array.from(state.edges.values()).flatMap((e) => e.types));
    return { nodeTypes, linkTypes };
  }, [state.nodes, state.edges]);

  // -- Canvas events (shared by both renderers) -------------------------------------

  const events = useMemo<Partial<GraphCanvasEvents>>(
    () => ({
      onNodeClick: (id, event) => {
        const current = stateRef.current;
        const target = current.nodes.get(id);
        const activeMode = modeRef.current;
        if (target && activeMode.kind === 'edge') {
          if (target.id !== activeMode.from.id) {
            setEdgeDialog({ from: activeMode.from, to: target });
            setMode({ kind: 'none' });
            canvasRef.current?.setEdgePreview(null);
          }
          return;
        }
        if (target && activeMode.kind === 'path') {
          if (!activeMode.from) {
            setMode({ kind: 'path', from: target });
            dispatch({ type: 'SET_SELECTION', nodeIds: [target.id] });
            return;
          }
          if (activeMode.from.id !== target.id) {
            const from = activeMode.from;
            setMode({ kind: 'none' });
            void explorer.findPathBetween(from.id, target.id).then((result) => {
              setNotice(
                result.found
                  ? `Path: ${result.nodeIds.length} node(s), ${result.edgeIds.length} edge(s)`
                  : `No path found between ${from.name} and ${target.name}`
              );
            });
            return;
          }
        }
        dispatch({
          type: 'SET_SELECTION',
          nodeIds: [id],
          additive: event.modifiers.shift || event.modifiers.meta || event.modifiers.ctrl,
        });
      },
      onNodeDoubleClick: (id) => {
        const node = stateRef.current.nodes.get(id);
        if (node) void explorer.toggleNode(node);
      },
      onNodeContextMenu: (id, event) => {
        const node = stateRef.current.nodes.get(id);
        if (!node) return;
        const native = event.originalEvent as MouseEvent;
        setContextMenu({ node, x: native.clientX, y: native.clientY });
      },
      onNodeDrag: (id, _position, phase) => {
        if (phase === 'end') {
          dispatch({ type: 'PIN_NODES', nodeIds: [id] });
          dispatch({ type: 'MARK_DIRTY' });
          // Children follow the dropped node via a force-directed animation.
          explorer.realignChildren(id);
        }
      },
      onEdgeClick: (edgeId, event) =>
        dispatch({ type: 'SET_SELECTION', edgeIds: [edgeId], additive: event.modifiers.shift }),
      onCanvasClick: () => {
        if (modeRef.current.kind !== 'none') {
          setMode({ kind: 'none' });
          canvasRef.current?.setEdgePreview(null);
          return;
        }
        dispatch({ type: 'SET_SELECTION', nodeIds: [], edgeIds: [] });
        dispatch({ type: 'SET_FOCUS', nodeId: null });
      },
      onMarqueeSelect: (bounds, event) => {
        const hit = stateRef.current.nodes.size
          ? Array.from(stateRef.current.nodes.values())
              .filter((node) => {
                if (stateRef.current.hidden.has(node.id)) return false;
                const p = positions.get(node.id);
                return (
                  p &&
                  p.x >= bounds.x &&
                  p.x <= bounds.x + bounds.width &&
                  p.y >= bounds.y &&
                  p.y <= bounds.y + bounds.height
                );
              })
              .map((node) => node.id)
          : [];
        dispatch({ type: 'SET_SELECTION', nodeIds: hit, additive: event.modifiers.shift && event.modifiers.meta });
      },
      onViewportChange: () => {
        if (stateRef.current.perspective) dispatch({ type: 'MARK_DIRTY' });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, explorer, positions]
  );

  const canvasProps = {
    nodes: visibleNodes,
    edges: visibleEdges,
    positions,
    animator: store.animator,
    selection: state.selection,
    focusNodeId: state.focusNodeId,
    expanded: state.expanded,
    pinned: state.pinned,
    events,
  };
  const canvas2d = useGraphWebGLCanvas({ ...canvasProps, active: state.viewMode === '2d' });
  const canvas3d = useGraph3DCanvas({
    ...canvasProps,
    active: state.viewMode === '3d',
    backgroundColor: toHex(backgroundColor),
    primaryColor,
    secondaryColor,
  });
  const canvas: GraphCanvasController = state.viewMode === '3d' ? canvas3d : canvas2d;
  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;

  /** Apply a camera to whichever renderer is (or is about to be) active. */
  const applyCamera = useCallback((camera: GraphCameraState | null, animate = true) => {
    pendingCameraRef.current = camera;
    // Two frames: lets a renderer switch mount its canvas first.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const pending = pendingCameraRef.current;
        pendingCameraRef.current = null;
        if (pending) canvasRef.current.setCamera(pending, animate);
        else canvasRef.current.fitToContent();
      })
    );
  }, []);

  // Switching renderers keeps the framing.
  const lastViewModeRef = useRef(state.viewMode);
  useEffect(() => {
    if (lastViewModeRef.current === state.viewMode) return;
    const previous = lastViewModeRef.current === '3d' ? canvas3d : canvas2d;
    lastViewModeRef.current = state.viewMode;
    applyCamera(previous.getCamera(), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.viewMode]);

  // -- Bootstrapping ----------------------------------------------------------------

  useEffect(() => {
    if (!data.capabilitiesResolved) return;
    let cancelled = false;
    data
      .getCatalogNodes()
      .then((nodes) => {
        if (cancelled) return;
        // The catalog can return the same root more than once.
        const unique = new Map<number, GraphNode>();
        for (const n of nodes) if (!unique.has(n.id)) unique.set(n.id, n);
        setCatalogs(Array.from(unique.values()));
      })
      .catch((err) => reactory.log('GraphExplorer: failed to load catalogs', { err }, 'error'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.capabilitiesResolved]);

  /** Open a root (catalog node) and restore its default perspective / fit. */
  const openRoot = useCallback(
    async (rootId: number, key?: string, depth?: number) => {
      try {
        setMode({ kind: 'none' });
        const restored = await explorer.openRoot(rootId, key, depth);
        explorer.applyOverlay(overlayRef.current);
        applyCamera(restored?.viewport ?? null);
        return restored;
      } catch (err) {
        reactory.log('GraphExplorer: failed to open root', { err }, 'error');
        setNotice('Failed to open project graph');
        return null;
      }
    },
    [explorer, applyCamera, reactory]
  );

  const openCatalog = useCallback((node: GraphNode) => openRoot(node.id, node.key), [openRoot]);

  // Route/props → root resolution: catalogNodeId > projectId > conversationId.
  // `conversationRetry` re-runs the conversation branch until the session has
  // been graphed server-side (ProcessConversationWorkflow runs ~60s after the
  // last message), so the viewer fills in without a remount.
  const resolvedKeyRef = useRef<string | null>(null);
  const [conversationRetry, setConversationRetry] = useState(0);
  useEffect(() => {
    if (!data.capabilitiesResolved) return;
    const key = `${catalogNodeId ?? ''}|${projectId ?? ''}|${conversationId ?? ''}|${nodeId ?? ''}|${conversationRetry}`;
    if (resolvedKeyRef.current === key) return;
    resolvedKeyRef.current = key;
    let cancelled = false;
    let retryTimer: number | null = null;

    const resolve = async () => {
      let rootId: number | null = null;
      let rootKey: string | undefined;
      let depth: number | undefined;
      if (catalogNodeId !== undefined && catalogNodeId !== null && Number.isFinite(Number(catalogNodeId))) {
        rootId = Number(catalogNodeId);
        rootKey = nodeKey ?? `${rootId}`;
      } else if (projectId) {
        rootId = await data.getProjectRootNodeId(projectId);
        if (rootId === null) {
          setNotice(`Project "${projectId}" has not been cataloged yet`);
          return;
        }
      } else if (conversationId) {
        const node = await data.getConversationNode(conversationId).catch((err) => {
          reactory.log('GraphExplorer: conversation node lookup failed', { err }, 'warn');
          return null;
        });
        if (cancelled) return;
        if (!node) {
          // Not graphed yet — show the host overlay (conversation fragment +
          // agent context) and poll until the conversation node appears.
          if (stateRef.current.rootId === null) {
            explorer.applyOverlay(overlayRef.current);
            applyCamera(null);
          }
          retryTimer = window.setTimeout(() => setConversationRetry((n) => n + 1), 30000);
          return;
        }
        rootId = node.id;
        rootKey = node.key;
        depth = 2;
      }
      if (cancelled || rootId === null) return;
      await openRoot(rootId, rootKey, depth);
      if (cancelled) return;
      const deepLink = nodeId !== undefined && nodeId !== null ? Number(nodeId) : NaN;
      if (Number.isFinite(deepLink) && deepLink !== rootId) {
        const node = await explorer.hydrateNode(deepLink);
        if (node && !cancelled) requestAnimationFrame(() => canvasRef.current.focusOn(node.id));
      }
    };
    void resolve().catch((err) => {
      reactory.log('GraphExplorer: root resolution failed', { err }, 'error');
      setNotice('Failed to resolve graph root');
    });
    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.capabilitiesResolved, catalogNodeId, projectId, conversationId, nodeId, conversationRetry]);

  // Overlay (host-injected graph) — merge whenever it changes.
  const lastOverlayRef = useRef<typeof overlay>(undefined);
  useEffect(() => {
    if (lastOverlayRef.current === overlay) return;
    lastOverlayRef.current = overlay;
    if (!overlay) return;
    const hadNodes = stateRef.current.nodes.size > 0;
    explorer.applyOverlay(overlay);
    // Overlay-only views (conversation not graphed yet) need an initial fit.
    if (!hadNodes) applyCamera(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  // Steering requests (loadGraphPerspective tool, hosts).
  const appliedRequestRef = useRef<GraphPerspectiveRequest | null | undefined>(undefined);
  useEffect(() => {
    if (!data.capabilitiesResolved || !perspectiveRequest || appliedRequestRef.current === perspectiveRequest) return;
    appliedRequestRef.current = perspectiveRequest;
    let cancelled = false;
    const run = async () => {
      if (typeof perspectiveRequest === 'string') {
        const term = perspectiveRequest.trim().toLowerCase();
        if (term === 'conversation') {
          if (conversationId) {
            const node = await data.getConversationNode(conversationId);
            if (node && !cancelled) await openRoot(node.id, node.key, 2);
          }
          return;
        }
        if (term === 'agent') {
          dispatch({ type: 'RESET' });
          positions.clear();
          explorer.applyOverlay(overlayRef.current);
          applyCamera(null);
          return;
        }
        // Saved perspective by name (any scope), then project by fqn/name.
        const saved = (await data.listPerspectives({})).find((p) => p.name.toLowerCase() === term);
        if (saved?.id) {
          const loaded = await explorer.loadPerspectiveById(saved.id);
          if (loaded && !cancelled) applyCamera(loaded.camera);
          return;
        }
        const list = catalogs.length ? catalogs : await data.getCatalogNodes();
        const project = list.find((c) => {
          const fqn = `${c.nameSpace ?? ''}.${c.name}`.toLowerCase();
          return fqn === term || c.name.toLowerCase() === term || fqn.includes(term);
        });
        if (project && !cancelled) await openRoot(project.id, project.key);
        else setNotice(`No perspective or project matches "${perspectiveRequest}"`);
        return;
      }
      if (perspectiveRequest.perspectiveId) {
        const loaded = await explorer.loadPerspectiveById(perspectiveRequest.perspectiveId);
        if (loaded && !cancelled) applyCamera(loaded.camera);
        return;
      }
      if (perspectiveRequest.viewMode) explorer.setViewMode(perspectiveRequest.viewMode);
      if (perspectiveRequest.rootId !== undefined && Number.isFinite(perspectiveRequest.rootId)) {
        await openRoot(perspectiveRequest.rootId, undefined, perspectiveRequest.depth);
      }
    };
    void run().catch((err) => {
      reactory.log('GraphExplorer: perspective request failed', { err }, 'error');
      setNotice('Failed to apply perspective request');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perspectiveRequest, data.capabilitiesResolved]);

  useEffect(() => {
    onNodeSelect?.(selectedNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  // -- Actions ------------------------------------------------------------------------

  const handleSearch = useCallback((term: string) => data.searchByTerm(term), [data]);

  const handleSearchResult = useCallback(
    async (node: GraphNode) => {
      const resolved = await explorer.jumpToSearchResult(node);
      if (resolved) requestAnimationFrame(() => canvasRef.current.focusOn(resolved.id));
    },
    [explorer]
  );

  const handleCrumbClick = useCallback(
    (node: GraphNode) => {
      dispatch({ type: 'SET_SELECTION', nodeIds: [node.id] });
      canvas.focusOn(node.id);
    },
    [dispatch, canvas]
  );

  const startEdge = useCallback(
    (node: GraphNode) => {
      setMode({ kind: 'edge', from: node });
      canvas.setEdgePreview(node.id);
      setNotice(`Click a target node to link from ${node.name} (Esc to cancel)`);
    },
    [canvas]
  );

  const startPath = useCallback((node: GraphNode | null) => {
    setMode({ kind: 'path', from: node });
    setNotice(node ? `Click a target node to find a path from ${node.name}` : 'Click the start node, then the end node');
  }, []);

  const cancelMode = useCallback(() => {
    setMode({ kind: 'none' });
    canvasRef.current.setEdgePreview(null);
  }, []);

  const handleConfirmEdge = useCallback(
    async (types: GraphLinkType[], title?: string, description?: string) => {
      const dialog = edgeDialog;
      setEdgeDialog(null);
      if (!dialog) return;
      try {
        if (dialog.edge) {
          await explorer.updateEdge(dialog.edge, types, title, description);
          setNotice('Edge updated');
        } else {
          await explorer.createEdge(dialog.from.id, dialog.to.id, types, title, description);
          setNotice('Edge created');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Edge mutation failed';
        reactory.log('GraphExplorer: edge mutation failed', { err }, 'error');
        setNotice(`Edge failed: ${message}`);
      }
    },
    [edgeDialog, explorer, reactory]
  );

  const handleEditEdge = useCallback(
    (edge: GraphEdge) => {
      const from = state.nodes.get(edge.source);
      const to = state.nodes.get(edge.target);
      if (from && to) setEdgeDialog({ from, to, edge });
    },
    [state.nodes]
  );

  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      try {
        const deleted = await explorer.deleteEdge(edgeId);
        setNotice(deleted ? 'Edge deleted' : 'Derived edge removed from view');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete edge';
        reactory.log('GraphExplorer: edge deletion failed', { err }, 'error');
        setNotice(`Delete failed: ${message}`);
      }
    },
    [explorer, reactory]
  );

  const handleSaveNodeData = useCallback(
    async (payload: Record<string, unknown>) => {
      const node = nodeDataDialog;
      setNodeDataDialog(null);
      if (!node) return;
      try {
        await explorer.updateNodeData(node.id, payload);
        setNotice('Node data saved');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update node';
        setNotice(`Update failed: ${message}`);
      }
    },
    [nodeDataDialog, explorer]
  );

  const handleHide = useCallback(
    (nodeIds: number[]) => {
      if (nodeIds.length === 0) return;
      explorer.hideNodes(nodeIds);
      dispatch({ type: 'SET_SELECTION', nodeIds: [], edgeIds: [] });
    },
    [explorer, dispatch]
  );

  const handleLayoutChange = useCallback(
    (layout: GraphLayoutKind) => {
      explorer.applyLayout(layout);
      requestAnimationFrame(() => canvasRef.current.fitToContent());
    },
    [explorer]
  );

  const handleViewModeChange = useCallback(
    (viewMode: GraphViewMode) => explorer.setViewMode(viewMode),
    [explorer]
  );

  // -- Perspectives -------------------------------------------------------------------

  const withNotice = useCallback(
    async <T,>(label: string, action: () => Promise<T>): Promise<T | null> => {
      try {
        return await action();
      } catch (err) {
        const message = err instanceof Error ? err.message : `${label} failed`;
        reactory.log(`GraphExplorer: ${label} failed`, { err }, 'error');
        setNotice(`${label} failed: ${message}`);
        return null;
      }
    },
    [reactory]
  );

  const refreshManager = useCallback(async () => {
    setManager((m) => ({ ...m, loading: true }));
    const perspectives = (await withNotice('Listing perspectives', () => explorer.listPerspectives())) ?? [];
    setManager((m) => ({ ...m, loading: false, perspectives }));
  }, [explorer, withNotice]);

  const openManager = useCallback(async () => {
    setManager({ open: true, loading: true, perspectives: [] });
    await refreshManager();
  }, [refreshManager]);

  const handleQuickSave = useCallback(async () => {
    const saved = await withNotice('Save', () => explorer.savePerspective(canvas.getCamera()));
    if (saved) setNotice(`Perspective "${saved.name}" saved`);
  }, [explorer, canvas, withNotice]);

  const handleSaveDialogConfirm = useCallback(
    async (input: { name: string; share: boolean; isDefault: boolean }) => {
      const dialog = saveDialog;
      setSaveDialog({ open: false, existing: null });
      if (dialog.existing) {
        const saved = await withNotice('Update', () =>
          explorer.renamePerspective({ ...dialog.existing!, share: input.share, isDefault: input.isDefault }, input.name)
        );
        if (saved) setNotice(`Perspective "${saved.name}" updated`);
        if (manager.open) await refreshManager();
        return;
      }
      const saved = await withNotice('Save', () =>
        explorer.saveAsPerspective(input.name, canvas.getCamera(), { share: input.share, isDefault: input.isDefault })
      );
      if (saved) setNotice(`Perspective "${saved.name}" saved`);
    },
    [saveDialog, explorer, canvas, withNotice, manager.open, refreshManager]
  );

  const handleLoadPerspective = useCallback(
    async (perspective: GraphPerspective) => {
      setManager((m) => ({ ...m, open: false }));
      const camera = await withNotice('Load', async () => {
        if (perspective.catalogNodeId !== null && perspective.catalogNodeId !== state.rootId) {
          await explorer.loadRoot(perspective.catalogNodeId, undefined, perspective.depth);
        }
        return explorer.applyPerspective(perspective);
      });
      if (camera) {
        applyCamera(camera);
        setNotice(`Perspective "${perspective.name}" loaded`);
      }
    },
    [explorer, state.rootId, withNotice, applyCamera]
  );

  const managerAction = useCallback(
    (label: string, action: () => Promise<unknown>) => async () => {
      await withNotice(label, action);
      await refreshManager();
    },
    [withNotice, refreshManager]
  );

  const handlePin = useCallback(async () => {
    if (!onPinPerspective) return;
    const snapshot = explorer.snapshotPerspective(canvas.getCamera());
    const key = `${snapshot.id ?? snapshot.name}|${state.rootId}|${selectedNode?.id ?? ''}`;
    try {
      await onPinPerspective(snapshot, selectedNode);
      setPinnedKey(key);
      setNotice('Pinned to chat');
    } catch (err) {
      reactory.log('GraphExplorer: pin failed', { err }, 'warn');
      setNotice('Pin failed');
    }
  }, [onPinPerspective, explorer, canvas, state.rootId, selectedNode, reactory]);

  const pinKey = `${state.perspective?.id ?? state.perspective?.name ?? ''}|${state.rootId}|${selectedNode?.id ?? ''}`;

  // -- Keyboard -------------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Never hijack typing in inputs/dialogs.
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      const current = stateRef.current;
      if (e.key === 'Escape') {
        if (modeRef.current.kind !== 'none') {
          e.preventDefault();
          cancelMode();
        } else if (current.selection.nodeIds.size || current.selection.edgeIds.size) {
          dispatch({ type: 'SET_SELECTION', nodeIds: [], edgeIds: [] });
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = Array.from(current.selection.nodeIds);
        if (selected.length > 0) {
          e.preventDefault();
          handleHide(selected);
        }
        return;
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        const focus = Array.from(current.selection.nodeIds)[0];
        if (focus !== undefined) canvasRef.current.focusOn(focus);
        else canvasRef.current.fitToContent();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, handleHide, cancelMode]);

  const nodeName = useCallback(
    (id: number) => state.nodes.get(id)?.name ?? `#${id}`,
    [state.nodes]
  );

  const filePathFor = (node: GraphNode | null): string | null => {
    const path = (node?.data?.relativePath ?? node?.data?.path) as string | undefined;
    return path ?? null;
  };

  // -- Render ---------------------------------------------------------------------------

  const modeBanner =
    mode.kind === 'edge'
      ? `Linking from ${mode.from.name} — click a target node`
      : mode.kind === 'path'
        ? mode.from
          ? `Path from ${mode.from.name} — click the target node`
          : 'Path tool — click the start node'
        : null;

  return (
    <Box
      sx={{
        display: 'flex',
        height: effectiveHeight,
        maxHeight: '100vh',
        minHeight: compact ? 280 : 480,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Drawer
        variant="persistent"
        open={leftOpen}
        sx={{
          width: leftOpen ? LEFT_PANEL_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: LEFT_PANEL_WIDTH, position: 'relative', height: '100%', overflowY: 'auto' },
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
          presentNodeTypes={presentTypes.nodeTypes}
          presentLinkTypes={presentTypes.linkTypes}
          onChange={(filters) => dispatch({ type: 'SET_FILTERS', filters })}
        />
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <GraphToolbar
          zoom={canvas.zoom}
          viewMode={state.viewMode}
          layout={state.layout}
          perspective={state.perspective}
          dirty={state.dirty}
          hiddenCount={state.hidden.size}
          truncated={state.truncated}
          readOnly={readOnly}
          compact={compact}
          pathMode={mode.kind === 'path'}
          canPin={Boolean(onPinPerspective)}
          pinned={pinnedKey === pinKey}
          onFit={canvas.fitToContent}
          onTidy={canvas.runForceLayout}
          onViewModeChange={handleViewModeChange}
          onLayoutChange={handleLayoutChange}
          onSavePerspective={() => void handleQuickSave()}
          onSaveAsPerspective={() => setSaveDialog({ open: true, existing: null })}
          onManagePerspectives={() => void openManager()}
          onTogglePathMode={() => (mode.kind === 'path' ? cancelMode() : startPath(selectedNode))}
          onUnhideAll={explorer.unhideAll}
          onToggleLeftPanel={() => setLeftOpen((open) => !open)}
          onPin={onPinPerspective ? () => void handlePin() : undefined}
        />
        {!compact && (
          <BreadcrumbBar node={selectedNode} resolveNodes={data.getNodes} onCrumbClick={handleCrumbClick} />
        )}
        <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {state.viewMode === '2d' ? (
            <Box
              key="canvas-2d"
              ref={canvas2d.containerRef}
              sx={{ position: 'absolute', inset: 0, bgcolor: boardCss }}
            />
          ) : (
            <Box
              key="canvas-3d"
              ref={canvas3d.containerRef}
              sx={{ position: 'absolute', inset: 0, bgcolor: backgroundColor ?? spaceCss }}
            />
          )}
          {canvas.marquee && (
            <Box
              sx={{
                position: 'absolute',
                left: canvas.marquee.x,
                top: canvas.marquee.y,
                width: canvas.marquee.width,
                height: canvas.marquee.height,
                border: '1px dashed',
                borderColor: 'warning.main',
                bgcolor: 'rgba(255, 215, 0, 0.08)',
                pointerEvents: 'none',
              }}
            />
          )}
          {modeBanner && (
            <Box
              sx={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                boxShadow: 2,
              }}
            >
              <Typography variant="caption">{modeBanner}</Typography>
              <IconButton size="small" onClick={cancelMode} aria-label="Cancel">
                <Icon fontSize="small">close</Icon>
              </IconButton>
            </Box>
          )}
          {state.nodes.size === 0 && !data.loading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {conversationId
                  ? 'Waiting for the conversation graph — it appears once the session has been processed, or as the agent touches the graph.'
                  : catalogs.length
                    ? 'Pick a project to explore its graph.'
                    : 'No cataloged projects yet.'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Drawer
        variant="persistent"
        anchor="right"
        open={selectedNode !== null || selectedEdge !== null}
        sx={{
          width: selectedNode || selectedEdge ? RIGHT_PANEL_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: RIGHT_PANEL_WIDTH, position: 'relative', height: '100%', overflowY: 'auto' },
        }}
      >
        <InspectorPanel
          node={selectedNode}
          selectionCount={state.selection.nodeIds.size}
          edges={selectedNodeEdges}
          selectedEdge={selectedEdge}
          nodeName={nodeName}
          expanded={selectedNode ? state.expanded.has(selectedNode.id) : false}
          loading={selectedNode ? state.loading.has(selectedNode.id) : false}
          readOnly={readOnly}
          onToggleExpand={(node) => void explorer.toggleNode(node)}
          onShowRelated={(node, direction) => void explorer.showRelated(node, direction)}
          onStartEdge={startEdge}
          onStartPath={startPath}
          onEditNodeData={setNodeDataDialog}
          onEditEdge={handleEditEdge}
          onDeleteEdge={(edgeId) => void handleDeleteEdge(edgeId)}
          onSelectEdge={(edgeId) => dispatch({ type: 'SET_SELECTION', nodeIds: Array.from(state.selection.nodeIds), edgeIds: [edgeId] })}
          onFocus={(node) => canvas.focusOn(node.id)}
          onHide={(node) => handleHide([node.id])}
          onOpenFile={(node) => setFilePreview(node)}
        />
      </Drawer>

      <GraphContextMenu
        state={contextMenu}
        expanded={contextMenu ? state.expanded.has(contextMenu.node.id) : false}
        readOnly={readOnly}
        onClose={() => setContextMenu(null)}
        onToggleExpand={(node) => void explorer.toggleNode(node)}
        onShowRelated={(node, direction) => void explorer.showRelated(node, direction)}
        onFocus={(node) => canvas.focusOn(node.id)}
        onStartPath={startPath}
        onStartEdge={startEdge}
        onEditNodeData={setNodeDataDialog}
        onHide={(node) => handleHide([node.id])}
      />

      <EdgeEditorDialog
        open={Boolean(edgeDialog)}
        from={edgeDialog?.from ?? null}
        to={edgeDialog?.to ?? null}
        edge={edgeDialog?.edge ?? null}
        onConfirm={(types, title, description) => void handleConfirmEdge(types, title, description)}
        onCancel={() => setEdgeDialog(null)}
      />

      <NodeDataDialog
        open={Boolean(nodeDataDialog)}
        node={nodeDataDialog}
        onConfirm={(payload) => void handleSaveNodeData(payload)}
        onCancel={() => setNodeDataDialog(null)}
      />

      <SavePerspectiveDialog
        open={saveDialog.open}
        existing={saveDialog.existing}
        defaultName={
          state.rootId !== null ? `${state.nodes.get(state.rootId)?.name ?? 'graph'} view` : 'graph view'
        }
        onConfirm={(input) => void handleSaveDialogConfirm(input)}
        onCancel={() => setSaveDialog({ open: false, existing: null })}
      />

      <PerspectiveManagerDialog
        open={manager.open}
        loading={manager.loading}
        perspectives={manager.perspectives}
        currentId={state.perspective?.id}
        readOnly={readOnly}
        onLoad={(perspective) => void handleLoadPerspective(perspective)}
        onRename={(perspective, name) => void managerAction('Rename', () => explorer.renamePerspective(perspective, name))()}
        onDuplicate={(perspective, name) => void managerAction('Duplicate', () => explorer.duplicatePerspective(perspective, name))()}
        onToggleShare={(perspective) => void managerAction('Share', () => explorer.setPerspectiveShare(perspective, !perspective.share))()}
        onToggleDefault={(perspective) => void managerAction('Default', () => explorer.setPerspectiveDefault(perspective, !perspective.isDefault))()}
        onDelete={(perspective) => void managerAction('Delete', () => explorer.deletePerspective(perspective))()}
        onCancel={() => setManager((m) => ({ ...m, open: false }))}
      />

      <Dialog open={Boolean(filePreview)} onClose={() => setFilePreview(null)} maxWidth="md" fullWidth>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontFamily: 'monospace' }}>
            {filePreview?.name}
          </Typography>
          <IconButton size="small" onClick={() => setFilePreview(null)}>
            <Icon>close</Icon>
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0, height: '65vh', overflow: 'hidden' }}>
          {filePathFor(filePreview) && <File path={filePathFor(filePreview)!} scope="server" />}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={notice !== null}
        autoHideDuration={3000}
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
    'Explorer for the Reactor system graph with 2D and 3D renderers — walk cataloged projects, traverse edges and paths, search, edit links and node data, and manage saved perspectives.',
  tags: ['graph', 'visualization', 'webgl', 'three', 'reactor', 'explorer', 'shared'],
};

export { DEFAULT_CAMERA };
