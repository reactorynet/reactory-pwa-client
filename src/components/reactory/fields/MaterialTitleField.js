import React, { Component } from 'react'
import PropTypes from 'prop-types'

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Input,
} from '@material-ui/core'

export default (props) => {   
  const { 
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
    uiScehma,
    align 
  } = props;
  
  return(<Typography value={props.value}variant="h6" align={align || 'left'}/>) 
};
