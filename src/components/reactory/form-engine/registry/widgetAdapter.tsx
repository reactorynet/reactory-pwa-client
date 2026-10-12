/**
 * widgetAdapter — translate rjsf v5 `WidgetProps` into the prop shape
 * existing Reactory widgets expect, so the 47-widget catalogue under
 * components/reactory/ux/mui/widgets/ can be reused without modification.
 *
 * Translation rules (per docs/forms-engine/06-reactory-extensions.md
 * section 9):
 *
 *   rjsf prop          Reactory widget prop
 *   ─────────          ────────────────────
 *   value              formData  (and `value` kept as alias)
 *   id                 id, idSchema.$id (idSchema constructed if absent)
 *   schema             schema
 *   uiSchema           uiSchema
 *   options            options (rjsf includes enumOptions for selects)
 *   onChange(v)        onChange(v)
 *   onBlur(id, v)      onBlur(id, v)
 *   onFocus(id, v)     onFocus(id, v)
 *   formContext        formContext (typed as ReactoryFormContextType)
 *   registry           registry
 *   disabled etc.      pass-through
 *   (derived)          reactory   (extracted from formContext.reactory)
 *
 * Adapter does not alter the underlying widget's behaviour; if a widget
 * keeps local input state to avoid cursor jumping (MaterialStringField
 * does this), that still works because we forward onChange in flight.
 */

import * as React from 'react';
import type { WidgetProps } from '@rjsf/utils';

/**
 * Minimal shape of an existing Reactory widget. We don't import a strict
 * type because the catalogue widgets vary on edge prop usage — keep this
 * permissive so adoption is mechanical.
 */
export interface ReactoryWidgetLikeProps {
  id: string;
  name?: string;
  formData: unknown;
  /** Legacy alias kept for widgets written against rjsf v4. */
  value: unknown;
  schema: unknown;
  uiSchema?: unknown;
  idSchema?: { $id: string };
  options?: Record<string, unknown>;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autofocus?: boolean;
  placeholder?: string;
  rawErrors?: string[];
  hideError?: boolean;
  formContext?: Record<string, unknown>;
  registry?: unknown;
  /** Reactory SDK handle, extracted from formContext.reactory if available. */
  reactory?: unknown;
  onChange: (value: unknown) => void;
  onBlur?: (id: string, value: unknown) => void;
  onFocus?: (id: string, value: unknown) => void;
}

/**
 * Wrap an existing Reactory widget so it consumes rjsf v5 `WidgetProps`.
 *
 * Returns a memoized component to avoid unnecessary re-renders when
 * `formContext` identity changes (which it does on every parent update
 * unless the parent memoizes it).
 *
 * IMPORTANT — why the returned value is a plain function, not `React.memo`:
 *
 * rjsf v5's `getWidget` decides whether a registry entry is a component with:
 *
 *   typeof widget === 'function'
 *     || ReactIs.isForwardRef(createElement(widget))
 *     || ReactIs.isMemo(widget)
 *
 * This app runs React 17 while `@rjsf/utils` depends on `react-is@^18.2.0
 * (resolved to 18.3.1). With that pairing `isMemo()` and `isForwardRef()`
 * return **false** even for genuine `React.memo(...)` / `React.forwardRef(...)`
 * objects — verified with rjsf's own `getWidget` in
 * `__tests__/widgets/widgetValidity.test.tsx`. So returning `React.memo(Inner)`
 * made rjsf fall through to `typeof widget !== 'string'` and throw
 * "Unsupported widget definition: object" for every adapted widget, which
 * crashed any form rendering a Reactory catalogue widget on the v5 engine.
 *
 * Returning a plain function satisfies the `typeof` branch, and the memoised
 * implementation is still used internally, so render-skipping is preserved.
 */
export function adaptWidget<TProps extends ReactoryWidgetLikeProps>(
  Widget: React.ComponentType<TProps>,
  displayName: string = Widget.displayName ?? Widget.name ?? 'AdaptedWidget',
): React.ComponentType<WidgetProps> {
  const Inner: React.FC<WidgetProps> = (rjsfProps) => {
    const adapted = adaptProps(rjsfProps);
    // Cast: the catalogue widgets accept various non-standard extras we don't
    // model in the public adapter type. The cast lets us pass them through.
    return <Widget {...(adapted as unknown as TProps)} />;
  };
  Inner.displayName = `AdaptedInner(${displayName})`;

  // Memoised implementation — identity is stable for the life of the module.
  const MemoizedInner = React.memo(Inner);

  // Plain function wrapper presented to rjsf. See the doc comment above.
  const Adapted: React.FC<WidgetProps> = (props) =>
    React.createElement(MemoizedInner as unknown as React.ComponentType<WidgetProps>, props);
  Adapted.displayName = `Adapted(${displayName})`;

  return Adapted as unknown as React.ComponentType<WidgetProps>;
}

/**
 * Resolve `ui:props` (static literals) and `ui:props-map` (a declarative
 * source-path -> prop-name map) into the extra props a widget should receive.
 *
 * This is the same contract the legacy fork honours in `MaterialObjectField` /
 * `MaterialObjectTemplate`. The v5 adapter previously ignored both directives,
 * so any widget that relied on a props-map silently received no mapped props —
 * for example the application dashboard panels read `applicationId` from
 * `formContext.props.applicationId`; without it their mutation handlers
 * early-return and edits appear to do nothing.
 *
 * The map source deliberately mirrors the legacy `{ ...props }` shape: paths are
 * resolved against the full rjsf widget props (so `formContext.*` works) plus
 * `formData`/`value` aliases so a map can also target the field value.
 */
export function resolveMappedProps(rjsfProps: WidgetProps): Record<string, unknown> {
  const uiSchema = (rjsfProps.uiSchema ?? {}) as Record<string, unknown>;
  const fc = (rjsfProps.formContext ?? {}) as Record<string, unknown>;
  const reactory = (fc as {
    reactory?: { utils?: { objectMapper?: { merge?: (...args: unknown[]) => unknown } } };
  }).reactory;

  let mapped: Record<string, unknown> = {};

  const staticProps = uiSchema['ui:props'];
  if (staticProps && typeof staticProps === 'object') {
    mapped = { ...(staticProps as Record<string, unknown>) };
  }

  const propMap = uiSchema['ui:props-map'];
  const merge = reactory?.utils?.objectMapper?.merge;
  if (propMap && typeof propMap === 'object' && typeof merge === 'function') {
    const source = {
      ...(rjsfProps as unknown as Record<string, unknown>),
      formContext: fc,
      formData: (rjsfProps as { value?: unknown }).value,
      value: (rjsfProps as { value?: unknown }).value,
      reactory,
    };
    try {
      mapped = merge(source, mapped, propMap, mapped) as Record<string, unknown>;
    } catch {
      // A malformed map must never take the form down; fall back to static props.
    }
  }

  return mapped;
}

/**
 * Pure prop translator. Exposed for tests and for advanced consumers that
 * want to call the original widget directly without the React wrapping.
 */
export function adaptProps(rjsfProps: WidgetProps): ReactoryWidgetLikeProps {
  const {
    id,
    name,
    schema,
    uiSchema,
    value,
    required,
    disabled,
    readonly,
    autofocus,
    placeholder,
    options,
    rawErrors,
    hideError,
    formContext,
    registry,
    onChange,
    onBlur,
    onFocus,
  } = rjsfProps;

  const fc = (formContext ?? {}) as Record<string, unknown>;
  const incoming = rjsfProps as unknown as Record<string, unknown>;
  // `reactory` normally rides on formContext, but a non-rjsf caller (the
  // MaterialTableWidget column renderer) passes it directly.
  const reactory = (fc as { reactory?: unknown }).reactory ?? incoming.reactory;

  // Reactory catalogue widgets are not only rjsf field widgets: the
  // MaterialTableWidget renders them as column/action renderers and hands them
  // `rowData`, `cellData`, `formData` (the cell value), `cellIndex`, `api` and
  // friends — not rjsf's `value`. The adapter used to drop everything it did
  // not explicitly model, so a column's `ui:options.format` template that
  // references `${rowData.nameSpace}` threw `ReferenceError: rowData is not
  // defined` and took the form down. Forward the caller's props verbatim; the
  // explicit translations below still win.
  const resolvedValue = value !== undefined ? value : incoming.formData;

  return {
    ...incoming,
    id,
    name,
    formData: resolvedValue,
    value: resolvedValue,
    schema,
    uiSchema,
    idSchema: { $id: id },
    options: options as Record<string, unknown> | undefined,
    required,
    disabled,
    readonly,
    autofocus,
    placeholder,
    rawErrors,
    hideError,
    formContext: fc,
    registry,
    reactory,
    onChange,
    onBlur,
    onFocus,
    // Mapped props win, matching the legacy `{ ...templateProps, ...$props }`
    // merge order so a props-map can override a default.
    ...resolveMappedProps(rjsfProps),
  } as ReactoryWidgetLikeProps;
}
