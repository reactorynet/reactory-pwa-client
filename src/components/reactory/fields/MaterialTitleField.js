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
} from '@material-ui/core'


export const MaterialDescriptionField = (props) => {

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

  return (<Typography id={id} variant={variant} align={align || 'left'} style={style}>{_description}</Typography>);

};

export const MaterialTitleField = (props) => {
  const {
    required,
    align,
    title,
    id,
    style = {},
    variant = "h5"
  } = props;

  let _title = title;
  try {
    _title = template(title, { variable: 'props' })(props);
  } catch (templateError) {
    if (props.formContext && props.formContext.api) {
      props.formContext.api.log(`TemplateField has a bad field template: ${id}`, props);
    }
  }

  return (<Typography id={id} variant={variant} align={align || 'left'} style={style}>{_title}{required === true ? '*' : null}</Typography>);
};

export default MaterialTitleField;
