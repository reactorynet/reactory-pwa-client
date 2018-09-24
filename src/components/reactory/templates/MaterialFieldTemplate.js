import React, { Component } from 'react';
import { isNil } from 'lodash';
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  InputLabel,
  Input,
} from '@material-ui/core'

const MaterialFieldStyles = (theme) => {
  return { }
};

export default compose(withTheme(), withStyles(MaterialFieldStyles))((props) => {
  const {id, classNames, classes, label, rawHelp, required, description, errors, children, schema} = props;  
  const isObject = schema.type === 'object'
  return (
    <FormControl className={classes.formControl} fullWidth>
      { isObject === false ? <InputLabel htmlFor={id}>{label}</InputLabel> : null }
      { children }
      { isNil(rawHelp) === false ? <FormHelperText id={`${id}_helper`}>{rawHelp}</FormHelperText> : null }
    </FormControl>    
  );
})
