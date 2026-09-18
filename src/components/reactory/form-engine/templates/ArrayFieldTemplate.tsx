/**
 * ArrayFieldTemplate — renders the container for an array schema's items.
 * Each item is rendered via ArrayFieldItemTemplate (rjsf supplies them
 * pre-rendered in `items`); we lay them out and surface the Add affordance
 * when canAdd allows it.
 *
 * The root is a plain `<section>` carrying the caller's `className` verbatim
 * (or the `array-field` default) because form authors and tests target that
 * exact class. Items keep the ordered-list structure.
 *
 * Virtualization for large arrays is a later phase per
 * docs/forms-engine/08-enterprise-capabilities.md section 7.
 */

import * as React from 'react';
import { Box, Icon, Paper, Typography } from '@mui/material';
import type { ArrayFieldTemplateProps } from '@rjsf/utils';

export function ReactoryArrayFieldTemplate(props: ArrayFieldTemplateProps): React.ReactElement {
  const {
    canAdd,
    className,
    disabled,
    idSchema,
    items,
    onAddClick,
    readonly,
    required,
    title,
    uiSchema,
  } = props;

  const titleId = `${idSchema.$id}__title`;
  const labelOverride = (uiSchema as Record<string, unknown> | undefined)?.['ui:label'];
  const showTitle = labelOverride !== false && Boolean(title);

  return (
    <section
      className={className ?? 'array-field'}
      aria-labelledby={showTitle ? titleId : undefined}
      data-array-id={idSchema.$id}
      style={{ width: '100%', marginBottom: 16 }}
    >
      {showTitle ? (
        <Typography
          component="h4"
          variant="subtitle2"
          className="array-field-title"
          id={titleId}
          sx={{ fontWeight: 600, lineHeight: 1.5, mb: 1 }}
        >
          {title}
          {required ? (
            <Typography component="span" className="required-indicator" sx={{ color: 'error.main' }} aria-hidden="true">
              {' *'}
            </Typography>
          ) : null}
        </Typography>
      ) : null}

      <Box component="ol" className="array-field-items" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {items.map((item, index) => (
          <Paper
            component="li"
            key={item.key}
            variant="outlined"
            className="array-field-item"
            sx={{
              p: 1.5,
              mb: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              listStyle: 'none',
            }}
          >
            {/* Item chrome (move up/down, copy, remove) is rendered by rjsf's
                ArrayFieldItemTemplate, which draws its buttons from
                `registry.templates.ButtonTemplates` — i.e. our MUI
                ButtonTemplates. We only supply the surrounding list item. */}
            <Box sx={{ flex: 1, minWidth: 0 }}>{item.children}</Box>
          </Paper>
        ))}
      </Box>

      {canAdd && !readonly && !disabled ? (
        <Box
          component="button"
          type="button"
          className="array-field-add"
          onClick={onAddClick}
          aria-label="Add new item"
          sx={{
            mt: 0.5,
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
          Add item
        </Box>
      ) : null}
    </section>
  );
}

export default ReactoryArrayFieldTemplate;
