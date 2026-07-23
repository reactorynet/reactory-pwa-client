import React, { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Paper,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Delete,
  ArrowForward,
} from '@mui/icons-material';
import {
  MapRow,
  objectMapToRows,
  rowsToObjectMap,
  isSimpleObjectMap,
  ACTION_HANDLER_TYPES,
  MERGE_STRATEGIES,
  FETCH_POLICIES,
  RESULT_TYPES,
  NOTIFICATION_TYPES,
  MUTATION_HANDLED_BY,
  emptyEvent,
  emptyNotification,
} from './graphConfig';

// ── Small helpers ────────────────────────────────────────────────────────────

/** Multi-select of action-handler methods (onSuccessMethod / onErrorMethod). */
const MethodSelect: React.FC<{
  label: string;
  value: string | string[] | undefined;
  onChange: (v: string[]) => void;
}> = ({ label, value, onChange }) => {
  const arr = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <TextField
      select
      size="small"
      label={label}
      value={arr}
      SelectProps={{ multiple: true, renderValue: (v: any) => (v as string[]).join(', ') }}
      onChange={(e) => onChange(e.target.value as unknown as string[])}
      sx={{ minWidth: 220 }}
    >
      {ACTION_HANDLER_TYPES.map((m) => (
        <MenuItem key={m} value={m}>{m}</MenuItem>
      ))}
    </TextField>
  );
};

// ── ObjectMap editor (rows + JSON toggle) ────────────────────────────────────

export const MappingEditor: React.FC<{
  label: string;
  value: any;
  onChange: (map: any) => void;
  help?: string;
  sourceLabel?: string;
  targetLabel?: string;
}> = ({ label, value, onChange, help, sourceLabel = 'Source path', targetLabel = 'Target' }) => {
  const simple = isSimpleObjectMap(value);
  const [mode, setMode] = useState<'rows' | 'json'>(simple ? 'rows' : 'json');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value || {}, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'json') setJsonText(JSON.stringify(value || {}, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const rows = objectMapToRows(value);
  const updateRows = (next: MapRow[]) => onChange(rowsToObjectMap(next));

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>{label}</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, v) => v && setMode(v)}
        >
          <ToggleButton value="rows" disabled={!simple}>Rows</ToggleButton>
          <ToggleButton value="json">{'{ }'}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {mode === 'json' ? (
        <TextField
          fullWidth
          multiline
          minRows={4}
          size="small"
          value={jsonText}
          error={!!jsonError}
          helperText={jsonError || help || 'JSON object map (supports value transforms)'}
          onChange={(e) => {
            setJsonText(e.target.value);
            try {
              const parsed = JSON.parse(e.target.value || '{}');
              setJsonError(null);
              onChange(parsed);
            } catch {
              setJsonError('Invalid JSON');
            }
          }}
          sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
        />
      ) : (
        <Stack spacing={1}>
          {rows.length === 0 && (
            <Typography variant="caption" color="text.secondary">No mappings.</Typography>
          )}
          {rows.map((row, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <TextField
                size="small" label={sourceLabel} value={row.source}
                onChange={(e) => updateRows(rows.map((r, j) => (j === i ? { ...r, source: e.target.value } : r)))}
                sx={{ flex: 1 }}
              />
              <ArrowForward fontSize="small" color="disabled" />
              <TextField
                size="small" label={targetLabel} value={row.target}
                onChange={(e) => updateRows(rows.map((r, j) => (j === i ? { ...r, target: e.target.value } : r)))}
                sx={{ flex: 1 }}
              />
              <IconButton size="small" color="error" onClick={() => updateRows(rows.filter((_, j) => j !== i))}>
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Box>
            <Button size="small" startIcon={<Add />} onClick={() => updateRows([...rows, { source: '', target: '' }])}>
              Add mapping
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

// ── Event editor (IReactoryEvent) ────────────────────────────────────────────

const EventEditor: React.FC<{ value: any; onChange: (e: any) => void }> = ({ value = {}, onChange }) => {
  const set = (patch: any) => onChange({ ...value, ...patch });
  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <TextField size="small" label="Event name" value={value.name || ''} onChange={(e) => set({ name: e.target.value })} />
      <Stack direction="row" spacing={2}>
        <FormControlLabel control={<Switch checked={!!value.spreadProps} onChange={(e) => set({ spreadProps: e.target.checked })} />} label="Spread props" />
        <FormControlLabel control={<Switch checked={!!value.on} onChange={(e) => set({ on: e.target.checked })} />} label="Refresh on each event" />
      </Stack>
      <MappingEditor label="Data map" value={value.dataMap} onChange={(dataMap) => set({ dataMap })} />
    </Stack>
  );
};

const EventListEditor: React.FC<{ label: string; value: any[]; onChange: (events: any[]) => void }> = ({ label, value = [], onChange }) => (
  <Box>
    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{label}</Typography>
    <Stack spacing={1}>
      {value.map((ev, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 1 }}>
          <Stack direction="row" alignItems="center">
            <Typography variant="caption" sx={{ flexGrow: 1 }}>Event {i + 1}</Typography>
            <IconButton size="small" color="error" onClick={() => onChange(value.filter((_, j) => j !== i))}><Delete fontSize="small" /></IconButton>
          </Stack>
          <EventEditor value={ev} onChange={(next) => onChange(value.map((e, j) => (j === i ? next : e)))} />
        </Paper>
      ))}
      <Box><Button size="small" startIcon={<Add />} onClick={() => onChange([...value, emptyEvent()])}>Add event</Button></Box>
    </Stack>
  </Box>
);

// ── Notification editor (IReactoryNotification) ──────────────────────────────

const NotificationEditor: React.FC<{ value: any; onChange: (n: any) => void }> = ({ value = {}, onChange }) => {
  const set = (patch: any) => onChange({ ...value, ...patch });
  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <TextField size="small" label="Title" value={value.title || ''} onChange={(e) => set({ title: e.target.value })} sx={{ flex: 1, minWidth: 160 }} />
        <TextField select size="small" label="Type" value={value.type || 'info'} onChange={(e) => set({ type: e.target.value })} sx={{ width: 140 }}>
          {NOTIFICATION_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </Stack>
      <TextField size="small" label="Message" value={value.body || ''} onChange={(e) => set({ body: e.target.value })} />
      <FormControlLabel control={<Switch checked={value.inAppNotification !== false} onChange={(e) => set({ inAppNotification: e.target.checked })} />} label="In-app notification" />
    </Stack>
  );
};

// ── Error handler editor (IReactoryFormQueryErrorHandlerDefinition) ──────────

const ErrorHandlerEditor: React.FC<{ value: any; onChange: (e: any) => void }> = ({ value = {}, onChange }) => {
  const set = (patch: any) => onChange({ ...value, ...patch });
  return (
    <Stack spacing={1.5}>
      <MethodSelect label="On error method" value={value.onErrorMethod} onChange={(v) => set({ onErrorMethod: v })} />
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <TextField size="small" label="Component ref (FQN)" value={value.componentRef || ''} onChange={(e) => set({ componentRef: e.target.value })} sx={{ flex: 1, minWidth: 180 }} />
        <TextField size="small" label="Method name" value={value.method || ''} onChange={(e) => set({ method: e.target.value })} sx={{ width: 160 }} />
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <TextField size="small" label="Redirect URL" value={value.onErrorUrl || ''} onChange={(e) => set({ onErrorUrl: e.target.value })} sx={{ flex: 1, minWidth: 200 }} />
        <TextField size="small" type="number" label="Redirect timeout (ms)" value={value.onErrorRedirectTimeout ?? ''} onChange={(e) => set({ onErrorRedirectTimeout: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} sx={{ width: 180 }} />
      </Stack>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="body2">Error event</Typography></AccordionSummary>
        <AccordionDetails><EventEditor value={value.onErrorEvent} onChange={(onErrorEvent) => set({ onErrorEvent })} /></AccordionDetails>
      </Accordion>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="body2">Error notification</Typography></AccordionSummary>
        <AccordionDetails><NotificationEditor value={value.notification} onChange={(notification) => set({ notification })} /></AccordionDetails>
      </Accordion>
    </Stack>
  );
};

// ── Result handler editor (IReactoryFormGraphResultHandler) ──────────────────

const ResultHandlerEditor: React.FC<{ value: any; onChange: (v: any) => void; showResultMap?: boolean }> = ({ value = {}, onChange, showResultMap = true }) => {
  const set = (patch: any) => onChange({ ...value, ...patch });
  return (
    <Stack spacing={1.5}>
      <MethodSelect label="On success method" value={value.onSuccessMethod} onChange={(v) => set({ onSuccessMethod: v })} />
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <TextField size="small" label="Success redirect URL" value={value.onSuccessUrl || ''} onChange={(e) => set({ onSuccessUrl: e.target.value })} sx={{ flex: 1, minWidth: 200 }} />
        <TextField size="small" type="number" label="Redirect timeout (ms)" value={value.onSuccessRedirectTimeout ?? ''} onChange={(e) => set({ onSuccessRedirectTimeout: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} sx={{ width: 180 }} />
      </Stack>
      <TextField size="small" label="Component ref (FQN)" value={value.componentRef || ''} onChange={(e) => set({ componentRef: e.target.value })} />
      {showResultMap && (
        <MappingEditor label="Result map" value={value.resultMap} onChange={(resultMap) => set({ resultMap })} sourceLabel="Result path" targetLabel="Form data path" help="Map the query/mutation result into the form data" />
      )}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <TextField select size="small" label="Merge strategy" value={value.mergeStrategy || ''} onChange={(e) => set({ mergeStrategy: e.target.value })} sx={{ width: 160 }}>
          <MenuItem value="">(default)</MenuItem>
          {MERGE_STRATEGIES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Merge function (FQN)" value={value.mergeFunction || ''} onChange={(e) => set({ mergeFunction: e.target.value })} disabled={value.mergeStrategy !== 'function'} sx={{ flex: 1, minWidth: 200 }} />
      </Stack>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="body2">Success event</Typography></AccordionSummary>
        <AccordionDetails><EventEditor value={value.onSuccessEvent} onChange={(onSuccessEvent) => set({ onSuccessEvent })} /></AccordionDetails>
      </Accordion>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="body2">Success notification</Typography></AccordionSummary>
        <AccordionDetails><NotificationEditor value={value.notification} onChange={(notification) => set({ notification })} /></AccordionDetails>
      </Accordion>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="body2">Error handling</Typography></AccordionSummary>
        <AccordionDetails><ErrorHandlerEditor value={value.onError} onChange={(onError) => set({ onError })} /></AccordionDetails>
      </Accordion>
    </Stack>
  );
};

// ── Response handlers (per-typename) ─────────────────────────────────────────

const ResponseHandlersEditor: React.FC<{ value: any; onChange: (v: any) => void }> = ({ value = {}, onChange }) => {
  const [newType, setNewType] = useState('');
  const keys = Object.keys(value || {});
  const setHandler = (key: string, handler: any) => onChange({ ...value, [key]: handler });
  const removeHandler = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };
  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary">
        Handle union-type results: add a handler keyed by the response __typename.
      </Typography>
      {keys.map((key) => (
        <Paper key={key} variant="outlined" sx={{ p: 1 }}>
          <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
            <Chip label={key} size="small" sx={{ flexGrow: 1, mr: 1 }} />
            <IconButton size="small" color="error" onClick={() => removeHandler(key)}><Delete fontSize="small" /></IconButton>
          </Stack>
          <ResultHandlerEditor value={value[key]} onChange={(h) => setHandler(key, h)} />
        </Paper>
      ))}
      <Stack direction="row" spacing={1}>
        <TextField size="small" label="Response __typename" value={newType} onChange={(e) => setNewType(e.target.value)} />
        <Button size="small" startIcon={<Add />} disabled={!newType || !!value[newType]} onClick={() => { setHandler(newType, {}); setNewType(''); }}>Add handler</Button>
      </Stack>
    </Stack>
  );
};

// ── Main element editor ──────────────────────────────────────────────────────

const SectionAccordion: React.FC<{ title: string; defaultExpanded?: boolean; children: React.ReactNode }> = ({ title, defaultExpanded, children }) => (
  <Accordion defaultExpanded={defaultExpanded} disableGutters>
    <AccordionSummary expandIcon={<ExpandMore />}><Typography sx={{ fontWeight: 600 }}>{title}</Typography></AccordionSummary>
    <AccordionDetails><Box sx={{ pt: 0.5 }}>{children}</Box></AccordionDetails>
  </Accordion>
);

export interface GraphElementEditorProps {
  kind: 'query' | 'mutation';
  value: any;
  onChange: (value: any) => void;
}

export const GraphElementEditor: React.FC<GraphElementEditorProps> = ({ kind, value, onChange }) => {
  const set = (patch: any) => onChange({ ...value, ...patch });
  const setOption = (patch: any) => onChange({ ...value, options: { ...(value.options || {}), ...patch } });
  const refetchQueries: string[] = Array.isArray(value?.options?.refetchQueries) ? value.options.refetchQueries : [];

  return (
    <Box>
      <SectionAccordion title="Basics" defaultExpanded>
        <Stack spacing={1.5}>
          <TextField size="small" label="Name" value={value.name || ''} onChange={(e) => set({ name: e.target.value })} required helperText="The graph operation name (matches the server query/mutation)" />
          <TextField
            label="GraphQL text" value={value.text || ''} onChange={(e) => set({ text: e.target.value })}
            fullWidth multiline minRows={6} required
            placeholder={kind === 'query' ? 'query MyQuery($id: String!) { ... }' : 'mutation MyMutation($input: Input!) { ... }'}
            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.82rem' } }}
          />
        </Stack>
      </SectionAccordion>

      <SectionAccordion title="Variables" defaultExpanded>
        <MappingEditor
          label="Variable mapping"
          value={value.variables}
          onChange={(variables) => set({ variables })}
          sourceLabel="Form/context path" targetLabel="Query variable"
          help="Map form data / context (e.g. formData.id) to GraphQL variables"
        />
      </SectionAccordion>

      <SectionAccordion title="Result binding">
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <TextField select size="small" label="Result type" value={value.resultType || ''} onChange={(e) => set({ resultType: e.target.value })} sx={{ width: 140 }}>
              <MenuItem value="">(auto)</MenuItem>
              {RESULT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Result key" value={value.resultKey || ''} onChange={(e) => set({ resultKey: e.target.value })} helperText="Extract a single value from the result" sx={{ flex: 1, minWidth: 180 }} />
          </Stack>
          <Divider />
          <ResultHandlerEditor value={value} onChange={(next) => onChange({ ...value, ...next })} />
        </Stack>
      </SectionAccordion>

      {kind === 'query' && (
        <SectionAccordion title="Query behaviour">
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControlLabel control={<Switch checked={!!value.autoQuery} onChange={(e) => set({ autoQuery: e.target.checked })} />} label="Auto query on mount" />
              <FormControlLabel control={<Switch checked={!!value.useWebsocket} onChange={(e) => set({ useWebsocket: e.target.checked })} />} label="Use websocket" />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <TextField size="small" type="number" label="Auto query delay (ms)" value={value.autoQueryDelay ?? ''} onChange={(e) => set({ autoQueryDelay: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} sx={{ width: 180 }} />
              <TextField size="small" type="number" label="Poll interval (ms)" value={value.interval ?? ''} onChange={(e) => set({ interval: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} sx={{ width: 160 }} />
              <TextField size="small" type="number" label="Throttle (ms)" value={value.throttle ?? ''} onChange={(e) => set({ throttle: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} sx={{ width: 140 }} />
            </Stack>
            <TextField size="small" label="Query message" value={value.queryMessage || ''} onChange={(e) => set({ queryMessage: e.target.value })} helperText="Shown while the query is running" />
            <TextField select size="small" label="Fetch policy" value={value.options?.fetchPolicy || ''} onChange={(e) => setOption({ fetchPolicy: e.target.value })} sx={{ width: 220 }}>
              <MenuItem value="">(default)</MenuItem>
              {FETCH_POLICIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <Divider />
            <EventListEditor label="Refresh events" value={value.refreshEvents || []} onChange={(refreshEvents) => set({ refreshEvents })} />
          </Stack>
        </SectionAccordion>
      )}

      {kind === 'mutation' && (
        <SectionAccordion title="Mutation behaviour">
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <TextField select size="small" label="Handled by" value={value.handledBy || ''} onChange={(e) => set({ handledBy: e.target.value })} sx={{ width: 160 }}>
                <MenuItem value="">(default)</MenuItem>
                {MUTATION_HANDLED_BY.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
              </TextField>
              <TextField size="small" type="number" label="Throttle (ms)" value={value.throttle ?? ''} onChange={(e) => set({ throttle: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} sx={{ width: 140 }} />
              <FormControlLabel control={<Switch checked={!!value.objectMap} onChange={(e) => set({ objectMap: e.target.checked })} />} label="Object map" />
            </Stack>
            <TextField size="small" label="Update message" value={value.updateMessage || ''} onChange={(e) => set({ updateMessage: e.target.value })} helperText="Shown in a minimal modal while the mutation runs" />
            <TextField select size="small" label="Fetch policy" value={value.options?.fetchPolicy || ''} onChange={(e) => setOption({ fetchPolicy: e.target.value })} sx={{ width: 220 }}>
              <MenuItem value="">(default)</MenuItem>
              {FETCH_POLICIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Refetch queries</Typography>
              <Stack spacing={1}>
                {refetchQueries.map((q, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <TextField size="small" fullWidth value={q} onChange={(e) => setOption({ refetchQueries: refetchQueries.map((x, j) => (j === i ? e.target.value : x)) })} />
                    <IconButton size="small" color="error" onClick={() => setOption({ refetchQueries: refetchQueries.filter((_, j) => j !== i) })}><Delete fontSize="small" /></IconButton>
                  </Stack>
                ))}
                <Box><Button size="small" startIcon={<Add />} onClick={() => setOption({ refetchQueries: [...refetchQueries, ''] })}>Add refetch query</Button></Box>
              </Stack>
            </Box>
            <Divider />
            <EventListEditor label="Refresh events" value={value.refreshEvents || []} onChange={(refreshEvents) => set({ refreshEvents })} />
          </Stack>
        </SectionAccordion>
      )}

      <SectionAccordion title="Response handlers (union types)">
        <ResponseHandlersEditor value={value.responseHandlers} onChange={(responseHandlers) => set({ responseHandlers })} />
      </SectionAccordion>
    </Box>
  );
};

export default GraphElementEditor;
