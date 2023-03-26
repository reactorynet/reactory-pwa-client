import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { throttle } from 'lodash';
import {  
  Toolbar,
  Tooltip, 
  IconButton,
  Icon,
} from '@mui/material';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

interface IToolbarWidgetProps {
  uiSchema: any;
  reactory: Reactory.Client.IReactoryApi;
  formData: any;
  formContext: any;
}

interface IToolbarWidgetState {
  formData: any;
  formContext: any;
}

class ToolbarWidget extends Component<IToolbarWidgetProps, IToolbarWidgetState> {

  constructor(props) {
    super(props);
    this.state = {
      formData: props.formData,
      formContext: props.formContext,
    }
  }

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
    uiSchema: PropTypes.object,
    reactory: PropTypes.object,
    formData: PropTypes.object,
    formContext: PropTypes.object,
  }
     
  render() {
    const { uiSchema, reactory, formData, formContext } = this.props;
    let options = { commands: [] };
    if(uiSchema['ui:options']) options = {...options, ...uiSchema['ui:options']}
    const buttons = options.commands.map((command) => {
      const onRaiseCommand = ( evt ) => {        
        if(reactory) reactory.raiseFormCommand(command.command, command, { formData: formData, formContext: formContext });
      }            
      return (
        <Tooltip key={command.id} title={command.tooltip || command.id}>
          <IconButton
            color={command.color || "secondary"}
            onClick={onRaiseCommand}
            size="large">
            <Icon>{command.icon}</Icon>
          </IconButton>
        </Tooltip>
      );
    });
    return (
      <Toolbar>
        {buttons}    
      </Toolbar>
    );
  }
}

export const ToolbarWidgetComponent = compose(withReactory, withStyles(ToolbarWidget.styles), withTheme)(ToolbarWidget);
export default ToolbarWidgetComponent;
