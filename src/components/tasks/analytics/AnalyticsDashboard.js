import React, { Component } from 'react';
import PropTypes from 'react';
import { compose } from 'recompose';
import {
  Typography,
  Icon,
  Paper
} from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import coreStyles from '../../shared/styles';
import { CenteredContainer } from '../../shared/Layout';
import Logo from '../../shared/logo'

class AnalyticsDashboard extends Component {

  static styles = theme => { 
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
      }    
    };
  };

  render(){
    const { classes, icon, message, spinIcon } = this.props;
    return ( 
        <CenteredContainer>          
          <Paper className={`${classes.root600} ${classes.paper}`}>
            <Logo />
            <p>Sexy Charts</p>
          </Paper>
        </CenteredContainer>
      );
  }
}

AnalyticsDashboard.propTypes = {
  message: PropTypes.string,
  classes: PropTypes.object,
  icon: PropTypes.string,
  spinIcon: PropTypes.boolean
}

AnalyticsDashboard.defaultProps = {
  message: "Loading please stand by...",
  icon: 'cached',
  spinIcon: true
}

const AnalyticsDashboardComponent = compose(
  withTheme,
  withStyles(AnalyticsDashboard.styles)
)(AnalyticsDashboard)

export default AnalyticsDashboardComponent;