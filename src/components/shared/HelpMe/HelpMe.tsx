import React, { Component } from 'react'
import { compose } from 'redux';
import { Paper, Theme } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';

interface IHelpMeProps {
  reactory: Reactory.Client.IReactoryApi,
  formContext?: Reactory.Client.IReactoryFormContext<any>,
  topics: string[],
  theme: Theme,
  open: boolean,
  showSupport?: boolean,
  allowSupportRequest?: boolean,
  title?: string,
  onClose: () => void,
}

interface IHelpMeDepencdies {
  FullScreenModal: any,
  StaticContent: Reactory.Client.Components.StaticContentWidget,
  MaterialCore: Reactory.Client.Web.MaterialCore,
  SupportForm: any,
}

const HelpMe = (props: IHelpMeProps) => {
  const theme = useTheme();
  
const { reactory, topics, onClose, title = 'Help', allowSupportRequest = true } = props;

const { FullScreenModal, StaticContent, MaterialCore, SupportForm } = reactory.getComponents<IHelpMeDepencdies>(['core.FullScreenModal', 'core.StaticContent', 'core.SupportForm', 'material-ui.MaterialCore']);
const { Typography } = MaterialCore;

    const helpItems = topics.map((topic, index) => {
      return ( 
        <Paper key={index} style={{margin: theme.spacing(2)}}>
          <StaticContent slug={topic} slugSource={'property'} >
          </StaticContent>
        </Paper> 
      )
    });
    return (
      <FullScreenModal title={title} open={props.open === true} onClose={onClose}>
        {helpItems}
        {allowSupportRequest === true ? <><hr />
        <Typography>Request support</Typography>
        
        <SupportForm /></> : null}        
      </FullScreenModal>
    )
}

const HelpMeComponent = compose(withReactory)(HelpMe);

export default HelpMeComponent;
