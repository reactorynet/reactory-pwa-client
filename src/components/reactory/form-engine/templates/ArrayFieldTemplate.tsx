/**
 * ArrayFieldTemplate — renders the container for an array schema's items.
 * Each item is rendered via ArrayFieldItemTemplate (rjsf supplies them
 * pre-rendered in `items`); we lay them out and surface the Add affordance
 * when canAdd allows it.
 *
 * Layout resolution (mirrors the legacy fork's `MaterialDefaultArrayField`, so a
 * form authored against the fork lays out the same way here):
 *
 *   1. `ui:options.container` / `ui:options.containerProps` — the outer wrapper.
 *      A string names an MUI primitive ('Grid' | 'Paper' | 'Box' | 'Card' |
 *      'Stack' | 'FormControl' | 'div' | 'section' | 'article' | 'p'); a
 *      component is used directly. `containerProps` is spread onto it.
 *   2. `ui:options.itemsContainer` / `ui:options.itemsContainerProps` — applied
 *      **per item**. `'Grid'` wraps each item in a MUI `<Grid2 {...props}>`, so
 *      a form can express a responsive card grid (
 *      `itemsContainerProps.size = { md: 6, lg: 4, xl: 4 }`).
 *   3. Otherwise the default markup is used: a `<section>` wrapping an
 *      ordered list of full-width `Paper` items. That default is the long-
 *      standing contract (class names, ids, list structure) and is unchanged.
 *
 * `ui:options.showTitle` / `showDescription` / `showToolbar === false` suppress
 * the corresponding chrome, as the fork's array field did.
 *
 * Virtualization for large arrays is a later phase per
 * docs/forms-engine/08-enterprise-capabilities.md section 7.
 */

import * as React from 'react';
import {
  Box,
  Card,
  FormControl,
  Grid2,
  Icon,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { ArrayFieldTemplateProps } from '@rjsf/utils';

/**
 * String → MUI primitive. Matches the fork's `getComponentFromString` map for
 * the container names the forms actually use. Unknown strings fall through to
 * the default markup rather than rendering nothing.
 */
const STRING_CONTAINERS: Record<string, React.ComponentType<any>> = {
  Grid: Grid2 as unknown as React.ComponentType<any>,
  Paper: Paper as unknown as React.ComponentType<any>,
  Box: Box as unknown as React.ComponentType<any>,
  Card: Card as unknown as React.ComponentType<any>,
  Stack: Stack as unknown as React.ComponentType<any>,
  FormControl: FormControl as unknown as React.ComponentType<any>,
  div: 'div' as unknown as React.ComponentType<any>,
  section: 'section' as unknown as React.ComponentType<any>,
  article: 'article' as unknown as React.ComponentType<any>,
  p: 'p' as unknown as React.ComponentType<any>,
};

/** Resolve a `container` / `itemsContainer` spec to a component, or null. */
function resolveContainerSpec(spec: unknown): React.ComponentType<any> | null {
  if (!spec) return null;
  if (typeof spec === 'function' || (typeof spec === 'object' && spec !== null)) {
    // A component (or a memo/forwardRef object). rjsf's `typeof` trap does not
    // apply here — this is rendered directly, not looked up in the registry.
    return spec as React.ComponentType<any>;
  }
  if (typeof spec === 'string') {
    return STRING_CONTAINERS[spec] ?? null;
  }
  return null;
}

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
    schema,
    title,
    uiSchema,
  } = props;

  const uiOptions = ((uiSchema as Record<string, unknown> | undefined)?.['ui:options'] ?? {}) as Record<
    string,
    unknown
  >;

  const titleId = `${idSchema.$id}__title`;
  const labelOverride = (uiSchema as Record<string, unknown> | undefined)?.['ui:label'];
  const showTitle = uiOptions.showTitle !== false && labelOverride !== false && Boolean(title);
  const showDescription = uiOptions.showDescription !== false && Boolean(schema?.description);
  const showToolbar = uiOptions.showToolbar !== false;

  const Container = resolveContainerSpec(uiOptions.container);
  const ItemsContainer = resolveContainerSpec(uiOptions.itemsContainer);
  const containerProps = (uiOptions.containerProps as Record<string, unknown> | undefined) ?? {};
  const itemsContainerProps = (uiOptions.itemsContainerProps as Record<string, unknown> | undefined) ?? {};

  const titleNode = showTitle ? (
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
  ) : null;

  const descriptionNode = showDescription ? (
    <Typography
      component="p"
      variant="caption"
      className="array-field-description"
      id={`${idSchema.$id}__description`}
      sx={{ display: 'block', color: 'text.secondary', mb: 1 }}
    >
      {schema.description}
    </Typography>
  ) : null;

  const addNode =
    canAdd && !readonly && !disabled && showToolbar ? (
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
    ) : null;

  // Default list markup: an ordered list of full-width Paper items. Used when no
  // `itemsContainer` is configured, and unchanged from the original contract.
  const listNode = (
    <Box component="ol" className="array-field-items" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items.map((item) => (
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
  );

  // `ui:options.itemsContainer` is applied PER ITEM. `'Grid'` wraps each item in
  // a responsive <Grid2 size={{...}} item>, which is what expresses the column
  // sizes (e.g. md:6 / lg:4 / xl:4 → a 3-up card grid).
  const itemsNode = ItemsContainer
    ? items.map((item) => (
        <ItemsContainer key={item.key} {...(itemsContainerProps as any)} className="array-field-item">
          {item.children}
        </ItemsContainer>
      ))
    : listNode;

  const content = (
    <>
      {titleNode}
      {descriptionNode}
      {itemsNode}
      {addNode}
    </>
  );

  // `ui:options.container` (e.g. 'Grid' with `containerProps.container === true`)
  // wraps the whole array, exactly as the legacy fork did. This is also what
  // makes the per-item Grid `size` props lay out in a row — a Grid *item* needs a
  // Grid *container* ancestor, otherwise each item is a full-width block.
  if (Container) {
    return (
      <Container
        {...(containerProps as any)}
        className={className ?? 'array-field'}
        data-array-id={idSchema.$id}
      >
        {content}
      </Container>
    );
  }

  return (
    <section
      className={className ?? 'array-field'}
      aria-labelledby={showTitle ? titleId : undefined}
      data-array-id={idSchema.$id}
      style={{ width: '100%', marginBottom: 16 }}
    >
      {content}
    </section>
  );
}

export default ReactoryArrayFieldTemplate;
