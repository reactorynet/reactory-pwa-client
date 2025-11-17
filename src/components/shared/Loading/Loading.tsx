import React from 'react';
import { compose } from 'redux';
import {
  Typography,
  Icon,
  Paper,
  Theme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import coreStyles from '@reactory/client-core/components/shared/styles';
import { CenteredContainer } from '@reactory/client-core/components/shared/Layout';
import Logo from '@reactory/client-core/components/shared/logo'

const Loading = (props: any) => {
  const theme = useTheme();
  const { icon, message, spinIcon, nologo, children } = props;
  
  const styles = (theme: Theme): any => { 
    const core = coreStyles(theme);
    return {
      ...core,
      spinning: {
        animation: 'spin 3s infinite',      
      },
      paper: {      
        padding: theme.spacing(1),        
        margin: 'auto',
        marginTop: '100px',        
        minHeight: '300px',
      },
      nologo: {
        minHeight: 'unset!'
      }    
    };
  };

  const classes = styles(theme);
  
  return ( 
      <CenteredContainer>          
        <Paper className={`${classes.root600} ${classes.paper} ${nologo === true ? classes.nologo : ''}`}>
          { nologo === true ? null : <Logo /> }
          <Typography variant={'h6'}>{message} &nbsp;<Icon className={spinIcon === true ? classes.spinning: ''}>{icon}</Icon></Typography>
          {children}
        </Paper>
      </CenteredContainer>
    );
};


export default Loading;