import React, { Component, Fragment } from 'react';
import { compose } from 'redux';
import {
  AppBar,
  Button,
  FormControlLabel,
  IconButton,
  Icon,
  ListItem,
  ListItemText,
  List,
  ListItemSecondaryAction,
  Switch,
  Toolbar,
  Typography
} from '@mui/material';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';
import { getUiOptions } from '@reactory/client-core/components/reactory/form/utils';


class SchemaSelectorWidget extends Component<any,any> {


  render(){
    const { formContext, uiSchema } = this.props;
    let ComponentToRender = null;

    if(uiSchema ) {
      let _options = getUiOptions(uiSchema);
      if(_options) {

      }
    }

    if(formContext.$schemaSelector) {
      return formContext.$schemaSelector;
    } else {
      return (
        <Typography>No Selector</Typography>
      )
    }
  }

  static styles = (theme: any) => {
    return {}
  };
};



const SchemaSelectorWidgetComponent = compose(
  withTheme,
  withStyles(SchemaSelectorWidget.styles),
  withReactory
)(SchemaSelectorWidget)

export default SchemaSelectorWidgetComponent;
