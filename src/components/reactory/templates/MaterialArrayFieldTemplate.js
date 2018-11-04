import React, { Component } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { } from 'react-jsonschema-form/lib/utils'

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

import { withApi } from '../../../api/ApiProvider'

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

  constructor(props, context) {
    super(props, context)
    this.state = {
      formData: props.formData
    }

    this.onAddClicked = this.onAddClicked.bind(this)
  }

  onAddClicked(e) {
    console.log('adding new element', { p: this.props });
    //this.props.onAddClick(e)
    this.props.onAddClick()
  }


  render() {
    const {
      DescriptionField, //The DescriptionField from the registry (in case you wanted to utilize it)
      TitleField, //The TitleField from the registry (in case you wanted to utilize it).
      canAdd, //A boolean value stating whether new elements can be added to the array.
      className, //The className string.
      disabled, //A boolean value stating if the array is disabled.
      idSchema, //Object
      items, //An array of objects representing the items in the array. Each of the items represent a child with properties described below.
      onAddClick, //(event) => void, //A function that adds a new item to the array.
      readonly, //A boolean value stating if the array is read-only.
      required, //A boolean value stating if the array is required.
      schema, //The schema object for this array.
      uiSchema, //The uiSchema object for this array field.
      title, //A string value containing the title for the array.
      formContext, //The formContext object that you passed to Form.
      formData, //The formData for this array. 
      classes,
      api
    } = this.props;

    const uiOptions = uiSchema['ui:options'] || null
    let component = null
    if (uiOptions !== null) {
      if (uiOptions.componentFqn) component = api.getComponent(uiOptions.componentFqn);
    }

    console.log('schema and uiSchema', { schema, uiSchema, component, formData , onAddClick});
    return (
      <Paper className={classes.root}>
      
        <Grid container spacing={8}>
          {items && items.map((item) => {
            return (
              <Grid item md={12} sm={12}>
                {item.chilren}
              </Grid>)
          })
          }
        </Grid>
        <AppBar position="relative" color="primary" className={classes.appBar}>
          <Toolbar className={classes.toolbar}>
            <Button variant="fab" color="secondary" disabled={canAdd === false} aria-label="Add" className={classes.fabButton} onClick={this.onAddClicked}>
              <Icon>add</Icon>
            </Button>
          </Toolbar>
        </AppBar>
      </Paper>
    );
  }
}

const MaterialArrayTemplate = compose(
  withApi,
  withStyles(ArrayTemplate.styles),
  withTheme())(ArrayTemplate);

export default (props) => {
  return (<MaterialArrayTemplate {...props} />)
};
