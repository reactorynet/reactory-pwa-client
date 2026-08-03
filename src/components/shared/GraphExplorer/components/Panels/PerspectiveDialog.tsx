import React, { useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import Icon from '@mui/material/Icon';
import { GraphPerspective } from '../../types';

export interface SavePerspectiveDialogProps {
  open: boolean;
  defaultName: string;
  onConfirm(name: string): void;
  onCancel(): void;
}

export function SavePerspectiveDialog(props: SavePerspectiveDialogProps) {
  const { open, defaultName, onConfirm, onCancel } = props;
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Save perspective</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onConfirm(name.trim());
          }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim()} onClick={() => onConfirm(name.trim())}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export interface LoadPerspectiveDialogProps {
  open: boolean;
  loading: boolean;
  perspectives: GraphPerspective[];
  onLoad(perspective: GraphPerspective): void;
  onDelete(perspective: GraphPerspective): void;
  onCancel(): void;
}

export function LoadPerspectiveDialog(props: LoadPerspectiveDialogProps) {
  const { open, loading, perspectives, onLoad, onDelete, onCancel } = props;
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Load perspective</DialogTitle>
      <DialogContent sx={{ minHeight: 120 }}>
        {loading && <CircularProgress size={22} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        {!loading && perspectives.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No saved perspectives for this project.
          </Typography>
        )}
        <List dense disablePadding>
          {perspectives.map((perspective) => (
            <ListItemButton
              key={perspective.id ?? perspective.name}
              onClick={() => onLoad(perspective)}
            >
              <ListItemText
                primary={perspective.name}
                secondary={`${perspective.positions.length} node position(s)${perspective.share ? ' — shared' : ''}`}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <IconButton
                size="small"
                edge="end"
                aria-label="Delete perspective"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(perspective);
                }}
              >
                <Icon fontSize="small">delete</Icon>
              </IconButton>
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
