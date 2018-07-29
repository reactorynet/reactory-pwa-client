import React, { Component } from 'react'
import PropTypes from 'prop-types'

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Input,
} from 'material-ui'

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
    uiScehma 
  } = props;
  
  const inputProps = {
    value: '',
    name,
    required,
    disabled,
    autofocus
  }

  return(<Input value={props.value} onChange={(evt) => { evt.persist(); onChange(evt); }} />) 
};
