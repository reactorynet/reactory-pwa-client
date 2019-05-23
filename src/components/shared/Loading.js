import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import {
  Typography,
  Icon,
  Paper
} from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import coreStyles from '../shared/styles';
import { CenteredContainer } from '../shared/Layout';
import Logo from '../shared/logo'

class Loading extends Component {

  static styles = theme => { 
    const core = coreStyles(theme);
    return {
      ...core,
      spinning: {
        animation: 'spin 3s infinite',      
      },
      paper: {      
        padding: theme.spacing.unit,        
        margin: 'auto',
        marginTop: '100px',        
        minHeight: '300px',
      },
      nologo: {
        minHeight: 'unset!'
      }    
    }
  };

  render(){
    const { classes, icon, message, spinIcon, nologo } = this.props;
    return ( 
        <CenteredContainer>          
          <Paper className={`${classes.root600} ${classes.paper} ${nologo === true ? classes.nologo : ''}`}>
            { nologo === true ? null : <Logo /> }
            <Typography variant={'h6'}>{message} &nbsp;<Icon className={spinIcon === true ? classes.spinning: ''}>{icon}</Icon></Typography>
          </Paper>
        </CenteredContainer>
      );
  }
}

Loading.propTypes = {
  message: PropTypes.string,
  classes: PropTypes.object,
  icon: PropTypes.string,
  spinIcon: PropTypes.bool,
  nologo: PropTypes.bool
}

Loading.defaultProps = {
  message: "Loading please stand by...",
  icon: 'cached',
  spinIcon: true,
  nologo: false
}

const ThemedLoading = compose(
  withTheme(),
  withStyles(Loading.styles)
)(Loading)

export default ThemedLoading;