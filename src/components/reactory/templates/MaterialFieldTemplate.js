import React, { Component } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from 'material-ui/styles';

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Input,
} from 'material-ui'

const MaterialFieldStyles = (theme) => {
  return { }
};

export default compose(withTheme(), withStyles(MaterialFieldStyles))((props) => {
  const {id, classNames, classes, label, help, required, description, errors, children} = props;
  console.log('Creating MaterialField', props)
  return (
    <FormControl className={classes.formControl} fullWidth>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      {children}
    </FormControl>    
  );
})
