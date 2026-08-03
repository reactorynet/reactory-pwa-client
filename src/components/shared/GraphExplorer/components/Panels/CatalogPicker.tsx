import React from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import Icon from '@mui/material/Icon';
import { GraphNode } from '../../types';

export interface CatalogPickerProps {
  catalogs: GraphNode[];
  selectedId: number | null;
  loading: boolean;
  onSelect(node: GraphNode): void;
}

export default function CatalogPicker(props: CatalogPickerProps) {
  const { catalogs, selectedId, loading, onSelect } = props;
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
          <ListItemButton
            key={catalog.id}
            selected={catalog.id === selectedId}
            onClick={() => onSelect(catalog)}
          >
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
