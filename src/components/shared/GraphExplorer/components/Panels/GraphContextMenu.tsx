import React from 'react';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import Icon from '@mui/material/Icon';
import { GraphNode } from '../../types';

export interface GraphContextMenuState {
  node: GraphNode;
  x: number;
  y: number;
}

export interface GraphContextMenuProps {
  state: GraphContextMenuState | null;
  expanded: boolean;
  readOnly?: boolean;
  onClose(): void;
  onToggleExpand(node: GraphNode): void;
  onShowRelated(node: GraphNode, direction: 'dependencies' | 'dependents'): void;
  onFocus(node: GraphNode): void;
  onStartPath(node: GraphNode): void;
  onStartEdge(node: GraphNode): void;
  onEditNodeData(node: GraphNode): void;
  onHide(node: GraphNode): void;
  /** Remove from the view/perspective (not persisted server data). */
  onRemove(node: GraphNode): void;
}

export default function GraphContextMenu(props: GraphContextMenuProps) {
  const {
    state,
    expanded,
    readOnly,
    onClose,
    onToggleExpand,
    onShowRelated,
    onFocus,
    onStartPath,
    onStartEdge,
    onEditNodeData,
    onHide,
    onRemove,
  } = props;
  const node = state?.node;
  const run = (fn: (node: GraphNode) => void) => () => {
    if (node) fn(node);
    onClose();
  };
  return (
    <Menu
      open={Boolean(state)}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={state ? { top: state.y, left: state.x } : undefined}
      MenuListProps={{ dense: true }}
    >
      {node?.hasChildren && (
        <MenuItem onClick={run((n) => onToggleExpand(n))}>
          <ListItemIcon><Icon fontSize="small">{expanded ? 'unfold_less' : 'unfold_more'}</Icon></ListItemIcon>
          <ListItemText>{expanded ? 'Collapse' : 'Expand'}</ListItemText>
        </MenuItem>
      )}
      <MenuItem onClick={run((n) => onShowRelated(n, 'dependencies'))}>
        <ListItemIcon><Icon fontSize="small">call_made</Icon></ListItemIcon>
        <ListItemText>Show dependencies</ListItemText>
      </MenuItem>
      <MenuItem onClick={run((n) => onShowRelated(n, 'dependents'))}>
        <ListItemIcon><Icon fontSize="small">call_received</Icon></ListItemIcon>
        <ListItemText>Show dependents</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(onFocus)}>
        <ListItemIcon><Icon fontSize="small">center_focus_strong</Icon></ListItemIcon>
        <ListItemText>Focus</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(onStartPath)}>
        <ListItemIcon><Icon fontSize="small">route</Icon></ListItemIcon>
        <ListItemText>Path to…</ListItemText>
      </MenuItem>
      {!readOnly && <Divider />}
      {!readOnly && (
        <MenuItem onClick={run(onStartEdge)}>
          <ListItemIcon><Icon fontSize="small">add_link</Icon></ListItemIcon>
          <ListItemText>Create edge to…</ListItemText>
        </MenuItem>
      )}
      {!readOnly && (
        <MenuItem onClick={run(onEditNodeData)}>
          <ListItemIcon><Icon fontSize="small">data_object</Icon></ListItemIcon>
          <ListItemText>Edit data</ListItemText>
        </MenuItem>
      )}
      <Divider />
      <MenuItem onClick={run(onHide)}>
        <ListItemIcon><Icon fontSize="small">visibility_off</Icon></ListItemIcon>
        <ListItemText>Hide (restorable)</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(onRemove)}>
        <ListItemIcon><Icon fontSize="small">delete</Icon></ListItemIcon>
        <ListItemText>Remove from perspective (Del)</ListItemText>
      </MenuItem>
    </Menu>
  );
}
