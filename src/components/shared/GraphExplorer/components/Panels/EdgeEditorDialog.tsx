import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ALL_LINK_TYPES, GraphEdge, GraphLinkType, GraphNode } from '../../types';

const EDITABLE_TYPES: GraphLinkType[] = ALL_LINK_TYPES.filter(
  (t) => t !== 'UNKNOWN' && t !== 'CONTAINS'
);

export interface EdgeEditorDialogProps {
  open: boolean;
  from: GraphNode | null;
  to: GraphNode | null;
  /** When set the dialog edits this edge (types/title/description). */
  edge?: GraphEdge | null;
  onConfirm(types: GraphLinkType[], title?: string, description?: string): void;
  onCancel(): void;
}

/** Create or edit an edge; supports multiple link types per edge. */
export default function EdgeEditorDialog(props: EdgeEditorDialogProps) {
  const { open, from, to, edge, onConfirm, onCancel } = props;
  const [types, setTypes] = useState<GraphLinkType[]>(['DEPENDENCY']);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Reset per opening so the previous edge's values never leak into the next.
  useEffect(() => {
    if (!open) return;
    setTypes(edge?.types.filter((t) => EDITABLE_TYPES.includes(t)) ?? ['DEPENDENCY']);
    setTitle(edge?.title ?? '');
    setDescription(edge?.description ?? '');
  }, [open, edge]);

  const valid = Boolean(from && to) && types.length > 0;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{edge ? 'Edit edge' : 'Create edge'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {from?.name ?? '…'} → {to?.name ?? '…'}
        </Typography>
        <Stack spacing={2}>
          <Autocomplete
            multiple
            size="small"
            options={EDITABLE_TYPES}
            value={types}
            onChange={(_, value) => setTypes(value as GraphLinkType[])}
            getOptionLabel={(option) => option.toLowerCase()}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option} size="small" label={option.toLowerCase()} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Types" />}
          />
          <TextField
            size="small"
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            size="small"
            label="Description (optional)"
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!valid}
          onClick={() => onConfirm(types, title || undefined, description || undefined)}
        >
          {edge ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
