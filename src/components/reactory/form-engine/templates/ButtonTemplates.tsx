/**
 * ButtonTemplates — MUI buttons for the v5 engine.
 *
 * The legacy fork's toolbar read its label and icon from Reactory's
 * `ui:options.submitText` / `ui:options.submitIcon`. The first v5
 * implementation only consulted rjsf's native `ui:submitButtonOptions`, so
 * forms that configure `submitText: 'Execute Query'` silently rendered the
 * generic "SUBMIT". This template resolves both, Reactory-first:
 *
 *   1. `ui:options.submitText`      (Reactory extension)
 *   2. `ui:submitButtonOptions.submitText` (rjsf native)
 *   3. 'Submit'
 *
 * Icon alignment follows `ui:options.submitProps.iconAlign` ('left' | 'right').
 */

import * as React from 'react';
import { Button, Icon, IconButton, Tooltip } from '@mui/material';
import type { SubmitButtonProps, IconButtonProps } from '@rjsf/utils';
import { getSubmitButtonOptions } from '@rjsf/utils';

type ButtonUiOptions = {
  submitText?: string;
  submitIcon?: string;
  submitIconProps?: Record<string, unknown>;
  submitProps?: {
    iconAlign?: 'left' | 'right';
    tooltip?: string;
    variant?: 'text' | 'contained' | 'outlined';
    color?: 'primary' | 'secondary' | 'inherit' | 'success' | 'error' | 'info' | 'warning';
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    [key: string]: unknown;
  };
};

function readUiOptions(uiSchema: unknown): ButtonUiOptions {
  const opts = (uiSchema as Record<string, unknown> | undefined)?.['ui:options'];
  return (opts && typeof opts === 'object' ? opts : {}) as ButtonUiOptions;
}

function iconElement(name: string | undefined, props: Record<string, unknown> | undefined) {
  if (!name || name === '$none') return undefined;
  return <Icon {...(props as any)}>{name}</Icon>;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ uiSchema, registry: _registry }) => {
  const nativeOptions = getSubmitButtonOptions(uiSchema as any);
  if (nativeOptions.norender) return null;

  const uiOptions = readUiOptions(uiSchema);
  const submitProps = uiOptions.submitProps ?? {};

  const label = uiOptions.submitText || nativeOptions.submitText || 'Submit';
  const iconAlign = submitProps.iconAlign ?? 'left';
  const icon = iconElement(uiOptions.submitIcon, uiOptions.submitIconProps);

  const {
    iconAlign: _iconAlign,
    tooltip,
    variant,
    color,
    size,
    fullWidth,
    ...restSubmitProps
  } = submitProps as Record<string, unknown> & { iconAlign?: string };

  const button = (
    <Button
      {...(restSubmitProps as any)}
      {...(nativeOptions.props as any)}
      type="submit"
      className="reactory-submit-button"
      variant={variant ?? 'contained'}
      color={color ?? 'primary'}
      size={size ?? 'medium'}
      fullWidth={fullWidth}
      startIcon={iconAlign === 'left' ? icon : undefined}
      endIcon={iconAlign === 'right' ? icon : undefined}
      sx={{ textTransform: 'none', fontWeight: 600, ...(restSubmitProps.sx as object) }}
    >
      {label}
    </Button>
  );

  return tooltip ? <Tooltip title={String(tooltip)}>{button}</Tooltip> : button;
};

const makeIconButton =
  (defaultIcon: string, defaultLabel: string, className: string) =>
  ({ onClick, disabled, uiSchema: _uiSchema, registry: _registry, icon, ...rest }: IconButtonProps) => (
    <IconButton
      {...(rest as any)}
      type="button"
      onClick={onClick as any}
      disabled={disabled}
      aria-label={defaultLabel}
      className={className}
      size="small"
    >
      {typeof icon === 'string' && icon ? <Icon>{icon}</Icon> : <Icon>{defaultIcon}</Icon>}
    </IconButton>
  );

export const AddButton = makeIconButton('add', 'Add', 'reactory-add-button');
export const RemoveButton = makeIconButton('remove', 'Remove', 'reactory-remove-button');
export const MoveUpButton = makeIconButton('arrow_upward', 'Move up', 'reactory-move-up-button');
export const MoveDownButton = makeIconButton('arrow_downward', 'Move down', 'reactory-move-down-button');
export const CopyButton = makeIconButton('content_copy', 'Copy', 'reactory-copy-button');

export const ButtonTemplates = {
  SubmitButton,
  AddButton,
  RemoveButton,
  MoveUpButton,
  MoveDownButton,
  CopyButton,
};

export default ButtonTemplates;
