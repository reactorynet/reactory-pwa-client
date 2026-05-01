/**
 * FieldTemplate — the wrapper around every field.
 *
 * Responsibilities (per docs/forms-engine/06-reactory-extensions.md and
 * 10-non-functional.md):
 *   - Render the structural shell: label, child input, help, error region.
 *   - Honour `ui:hidden` as either a boolean or a callback. (rjsf's own
 *     `hidden` prop covers `ui:widget: "hidden"`; `ui:hidden` is the
 *     Reactory extension that adds a callback form.)
 *   - Wire stable IDs for help (`${id}-help`) and error (`${id}-error`)
 *     regions. Widgets reference these via `aria-describedby` (handled
 *     by the widgetAdapter, not here).
 *   - Mark the error region with `role="alert"` so screen readers
 *     announce on validation change.
 *   - Mark required fields with the asterisk; the actual `aria-required`
 *     attribute is the Widget's responsibility on the input element.
 */

import * as React from 'react';
import type { FieldTemplateProps } from '@rjsf/utils';
import { checkFieldPermission, type PermissionResolveDeps } from '../permissions/checkPermission';

export type UiHiddenCallback = (args: {
  formData: unknown;
  formContext: Record<string, unknown> | undefined;
  idSchema: { $id: string } & Record<string, unknown>;
  schema: unknown;
  uiSchema: Record<string, unknown> | undefined;
}) => boolean;

export type UiHidden = boolean | UiHiddenCallback;

/**
 * Resolve the `ui:hidden` extension. Returns true if the field should be
 * hidden, taking into account both rjsf's `hidden` prop (set by
 * `ui:widget: "hidden"`) and the Reactory `ui:hidden` extension.
 */
export function isFieldHidden(
  rjsfHidden: boolean | undefined,
  uiSchema: Record<string, unknown> | undefined,
  callbackArgs: Parameters<UiHiddenCallback>[0],
): boolean {
  if (rjsfHidden === true) return true;
  if (!uiSchema) return false;
  const hidden = uiSchema['ui:hidden'] as UiHidden | undefined;
  if (hidden === undefined) return false;
  if (typeof hidden === 'boolean') return hidden;
  if (typeof hidden === 'function') {
    try {
      return hidden(callbackArgs) === true;
    } catch {
      // A throwing callback should not crash the form; default to visible.
      return false;
    }
  }
  return false;
}

export function ReactoryFieldTemplate(props: FieldTemplateProps): React.ReactElement | null {
  const {
    id,
    classNames,
    style,
    label,
    description,
    children,
    errors,
    help,
    rawErrors,
    hidden,
    required,
    readonly: _readonly,
    disabled: _disabled,
    displayLabel,
    schema,
    uiSchema,
    formContext,
    formData,
  } = props as FieldTemplateProps & { formData?: unknown };

  const idSchema = (props as { idSchema?: { $id: string } }).idSchema ?? { $id: id };

  // ui:permission resolution. Hide takes precedence over ui:hidden;
  // readonly applies on top of any rjsf-supplied readonly state.
  const permissionDeps = formContext as unknown as PermissionResolveDeps | undefined;
  const permission = permissionDeps?.reactory
    ? checkFieldPermission(uiSchema as Record<string, unknown> | undefined, permissionDeps)
    : undefined;

  if (permission?.hide) {
    return null;
  }

  if (
    isFieldHidden(hidden, uiSchema as Record<string, unknown> | undefined, {
      formData,
      formContext: formContext as Record<string, unknown> | undefined,
      idSchema: idSchema as { $id: string } & Record<string, unknown>,
      schema,
      uiSchema: uiSchema as Record<string, unknown> | undefined,
    })
  ) {
    return null;
  }

  const effectiveReadonly = _readonly === true || permission?.readonly === true;
  const hasErrors = Array.isArray(rawErrors) && rawErrors.length > 0;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div
      className={classNames ?? `field field-${(schema as { type?: string })?.type ?? 'unknown'}`}
      style={style}
      data-field-id={id}
      data-readonly={effectiveReadonly ? 'true' : undefined}
      aria-readonly={effectiveReadonly ? true : undefined}
    >
      {displayLabel !== false && label ? (
        <label className="control-label" htmlFor={id}>
          {label}
          {required ? <span className="required-indicator" aria-hidden="true">{' *'}</span> : null}
        </label>
      ) : null}

      {description ? <div className="field-description">{description}</div> : null}

      {children}

      {help ? (
        <div className="field-help" id={helpId}>
          {help}
        </div>
      ) : null}

      {hasErrors && errors ? (
        <div className="field-errors" id={errorId} role="alert">
          {errors}
        </div>
      ) : null}
    </div>
  );
}

export default ReactoryFieldTemplate;
