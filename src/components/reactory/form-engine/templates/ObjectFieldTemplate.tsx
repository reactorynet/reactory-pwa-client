/**
 * ObjectFieldTemplate — renders the container for an object schema's
 * properties. Each property is already wrapped in a FieldTemplate by rjsf
 * before reaching us (so `p.content` carries correct ids and registry wiring),
 * and here we lay them out with the object's title and description.
 *
 * Layout resolution, in priority order:
 *   1. `ui:grid-layout` — Reactory's responsive 12-column grid. An array of
 *      row objects, each mapping a property path to MUI breakpoint sizes:
 *
 *        'ui:grid-layout': [
 *          { connectionId: { xs: 12, md: 6, lg: 4 },
 *            'paging.pageSize': { xs: 12, sm: 6, md: 3, lg: 2 } },
 *          { commandText: { xs: 12 } },
 *        ]
 *
 *      Nested paths ('paging.pageSize') are attributed to their top-level
 *      property, so a row can describe the widths of fields owned by a nested
 *      object without that object being rendered at this level.
 *   2. `ui:options.layout === 'grid'` — grid with every property full width.
 *   3. Default — a single-column vertical stack.
 *
 * The fieldset/legend structure is preserved from the previous implementation
 * (it is the long-standing contract, and gives the group a native accessible
 * name), while styling comes from the MUI theme.
 */

import * as React from 'react';
import { Box, Icon, Typography } from '@mui/material';
import type { ObjectFieldTemplateProps } from '@rjsf/utils';

type BreakpointSizes = Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number>>;
type GridLayoutRow = Record<string, BreakpointSizes | number>;

/**
 * Flatten `ui:grid-layout` rows into a lookup of top-level property name →
 * responsive `gridColumn` value.
 */
export function buildGridSpans(gridLayout: unknown): Record<string, unknown> {
  const spans: Record<string, unknown> = {};
  if (!Array.isArray(gridLayout)) return spans;

  (gridLayout as GridLayoutRow[]).forEach((row) => {
    if (!row || typeof row !== 'object') return;

    Object.keys(row).forEach((path) => {
      const topLevel = path.split('.')[0];
      const size = row[path];

      if (typeof size === 'number') {
        spans[topLevel] = `span ${Math.min(Math.max(size, 1), 12)}`;
        return;
      }

      if (!size || typeof size !== 'object') return;

      const responsive: Record<string, string> = {};
      (['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach((breakpoint) => {
        const value = size[breakpoint];
        if (typeof value === 'number') {
          responsive[breakpoint] = `span ${Math.min(Math.max(value, 1), 12)}`;
        }
      });

      // A property appearing in more than one row keeps the first definition,
      // which matches authoring intuition (rows are ordered top to bottom).
      if (Object.keys(responsive).length > 0 && spans[topLevel] === undefined) {
        spans[topLevel] = responsive;
      }
    });
  });

  return spans;
}

export function ReactoryObjectFieldTemplate(props: ObjectFieldTemplateProps): React.ReactElement {
  const {
    title,
    description,
    properties,
    schema,
    uiSchema,
    idSchema,
    required,
    onAddClick,
    disabled,
    readonly,
  } = props;

  const uiOptions = ((uiSchema as Record<string, unknown> | undefined)?.['ui:options'] ?? {}) as Record<string, unknown>;
  const gridLayout = (uiSchema as Record<string, unknown> | undefined)?.['ui:grid-layout'];
  const gridSpans = buildGridSpans(gridLayout);
  const hasGridLayout = Object.keys(gridSpans).length > 0;
  const useGrid = hasGridLayout || uiOptions.layout === 'grid';

  const additionalAllowed = schema.additionalProperties !== false && schema.additionalProperties !== undefined;
  const titleId = `${idSchema.$id}__title`;
  const descId = `${idSchema.$id}__description`;
  const labelOverride = (uiSchema as Record<string, unknown> | undefined)?.['ui:label'];
  const showTitle = labelOverride !== false && Boolean(title);

  const visible = properties.filter((p) => !p.hidden);

  const rendered = useGrid ? (
    <Box
      data-grid-layout={hasGridLayout ? 'ui:grid-layout' : 'options'}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        columnGap: 2,
        rowGap: 0,
        width: '100%',
      }}
    >
      {visible.map((p) => (
        <Box
          key={p.name}
          data-property-name={p.name}
          sx={{ gridColumn: gridSpans[p.name] ?? 'span 12', minWidth: 0 }}
        >
          {p.content}
        </Box>
      ))}
    </Box>
  ) : (
    visible.map((p) => (
      <Box key={p.name} data-property-name={p.name} sx={{ width: '100%' }}>
        {p.content}
      </Box>
    ))
  );

  return (
    <Box
      component="fieldset"
      className="object-field"
      aria-labelledby={showTitle ? titleId : undefined}
      data-object-id={idSchema.$id}
      sx={{ border: 0, margin: 0, padding: 0, width: '100%', mb: 1 }}
    >
      {showTitle ? (
        <Box
          component="legend"
          className="object-field-title"
          id={titleId}
          sx={{
            p: 0,
            mb: 0.5,
            fontWeight: 600,
            fontSize: '1rem',
            lineHeight: 1.5,
            color: 'text.primary',
          }}
        >
          {title}
          {required ? (
            <Box component="span" className="required-indicator" aria-hidden="true" sx={{ color: 'error.main' }}>
              {' *'}
            </Box>
          ) : null}
        </Box>
      ) : null}

      {description ? (
        <Box
          component="p"
          className="object-field-description"
          id={descId}
          sx={{ m: 0, mb: 1.5, color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.43 }}
        >
          {description}
        </Box>
      ) : null}

      {rendered}

      {additionalAllowed && !readonly && !disabled ? (
        <Box
          component="button"
          type="button"
          className="object-field-add"
          onClick={onAddClick(schema)}
          aria-label="Add new property"
          sx={{
            mt: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'transparent',
            color: 'primary.main',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Icon fontSize="small">add</Icon>
          Add property
        </Box>
      ) : null}
    </Box>
  );
}

export default ReactoryObjectFieldTemplate;
