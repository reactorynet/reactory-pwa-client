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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Storage,
  FlashOn,
} from '@mui/icons-material';
import { GraphElementDialog } from './GraphElementDialog';
import { STANDARD_MUTATION_KEYS, emptyQuery, emptyMutation } from './graphConfig';

interface VisualGraphQLDataEditorProps {
  data: any; // The IFormGraphDefinition object
  onChange: (data: any) => void;
}

type DialogState = {
  open: boolean;
  kind: 'query' | 'mutation';
  slot: 'primary' | string; // 'primary' for data.query, otherwise the key in queries/mutation
  initialData?: any;
};

/** Compact summary card for a query / mutation. */
const ElementCard: React.FC<{
  keyLabel?: string;
  keyColor?: any;
  element: any;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ keyLabel, keyColor, element, onEdit, onDelete }) => (
  <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
    <Stack direction="row" alignItems="flex-start" spacing={1}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
          {keyLabel && <Chip label={keyLabel} size="small" color={keyColor} />}
          <Typography variant="subtitle2">{element?.name || '(unnamed)'}</Typography>
          {element?.variables && Object.keys(element.variables).length > 0 && (
            <Chip label={`${Object.keys(element.variables).length} vars`} size="small" variant="outlined" />
          )}
          {element?.resultMap && Object.keys(element.resultMap).length > 0 && (
            <Chip label="result map" size="small" variant="outlined" />
          )}
          {element?.autoQuery && <Chip label="auto" size="small" variant="outlined" color="info" />}
          {element?.handledBy && <Chip label={element.handledBy} size="small" variant="outlined" />}
        </Stack>
        <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {(element?.text || '').replace(/\s+/g, ' ').slice(0, 80) || 'no query text'}
        </Typography>
      </Box>
      <Tooltip title="Edit"><IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Remove"><IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  </Paper>
);

/** Inline "add a keyed entry" row. */
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

export const VisualGraphQLDataEditor: React.FC<VisualGraphQLDataEditorProps> = ({ data = {}, onChange }) => {
  const [dialog, setDialog] = useState<DialogState>({ open: false, kind: 'query', slot: 'primary' });

  const queries = data?.queries || {};
  const mutations = data?.mutation || {};

  const update = (patch: any) => onChange({ ...data, ...patch });

  const openEditor = (kind: 'query' | 'mutation', slot: string, initialData: any) =>
    setDialog({ open: true, kind, slot, initialData });

  const handleSave = (element: any) => {
    if (dialog.kind === 'query') {
      if (dialog.slot === 'primary') {
        update({ query: element });
      } else {
        update({ queries: { ...queries, [dialog.slot]: element } });
      }
    } else {
      update({ mutation: { ...mutations, [dialog.slot]: element } });
    }
  };

  const removeQuery = (slot: string) => {
    if (slot === 'primary') { update({ query: undefined }); return; }
    const next = { ...queries };
    delete next[slot];
    update({ queries: next });
  };

  const removeMutation = (key: string) => {
    const next = { ...mutations };
    delete next[key];
    update({ mutation: next });
  };

  const mutationKeys = Object.keys(mutations);
  const missingStandard = STANDARD_MUTATION_KEYS.filter((k) => !mutations[k]);

  return (
    <Box>
      {/* ── Primary query ─────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Storage color="primary" fontSize="small" /> Primary query
        </Typography>
        {!data?.query && (
          <Button size="small" variant="outlined" startIcon={<AddIcon />}
            onClick={() => openEditor('query', 'primary', emptyQuery())}>
            Add primary query
          </Button>
        )}
      </Stack>
      {data?.query ? (
        <ElementCard
          keyLabel="primary" keyColor="primary" element={data.query}
          onEdit={() => openEditor('query', 'primary', data.query)}
          onDelete={() => removeQuery('primary')}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No primary query. The primary query loads the form's data.
        </Typography>
      )}

      {/* ── Named queries ─────────────────────────────────────────────── */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Storage color="action" fontSize="small" /> Named queries
      </Typography>
      {Object.entries(queries).map(([key, q]: [string, any]) => (
        <ElementCard
          key={key} keyLabel={key} element={q}
          onEdit={() => openEditor('query', key, q)}
          onDelete={() => removeQuery(key)}
        />
      ))}
      <AddKeyRow label="New query key" existing={Object.keys(queries)} onAdd={(key) => openEditor('query', key, emptyQuery(key))} />

      {/* ── Mutations ─────────────────────────────────────────────────── */}
      <Divider sx={{ my: 2 }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlashOn color="secondary" fontSize="small" /> Mutations
        </Typography>
        <Box>
          {missingStandard.map((key) => (
            <Button key={key} size="small" variant="outlined" startIcon={<AddIcon />} sx={{ ml: 1 }}
              onClick={() => openEditor('mutation', key, emptyMutation(`${key}Mutation`))}>
              Add {key}
            </Button>
          ))}
        </Box>
      </Stack>
      {mutationKeys.map((key) => (
        <ElementCard
          key={key} keyLabel={key}
          keyColor={key === 'new' ? 'success' : key === 'edit' ? 'info' : key === 'delete' ? 'error' : 'default'}
          element={mutations[key]}
          onEdit={() => openEditor('mutation', key, mutations[key])}
          onDelete={() => removeMutation(key)}
        />
      ))}
      {mutationKeys.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No mutations configured.</Typography>
      )}
      <AddKeyRow label="Custom mutation key" existing={mutationKeys} onAdd={(key) => openEditor('mutation', key, emptyMutation(`${key}Mutation`))} />

      {dialog.open && (
        <GraphElementDialog
          open={dialog.open}
          kind={dialog.kind}
          title={`${dialog.slot === 'primary' ? 'Primary' : dialog.slot} ${dialog.kind}`}
          initialData={dialog.initialData}
          onClose={() => setDialog((prev) => ({ ...prev, open: false }))}
          onSave={handleSave}
        />
      )}
    </Box>
  );
};
