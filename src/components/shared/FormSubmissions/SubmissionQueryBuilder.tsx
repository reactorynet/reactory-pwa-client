import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

export interface SubmissionQueryBuilderProps {
  /** The current query text (rjsf value, adapted to formData). */
  formData?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  readonly?: boolean;
  schema?: { title?: string; description?: string };
  uiSchema?: Record<string, unknown>;
}

/**
 * The data query field for the submissions explorer.
 *
 * The query is the structured predicate the server compiles into JSONB
 * operators - it is not code and it is never evaluated in a sandbox, so what
 * the field needs to do is keep the author honest about the JSON shape before
 * the query is sent. Invalid JSON is reported inline rather than at query time,
 * and the examples are one click away because the operator vocabulary is not
 * something anyone should have to remember.
 */
const EXAMPLES: { label: string; hint: string; value: string }[] = [
  {
    label: 'Field equals',
    hint: 'Match a single value',
    value: JSON.stringify({ path: 'country', op: 'eq', value: 'ZA' }, null, 2),
  },
  {
    label: 'Numeric range',
    hint: 'Compare a numeric field',
    value: JSON.stringify(
      { path: 'score', op: 'gte', value: 80, valueType: 'number' }, null, 2),
  },
  {
    label: 'Text contains',
    hint: 'Case insensitive substring',
    value: JSON.stringify({ path: 'notes', op: 'contains', value: 'urgent' }, null, 2),
  },
  {
    label: 'Combined',
    hint: 'Several predicates with and / or',
    value: JSON.stringify({
      and: [
        { path: 'country', op: 'eq', value: 'ZA' },
        { path: 'score', op: 'gte', value: 80, valueType: 'number' },
      ],
    }, null, 2),
  },
  {
    label: 'Field present',
    hint: 'The path exists in the document',
    value: JSON.stringify({ path: 'phone', op: 'exists' }, null, 2),
  },
];

const OPERATORS = [
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
  'contains', 'startsWith', 'endsWith',
  'in', 'nin', 'exists', 'isNull', 'between',
];

const SubmissionQueryBuilder: React.FC<SubmissionQueryBuilderProps> = ({
  formData,
  onChange,
  disabled,
  readonly,
  schema,
}) => {
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const text = formData ?? '';

  const error = useMemo<string | null>(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return 'The query must be an object - a predicate, or an "and" / "or" group.';
      }
      return null;
    } catch (parseError) {
      return `Not valid JSON: ${(parseError as Error).message}`;
    }
  }, [text]);

  const apply = useCallback((next: string) => {
    if (onChange) onChange(next);
  }, [onChange]);

  return (
    <Box>
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={10}
        size="small"
        label={schema?.title || 'Data query'}
        placeholder='{ "and": [ { "path": "country", "op": "eq", "value": "ZA" } ] }'
        value={text}
        disabled={disabled || readonly}
        error={error !== null}
        helperText={error || schema?.description}
        onChange={(event) => apply(event.target.value)}
        InputProps={{
          sx: { fontFamily: 'monospace', fontSize: '0.82rem' },
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
        <Tooltip title={showHelp ? 'Hide the operator reference' : 'Show the operator reference'}>
          <IconButton size="small" onClick={() => setShowHelp((current) => !current)}>
            <span className="material-icons" style={{ fontSize: 18 }}>help_outline</span>
          </IconButton>
        </Tooltip>
        {EXAMPLES.map((example) => (
          <Tooltip key={example.label} title={example.hint}>
            <Chip
              size="small"
              variant="outlined"
              label={example.label}
              onClick={() => apply(example.value)}
              disabled={disabled || readonly}
            />
          </Tooltip>
        ))}
        {text.trim().length > 0 && (
          <Chip
            size="small"
            label="Clear"
            onClick={() => apply('')}
            disabled={disabled || readonly}
          />
        )}
      </Box>

      <Collapse in={showHelp}>
        <Box sx={{ mt: 1, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" display="block" gutterBottom>
            A predicate is <code>{'{ path, op, value, valueType }'}</code>. Paths address the
            submitted document, e.g. <code>address.country</code> or <code>lines[0].sku</code>.
            Group predicates with <code>and</code>, <code>or</code> or <code>not</code>.
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            <strong>Operators:</strong> {OPERATORS.join(', ')}
          </Typography>
          <Typography variant="caption" display="block">
            <strong>valueType:</strong> string (default), number, boolean, date. Numeric and date
            comparisons need the matching valueType - dates compare as ISO-8601 strings.
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

export default SubmissionQueryBuilder;
