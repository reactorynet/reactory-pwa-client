import React, { Component } from 'react';
import { compose } from 'redux';
import {
  Badge,
  Paper,
  Typography,
  Icon,
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';

class MaterialFormErrorTemplate extends Component {
  static ErrorStyles = (theme) => ({
    margin: theme.spacing.unit * 2,
    padding: theme.spacing.unit * 2,
  });

  render(){
    const {errors} = this.props;
    return (
      <Paper className={this.props.classes.errorForm}>
        <Typography variant="h5" color='primary' gutterBottom><Icon>notifications_active</Icon>&nbsp;Please correct {errors.length} the below errors, then try again.</Typography>
      </Paper>
    );
  }
}

export const MaterialFormTemplateComponent = compose(withStyles(MaterialFormErrorTemplate.ErrorStyles), withTheme())(MaterialFormErrorTemplate);
export default {
  MaterialFormTemplateComponent,
}