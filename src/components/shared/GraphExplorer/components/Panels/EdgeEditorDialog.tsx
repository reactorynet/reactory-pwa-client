import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { GraphLinkType, GraphNode } from '../../types';

const EDGE_TYPES: GraphLinkType[] = [
  'DEPENDENCY',
  'CALL',
  'INHERITS',
  'IMPLEMENTS',
  'REFERENCE',
  'CONNECTION',
  'DIRECT',
];

export interface EdgeEditorDialogProps {
  open: boolean;
  from: GraphNode | null;
  to: GraphNode | null;
  onConfirm(types: GraphLinkType[], title?: string): void;
  onCancel(): void;
}

export default function EdgeEditorDialog(props: EdgeEditorDialogProps) {
  const { open, from, to, onConfirm, onCancel } = props;
  const [type, setType] = useState<GraphLinkType>('DEPENDENCY');
  const [title, setTitle] = useState('');

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Create edge</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {from?.name ?? '…'} → {to?.name ?? '…'}
        </Typography>
        <Stack spacing={2}>
          <TextField
            select
            size="small"
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as GraphLinkType)}
          >
            {EDGE_TYPES.map((edgeType) => (
              <MenuItem key={edgeType} value={edgeType}>
                {edgeType.toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!from || !to}
          onClick={() => onConfirm([type], title || undefined)}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
