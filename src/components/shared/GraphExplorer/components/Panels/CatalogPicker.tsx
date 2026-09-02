import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Box,
  Stack,
} from '@mui/material';
import Icon from '@mui/material/Icon';
import { GraphNode } from '../../types';

export interface CatalogPickerProps {
  catalogs: GraphNode[];
  selectedId: number | null;
  loading: boolean;
  /** Replace the view with this project (also the ⟳ button). */
  onSelect(node: GraphNode): void;
  /** Merge this project into the current view (the + button). */
  onAdd(node: GraphNode): void;
}

export default function CatalogPicker(props: CatalogPickerProps) {
  const { catalogs, selectedId, loading, onSelect, onAdd } = props;
  return (
    <Box>
      <Typography variant="overline" sx={{ px: 2 }}>
        Projects
      </Typography>
      {loading && catalogs.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      <List dense disablePadding>
        {catalogs.map((catalog) => (
          <ListItem
            key={catalog.id}
            disablePadding
            secondaryAction={
              <Stack direction="row" spacing={0}>
                <Tooltip title="Add to current view (build a combined perspective)">
                  <IconButton size="small" onClick={() => onAdd(catalog)} aria-label={`Add ${catalog.name} to view`}>
                    <Icon fontSize="small">add</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Replace the view with this project">
                  <IconButton
                    size="small"
                    edge="end"
                    onClick={() => onSelect(catalog)}
                    aria-label={`Replace view with ${catalog.name}`}
                  >
                    <Icon fontSize="small">autorenew</Icon>
                  </IconButton>
                </Tooltip>
              </Stack>
            }
          >
            <ListItemButton selected={catalog.id === selectedId} onClick={() => onSelect(catalog)} sx={{ pr: 9 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Icon fontSize="small">hub</Icon>
              </ListItemIcon>
              <ListItemText
                primary={catalog.name}
                secondary={catalog.nameSpace ? `${catalog.nameSpace}@${catalog.version ?? ''}` : undefined}
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {!loading && catalogs.length === 0 && (
        <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>
          No cataloged projects.
        </Typography>
      )}
    </Box>
  );
}
