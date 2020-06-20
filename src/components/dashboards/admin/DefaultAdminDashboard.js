import React,  { Component } from 'react';
import AnnounceMentIcon from '@material-ui/icons/Announcement';


import { withStyles, withTheme } from '@material-ui/core/styles';
import moment from 'moment';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Grid, Typography, Paper, Checkbox, Avatar } from '@material-ui/core';
import Charts from '../../charts'
import AdminCalendar from '../../admin/widget/AdminCalendar';

class DefaultAdminDashboard extends Component {


  render(){
    return (
      <Grid container>
        <Grid item xs={12} md={12}>
          <Typography variant="h6">Dashboard</Typography>
        </Grid>                
        <Grid item xs={12} md={12} lg={12}>
          <Typography variant="caption">Calendar</Typography>
          <AdminCalendar />
        </Grid>
      </Grid>
    )
  }

  static styles = (theme) => ({
    
  })

  static mapStateToProps = (state, props) => ({

  })

  static mapDispatchToProps = (dispatch) => ({

  })

  constructor(props, context){
    super(props, context);
    this.state = {

    }
  }
}


let DefaultAdminDashboardComponent = compose(
  withStyles(DefaultAdminDashboard.styles),
  withTheme,  
  connect(DefaultAdminDashboard.mapStateToProps, DefaultAdminDashboard.mapDispatchToProps)
)(DefaultAdminDashboard)


export default DefaultAdminDashboardComponent;