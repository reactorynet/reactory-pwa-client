import React, { Fragment } from 'react';
import { compose } from 'redux';
import { throttle } from 'lodash';
import {  
  Toolbar,
  Tooltip, 
  IconButton,
  Icon,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
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

const ToolbarWidget = (props: IToolbarWidgetProps) => {
  const theme = useTheme();
  
  const { uiSchema, reactory, formData, formContext } = props;
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
};

export default ToolbarWidget;
