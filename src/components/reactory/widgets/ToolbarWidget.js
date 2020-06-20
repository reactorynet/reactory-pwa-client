import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { throttle } from 'lodash';
import {  
  Toolbar,
  Tooltip, 
  IconButton,
  Icon,
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import { ReactoryApi } from "../../../api/ReactoryApi";


class ToolbarWidget extends Component {

  static styles = theme => ({
    root: {
      width: '85%',
    },
    slider: {
      padding: '22px 0px',
      margin: 'auto'
    },    
  });

  static propTypes = {
    api: PropTypes.instanceOf(ReactoryApi).isRequired
  }
  
  
  render() {
    const { uiSchema, api, formData, formContext } = this.props;
    let options = { commands: [] };
    if(uiSchema['ui:options']) options = {...options, ...uiSchema['ui:options']}
    const buttons = options.commands.map((command) => {
      const onRaiseCommand = ( evt ) => {        
        ////console.log('Raising Toolbar Command', api);
        if(api) api.raiseFormCommand(command.command, { formData: formData, formContext: formContext });
      }            
      return (
      <Tooltip key={command.id} title={command.tooltip || command.id}>
        <IconButton color={command.color || "secondary"} onClick={onRaiseCommand}>
          <Icon>{command.icon}</Icon>
        </IconButton>
      </Tooltip>)
    });
    return (
      <Toolbar>
        {buttons}    
      </Toolbar>
    );
  }
}

ToolbarWidget.propTypes = {
  classes: PropTypes.object,
};

export const ToolbarWidgetComponent = compose(withApi, withStyles(ToolbarWidget.styles), withTheme)(ToolbarWidget);
export default ToolbarWidgetComponent