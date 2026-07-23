import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { MappingEditor } from './GraphElementEditor';
import {
  REST_METHODS,
  REST_PROVIDERS,
  REST_RUNAT,
  METHODS_WITH_BODY,
  parseBodyValue,
  bodyToText,
  splitOptions,
  mergeOptions,
} from './restConfig';

export interface RESTCallEditorProps {
  value: any;
  onChange: (value: any) => void;
}

const SectionAccordion: React.FC<{ title: string; defaultExpanded?: boolean; children: React.ReactNode }> = ({ title, defaultExpanded, children }) => (
  <Accordion defaultExpanded={defaultExpanded} disableGutters>
    <AccordionSummary expandIcon={<ExpandMore />}><Typography sx={{ fontWeight: 600 }}>{title}</Typography></AccordionSummary>
    <AccordionDetails><Box sx={{ pt: 0.5 }}>{children}</Box></AccordionDetails>
  </Accordion>
);

export const RESTCallEditor: React.FC<RESTCallEditorProps> = ({ value, onChange }) => {
  const { headers, body, other } = splitOptions(value?.options);
  const method = value?.method || 'GET';

  const set = (patch: any) => onChange({ ...value, ...patch });
  const setOptions = (nextHeaders: any, nextBody: any, nextOther: Record<string, any>) =>
    onChange({ ...value, options: mergeOptions(nextHeaders, nextBody, nextOther) });

  // Local text state for body + other-options JSON (so invalid intermediate text
  // does not clobber the stored value).
  const [bodyText, setBodyText] = useState<string>(() => bodyToText(body));
  const [otherText, setOtherText] = useState<string>(() => JSON.stringify(other || {}, null, 2));
  const [otherError, setOtherError] = useState<string | null>(null);

  return (
    <Box>
      <SectionAccordion title="Request" defaultExpanded>
        <Stack spacing={1.5}>
          <TextField
            label="URL (template)" value={value?.url || ''} onChange={(e) => set({ url: e.target.value })}
            fullWidth required
            placeholder="${process.env.API_URL}/v1/customer/${formContext.queryObject.id}"
            helperText="Supports lodash template syntax against formData / formContext"
            sx={{ '& input': { fontFamily: 'monospace', fontSize: '0.82rem' } }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <TextField select size="small" label="Method" value={method} onChange={(e) => set({ method: e.target.value })} sx={{ width: 120 }}>
              {REST_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="HTTP client" value={value?.provider || ''} onChange={(e) => set({ provider: e.target.value })} sx={{ width: 140 }}>
              <MenuItem value="">(default)</MenuItem>
              {REST_PROVIDERS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Run at" value={value?.runat || ''} onChange={(e) => set({ runat: e.target.value })} sx={{ width: 140 }}>
              <MenuItem value="">(default: server)</MenuItem>
              {REST_RUNAT.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Stack>
        </Stack>
      </SectionAccordion>

      <SectionAccordion title="Headers" defaultExpanded>
        <MappingEditor
          label="Headers"
          value={headers}
          onChange={(nextHeaders) => setOptions(nextHeaders, parseBodyValue(bodyText), other)}
          sourceLabel="Header" targetLabel="Value"
          help="Header name → value (values support template syntax)"
        />
      </SectionAccordion>

      {METHODS_WITH_BODY.includes(method) && (
        <SectionAccordion title="Body" defaultExpanded>
          <TextField
            fullWidth multiline minRows={5} size="small"
            label="Request body (JSON or template)"
            value={bodyText}
            onChange={(e) => {
              setBodyText(e.target.value);
              setOptions(headers, parseBodyValue(e.target.value), other);
            }}
            helperText="Valid JSON is stored as an object; anything else is stored as a template string"
            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          />
        </SectionAccordion>
      )}

      <SectionAccordion title="Advanced">
        <Stack spacing={1.5}>
          <TextField size="small" label="Options provider (FQN)" value={value?.optionsProvider || ''} onChange={(e) => set({ optionsProvider: e.target.value })} helperText="A registered function that supplies request options" />
          <Divider />
          <Typography variant="subtitle2">Other request options (JSON)</Typography>
          <TextField
            fullWidth multiline minRows={3} size="small"
            value={otherText}
            error={!!otherError}
            helperText={otherError || 'Extra keys merged into the REST options object (besides headers/body)'}
            onChange={(e) => {
              setOtherText(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value || '{}');
                setOtherError(null);
                setOptions(headers, parseBodyValue(bodyText), parsed);
              } catch {
                setOtherError('Invalid JSON');
              }
            }}
            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          />
        </Stack>
      </SectionAccordion>
    </Box>
  );
};

export default RESTCallEditor;
