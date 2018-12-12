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
    required,
    align,
    title, 
    id
  } = props;
  
  return(<Typography id={id} variant="h5" align={align || 'left'}>{title}{required === true ? '*' : null}</Typography>);
};
