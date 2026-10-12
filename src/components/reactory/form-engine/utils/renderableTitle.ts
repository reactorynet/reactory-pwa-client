/**
 * Coerce a value that rjsf or a legacy `uiSchema` may hand us as a "title" or
 * "label" into something safe to render as a React child.
 *
 * Why this exists: rjsf copies `ui:title` verbatim onto the `title`/`label`
 * props (`SchemaField` computes `uiOptions.title || schema.title || …`). Legacy
 * Reactory forms use `'ui:title': { jss: { paddingLeft: '24px' } }` — a styling
 * directive the old in-tree fork understood. Under the v5 engine that object
 * reaches a template and is rendered as a child, which throws:
 *
 *     Objects are not valid as a React child (found: object with keys {jss})
 *
 * and takes the whole form down with it (see the Workflow Registry form).
 *
 * Only strings and numbers are valid titles. The richer
 * `{ title, field, icon }` form (see TitleFieldTemplate) also yields its
 * `title` string when present. Anything else returns `undefined` so the caller
 * can fall back to the schema title.
 */
export function toRenderableTitle(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { title?: unknown }).title === 'string'
  ) {
    return (value as { title: string }).title;
  }
  return undefined;
}

export default toRenderableTitle;
