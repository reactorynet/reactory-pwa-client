import React, { Component } from 'react'
// import PropTypes from 'prop-types'
import { withRouter, Route, Switch } from 'react-router'
import { Link } from "react-router-dom";
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
// import TextField from '@material-ui/core/TextField'
import Toolbar from '@material-ui/core/Toolbar'
import Grid from '@material-ui/core/Grid' 
// import Form from 'react-jsonschema-form';
//import List, { ListItem, ListItemSecondaryAction, ListItemText } from '@material-ui/core/List'
//import Avatar from '@material-ui/core/Avatar'
//import SwipeableViews from 'react-swipeable-views';
//import AppBar from '@material-ui/core/AppBar';
//import Tabs, { Tab } from '@material-ui/core/Tabs';
import { OrganizationList, Forms } from '../organization';
//import schemas, { FieldTemplate } from './schemas';
import Dashboards from '../dashboards';
import { withApi, ReactoryApi } from '../../api/ApiProvider'

class AdminDashboard extends Component {

  static styles = theme => ({
    dashboardRoot: {
      backgroundColor: theme.palette.primary.light
    }
  })

  static propTypes = {

  }

  handleOrganizationSelect = (organization) => {
    this.props.history.push(`/admin/org/${organization.id}/general`)  
  } 

  render(){
    const { classes } = this.props;
    return(
      <Grid container spacing={8}>
        <Grid item xs={12}>
          <Toolbar>
            <Link to="/admin/">
              <Typography variant="h6">Dashboard</Typography>
            </Link>            
          </Toolbar>
        </Grid>
        <Grid item md={3} xs={12}>
          <OrganizationList admin={true} newOrganizationLink={true}/>                    
        </Grid>
        <Grid item md={9} xs={12}>        
          <Switch>
            <Route exact path='/admin/'>
              <Dashboards.DefaultAdminDashboard />
            </Route>
            <Route exact path='/admin/org/new/general'>
              <Forms.Default mode={'new'} tab={'general'} />
            </Route>
            <Route path='/admin/org/:organizationId/:tab' render={ props =>
              <Forms.Default organizationId={props.match.params.organizationId} tab={props.match.params.tab} mode={'edit'} {...props} />              
            } />                        
          </Switch> 
        </Grid>        
      </Grid>
    )
  }

  constructor(props, context){
    super(props, context);
    this.handleOrganizationSelect = this.handleOrganizationSelect.bind(this);
   
  }
}

export default compose(
  withApi,
  withRouter,
  withStyles(AdminDashboard.styles),
  withTheme
)(AdminDashboard)