import * as React from 'react';
import type { SubmitButtonProps, IconButtonProps } from '@rjsf/utils';
import { getSubmitButtonOptions } from '@rjsf/utils';

export const SubmitButton: React.FC<SubmitButtonProps> = ({ uiSchema, registry: _registry }) => {
  const options = getSubmitButtonOptions(uiSchema);
  if (options.norender) return null;
  return (
    <button type="submit" className="reactory-submit-button">
      {options.submitText ?? 'Submit'}
    </button>
  );
};

export const AddButton: React.FC<IconButtonProps> = ({
  onClick,
  disabled,
  uiSchema: _uiSchema,
  registry: _registry,
  iconType: _iconType,
  icon: _icon,
  ...rest
}) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label="Add" {...rest}>
    {'+ Add'}
  </button>
);

export const RemoveButton: React.FC<IconButtonProps> = ({
  onClick,
  disabled,
  uiSchema: _uiSchema,
  registry: _registry,
  iconType: _iconType,
  icon: _icon,
  ...rest
}) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label="Remove" {...rest}>
    {'Remove'}
  </button>
);

export const MoveUpButton: React.FC<IconButtonProps> = ({
  onClick,
  disabled,
  uiSchema: _uiSchema,
  registry: _registry,
  iconType: _iconType,
  icon: _icon,
  ...rest
}) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label="Move up" {...rest}>
    {'Move up'}
  </button>
);

export const MoveDownButton: React.FC<IconButtonProps> = ({
  onClick,
  disabled,
  uiSchema: _uiSchema,
  registry: _registry,
  iconType: _iconType,
  icon: _icon,
  ...rest
}) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label="Move down" {...rest}>
    {'Move down'}
  </button>
);

export const CopyButton: React.FC<IconButtonProps> = ({
  onClick,
  disabled,
  uiSchema: _uiSchema,
  registry: _registry,
  iconType: _iconType,
  icon: _icon,
  ...rest
}) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label="Copy" {...rest}>
    {'Copy'}
  </button>
);

export const ButtonTemplates = {
  SubmitButton,
  AddButton,
  RemoveButton,
  MoveUpButton,
  MoveDownButton,
  CopyButton,
};

export default ButtonTemplates;
