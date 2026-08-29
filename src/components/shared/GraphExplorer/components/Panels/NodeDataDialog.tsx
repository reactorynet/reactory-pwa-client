import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { GraphNode } from '../../types';

export interface NodeDataDialogProps {
  open: boolean;
  node: GraphNode | null;
  onConfirm(data: Record<string, unknown>): void;
  onCancel(): void;
}

/**
 * Edits a node's free-form `data` payload (the only node field the server
 * exposes for mutation — names/types are owned by the indexer).
 */
export default function NodeDataDialog(props: NodeDataDialogProps) {
  const { open, node, onConfirm, onCancel } = props;
  const [text, setText] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText(JSON.stringify(node?.data ?? {}, null, 2));
      setError(null);
    }
  }, [open, node]);

  const submit = () => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('Data must be a JSON object');
        return;
      }
      onConfirm(parsed as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Edit node data — {node?.name ?? ''}</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Free-form JSON stored on the node (`data`). Paths and repo locations are managed by the indexer and
          are redacted here.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={10}
          maxRows={24}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          error={Boolean(error)}
          helperText={error ?? ' '}
          InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!node}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
