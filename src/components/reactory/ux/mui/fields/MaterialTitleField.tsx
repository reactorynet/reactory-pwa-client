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
import { useReactory } from '@reactory/client-core/api/ApiProvider';


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
      props.formContext.reactory.log(`TemplateField has a bad field template: ${id}`, props);
    }
  }

  return (<Typography className={'reactory-material-description-field'} id={id} variant={variant} align={align || 'left'} style={style}>{_description}</Typography>);

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

  const reactory = useReactory();

  let _title = title;
  try {
    _title = template(reactory.i18n.t(title), { variable: 'props' })(props);
  } catch (templateError) {
    reactory.log(`TemplateField has a bad field template: ${id}`, props);
  }

  return (<Typography className={'reactory-material-title-field'} id={id} variant={variant} align={align || 'left'} style={style}>{_title}{required === true ? '*' : null}</Typography>);
};

export default MaterialTitleField;
