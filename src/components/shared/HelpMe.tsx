import React, { Component } from 'react'
import { compose } from 'redux';
import { Paper, Theme } from '@mui/material';
import { withTheme } from '@mui/styles';
import { withReactory } from '../../api/ApiProvider';
import Reactory from '@reactory/reactory-core';

interface IHelpMeProps {
  reactory: Reactory.Client.IReactoryApi,
  formContext?: Reactory.Client.IReactoryFormContext<any>,
  topics: string[],
  theme: Theme,
  open: boolean,
  title?: string,
  onClose: () => void,
}

const HelpMe = (props: IHelpMeProps) => {
  
const { reactory, topics, theme, formContext, onClose, title = 'Help' } = props;

const { FullScreenModal, StaticContent, MaterialCore, SupportForm } = reactory.getComponents(['core.FullScreenModal', 'core.StaticContent', 'core.SupportForm', 'material-ui.MaterialCore']);
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
        <hr />
        <Typography>Request support</Typography>
        
        <SupportForm />
      </FullScreenModal>
    )
}

const HelpMeComponent = compose(withTheme, withReactory)(HelpMe);

export default HelpMeComponent;
