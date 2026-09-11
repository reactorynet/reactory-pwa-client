import React from 'react';
import {
  Input,
  OutlinedInput,
  FilledInput,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const MaterialNumberfield = (props: any, context: any) => {
  const theme = useTheme();
  const { uiSchema, registry, onChange, schema, required, formData } = props;
  const uiOptions = uiSchema?.['ui:options'] || { readOnly: false, format: 'int', precision: 8 };

  if (uiSchema?.["ui:widget"]) {
    const Widget = registry.widgets[uiSchema["ui:widget"]];
    if (Widget) return <Widget {...props} />
  }

  const resolveVariant = (): 'outlined' | 'filled' | 'standard' => {
    const opts = (uiOptions || {}) as any;
    if (opts?.variant && ['outlined', 'filled', 'standard'].includes(opts.variant)) {
      return opts.variant;
    }
    const tfVariant = theme?.components?.MuiTextField?.defaultProps?.variant;
    if (tfVariant && ['outlined', 'filled', 'standard'].includes(tfVariant)) return tfVariant;
    const fcVariant = theme?.components?.MuiFormControl?.defaultProps?.variant;
    if (fcVariant && ['outlined', 'filled', 'standard'].includes(fcVariant)) return fcVariant;
    const inVariant = (theme?.components?.MuiInput?.defaultProps as any)?.variant;
    if (inVariant && ['outlined', 'filled', 'standard'].includes(inVariant)) return inVariant;
    return 'outlined';
  };

  const variant = resolveVariant();

  const fieldLabel = (typeof uiSchema?.['ui:title'] === 'string' ? uiSchema['ui:title'] : undefined)
    || schema?.title
    || (typeof props.label === 'string' ? props.label : undefined)
    || '';

  let ComponentToRender: any = Input;
  let extraProps: any = {};
  if (variant === 'outlined') {
    ComponentToRender = OutlinedInput;
    extraProps.label = fieldLabel ? `${fieldLabel}${required ? ' *' : ''}` : undefined;
    extraProps.notched = Boolean(formData !== null && formData !== undefined && String(formData).trim() !== '');
  } else if (variant === 'filled') {
    ComponentToRender = FilledInput;
  }

  const onInputChanged = (evt: any) => {
    evt.persist();

    let value: number = 0;

    switch (uiOptions.format) {
      case 'float': {
        value = parseFloat(evt.target.value);
        break;
      }
      case 'int':
      default: {
        value = parseInt(evt.target.value, 10);
      }
    }

    onChange(isNaN(value) ? undefined : value);
  };

  return (
    <ComponentToRender
      id={props.idSchema?.$id}
      type="number"
      margin="none"
      fullWidth
      onChange={onInputChanged}
      value={props.formData != null ? props.formData : ''}
      {...extraProps}
    />
  );
};

export default MaterialNumberfield;
