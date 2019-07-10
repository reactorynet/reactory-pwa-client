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
  } = props;

  let _description = description;
  try {
    _description = template(description, { variable: 'props' })(props);
  } catch ( templateError ) {
    if(props.formContext && props.formContext.api) {
      props.formContext.api.log(`TemplateField has a bad field template: ${id}`, props);
    }
  }
  
  return(<Typography id={id} variant="body1" align={align || 'left'}>{_description}</Typography>);

}; 

export default (props) => {   
  const { 
    required,
    align,
    title, 
    id,
  } = props;

  let _title = title;
  try {
    _title = template(title, { variable: 'props' })(props);
  } catch ( templateError ) {
    if(props.formContext && props.formContext.api) {
      props.formContext.api.log(`TemplateField has a bad field template: ${id}`, props);
    }
  }
  
  return(<Typography id={id} variant="h5" align={align || 'left'}>{_title}{required === true ? '*' : null}</Typography>);
};
