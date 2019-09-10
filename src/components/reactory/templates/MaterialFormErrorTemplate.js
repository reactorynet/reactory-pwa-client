import React, { Component } from 'react';
import { compose } from 'redux';
import {
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText, 
  ListItemSecondaryAction,    
  Paper,
  Typography,
  Icon,
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';

class MaterialFormErrorTemplate extends Component {
  

  render(){
    const {errors} = this.props;
    return (
      <Paper className={this.props.classes.errorForm}>
        <Typography variant="h5" color='primary' gutterBottom><Icon>notifications_active</Icon>&nbsp;Please correct {errors.length} the below errors, then try again.</Typography>
        <List>
          {errors.map((error) => {
            return (
            <ListItem>
              <ListItemText primary={error.stack} secondary={error.toString()} />
            </ListItem>)
          })}
        </List>
      </Paper>
    );
  }
}

MaterialFormErrorTemplate.ErrorStyles = (theme) => {  
  return {    
    errorForm: {
      padding: theme.spacing(1)
    },
  };
};

export const MaterialFormTemplateComponent = compose(withStyles(MaterialFormErrorTemplate.ErrorStyles), withTheme)(MaterialFormErrorTemplate);
export default {
  MaterialFormTemplateComponent,
}