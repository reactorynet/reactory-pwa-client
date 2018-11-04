import React, { Component } from 'react'
import PropTypes from 'prop-types'

import {
  FormControlLabel,
  Switch,
} from '@material-ui/core'

const nilf = (e) => {}

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
    title,
    onBlur,
    onChange,
    onFocus,
    rawErrors,
    readOnly,
    registry,
    required,
    schema,
    uiSchema,
    hidden
  } = props;

  const inputProps = {
    value: '',
    name,
    required,
    disabled,
    autofocus
  }

  const toggleSwitch = ( evt, checked ) => {
    if(onChange) onChange(checked)
  }

  debugger 
  return (<FormControlLabel
      control={
      <Switch
        checked={formData === true}
        onChange={toggleSwitch}
        value={name}
      />
    }
    label={`${title || name} - ${formData}`}
  />)

  
};


