/**
 * FieldTemplate — the wrapper around every field.
 *
 * Responsibilities (per docs/forms-engine/06-reactory-extensions.md and
 * 10-non-functional.md):
 *   - Render the structural shell: label, child input, description, help and
 *     error region, styled from the active MUI theme so fields participate in
 *     typography/density/palette rather than rendering bare HTML.
 *   - Establish vertical rhythm. The legacy fork rendered every
 *     `MuiFormControl` with `margin: 0`, so consecutive fields touched and the
 *     form read as cramped. This template owns the per-field bottom margin.
 *   - Honour `ui:hidden` as either a boolean or a callback. (rjsf's own
 *     `hidden` prop covers `ui:widget: "hidden"`; `ui:hidden` is the Reactory
 *     extension that adds a callback form.)
 *   - Wire stable IDs for help (`${id}-help`) and error (`${id}-error`)
 *     regions, which widgets reference via `aria-describedby`.
 *   - Mark the error region with `role="alert"` so screen readers announce on
 *     validation change.
 *   - Mark required fields with an asterisk; `aria-required` on the input is
 *     the widget's responsibility.
 *
 * The root element is intentionally a plain `<div>` carrying the caller's
 * `classNames` verbatim (or the `field field-<type>` default), because form
 * authors and tests target that exact class. Theme-driven styling therefore
 * uses inline styles derived from `useTheme()` rather than `sx`, which would
 * append emotion class names to the root.
 *
 * Note on the label: this template owns the label and renders it above the
 * input. Inputs therefore render without MUI's `label` prop, which means no
 * notched-outline legend — removing the legacy defect where the absolutely
 * positioned floating label straddled the outline border.
 */

import * as React from 'react';
import { useTheme } from '@mui/material/styles';
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
    displayLabel,
    schema,
    uiSchema,
    formContext,
    formData,
  } = props as FieldTemplateProps & { formData?: unknown };

  const theme = useTheme();
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
  const schemaType = (schema as { type?: string | string[] })?.type;
  const isBoolean = (Array.isArray(schemaType) ? schemaType[0] : schemaType) === 'boolean';
  const hasErrors = Array.isArray(rawErrors) && rawErrors.length > 0;
  const showLabel = displayLabel !== false && Boolean(label);

  const labelStyle: React.CSSProperties = {
    display: isBoolean ? 'inline-block' : 'block',
    // MUI's `body2`/`caption` scale, so labels sit consistently against inputs.
    fontSize: theme.typography.body2.fontSize,
    fontWeight: isBoolean ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium,
    lineHeight: 1.5,
    color: hasErrors ? theme.palette.error.main : theme.palette.text.secondary,
    marginBottom: isBoolean ? 0 : theme.spacing(0.75),
  };

  const helperStyle: React.CSSProperties = {
    marginTop: theme.spacing(0.5),
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 1.43,
  };

  const labelNode = showLabel ? (
    <label className="control-label" htmlFor={id} style={labelStyle}>
      {label}
      {required ? (
        <span className="required-indicator" aria-hidden="true">
          {' *'}
        </span>
      ) : null}
    </label>
  ) : null;

  const descriptionNode = description ? (
    <div className="field-description" style={{ ...helperStyle, color: theme.palette.text.secondary }}>
      {description}
    </div>
  ) : null;

  const helpNode = help ? (
    <div
      className="field-help"
      id={`${id}-help`}
      style={{ ...helperStyle, color: theme.palette.text.secondary }}
    >
      {help}
    </div>
  ) : null;

  const errorNode = hasErrors && errors ? (
    <div
      className="field-errors"
      id={`${id}-error`}
      role="alert"
      style={{ ...helperStyle, color: theme.palette.error.main }}
    >
      {errors}
    </div>
  ) : null;

  // Boolean fields read best with the control first and its label inline.
  if (isBoolean) {
    return (
      <div
        className={classNames ?? `field field-${(schema as { type?: string })?.type ?? 'unknown'}`}
        style={{
          marginBottom: theme.spacing(2),
          display: 'flex',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          width: '100%',
          opacity: effectiveReadonly ? 0.85 : 1,
          ...(style as React.CSSProperties),
        }}
        data-field-id={id}
        data-readonly={effectiveReadonly ? 'true' : undefined}
        aria-readonly={effectiveReadonly ? true : undefined}
      >
        {children}
        <span style={{ marginLeft: theme.spacing(1) }}>
          {labelNode}
          {descriptionNode}
          {helpNode}
          {errorNode}
        </span>
      </div>
    );
  }

  return (
    <div
      className={classNames ?? `field field-${(schema as { type?: string })?.type ?? 'unknown'}`}
      style={{
        marginBottom: theme.spacing(2),
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        opacity: effectiveReadonly ? 0.85 : 1,
        ...(style as React.CSSProperties),
      }}
      data-field-id={id}
      data-readonly={effectiveReadonly ? 'true' : undefined}
      aria-readonly={effectiveReadonly ? true : undefined}
    >
      {labelNode}
      {children}
      {descriptionNode}
      {helpNode}
      {errorNode}
    </div>
  );
}

export default ReactoryFieldTemplate;
