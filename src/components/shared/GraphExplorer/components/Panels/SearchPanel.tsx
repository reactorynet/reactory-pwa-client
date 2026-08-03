import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import Icon from '@mui/material/Icon';
import { GraphNode } from '../../types';

export interface SearchPanelProps {
  onSearch(term: string): Promise<GraphNode[]>;
  onResultClick(node: GraphNode): void;
}

export default function SearchPanel(props: SearchPanelProps) {
  const { onSearch, onResultClick } = props;
  const [results, setResults] = useState<GraphNode[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const term = event.target.value;
      window.clearTimeout(debounceRef.current);
      if (term.trim().length < 2) {
        setResults([]);
        return;
      }
      debounceRef.current = window.setTimeout(async () => {
        setSearching(true);
        try {
          setResults(await onSearch(term.trim()));
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      }, 350);
    },
    [onSearch]
  );

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search graph…"
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Icon fontSize="small">search</Icon>
            </InputAdornment>
          ),
        }}
      />
      {searching && (
        <Typography variant="caption" color="text.secondary">
          Searching…
        </Typography>
      )}
      <List dense disablePadding sx={{ maxHeight: 240, overflowY: 'auto' }}>
        {results.map((node) => (
          <ListItemButton key={`${node.id}-${node.key}`} onClick={() => onResultClick(node)}>
            <ListItemText
              primary={node.name}
              secondary={`${node.type}${node.data?.relativePath ? ` — ${node.data.relativePath}` : ''}`}
              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
              secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
