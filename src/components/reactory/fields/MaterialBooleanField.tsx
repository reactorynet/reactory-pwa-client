import React, { Component } from 'react'
import PropTypes from 'prop-types'

import {
  FormControlLabel,
  Switch,
} from '@mui/material'

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
    if(onChange) onChange(checked === true)
  }

  let yesLabel = 'Yes';
  let noLabel = 'No';

  if(uiSchema && uiSchema['ui:options']){
     if(uiSchema['ui:options'].yesLabel) yesLabel = uiSchema['ui:options'].yesLabel;
     if(uiSchema['ui:options'].noLabel) noLabel = uiSchema['ui:options'].noLabel;
  }

  if(uiSchema && uiSchema.hidden) {
    return (<input type="hidden" value={formData} />)
  } 
     
  return (
  <FormControlLabel
      control={
      <Switch
        checked={formData === true}
        onChange={toggleSwitch}
        value={name}
      />
    }
    label={`${schema.title || name} - ${formData ? yesLabel : noLabel }`}
  />);
};


