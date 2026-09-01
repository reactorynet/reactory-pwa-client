import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import Icon from '@mui/material/Icon';
import { GraphEdge, GraphNode } from '../../types';
import { toSafeSvg } from '../../utils/svgAttribute';

export interface InspectorPanelProps {
  node: GraphNode | null;
  /** Additional selected nodes (multi-select summary). */
  selectionCount: number;
  edges: GraphEdge[];
  selectedEdge: GraphEdge | null;
  nodeName(id: number): string;
  expanded: boolean;
  loading: boolean;
  readOnly?: boolean;
  onToggleExpand(node: GraphNode): void;
  onShowRelated(node: GraphNode, direction: 'dependencies' | 'dependents'): void;
  onStartEdge(node: GraphNode): void;
  onStartPath(node: GraphNode): void;
  onEditNodeData(node: GraphNode): void;
  onEditEdge(edge: GraphEdge): void;
  onDeleteEdge(edgeId: string): void;
  onSelectEdge(edgeId: string): void;
  onFocus(node: GraphNode): void;
  /** Hide the node (restorable via Unhide; persisted in the perspective). */
  onHide(node: GraphNode): void;
  /** Remove the node from the view/perspective (Delete key does the same). */
  onRemove(node: GraphNode): void;
  /** Bulk actions over the whole selection (multi-select). */
  onHideSelection(): void;
  onRemoveSelection(): void;
  onOpenFile?(node: GraphNode): void;
}

export default function InspectorPanel(props: InspectorPanelProps) {
  const {
    node,
    selectionCount,
    edges,
    selectedEdge,
    nodeName,
    expanded,
    loading,
    readOnly,
    onToggleExpand,
    onShowRelated,
    onStartEdge,
    onStartPath,
    onEditNodeData,
    onEditEdge,
    onDeleteEdge,
    onSelectEdge,
    onFocus,
    onHide,
    onRemove,
    onHideSelection,
    onRemoveSelection,
    onOpenFile,
  } = props;

  if (!node && selectedEdge) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1">Edge</Typography>
        <Typography variant="body2" sx={{ my: 1 }}>
          {nodeName(selectedEdge.source)} → {nodeName(selectedEdge.target)}
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          {selectedEdge.types.map((t) => (
            <Chip key={t} size="small" label={t.toLowerCase()} />
          ))}
          {selectedEdge.synthetic && <Chip size="small" variant="outlined" label="derived" />}
        </Stack>
        {selectedEdge.title && <Typography variant="body2">{selectedEdge.title}</Typography>}
        {selectedEdge.description && (
          <Typography variant="caption" color="text.secondary">
            {selectedEdge.description}
          </Typography>
        )}
        {!readOnly && !selectedEdge.synthetic && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
            <Button size="small" onClick={() => onEditEdge(selectedEdge)}>
              Edit
            </Button>
            <Button size="small" color="error" onClick={() => onDeleteEdge(selectedEdge.id)}>
              Delete
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  if (!node) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select a node to inspect it.
        </Typography>
      </Box>
    );
  }

  const details: Array<[string, string | undefined]> = [
    ['Id', String(node.id)],
    ['Type', node.type],
    ['Namespace', node.nameSpace],
    ['Version', node.version],
    ['Path', node.data?.relativePath as string | undefined],
    ['Kind', node.data?.kind as string | undefined],
    ['Language', node.data?.language as string | undefined],
    ['Symlink target', (node.data?.symlink as { target?: string } | undefined)?.target],
    ['Provider', node.providerId],
    ['Description', node.description],
  ];
  const attributes = Object.entries(node.attributes ?? {}).filter(([, v]) => v !== undefined && v !== null);
  const filePath = (node.data?.relativePath ?? node.data?.path) as string | undefined;

  return (
    <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
      <Typography variant="subtitle1" noWrap title={node.name}>
        {node.name}
      </Typography>
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ my: 1 }}>
        <Chip size="small" label={node.type.toLowerCase()} />
        {node.data?.kind === 'symlink' && <Chip size="small" color="warning" label="symlink" />}
        {(node.origin === 'overlay' || node.origin === 'both') && (
          <Chip size="small" color="info" variant="outlined" label="agent" />
        )}
        {selectionCount > 1 && <Chip size="small" variant="outlined" label={`+${selectionCount - 1} selected`} />}
      </Stack>

      {selectionCount > 1 && (
        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
          <Button size="small" color="error" variant="outlined" onClick={onRemoveSelection}>
            Remove {selectionCount} nodes
          </Button>
          <Button size="small" onClick={onHideSelection}>
            Hide {selectionCount}
          </Button>
        </Stack>
      )}

      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
        {node.hasChildren && (
          <Button size="small" variant="outlined" disabled={loading} onClick={() => onToggleExpand(node)}>
            {loading ? 'Loading…' : expanded ? 'Collapse' : 'Expand'}
          </Button>
        )}
        <Button size="small" onClick={() => onShowRelated(node, 'dependencies')}>
          Deps
        </Button>
        <Button size="small" onClick={() => onShowRelated(node, 'dependents')}>
          Dependents
        </Button>
        <Tooltip title="Focus camera on this node">
          <IconButton size="small" onClick={() => onFocus(node)}>
            <Icon fontSize="small">center_focus_strong</Icon>
          </IconButton>
        </Tooltip>
        <Tooltip title="Find a path from this node: click a target node">
          <IconButton size="small" onClick={() => onStartPath(node)}>
            <Icon fontSize="small">route</Icon>
          </IconButton>
        </Tooltip>
        {!readOnly && (
          <>
            <Tooltip title="Create edge from this node: click a target node">
              <IconButton size="small" onClick={() => onStartEdge(node)}>
                <Icon fontSize="small">add_link</Icon>
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit node data">
              <IconButton size="small" onClick={() => onEditNodeData(node)}>
                <Icon fontSize="small">data_object</Icon>
              </IconButton>
            </Tooltip>
          </>
        )}
        {onOpenFile && node.type === 'FILE' && filePath && (
          <Tooltip title="View file">
            <IconButton size="small" onClick={() => onOpenFile(node)}>
              <Icon fontSize="small">visibility</Icon>
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Hide (restorable via Unhide)">
          <IconButton size="small" onClick={() => onHide(node)}>
            <Icon fontSize="small">visibility_off</Icon>
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove from view / perspective (Delete)">
          <IconButton size="small" onClick={() => onRemove(node)}>
            <Icon fontSize="small">delete</Icon>
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ my: 1 }} />
      <List dense disablePadding>
        {details
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([label, value]) => (
            <ListItem key={label} disableGutters sx={{ py: 0 }}>
              <ListItemText
                primary={value}
                secondary={label}
                primaryTypographyProps={{ variant: 'body2', sx: { wordBreak: 'break-all' } }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
      </List>

      {attributes.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="overline">Attributes</Typography>
          <List dense disablePadding>
            {attributes.slice(0, 40).map(([key, value]) => {
              // Parser-emitted file icons ({type:'svg', svg:'<svg…>'}) render
              // inline (sanitized) instead of as a JSON blob.
              const svg = toSafeSvg(value);
              if (svg) {
                return (
                  <ListItem key={key} disableGutters sx={{ py: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          '& svg': { width: 28, height: 28 },
                        }}
                        // Sanitized by toSafeSvg (no scripts/handlers/URLs).
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {key}
                      </Typography>
                    </Stack>
                  </ListItem>
                );
              }
              return (
                <ListItem key={key} disableGutters sx={{ py: 0 }}>
                  <ListItemText
                    primary={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    secondary={key}
                    primaryTypographyProps={{ variant: 'body2', sx: { wordBreak: 'break-all' } }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      <Divider sx={{ my: 1 }} />
      <Typography variant="overline">Edges ({edges.length})</Typography>
      <List dense disablePadding>
        {edges.slice(0, 80).map((edge) => (
          <ListItem
            key={edge.id}
            disableGutters
            sx={{ py: 0, cursor: 'pointer', bgcolor: selectedEdge?.id === edge.id ? 'action.selected' : undefined }}
            onClick={() => onSelectEdge(edge.id)}
            secondaryAction={
              !readOnly && !edge.synthetic ? (
                <Stack direction="row">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditEdge(edge); }}>
                    <Icon fontSize="small">edit</Icon>
                  </IconButton>
                  <IconButton size="small" edge="end" onClick={(e) => { e.stopPropagation(); onDeleteEdge(edge.id); }}>
                    <Icon fontSize="small">link_off</Icon>
                  </IconButton>
                </Stack>
              ) : undefined
            }
          >
            <ListItemText
              primary={`${nodeName(edge.source)} → ${nodeName(edge.target)}`}
              secondary={edge.types.join(', ').toLowerCase() + (edge.title ? ` — ${edge.title}` : '')}
              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
              secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
