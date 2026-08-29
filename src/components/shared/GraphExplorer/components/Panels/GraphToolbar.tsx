import React, { useState } from 'react';
import {
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import Icon from '@mui/material/Icon';
import { GraphLayoutKind, GraphPerspective, GraphViewMode } from '../../types';

export interface GraphToolbarProps {
  zoom: number;
  viewMode: GraphViewMode;
  layout: GraphLayoutKind;
  perspective: GraphPerspective | null;
  dirty: boolean;
  hiddenCount: number;
  truncated: boolean;
  readOnly?: boolean;
  compact?: boolean;
  pathMode?: boolean;
  canPin?: boolean;
  pinned?: boolean;
  onFit(): void;
  onTidy(): void;
  onViewModeChange(viewMode: GraphViewMode): void;
  onLayoutChange(layout: GraphLayoutKind): void;
  onSavePerspective(): void;
  onSaveAsPerspective(): void;
  onManagePerspectives(): void;
  onTogglePathMode(): void;
  onUnhideAll(): void;
  onToggleLeftPanel(): void;
  onPin?(): void;
  onReload?(): void;
}

const LAYOUTS: Array<{ key: GraphLayoutKind; label: string; icon: string }> = [
  { key: 'radial', label: 'Radial (containment)', icon: 'hub' },
  { key: 'force', label: 'Force directed', icon: 'bubble_chart' },
  { key: 'hierarchical', label: 'Hierarchical (layers)', icon: 'account_tree' },
];

export default function GraphToolbar(props: GraphToolbarProps) {
  const {
    zoom,
    viewMode,
    layout,
    perspective,
    dirty,
    hiddenCount,
    truncated,
    readOnly,
    compact,
    pathMode,
    canPin,
    pinned,
    onFit,
    onTidy,
    onViewModeChange,
    onLayoutChange,
    onSavePerspective,
    onSaveAsPerspective,
    onManagePerspectives,
    onTogglePathMode,
    onUnhideAll,
    onToggleLeftPanel,
    onPin,
    onReload,
  } = props;
  const [layoutAnchor, setLayoutAnchor] = useState<HTMLElement | null>(null);

  const canUpdate = Boolean(perspective?.id && perspective.isOwner && !readOnly);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      useFlexGap
      flexWrap="wrap"
      sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Tooltip title="Toggle panel">
        <IconButton size="small" onClick={onToggleLeftPanel}>
          <Icon fontSize="small">menu</Icon>
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem />

      <ToggleButtonGroup
        size="small"
        exclusive
        value={viewMode}
        onChange={(_, value) => value && onViewModeChange(value as GraphViewMode)}
      >
        <ToggleButton value="2d" sx={{ px: 1, py: 0.25 }}>
          <Tooltip title="2D board">
            <span>2D</span>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="3d" sx={{ px: 1, py: 0.25 }}>
          <Tooltip title="3D orbit">
            <span>3D</span>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Tooltip title="Layout">
        <IconButton size="small" onClick={(e) => setLayoutAnchor(e.currentTarget)}>
          <Icon fontSize="small">{LAYOUTS.find((l) => l.key === layout)?.icon ?? 'hub'}</Icon>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={layoutAnchor} open={Boolean(layoutAnchor)} onClose={() => setLayoutAnchor(null)}>
        {LAYOUTS.map((item) => (
          <MenuItem
            key={item.key}
            selected={item.key === layout}
            onClick={() => {
              setLayoutAnchor(null);
              onLayoutChange(item.key);
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small">{item.icon}</Icon>
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </MenuItem>
        ))}
      </Menu>

      <Tooltip title="Fit to content">
        <IconButton size="small" onClick={onFit}>
          <Icon fontSize="small">fit_screen</Icon>
        </IconButton>
      </Tooltip>
      <Tooltip title="Tidy (force relax unpinned nodes)">
        <IconButton size="small" onClick={onTidy}>
          <Icon fontSize="small">auto_fix_high</Icon>
        </IconButton>
      </Tooltip>
      <Tooltip title={pathMode ? 'Cancel path tool (Esc)' : 'Path tool: click two nodes to find a path'}>
        <IconButton size="small" color={pathMode ? 'primary' : 'default'} onClick={onTogglePathMode}>
          <Icon fontSize="small">route</Icon>
        </IconButton>
      </Tooltip>
      {hiddenCount > 0 && (
        <Tooltip title={`Unhide ${hiddenCount} hidden node(s)`}>
          <IconButton size="small" onClick={onUnhideAll}>
            <Icon fontSize="small">visibility</Icon>
          </IconButton>
        </Tooltip>
      )}
      <Divider orientation="vertical" flexItem />

      <Tooltip title="Perspectives">
        <IconButton size="small" onClick={onManagePerspectives}>
          <Icon fontSize="small">bookmarks</Icon>
        </IconButton>
      </Tooltip>
      <Chip
        size="small"
        variant={perspective ? 'filled' : 'outlined'}
        color={dirty && perspective ? 'warning' : 'default'}
        icon={<Icon fontSize="small">{perspective?.share ? 'group' : 'bookmark'}</Icon>}
        label={
          perspective
            ? `${perspective.name}${dirty ? ' •' : ''}${perspective.isOwner ? '' : ' (shared)'}`
            : 'No perspective'
        }
        onClick={onManagePerspectives}
        sx={{ maxWidth: compact ? 160 : 260 }}
      />
      {!readOnly && (
        <>
          <Tooltip title={canUpdate ? 'Save changes to this perspective' : 'Save as new perspective'}>
            <IconButton size="small" onClick={canUpdate ? onSavePerspective : onSaveAsPerspective}>
              <Icon fontSize="small">{canUpdate ? 'save' : 'bookmark_add'}</Icon>
            </IconButton>
          </Tooltip>
          {canUpdate && (
            <Tooltip title="Save as new perspective">
              <IconButton size="small" onClick={onSaveAsPerspective}>
                <Icon fontSize="small">save_as</Icon>
              </IconButton>
            </Tooltip>
          )}
        </>
      )}
      {canPin && onPin && (
        <Tooltip title={pinned ? 'Pinned to chat' : 'Pin perspective (+ selected node) to chat'}>
          <IconButton size="small" onClick={onPin} disabled={pinned} color={pinned ? 'success' : 'default'}>
            <Icon fontSize="small">{pinned ? 'push_pin' : 'push_pin'}</Icon>
          </IconButton>
        </Tooltip>
      )}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto', pr: 1 }}>
        {truncated && (
          <Tooltip title="The server limited this neighbourhood — expand nodes to load more.">
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              icon={<Icon fontSize="small">warning</Icon>}
              label="truncated"
              onClick={onReload}
            />
          </Tooltip>
        )}
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {Math.round(zoom * 100)}%
        </Typography>
      </Stack>
    </Stack>
  );
}
