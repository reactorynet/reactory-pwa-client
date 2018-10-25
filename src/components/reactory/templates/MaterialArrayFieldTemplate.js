import React, { Component } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';

import {
  AppBar,
  Button,
  Icon,
  IconButton,
  Typography,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  Input,
  Paper,
  Toolbar,
} from '@material-ui/core'

class ArrayTemplate extends Component {

  static styles = (theme) => ({
    root: {
      padding: theme.spacing.unit,
      minHeight: '200px',            
    },
    appBar: {
      marginTop: theme.spacing.unit * 14,
      top: 'auto',
      bottom: 0,
    },
    toolbar: {
      alignItems: 'center',
      justifyContent: 'space-between',      
    },
    fabButton: {
      position: 'absolute',
      top: -30,
      left: 0,
      right: 0,
      margin: '0 auto',
    },
  })

  static defaultProps = {
    formData: []
  }

  constructor(props, context){
    super(props, context)
    this.state = {

    }

    this.onAddClicked = this.onAddClicked.bind(this)
  }

  onAddClicked(){
    console.log('adding', {p: this.props});
  }
  

  render(){
    const { title, description, properties, classes, formData, registry, items } = this.props;
    return (
      <Paper className={classes.root}>
        <Grid container spacing={8}>
          { items && items.map( p => <Grid item md={12} sm={12}>{p}</Grid> ) }          
        </Grid>
        <AppBar position="relative" color="primary" className={classes.appBar}>
        <Toolbar className={classes.toolbar}>          
          <Button variant="fab" color="secondary" aria-label="Add" className={classes.fabButton}>
            <Icon>add</Icon>
          </Button>
          <div>
            <IconButton color="inherit" onClick={this.onAddClicked}>
              <Icon>search</Icon>
            </IconButton>            
          </div>
        </Toolbar>
      </AppBar>        
      </Paper>
    );
  }
}

const MaterialArrayTemplate = compose(
  withStyles(ArrayTemplate.styles), 
  withTheme())(ArrayTemplate);

export default (props) => {
  return (<MaterialArrayTemplate {...props} />)
};
