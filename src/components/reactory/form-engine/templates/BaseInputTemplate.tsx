/**
 * BaseInputTemplate — the MUI input primitive for every text-like widget.
 *
 * ADR-0004 decided Reactory builds its own MUI v6 templates rather than
 * depending on `@rjsf/mui` (which tracks MUI v5 and would ship a second MUI
 * copy). rjsf v5 resolves this template via `getTemplate('BaseInputTemplate')`
 * for the text, email, url, tel, date, time, datetime, color, password, number
 * and textarea widgets — so implementing it here themes all of them at once.
 * Without it those widgets fall back to raw `<input>` elements, which is the
 * "unstyled form" class of defect this template closes.
 *
 * Design notes:
 *   - The field label, description, help and error text are owned by
 *     FieldTemplate, which renders them *around* this input. This template
 *     therefore renders an unlabelled input: no MUI `label` prop, so no
 *     notched-outline legend — which removes the legacy "label is cut by the
 *     outline border" defect by construction.
 *   - `ui:options.rows` / `ui:options.multiline` switch the control to a
 *     multiline TextField.
 *   - The variant resolves from `ui:options.variant`, then the theme's
 *     MuiTextField defaults, then 'outlined' — matching the legacy fork's
 *     precedence so migrated forms keep their look.
 */

import * as React from 'react';
import { TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { BaseInputTemplateProps } from '@rjsf/utils';

type Variant = 'outlined' | 'filled' | 'standard';

const VARIANTS: Variant[] = ['outlined', 'filled', 'standard'];

export function resolveInputVariant(
  uiOptions: Record<string, unknown> | undefined,
  themeVariant: unknown,
): Variant {
  const fromOptions = uiOptions?.variant;
  if (typeof fromOptions === 'string' && (VARIANTS as string[]).includes(fromOptions)) {
    return fromOptions as Variant;
  }
  if (typeof themeVariant === 'string' && (VARIANTS as string[]).includes(themeVariant)) {
    return themeVariant as Variant;
  }
  return 'outlined';
}

export function ReactoryBaseInputTemplate(props: BaseInputTemplateProps): React.ReactElement {
  const {
    id,
    value,
    required,
    disabled,
    readonly,
    autofocus,
    placeholder,
    schema,
    uiSchema,
    options,
    rawErrors,
    formContext: _formContext,
    registry,
    onChange,
    onBlur,
    onFocus,
    onChangeOverride,
    ...rest
  } = props as BaseInputTemplateProps & { type?: string };

  const theme = useTheme();
  const uiOptions = ((uiSchema as Record<string, any> | undefined)?.['ui:options'] ?? {}) as Record<string, any>;

  const variant = resolveInputVariant(
    uiOptions,
    (theme as any)?.components?.MuiTextField?.defaultProps?.variant,
  );

  const inputType = typeof (props as any).type === 'string' ? (props as any).type : (schema as any)?.format === 'data-url' ? 'text' : (schema as any)?.type === 'number' || (schema as any)?.type === 'integer' ? 'number' : 'text';

  const rowsOption = uiOptions.rows ?? (options as any)?.rows;
  const isMultiline = inputType === 'textarea' || uiOptions.multiline === true || (rowsOption !== undefined && rowsOption !== null);

  const hasErrors = Array.isArray(rawErrors) && rawErrors.length > 0;

  // `ui:help` is rendered by FieldHelpTemplate into the `${id}-help` region.
  const declaredHelp = (uiSchema as Record<string, unknown> | undefined)?.['ui:help'];
  const hasHelp = typeof declaredHelp === 'string' && declaredHelp.length > 0;

  // Link the input to the error/help regions FieldTemplate renders so screen
  // readers announce validation state on focus. These must land on the real
  // <input>, so they are passed via inputProps (below) rather than spread onto
  // the TextField root element.
  const describedBy = [
    hasErrors ? `${id}-error` : null,
    hasHelp ? `${id}-help` : null,
  ].filter(Boolean).join(' ') || undefined;

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (onChangeOverride) {
        onChangeOverride(event as React.ChangeEvent<HTMLInputElement>);
        return;
      }
      const next = event.target.value;
      // Honor rjsf's emptyValue contract so clearing a field produces '' rather
      // than the string 'undefined' for numeric schemas.
      const emptyValue = (options as any)?.emptyValue;
      onChange(next === '' && emptyValue !== undefined ? emptyValue : next);
    },
    [onChange, onChangeOverride, options],
  );

  return (
    <TextField
      {...(rest as any)}
      id={id}
      name={id}
      value={value ?? ''}
      type={isMultiline ? undefined : inputType}
      multiline={isMultiline}
      rows={isMultiline ? (rowsOption ?? 4) : undefined}
      required={required}
      disabled={disabled === true || readonly === true}
      autoFocus={autofocus}
      placeholder={placeholder}
      variant={variant}
      error={hasErrors}
      fullWidth
      size={(uiOptions.size as any) ?? 'small'}
      aria-describedby={describedBy}
      aria-invalid={hasErrors || undefined}
      onChange={handleChange}
      onBlur={(event) => onBlur?.(id, event.target.value)}
      onFocus={(event) => onFocus?.(id, event.target.value)}
      inputProps={{
        'aria-describedby': describedBy,
        'aria-required': required === true ? true : undefined,
        ...(uiOptions.inputProps ?? {}),
      }}
    />
  );
}

export default ReactoryBaseInputTemplate;
