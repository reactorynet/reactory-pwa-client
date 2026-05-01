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
  Inner.displayName = `Adapted(${displayName})`;
  const Memoized = React.memo(Inner) as React.MemoExoticComponent<React.FC<WidgetProps>> & {
    displayName?: string;
  };
  Memoized.displayName = `Adapted(${displayName})`;
  return Memoized as unknown as React.ComponentType<WidgetProps>;
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
  const reactory = (fc as { reactory?: unknown }).reactory;

  return {
    id,
    name,
    formData: value,
    value,
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
  };
}
