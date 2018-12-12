import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { throttle } from 'lodash'

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

  const uiOptions = uiSchema['ui:options'] || { readOnly: false }

  if (uiSchema["ui:widget"]) {
    const Widget = registry.widgets[uiSchema["ui:widget"]]
    if (Widget) return <Widget {...props} />
  } else {
    let args = {}

    switch (schema.format) {
      case "password": args.type = "password"; break;
      case "email": args.type = "email"; break;
      default: args.type = "text"; break;
    }
    
    const onInputChanged = (evt) => {
      evt.persist(); 
      onChange(evt.target.value);
    }
    
    return (<Input {...args} readOnly={uiOptions.readOnly === true} value={formData || schema.default} onChange={throttle(onInputChanged, 250)} fullWidth />)
  }


};
