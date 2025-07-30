import React, { Component } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@mui/styles';

import {
  Input,
} from '@mui/material'

const MaterialNumberfield = (props: any, context: any) => {

  const { uiSchema, registry, onChange } = props;
  const uiOptions = uiSchema['ui:options'] || { readOnly: false, format: 'int', precision: 8 };

  if (uiSchema?.["ui:widget"]) {
    const Widget = registry.widgets[uiSchema["ui:widget"]];
    if (Widget) return <Widget {...props} />
  }

  const onInputChanged = (evt) => {
    evt.persist();

    let value: number = 0;

    switch (uiOptions.format) {
      case 'float': {
        value = parseFloat(evt.target.value);
        break;
      }
      case 'int':
      default: {
        value = parseInt(evt.target.value);
      }
    }

    onChange(value);
  };

  return (<Input
    id={props.idSchema.$id}
    type="number"
    margin="none"
    onChange={onInputChanged}
    value={props.formData}
  />)
}

export default MaterialNumberfield