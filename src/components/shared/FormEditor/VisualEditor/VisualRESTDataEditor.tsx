import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Storage,
  FlashOn,
} from '@mui/icons-material';
import { RESTCallDialog } from './RESTCallDialog';
import { emptyRestCall } from './restConfig';

interface VisualRESTDataEditorProps {
  data: any; // The REST provider object (holds default/queries/mutations)
  onChange: (data: any) => void;
}

type DialogState = {
  open: boolean;
  group: 'queries' | 'mutations';
  key: string;
  initialData?: any;
};

const methodColor = (m: string): any =>
  m === 'GET' ? 'info' : m === 'DELETE' ? 'error' : m === 'POST' ? 'success' : 'warning';

const CallCard: React.FC<{
  callKey: string;
  call: any;
  isDefault?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMakeDefault?: () => void;
}> = ({ callKey, call, isDefault, onEdit, onDelete, onMakeDefault }) => (
  <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
    <Stack direction="row" alignItems="flex-start" spacing={1}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
          <Chip label={callKey} size="small" />
          <Chip label={call?.method || 'GET'} size="small" color={methodColor(call?.method || 'GET')} variant="outlined" />
          {isDefault && <Chip label="default" size="small" color="primary" />}
          {call?.runat && <Chip label={call.runat} size="small" variant="outlined" />}
          {call?.options?.headers && Object.keys(call.options.headers).length > 0 && (
            <Chip label={`${Object.keys(call.options.headers).length} headers`} size="small" variant="outlined" />
          )}
        </Stack>
        <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {call?.url || 'no url'}
        </Typography>
      </Box>
      {onMakeDefault && !isDefault && (
        <Tooltip title="Set as default query"><Button size="small" onClick={onMakeDefault}>Default</Button></Tooltip>
      )}
      <Tooltip title="Edit"><IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Remove"><IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  </Paper>
);

const AddKeyRow: React.FC<{ label: string; existing: string[]; onAdd: (key: string) => void }> = ({ label, existing, onAdd }) => {
  const [key, setKey] = useState('');
  const invalid = !key || existing.includes(key);
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
      <TextField size="small" label={label} value={key} onChange={(e) => setKey(e.target.value.trim())} />
      <Button size="small" startIcon={<AddIcon />} disabled={invalid} onClick={() => { onAdd(key); setKey(''); }}>Add</Button>
    </Stack>
  );
};

export const VisualRESTDataEditor: React.FC<VisualRESTDataEditorProps> = ({ data = {}, onChange }) => {
  const [dialog, setDialog] = useState<DialogState>({ open: false, group: 'queries', key: '' });

  const queries = data?.queries || {};
  const mutations = data?.mutations || {};
  const queryKeys = Object.keys(queries);
  const mutationKeys = Object.keys(mutations);

  const update = (patch: any) => onChange({ ...data, ...patch });

  const openEditor = (group: 'queries' | 'mutations', key: string, initialData: any) =>
    setDialog({ open: true, group, key, initialData });

  const handleSave = (call: any) => {
    if (dialog.group === 'queries') {
      const nextQueries = { ...queries, [dialog.key]: call };
      // First query added becomes the default when none is set.
      const nextDefault = data?.default || dialog.key;
      update({ queries: nextQueries, default: nextDefault });
    } else {
      update({ mutations: { ...mutations, [dialog.key]: call } });
    }
  };

  const removeQuery = (key: string) => {
    const next = { ...queries };
    delete next[key];
    const patch: any = { queries: next };
    if (data?.default === key) patch.default = Object.keys(next)[0];
    update(patch);
  };

  const removeMutation = (key: string) => {
    const next = { ...mutations };
    delete next[key];
    update({ mutations: next });
  };

  return (
    <Box>
      {/* ── Queries ───────────────────────────────────────────────────── */}
      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Storage color="primary" fontSize="small" /> REST queries (read)
      </Typography>
      {queryKeys.map((key) => (
        <CallCard
          key={key} callKey={key} call={queries[key]}
          isDefault={data?.default === key}
          onEdit={() => openEditor('queries', key, queries[key])}
          onDelete={() => removeQuery(key)}
          onMakeDefault={() => update({ default: key })}
        />
      ))}
      {queryKeys.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No REST queries configured.</Typography>
      )}
      <AddKeyRow label="New query key" existing={queryKeys} onAdd={(key) => openEditor('queries', key, emptyRestCall())} />

      {/* ── Mutations ─────────────────────────────────────────────────── */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <FlashOn color="secondary" fontSize="small" /> REST mutations (write)
      </Typography>
      {mutationKeys.map((key) => (
        <CallCard
          key={key} callKey={key} call={mutations[key]}
          onEdit={() => openEditor('mutations', key, mutations[key])}
          onDelete={() => removeMutation(key)}
        />
      ))}
      {mutationKeys.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No REST mutations configured.</Typography>
      )}
      <AddKeyRow label="New mutation key" existing={mutationKeys} onAdd={(key) => openEditor('mutations', key, { ...emptyRestCall(), method: 'POST' })} />

      {dialog.open && (
        <RESTCallDialog
          open={dialog.open}
          title={`${dialog.key} (${dialog.group === 'queries' ? 'query' : 'mutation'})`}
          initialData={dialog.initialData}
          onClose={() => setDialog((prev) => ({ ...prev, open: false }))}
          onSave={handleSave}
        />
      )}
    </Box>
  );
};

export default VisualRESTDataEditor;
