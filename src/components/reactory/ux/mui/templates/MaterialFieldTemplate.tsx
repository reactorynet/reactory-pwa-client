import React, { Component, Fragment } from 'react';
import { isNil, isEmpty, isArray } from 'lodash';
import { compose } from 'redux';
import PropTypes from 'prop-types'
import {
  Typography,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  InputLabel,
  Input,
  Icon,
  IconButton,
  Toolbar,
  Tooltip,
  FormControlProps,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider'

const MaterialFieldTemplateFunction = (props) => {

  const {
    id, //The id of the field in the hierarchy. You can use it to render a label targeting the wrapped widget.
    classNames, //A string containing the base Bootstrap CSS classes, merged with any custom ones defined in your uiSchema.
    label, //The computed label for this field, as a string.
    description, //A component instance rendering the field description, if one is defined (this will use any custom DescriptionField defined).
    rawDescription, //A string containing any ui:description uiSchema directive defined.
    children, //The field or widget component instance for this field row.
    errors, //A component instance listing any encountered errors for this field.
    rawErrors, //An array of strings listing all generated error messages from encountered errors for this field.
    help, //A component instance rendering any ui:help uiSchema directive defined.
    rawHelp, //A string containing any ui:help uiSchema directive defined. NOTE, //rawHelp will be undefined if passed ui:help is a React component instead of a string.
    hidden, //A boolean value stating if the field should be hidden.
    required, //A boolean value stating if the field is required.
    readonly, //A boolean value stating if the field is read-only.
    disabled, //A boolean value stating if the field is disabled.
    displayLabel, //A boolean value stating if the label should be rendered or not. This is useful for nested fields in arrays where you don't want to clutter the UI.
    fields, //An array containing all Form's fields including your custom fields and the built-in fields.
    schema, //The schema object for this field.
    idSchema,
    uiSchema, //The uiSchema object for this field.
    formContext, //The formContext object that you passed to Form.api, uiSchema, formData
    
    registry,
    formData,
    classes,
  } = props;

  // reactory.log(`MaterialFieldTemplate Rendering field ${id}`, props);

  const { signature } = formContext || {};

  const isObject = schema.type === 'object'
  const isBoolean = schema.type === 'boolean'

  const uiOptions = uiSchema['ui:options'] || null
  const uiWidget = uiSchema['ui:widget'] || null
  const uiToolbar = uiSchema['ui:toolbar'] || null;
  let Widget = null;
  let showLabel = true;

  const reactory = useReactory();
  const theme = reactory.muiTheme;
  
  if (hidden === true || uiWidget === "HiddenWidget" || uiWidget === "hidden") {
    return <>{children}</>
  }

  if (uiOptions !== null) {
    showLabel = uiOptions.showLabel !== undefined && uiOptions.showLabel !== null ? uiOptions.showLabel === true : true;
    let _props = { ...props };

    if (uiOptions.componentFqn) {
      Widget = reactory.getComponent(uiOptions.componentFqn);            
    }

    if (typeof uiOptions.componentProps === 'object') {
      _props = { ..._props, ...uiOptions.componentProps }
    }

    if (typeof uiOptions.props === 'object') {
      _props = { ..._props, ...uiOptions.props }
    }

    if (uiOptions.componentPropsMap) {
      let mappedProps = reactory.utils.objectMapper(props, uiOptions.componentPropsMap);
      if (mappedProps) {
        _props = { ..._props, ...mappedProps }
      }
    }

    if (uiOptions.propsMap) {
      let mappedProps = reactory.utils.objectMapper(props, uiOptions.propsMap);
      if (mappedProps) {
        _props = { ..._props, ...mappedProps }
      }
    }

    if (Widget) {
      return (<Widget {..._props} />)
    }
  }
  let toolbar = null;

  if (uiToolbar) {
    //console.log('Generating toolbar with formState', { props });
    const buttons = uiSchema['ui:toolbar'].buttons.map((button) => {
      
      const onRaiseCommand = (evt) => {
        //console.log('Raising Toolbar Command', { evt, api });
        if (reactory) {
          reactory.raiseFormCommand(button.command, button, { formData: formData, formContext: formContext });
        }
        else {
          //console.log('No API to handle form command', {api, evt });
        }
      }
      return <Tooltip key={button.id} title={button.tooltip || button.id}><IconButton color={button.color || "secondary"} onClick={onRaiseCommand} size="large"><Icon>{button.icon}</Icon></IconButton></Tooltip>;
    });

    toolbar = (
      <Toolbar>
        {buttons}
      </Toolbar>
    )
  }

  let allowsNull = false;
  let schemaType = schema.type;

  const muiTheme = useTheme();

  const resolveVariant = (): 'outlined' | 'filled' | 'standard' => {
    const opts = (uiOptions || {}) as any;
    if (opts?.variant && ['outlined', 'filled', 'standard'].includes(opts.variant)) {
      return opts.variant;
    }
    if (opts?.componentProps?.variant && ['outlined', 'filled', 'standard'].includes(opts.componentProps.variant)) {
      return opts.componentProps.variant;
    }
    const currentTheme: any = muiTheme || theme;
    const textFieldVariant = currentTheme?.components?.MuiTextField?.defaultProps?.variant;
    if (textFieldVariant && ['outlined', 'filled', 'standard'].includes(textFieldVariant)) {
      return textFieldVariant;
    }
    const formControlVariant = currentTheme?.components?.MuiFormControl?.defaultProps?.variant;
    if (formControlVariant && ['outlined', 'filled', 'standard'].includes(formControlVariant)) {
      return formControlVariant;
    }
    const inputVariant = currentTheme?.components?.MuiInput?.defaultProps?.variant;
    if (inputVariant && ['outlined', 'filled', 'standard'].includes(inputVariant)) {
      return inputVariant;
    }
    if (currentTheme?.MaterialTextField?.variant) return currentTheme.MaterialTextField.variant;
    if (currentTheme?.MaterialInput?.variant) return currentTheme.MaterialInput.variant;

    return 'outlined';
  };

  const activeVariant = resolveVariant();

  let formControlProps: FormControlProps = {
    // className: classes.formControl,
    style: uiOptions ? uiOptions.style : {},
    fullWidth: true,
    variant: activeVariant,
    key: id,
    error: errors && errors.length > 0,
    disabled: readonly === true || disabled === true,
    required: required === true,
  };

  if (uiOptions && uiOptions.fullWidth === false) {
    delete formControlProps.fullWidth;
  }

  if (isArray(schemaType) === true) {
    allowsNull = true;
    schemaType = schemaType[0];
  }

  switch (schemaType) {
    case 'array':
    case 'boolean': {
      return (
        <FormControl fullWidth={formControlProps.fullWidth === true}>
          {children}
        </FormControl>
      )
    }
    case 'object': {
      return (
        <>
          {toolbar}
          {children}
        </>
      )
    }
    case 'string':
    case 'number':
    case 'file':
    default: {

      const labelRef = React.useRef(null);
      const labelId = `${id}__label`;
      
      let inputLabelProps: any = {
        htmlFor: id,
        id: labelId,
        required,
        variant: activeVariant,
        color: uiOptions && uiOptions.labelProps && uiOptions.labelProps.color ? uiOptions.labelProps.color : 'primary',
        error: errors && errors.length > 0,
        disabled: readonly === true || disabled === true,
        ref: labelRef,
      };

      if (uiOptions && uiOptions.labelProps) {
        inputLabelProps = { ...inputLabelProps, ...uiOptions.labelProps };
      }

      if (isNil(formData) === true || `${formData}`.trim() === "" || isEmpty(formData) === true) {
        if (schemaType !== "number") {
          inputLabelProps.shrink = false;
        } else {
          inputLabelProps.shrink = true;
        }
      } else {
        if (uiOptions && uiOptions.labelProps && uiOptions.labelProps.dontShrink != undefined && uiOptions.labelProps.dontShrink) {
          inputLabelProps.shrink = false;
        } else {
          inputLabelProps.shrink = true;
        }
      }

      // Background styling for outlined labels to prevent the border line cutting through the text
      const paperBg = (muiTheme as any)?.palette?.background?.paper || (theme as any)?.palette?.background?.paper || '#ffffff';
      inputLabelProps.style = {
        ...(inputLabelProps.style || {}),
        ...(activeVariant === 'outlined' ? {
          backgroundColor: paperBg,
          paddingLeft: '4px',
          paddingRight: '4px',
          marginLeft: '-4px',
        } : {}),
      };

      let labelComponent = isObject === false || isBoolean === true ? <InputLabel {...inputLabelProps}>{label}</InputLabel> : null;

      if (uiWidget && uiWidget && uiWidget.includes('Date')) {
        return <FormControl {...formControlProps}>          
          {children}
          {isNil(rawDescription) === false ? <FormHelperText id={`${id}_helper`}>{rawDescription}</FormHelperText> : null}
          {errors}
          {rawHelp}
        </FormControl>
      }

      if (uiOptions && uiOptions.component === 'TextField') return (<>{children}</>);

      if (uiWidget === 'LabelWidget' && uiOptions !== null && uiOptions !== undefined && (uiOptions.showLabel === null || uiOptions.showLabel === undefined)) showLabel = false;      

      let renderedChildren = children;
      if (React.isValidElement(children)) {
        renderedChildren = React.cloneElement(children as React.ReactElement<any>, {
          label: (children.props as any)?.label || label,
          labelId: (children.props as any)?.labelId || labelId,
          id: (children.props as any)?.id || id,
        });
      }

      return (
        <FormControl {...formControlProps}>          
          {showLabel !== false ? labelComponent : null}
          {renderedChildren}
          {isNil(rawDescription) === false ? <FormHelperText id={`${id}_helper`}>{rawDescription}</FormHelperText> : null}
          {errors}
          {rawHelp}
        </FormControl>
      );
    }
  }

};

export default MaterialFieldTemplateFunction;
