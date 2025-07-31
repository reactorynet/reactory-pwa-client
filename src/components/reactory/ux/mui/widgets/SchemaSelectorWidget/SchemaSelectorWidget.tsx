import React, { Component, Fragment } from 'react';
import { compose } from 'redux';
import {  
  Typography
} from '@mui/material';
import { withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';


class SchemaSelectorWidget extends Component<any,any> {


  render(){
    const { formContext } = this.props;
    if(formContext.$schemaSelector) {
      return formContext.$schemaSelector;
    } else {
      return (
        <Typography>No Selector</Typography>
      )
    }
  }
};



const SchemaSelectorWidgetComponent = compose(
  withTheme,
  withReactory
)(SchemaSelectorWidget)

export default SchemaSelectorWidgetComponent;
