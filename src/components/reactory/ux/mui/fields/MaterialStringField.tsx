import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { throttle, isNil, isEmpty } from 'lodash'
import { compose } from 'redux';
import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';

import om from 'object-mapper';

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Icon,
  Input,
  OutlinedInput,
  FilledInput,
  InputAdornment,
  TextField,
  InputLabelProps,
  InputProps,
  TextFieldProps,
} from '@mui/material';

import { useTheme } from '@mui/material/styles';


const resolveInputVariant = (theme: any, uiOptions: any): 'outlined' | 'filled' | 'standard' => {
  if (uiOptions?.variant && ['outlined', 'filled', 'standard'].includes(uiOptions.variant)) {
    return uiOptions.variant;
  }
  if (uiOptions?.componentProps?.variant && ['outlined', 'filled', 'standard'].includes(uiOptions.componentProps.variant)) {
    return uiOptions.componentProps.variant;
  }
  const textFieldVariant = theme?.components?.MuiTextField?.defaultProps?.variant;
  if (textFieldVariant && ['outlined', 'filled', 'standard'].includes(textFieldVariant)) {
    return textFieldVariant;
  }
  const formControlVariant = theme?.components?.MuiFormControl?.defaultProps?.variant;
  if (formControlVariant && ['outlined', 'filled', 'standard'].includes(formControlVariant)) {
    return formControlVariant;
  }
  const inputVariant = theme?.components?.MuiInput?.defaultProps?.variant;
  if (inputVariant && ['outlined', 'filled', 'standard'].includes(inputVariant)) {
    return inputVariant;
  }
  if (theme?.MaterialTextField?.variant) return theme.MaterialTextField.variant;
  if (theme?.MaterialInput?.variant) return theme.MaterialInput.variant;

  return 'outlined';
};

const MaterialStringFieldWidget = (props) => {
  const theme = useTheme();
  
  const {
    id,
    autofocus,
    disabled,
    errorSchema,
    formContext,
    formData,
    idPrefix,
    idSchema,
    name,
    onBlur = () => {},
    onChange = () => {},
    onFocus = () => { },
    rawErrors,
    readOnly = false,
    registry,
    required,
    schema,
    uiSchema,
    hidden,    
    
  } = props;

  const reactory = useReactory();
  const $id = idSchema.$id;

  // Local state prevents cursor jumping: the input is controlled by localValue,
  // not by the formData prop that flows back after every parent re-render.
  const [localValue, setLocalValue] = React.useState<string>(
    () => formData != null ? String(formData).replace("undefined", "") :
          (schema?.default != null ? String(schema.default) : "")
  );

  // Sync from external formData changes (e.g. form reset, data load).
  // Using the functional updater avoids a stale-closure on localValue.
  React.useEffect(() => {
    const externalValue = formData != null ? String(formData).replace("undefined", "") : "";
    setLocalValue(prev => prev !== externalValue ? externalValue : prev);
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  try {
    const inputProps: any = {
      value: '',
      name,
      required,
      disabled,
      autofocus
    };

    const $id = idSchema.$id;

    let inputLabelProps: InputLabelProps = {}

    const uiOptions = uiSchema['ui:options'] || { readOnly, props: {} };
    let args: any = uiOptions && uiOptions.props ? { ...uiOptions.props } : {};

    const {
      labelStyle = {

      },
      labelProps = {
        visible: true
      },
      componentProps,
    } = uiOptions;

    if (uiOptions.propsMap) {
      let margs = om(props, uiOptions.propsMap);
      args = { ...args, ...margs };
    } else {
      args = { ...args, ...props };
    }

    const onInputChanged = (evt) => {
      evt.persist();
      let _v = `${evt.target.value}`;
      if (args.toLowerCase === true) {
        _v = _v.toLowerCase();
      }
      setLocalValue(_v);
      onChange(_v);
    }

    if (uiSchema["ui:widget"]) {
      const Widget = registry.widgets[uiSchema["ui:widget"]]      
      if (Widget) return (<Widget {...args} />)
    }

    switch (schema.format) {
      case "password": args.type = "password"; break;
      case "email": args.type = "email"; break;
      default: args.type = schema.format || "text"; break;
    }

    if (schema.readonly === true) { 
      uiOptions.readOnly = true
    }



    // Always shrink the label if we're using specific widgets to ensure proper display
    if (uiSchema["ui:widget"] === "LabelWidget" || uiSchema["ui:widget"] === "LinkFieldWidget") {
      inputLabelProps.shrink = true;
    } else if (isNil(formData) === true || `${formData}`.trim() === "" || isEmpty(formData) === true) {
      reactory.debug(`MaterialStringFieldWidget: ${$id} formData is empty`, { formData, schema, uiSchema });
      // Check if we should force shrink from ui:options
      inputLabelProps.shrink = uiOptions.forceShrinkLabel === true;
    } else {
      inputLabelProps.shrink = true;
      inputLabelProps.style = {
        padding: '4px'
      };
    }

    inputLabelProps.style = { ...inputLabelProps.style, ...labelStyle }

    const onKeyDown = evt => {
      const { reactory } = props;

      if (evt.keyCode === 13 && uiOptions && uiOptions.componentProps && uiOptions.componentProps.submitOnEnter) {
        evt.preventDefault();

        if (uiOptions.componentProps.refreshEvents && uiOptions.componentProps.refreshEvents.length > 0) {
          uiOptions.componentProps.refreshEvents.forEach((refreshEvent) => {
            // props.formContext.$ref.submit();
            props.onChange(evt.target.value);
            // props.formContext.$ref.forceUpdate();
            reactory.emit(refreshEvent, props.formContext.$formData);
          });
        } else {
          props.formContext.$ref.submit();
        }
      }
    }

    const activeVariant = resolveInputVariant(theme || reactory?.muiTheme, uiOptions);

    if (uiOptions.component === "TextField") {

      let inputProps: any = {
        onChange: onInputChanged,
        onKeyDown: onKeyDown,
        onFocus: onFocus && (e => onFocus(id, e.target.value)), 
        onBlur: onBlur && (e => onBlur(id, e.target.value)),
        readOnly: disabled === true,
      };

      if (uiOptions.inputProps) {
        inputProps = { ...inputProps, ...uiOptions.inputProps, id: idSchema.$id };
      };

      if (args.type === 'search') {
        inputProps.endAdornment = (
          <InputAdornment position="end">
            <Icon>search</Icon>
          </InputAdornment>
        )
      }

      let componentProps: Partial<TextFieldProps> = {
        variant: activeVariant,
        InputProps: inputProps,
        label: `${schema.title}${required ? ' *' : ''}`,
        value: localValue,
        fullWidth: true,
        key: props.key || idSchema.$id || id,
        InputLabelProps: inputLabelProps,
      }

      if (uiOptions.componentProps) {
        componentProps = { ...componentProps, ...uiOptions.componentProps };
      }


      return (<TextField {...componentProps} />);

    } else {
      let COMPONENT: any = Input;
      let extraInputProps: any = {};

      const fieldLabel = (typeof uiSchema?.['ui:title'] === 'string' ? uiSchema['ui:title'] : undefined)
        || schema?.title
        || (typeof props.label === 'string' ? props.label : undefined)
        || '';

      switch (activeVariant) {
        case "outlined": {
          COMPONENT = OutlinedInput;
          extraInputProps.label = fieldLabel ? `${fieldLabel}${required ? ' *' : ''}` : undefined;
          extraInputProps.notched = Boolean(localValue != null && String(localValue).trim() !== '') || inputLabelProps.shrink === true;
          break;
        }
        case "filled": {
          COMPONENT = FilledInput;
          break;
        }
        case "standard":
        default: {
          COMPONENT = Input;
          break;
        }
      }

      return (
        <COMPONENT 
          key={props.key || id || idSchema.$id} 
          type={args.type || 'text'} 
          onKeyDown={onKeyDown} 
          id={idSchema.$id}
          fullWidth
          autoFocus={idSchema.id === props.formContext.$focus && props.formContext.$focus !== undefined}
          readOnly={uiOptions.readOnly === true} 
          value={localValue}
          onFocus={onFocus && (e => onFocus(id, e.target.value))}
          onBlur={onBlur && (e => onBlur(id, e.target.value))}
          onChange={onInputChanged}
          {...extraInputProps}
        />
      )
    }

  } catch (renderError) {
    if (reactory) {
      reactory.log(`💥 MaterialString Field Error`, { renderError });
    }
    return <>💥 Could not render field</>
  }

};

export default MaterialStringFieldWidget;

// const MaterialStringApiFieldWidget = compose(withReactory)(MaterialStringFieldWidget)
// export default MaterialStringApiFieldWidget;

