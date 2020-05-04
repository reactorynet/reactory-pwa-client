import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { throttle } from 'lodash'
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
} from '@material-ui/core';

import { withTheme } from '@material-ui/styles';


export default withTheme((props) => {
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
    onBlur,
    onChange,
    onFocus,
    rawErrors,
    readOnly,
    registry,
    required,
    schema,
    uiSchema,
    hidden,
    theme    
  } = props;

  const inputProps = {
    value: '',
    name,
    required,
    disabled,
    autofocus
  }

  const uiOptions = uiSchema['ui:options'] || { readOnly: false }

  if (uiSchema["ui:widget"]) {
    
    const Widget = registry.widgets[uiSchema["ui:widget"]]
    let args = { ...props };
    if(uiOptions.props) {
      args = {...args, ...uiOptions.props}
    }

    if(uiOptions.propsMap) {
      let margs = om(props, uiOptions.propsMap);
      args = {...args, ...margs};
    }

    if (Widget) return (<Widget {...args} />)
  } else {
    let args = {}

    switch (schema.format) {
      case "password": args.type = "password"; break;
      case "email": args.type = "email"; break;
      default: args.type = schema.format || "text"; break;
    }

    if(uiOptions && uiOptions.props) {            
      args = { ...args, ...uiOptions.props };
    }

    if(uiOptions.propsMap) {
      let margs = om(props, uiOptions.propsMap);
      args = {...args, ...margs};
    }
        
    const onInputChanged = (evt) => {
      evt.persist(); 
      onChange(evt.target.value);
    }
    
    if(uiOptions.component === "TextField") {
      
      let inputProps = {
        onChange: onInputChanged,
        readOnly: disabled === true,              
      };

      if(uiOptions.inputProps) {
        inputProps = { ...inputProps, ...uiOptions.inputProps, id: idSchema.$id };
      };

      if(args.type === 'search') {
        inputProps.endAdornment = (
          <InputAdornment position="end">
            <Icon>search</Icon>
          </InputAdornment>
        )
      }

      let themeDefaults = {};
      if(theme.MaterialTextField) {
        themeDefaults = theme.MaterialTextField;
      }
      
      
      let componentProps = {
        defaultValue:`${formData || schema.default}`.replace("undefined", ""),        
        variant: themeDefaults.variant || uiOptions.variant || "standard",
        InputProps: inputProps,              
      }

      if(uiOptions.componentProps) {
        componentProps = { ...componentProps, ...uiOptions.componentProps };
      }
      
      return ( <TextField {...componentProps} /> );
    } else {
      let themeDefaults = {};
      if(theme.MaterialInput) {
        themeDefaults = theme.MaterialInput;
      }

      let COMPONENT = Input;

      switch(themeDefaults.variant){
        case "outlined":
        case "outline":{
          COMPONENT = OutlinedInput;
          break;
        }
        case "filled": 
        case "fill": {
          COMPONENT = FilledInput;
          break;          
        }        
      }

      return (<COMPONENT {...args} id={idSchema.$id}  readOnly={uiOptions.readOnly === true} value={formData || schema.default} onChange={onInputChanged} />)
    }    
  }
});

