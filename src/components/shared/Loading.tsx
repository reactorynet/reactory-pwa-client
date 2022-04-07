import React, { Component } from 'react';
import PropTypes, { any } from 'prop-types';
import { compose } from 'redux';
import {
  Typography,
  Icon,
  Paper,
  Theme
} from '@mui/material';
import { withTheme, withStyles } from '@mui/styles';
import coreStyles from './styles';
import { CenteredContainer } from './Layout';
import Logo from './logo'

class Loading extends Component<any, any> {

  static styles = (theme: Theme): any => { 
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

  render(){
    const { classes, icon, message, spinIcon, nologo } = this.props;
    return ( 
        <CenteredContainer>          
          <Paper className={`${classes.root600} ${classes.paper} ${nologo === true ? classes.nologo : ''}`}>
            { nologo === true ? null : <Logo /> }
            <Typography variant={'h6'}>{message} &nbsp;<Icon className={spinIcon === true ? classes.spinning: ''}>{icon}</Icon></Typography>
            {this.props.children}
          </Paper>
        </CenteredContainer>
      );
  }

  static propTypes = {
    message: PropTypes.string,
    classes: PropTypes.object,
    icon: PropTypes.string,
    spinIcon: PropTypes.bool,
    nologo: PropTypes.bool
  }
  
  static defaultProps = {
    message: "Loading please stand by...",
    icon: 'cached',
    spinIcon: true,
    nologo: false
  }

}


const ThemedLoading = compose(
  withTheme,
  withStyles(Loading.styles)
)(Loading)

export default ThemedLoading;