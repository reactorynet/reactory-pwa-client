import React, { Component, Fragment } from 'react';
import { isNil } from 'lodash';
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
} from '@material-ui/core'
import { withApi } from '../../../api/ApiProvider'



const MaterialFieldStyles = (theme) => {
  return { }
};

export default compose(withTheme(), withStyles(MaterialFieldStyles), withApi)((props) => {
  debugger
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
    classes,
  } = props;  
  const isObject = schema.type === 'object'
  const isBoolean = schema.type === 'boolean'
  
  const uiOptions = uiSchema['ui:options'] || null
  const uiWidget = uiSchema['ui:widget'] || null
  let ComponentToRender = null

  if(uiWidget){
    //ComponentToRender = registry.widgets[uiWidget]
    //if(ComponentToRender) {
    //  return (<ComponentToRender {...props} />)
    //}
  }

  if(uiOptions !== null) 
  {    
    if(hidden === true) {
      return <Fragment>{children}</Fragment>
    }
    if(uiOptions.componentFqn) ComponentToRender = api.getComponent(uiOptions.componentFqn);    
  }
  
  let labelComponent = isObject === false || isBoolean === true ? <InputLabel htmlFor={id}>{label}</InputLabel> : null;

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
          { children }
        </Fragment>
      )
    }
    case 'string':
    case 'number':
    case 'file':    
    default: {
      return (
        <FormControl className={classes.formControl} fullWidth>     
          { labelComponent } 
          { children }
          { isNil(rawHelp) === false ? <FormHelperText id={`${id}_helper`}>{rawHelp}</FormHelperText> : null }
          { errors }
          { rawHelp }
        </FormControl>    
      );
    }    
  }

  
})
