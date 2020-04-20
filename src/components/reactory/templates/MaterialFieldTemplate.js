import React, { Component, Fragment } from 'react';
import { isNil, isEmpty } from 'lodash';
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';
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
} from '@material-ui/core'

import { withApi } from '../../../api/ApiProvider'



const MaterialFieldStyles = (theme) => {
  return { }
};



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
    uiSchema, //The uiSchema object for this field.
    formContext, //The formContext object that you passed to Form.api, uiSchema, formData
    api,
    registry,
    formData,
    classes,
  } = props;

  // api.log(`MaterialFieldTemplate Rendering field ${id}`, props);
  
  const isObject = schema.type === 'object'
  const isBoolean = schema.type === 'boolean'

  const uiOptions = uiSchema['ui:options'] || null
  const uiWidget = uiSchema['ui:widget'] || null
  const uiToolbar = uiSchema['ui:toolbar'] || null;
  let Widget = null;
  let showLabel = true;  

  
  if(uiOptions !== null)
  {
    showLabel = uiOptions.showLabel ? uiOptions.showLabel === true : true;

    if(hidden === true || uiWidget === "HiddenWidget") {
      return <Fragment>{children}</Fragment>
    }
    if(uiOptions.componentFqn)  {
      Widget = api.getComponent(uiOptions.componentFqn);
      let _props = { ...props };
      if(typeof uiOptions.componentProps === 'object') {
        _props = { ..._props, ...uiOptions.componentProps}
      }

      if(uiOptions.componentPropsMap) {
        let mappedProps = api.utils.objectMapper(props, uiOptions.componentPropsMap);
        if(mappedProps) {
          _props = {..._props, ...mappedProps}
        }
      }

      if(uiOptions.propsMap) {
        let mappedProps = api.utils.objectMapper(props, uiOptions.propsMap);        
        if(mappedProps) {
          _props = {..._props, ...mappedProps}
        }
      }

      if(Widget) {
        return (<Widget {..._props } />)
      }
    }
  }
  let toolbar = null;

  if(uiToolbar) {
    //console.log('Generating toolbar with formState', { props });
    const buttons = uiSchema['ui:toolbar'].buttons.map((button) => {
      const api = formContext.api
      const onRaiseCommand = ( evt ) => {
        //console.log('Raising Toolbar Command', { evt, api });
        if(api){
          api.raiseFormCommand(button.command, button, { formData: formData, formContext: formContext });
        } 
        else {
          //console.log('No API to handle form command', {api, evt });
        }
      }
      return (<Tooltip key={button.id} title={button.tooltip || button.id}><IconButton color={button.color || "secondary"} onClick={onRaiseCommand}><Icon>{button.icon}</Icon></IconButton></Tooltip>)
    });

    toolbar = (
      <Toolbar>
        {buttons}
      </Toolbar>
    )
  }

  

  switch(schema.type) {
    case 'array':
    case 'boolean': {
      return (
        <FormControl className={classes.formControl} fullWidth>
          { children }
        </FormControl>
      )
    }
    case 'object': {
      return (
        <Fragment>
          {toolbar}
          { children }
        </Fragment>
      )
    }
    case 'string':
    case 'number':
    case 'file':
    default: {

      let formControlProps = {
        className: classes.formControl,
        style: uiOptions ? uiOptions.style : {},
        fullWidth: 'fullWidth'
      }

      if(uiOptions && uiOptions.fullWidth === false) {
        delete formControlProps.fullWidth;
      }

      let inputLabelProps = {
        htmlFor: id,
      }

      if(isNil(formData) === false && isEmpty(formData) === true) {
        inputLabelProps.shrink = false;
      } else {
        inputLabelProps.shrink = true;
      }

      let labelComponent = isObject === false || isBoolean === true ? <InputLabel {...inputLabelProps}  >{label}</InputLabel> : null;

      return (
        <FormControl {...formControlProps}>
          { uiWidget === null && showLabel !== false ? labelComponent : null }
          { children }
          { isNil(rawHelp) === false ? <FormHelperText id={`${id}_helper`}>{rawHelp}</FormHelperText> : null }
          { errors }
          { rawHelp }
        </FormControl>
      );
    }
  }
};

const MaterialFieldTemplateComponent = compose(withApi, withTheme, withStyles(MaterialFieldStyles))(MaterialFieldTemplateFunction);
export default MaterialFieldTemplateComponent;
