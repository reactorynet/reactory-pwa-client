import React, { Component } from 'react';
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
  const {id, classNames, classes, label, rawHelp, required, description, errors, children, schema, api, uiSchema, formData} = props;  
  const isObject = schema.type === 'object'
  const isBoolean = schema.type === 'boolean'
  const uiWidget = uiSchema['ui:widget'] || null
  let hidden = false
  let component = null
  if(uiWidget !== null) 
  {
    if((uiWidget.hidden) === false) hidden = uiWidget.hidden === true;    
    
    if(hidden) {
      return (<input type='hidden' name={schema.name} value={formData} />)
    }

    if(uiWidget.componentFqn) component = api.getComponent(uiWidget.componentFqn);
    
  }
  
  let labelComponent = isObject === false || isBoolean === true ? <InputLabel htmlFor={id}>{label}</InputLabel> : null;

  switch(schema.type) {
    case 'boolean': {
      return (
        <FormControl className={classes.formControl}>                
          { children }          
        </FormControl>    
      )
    }
    case 'object':
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
