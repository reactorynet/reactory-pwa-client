import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, TextField, Tooltip } from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';

/**
 * JsonEditorWidget — a first-class JSON editor for object / `Any` fields.
 *
 * Replaces the previously-missing `JSONEditorWidget` / `JsonEditorWidget` names
 * that forms referenced but no catalogue provided (notably
 * `core.ApplicationRouteEditor`), and gives route/`componentProps`-style fields
 * a proper editor instead of the generic key/value object field.
 *
 * Behaviour:
 *   - Keeps the raw text in local state so typing is never clobbered by a
 *     re-render, and only pushes a value upstream when it parses.
 *   - Valid JSON → `onChange(parsed)`. Invalid JSON → keeps the text, surfaces
 *     an inline error, and does NOT emit (so a half-typed value can't corrupt
 *     the form). Empty → `onChange(undefined)`.
 *   - `schema.type === 'string'` is treated as raw JSON text and emitted
 *     verbatim, so a schema authored as a string still round-trips.
 *   - A "Format" action pretty-prints when the current text parses.
 *
 * Prop contract is tolerant so it works both as a form widget (legacy fork and
 * the v5 adapter supply `formData`/`value`, `onChange`, `schema`, `uiSchema`,
 * `idSchema`) and when mounted directly (e.g. inside a bespoke dialog).
 */
export interface JsonEditorWidgetProps {
  id?: string;
  name?: string;
  /** rjsf v5 `value` (preferred) — the field value (object/array/any). */
  value?: unknown;
  /** Legacy alias for `value`. */
  formData?: unknown;
  onChange?: (value: unknown) => void;
  onBlur?: (id: string, value: unknown) => void;
  schema?: { type?: string; title?: string; description?: string } & Record<string, unknown>;
  uiSchema?: Record<string, any>;
  idSchema?: { $id?: string };
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  label?: string;
  helperText?: string;
}

/** Pretty JSON text for a value; '' for nullish; strings are passed through. */
export const toJsonText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
};

export const JsonEditorWidget: React.FC<JsonEditorWidgetProps> = (props) => {
  const {
    id,
    name,
    value,
    formData,
    onChange,
    onBlur,
    schema,
    uiSchema = {},
    idSchema,
    required,
    disabled,
    readonly,
    label,
    helperText,
  } = props;

  const current = value !== undefined ? value : formData;
  const isStringField = schema?.type === 'string';
  const options = (uiSchema['ui:options'] || {}) as Record<string, any>;
  const minRows = Number(options.minRows ?? options.rows ?? 8);
  const isReadOnly = Boolean(disabled || readonly);

  const [text, setText] = useState<string>(() => toJsonText(current));
  const [error, setError] = useState<string | null>(null);

  // The last text we emitted upstream. When the incoming value corresponds to
  // it we leave the user's buffer alone; when it changes for another reason
  // (dialog opened on a different record) we re-seed.
  const lastEmitted = useRef<string>(toJsonText(current));

  useEffect(() => {
    const incoming = toJsonText(current);
    if (incoming !== lastEmitted.current) {
      setText(incoming);
      lastEmitted.current = incoming;
      setError(null);
    }
  }, [current]);

  const commit = (next: string) => {
    setText(next);

    if (next.trim() === '') {
      setError(null);
      lastEmitted.current = '';
      if (typeof onChange === 'function') onChange(undefined);
      return;
    }

    try {
      const parsed = JSON.parse(next);
      setError(null);
      lastEmitted.current = next;
      if (typeof onChange === 'function') onChange(isStringField ? next : parsed);
    } catch (err: any) {
      setError(err?.message ? `Invalid JSON: ${err.message}` : 'Invalid JSON');
    }
  };

  const format = () => {
    try {
      const parsed = JSON.parse(text);
      const pretty = JSON.stringify(parsed, null, 2);
      setText(pretty);
      setError(null);
      lastEmitted.current = pretty;
      if (typeof onChange === 'function') onChange(isStringField ? pretty : parsed);
    } catch {
      // Nothing to format while invalid; the inline error already explains why.
    }
  };

  const fieldLabel = label ?? (schema?.title as string | undefined) ?? name;
  const resolvedHelper =
    error
    || helperText
    || (schema?.description as string | undefined)
    || 'JSON value — validated as you type';

  const inputId = idSchema?.$id || id || name || 'json-editor';

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        id={inputId}
        name={name}
        label={fieldLabel}
        value={text}
        onChange={(event) => commit(event.target.value)}
        onBlur={() => {
          if (typeof onBlur === 'function') onBlur(inputId, isStringField ? text : safeParse(text));
        }}
        variant="outlined"
        fullWidth
        multiline
        minRows={minRows}
        error={Boolean(error)}
        required={required}
        disabled={disabled}
        // Read-only keeps the value selectable/copyable rather than greying it out.
        InputProps={{ readOnly: isReadOnly && !disabled }}
        helperText={resolvedHelper}
        FormHelperTextProps={error ? { error: true } : undefined}
        inputProps={{
          spellCheck: false,
          autoComplete: 'off',
          placeholder: typeof options.placeholder === 'string' ? options.placeholder : undefined,
          style: {
            fontFamily: 'monospace, SFMono-Regular, Consolas, Menlo, monospace',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          },
        }}
      />
      {!isReadOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
          <Tooltip title="Format JSON">
            <span>
              <IconButton
                size="small"
                onClick={format}
                disabled={Boolean(error) || text.trim() === ''}
                aria-label="Format JSON"
              >
                <FormatAlignLeftIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

/** Parse helper that never throws (used on blur). */
const safeParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const JsonEditorWidgetMeta = {
  name: 'JsonEditorWidget',
  nameSpace: 'reactory',
  version: '1.0.0',
  tags: ['json', 'editor', 'object', 'any'],
  icon: <DataObjectIcon />,
  description:
    'Edits object / Any fields as JSON text with live validation and a format action.',
};

export default JsonEditorWidget;
