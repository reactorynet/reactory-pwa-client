import React, { Component, Fragment } from 'react';
import { compose } from 'recompose';
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
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/styles';
import { withApi } from '@reactory/client-core/api';
import Reactory from '@reactory/client-core/types/reactory';
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
  withApi
)(SchemaSelectorWidget)

export default SchemaSelectorWidgetComponent;