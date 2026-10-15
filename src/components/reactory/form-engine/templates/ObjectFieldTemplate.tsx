/**
 * ObjectFieldTemplate — renders the container for an object schema's
 * properties. Each property is already wrapped in a FieldTemplate by rjsf
 * before reaching us (so `p.content` carries correct ids and registry wiring),
 * and here we lay them out with the object's title and description.
 *
 * **The layout is the render list.** With a `ui:grid-layout` present, only the
 * properties it names are rendered — matching the legacy `MaterialGridField`
 * (`ux/mui/fields/MaterialGridField.tsx`), which iterates the layout rows and
 * looks each name up in `schema.properties`; it never enumerates
 * `schema.properties` itself. Rendering the whole schema instead leaked
 * data-only properties (GraphQL result/error carriers such as `message`) into
 * forms as empty inputs. See REACTORY-302016408/20261014/2327145804.
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
 *      No declaration list exists here, so every property still renders.
 *   3. Default — a single-column vertical stack.
 *
 * The fieldset/legend structure is preserved from the previous implementation
 * (it is the long-standing contract, and gives the group a native accessible
 * name), while styling comes from the MUI theme.
 */

import * as React from 'react';
import { Box, Icon, Typography } from '@mui/material';
import type { ObjectFieldTemplateProps, ObjectFieldTemplatePropertyType } from '@rjsf/utils';
import { toRenderableTitle } from '../utils/renderableTitle';

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

/**
 * Does the field opt out of rendering through a Reactory-specific mechanism?
 *
 * rjsf only sets its own `hidden` flag for `ui:widget: 'hidden'` (lowercase;
 * see `@rjsf/core` `ObjectField.js`). Reactory adds two mechanisms rjsf knows
 * nothing about:
 *   - `ui:widget: 'HiddenWidget'` — the legacy alias, used by many migrated
 *     forms (Organization, UserPeers, classroom forms, ...).
 *   - `ui:hidden` — boolean or predicate callback (see `FieldTemplate`).
 *
 * Both must be honoured here as well as in the field template: otherwise the
 * property still contributes a wrapper element and therefore an *empty grid
 * cell*, which reads as a gap in the layout.
 */
export function isHiddenByReactoryUi(
  name: string,
  uiSchema: Record<string, unknown> | undefined,
  callbackArgs: {
    formData: unknown;
    formContext: unknown;
    idSchema: unknown;
    schema: unknown;
  },
): boolean {
  const fieldUiSchema = uiSchema?.[name];
  if (!fieldUiSchema || typeof fieldUiSchema !== 'object') return false;
  const fieldUi = fieldUiSchema as Record<string, unknown>;

  const widget = fieldUi['ui:widget'];
  if (widget === 'hidden' || widget === 'HiddenWidget') return true;

  const hidden = fieldUi['ui:hidden'];
  if (hidden === true) return true;
  if (typeof hidden === 'function') {
    try {
      return (hidden as (args: unknown) => unknown)({ ...callbackArgs, uiSchema: fieldUi }) === true;
    } catch {
      // A throwing predicate must not take the form down; default to visible,
      // matching `FieldTemplate.isFieldHidden`.
      return false;
    }
  }

  return false;
}

/**
 * Resolve the properties an object template should render.
 *
 * Legacy parity rule (see the module header): when the form declares a
 * `ui:grid-layout`, that layout is the render list — a schema property it does
 * not name is not rendered. When no layout is present the previous behaviour is
 * kept and every non-hidden property renders.
 *
 * `hasDeclaredLayout` is gated on a *derivable* span map (rather than merely on
 * `ui:grid-layout` being a non-empty array) so a malformed layout cannot blank
 * an entire form.
 */
export function selectVisibleProperties(
  properties: ObjectFieldTemplatePropertyType[],
  gridSpans: Record<string, unknown>,
  hasDeclaredLayout: boolean,
  uiSchema: Record<string, unknown> | undefined,
  callbackArgs: {
    formData: unknown;
    formContext: unknown;
    idSchema: unknown;
    schema: unknown;
  },
): ObjectFieldTemplatePropertyType[] {
  return properties.filter((property) => {
    if (property.hidden) return false;
    if (isHiddenByReactoryUi(property.name, uiSchema, callbackArgs)) return false;
    if (hasDeclaredLayout && gridSpans[property.name] === undefined) return false;
    return true;
  });
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
    formData,
    formContext,
  } = props;

  const uiOptions = ((uiSchema as Record<string, unknown> | undefined)?.['ui:options'] ?? {}) as Record<string, unknown>;
  const gridLayout = (uiSchema as Record<string, unknown> | undefined)?.['ui:grid-layout'];
  const gridSpans = buildGridSpans(gridLayout);
  const hasGridLayout = Object.keys(gridSpans).length > 0;
  const useGrid = hasGridLayout || uiOptions.layout === 'grid';

  // `ui:options.variant: 'section'` renders the object as a padded, bordered
  // section instead of a bare fieldset. Opt-in: the default presentation is
  // unchanged so existing forms keep their current look.
  const isSection = uiOptions.variant === 'section';

  const additionalAllowed = schema.additionalProperties !== false && schema.additionalProperties !== undefined;
  const titleId = `${idSchema.$id}__title`;
  const descId = `${idSchema.$id}__description`;
  const labelOverride = (uiSchema as Record<string, unknown> | undefined)?.['ui:label'];
  // `title` arrives from rjsf as the raw `uiOptions.title`, which for a legacy
  // `'ui:title': { jss: {...} }` is an object and would throw when rendered.
  // Coerce it and fall back to the schema title. See renderableTitle.
  const renderableTitle =
    toRenderableTitle(title) ?? toRenderableTitle((schema as { title?: unknown } | undefined)?.title);
  const showTitle = labelOverride !== false && Boolean(renderableTitle);

  // Only restrict to the layout when spans were actually derivable from it, so a
  // malformed `ui:grid-layout` degrades to the previous render-all behaviour
  // instead of blanking the form.
  const visible = selectVisibleProperties(
    properties,
    gridSpans,
    hasGridLayout,
    uiSchema as Record<string, unknown> | undefined,
    { formData, formContext, idSchema, schema },
  );

  const rendered = useGrid ? (
    <Box
      data-grid-layout={hasGridLayout ? 'ui:grid-layout' : 'options'}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        columnGap: 2,
        // Fields that wrap onto a second grid row need vertical rhythm too.
        // With `rowGap: 0` a field's helper text sat flush against the next
        // row's input, and because an outlined label is absolutely positioned
        // (overhanging its field) the next row's label landed on top of it.
        // Match the column gap so the grid is evenly spaced in both axes.
        rowGap: 2,
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
      data-variant={isSection ? 'section' : undefined}
      sx={
        isSection
          ? {
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              // Inner padding so a section's content is not flush with the edges.
              p: 2,
              margin: 0,
              width: '100%',
              mb: 2,
              bgcolor: 'background.paper',
            }
          : { border: 0, margin: 0, padding: 0, width: '100%', mb: 1 }
      }
    >
      {showTitle ? (
        <Box
          component="legend"
          className="object-field-title"
          id={titleId}
          sx={{
            p: 0,
            mb: isSection ? 1.5 : 0.5,
            fontWeight: 600,
            fontSize: isSection ? '1.0625rem' : '1rem',
            lineHeight: 1.5,
            color: 'text.primary',
          }}
        >
          {renderableTitle}
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
          sx={{
            m: 0,
            mb: isSection ? 2 : 1.5,
            color: 'text.secondary',
            fontSize: '0.75rem',
            lineHeight: 1.43,
          }}
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
