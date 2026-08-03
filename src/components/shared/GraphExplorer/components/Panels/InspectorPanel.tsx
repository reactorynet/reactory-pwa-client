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

export interface InspectorPanelProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  nodeName(id: number): string;
  expanded: boolean;
  readOnly?: boolean;
  onToggleExpand(node: GraphNode): void;
  onShowRelated(node: GraphNode, direction: 'dependencies' | 'dependents'): void;
  onStartEdge(node: GraphNode): void;
  onDeleteEdge(edgeId: string): void;
  /** Remove the node from the canvas (view only — Delete key does the same). */
  onRemoveFromView(node: GraphNode): void;
}

export default function InspectorPanel(props: InspectorPanelProps) {
  const {
    node,
    edges,
    nodeName,
    expanded,
    readOnly,
    onToggleExpand,
    onShowRelated,
    onStartEdge,
    onDeleteEdge,
    onRemoveFromView,
  } = props;

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
    ['Path', node.data?.relativePath as string | undefined],
    ['Kind', node.data?.kind as string | undefined],
    ['Language', node.data?.language as string | undefined],
    ['Symlink target', (node.data?.symlink as { target?: string } | undefined)?.target],
    ['Description', node.description],
  ];

  return (
    <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
      <Typography variant="subtitle1" noWrap>
        {node.name}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ my: 1 }}>
        <Chip size="small" label={node.type.toLowerCase()} />
        {node.data?.kind === 'symlink' && <Chip size="small" color="warning" label="symlink" />}
      </Stack>

      <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
        {node.hasChildren && (
          <Button size="small" variant="outlined" onClick={() => onToggleExpand(node)}>
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        )}
        <Button size="small" onClick={() => onShowRelated(node, 'dependencies')}>
          Deps
        </Button>
        <Button size="small" onClick={() => onShowRelated(node, 'dependents')}>
          Dependents
        </Button>
        {!readOnly && (
          <Tooltip title="Create edge from this node">
            <IconButton size="small" onClick={() => onStartEdge(node)}>
              <Icon fontSize="small">add_link</Icon>
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Remove from view (Delete)">
          <IconButton size="small" onClick={() => onRemoveFromView(node)}>
            <Icon fontSize="small">visibility_off</Icon>
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

      <Divider sx={{ my: 1 }} />
      <Typography variant="overline">Edges ({edges.length})</Typography>
      <List dense disablePadding>
        {edges.slice(0, 50).map((edge) => (
          <ListItem
            key={edge.id}
            disableGutters
            sx={{ py: 0 }}
            secondaryAction={
              !readOnly && !edge.synthetic ? (
                <IconButton size="small" edge="end" onClick={() => onDeleteEdge(edge.id)}>
                  <Icon fontSize="small">link_off</Icon>
                </IconButton>
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
