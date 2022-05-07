import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { template } from 'lodash'
import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Input,
} from '@mui/material'


const MaterialDescriptionField = (props) => {

  const {
    required,
    align,
    description,
    id,
    style = {},
    variant = "body2"
  } = props;

  let _description = description;
  try {
    _description = template(description, { variable: 'props' })(props);
  } catch (templateError) {
    if (props.formContext && props.formContext.api) {
      props.formContext.api.log(`TemplateField has a bad field template: ${id}`, props);
    }
  }

  return (<Typography className={'reactory-material-description-field'} id={id} variant={variant} align={align || 'left'} style={style}>{_description}</Typography>);

};

export default MaterialDescriptionField;