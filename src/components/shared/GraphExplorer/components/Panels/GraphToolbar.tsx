import React from 'react';
import { IconButton, Stack, Tooltip, Typography, Divider } from '@mui/material';
import Icon from '@mui/material/Icon';

export interface GraphToolbarProps {
  zoom: number;
  readOnly?: boolean;
  onFit(): void;
  onTidy(): void;
  onSavePerspective(): void;
  onLoadPerspective(): void;
  onToggleLeftPanel(): void;
}

export default function GraphToolbar(props: GraphToolbarProps) {
  const { zoom, readOnly, onFit, onTidy, onSavePerspective, onLoadPerspective, onToggleLeftPanel } = props;
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Tooltip title="Toggle panel">
        <IconButton size="small" onClick={onToggleLeftPanel}>
          <Icon fontSize="small">menu</Icon>
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem />
      <Tooltip title="Fit to content">
        <IconButton size="small" onClick={onFit}>
          <Icon fontSize="small">fit_screen</Icon>
        </IconButton>
      </Tooltip>
      <Tooltip title="Tidy graph (force layout)">
        <IconButton size="small" onClick={onTidy}>
          <Icon fontSize="small">auto_fix_high</Icon>
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem />
      <Tooltip title="Load perspective">
        <IconButton size="small" onClick={onLoadPerspective}>
          <Icon fontSize="small">bookmark</Icon>
        </IconButton>
      </Tooltip>
      {!readOnly && (
        <Tooltip title="Save perspective">
          <IconButton size="small" onClick={onSavePerspective}>
            <Icon fontSize="small">bookmark_add</Icon>
          </IconButton>
        </Tooltip>
      )}
      <Typography variant="caption" sx={{ ml: 'auto', pr: 1, color: 'text.secondary' }}>
        {Math.round(zoom * 100)}%
      </Typography>
    </Stack>
  );
}
