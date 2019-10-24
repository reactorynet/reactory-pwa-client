import React, { Component } from 'react';
import { compose } from 'redux';
import {
  List,
  ListItem,
  ListItemText, 
  Paper,
  Typography,
  Icon,
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';

class MaterialFormErrorTemplate extends Component {
  
  constructor(props, context){
    super(props, context);
    this.renderSingleError = this.renderSingleError.bind(this);
  }

  renderSingleError(){
    const { errors } = this.props;

    return (
      <Paper className={this.props.classes.errorForm}>
        <Typography variant="h5" color='primary' gutterBottom><Icon>notifications_active</Icon>&nbsp;Please correct the error below, then try again.</Typography>
        <List>
          {errors.map((error) => {
            return (
            <ListItem>
              <ListItemText primary={error.stack} secondary={error.toString()} />
            </ListItem>)
          })}
        </List>
      </Paper>
    )
  }

  renderMultipleErrors(){
    const {errors} = this.props;
    return (
      <Paper className={this.props.classes.errorForm}>
        <Typography variant="h5" color='primary' gutterBottom><Icon>notifications_active</Icon>&nbsp;Please correct the {errors.length} errors below, then try again.</Typography>
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

  render(){
    const {errors} = this.props;

    if(errors.length === 1) return renderSingleError();      
    if(errors.length > 1) return this.renderMultipleErrors();

    return null;    
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