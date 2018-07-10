import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { withRouter, Route, Switch } from 'react-router'
import { Link } from "react-router-dom";
import { compose } from 'redux'
import { withStyles, withTheme } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import TextField from 'material-ui/TextField'
import Toolbar from 'material-ui/Toolbar'
import Grid from 'material-ui/Grid' 
import Form from 'react-jsonschema-form';
import List, { ListItem, ListItemSecondaryAction, ListItemText } from 'material-ui/List'
import Avatar from 'material-ui/Avatar'
import SwipeableViews from 'react-swipeable-views';
import AppBar from 'material-ui/AppBar';
import Tabs, { Tab } from 'material-ui/Tabs';
import { OrganizationList, Forms } from '../organization';
import schemas, { FieldTemplate } from './schemas';
import Dashboards from '../dashboards';



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

    const log = (type) => console.log.bind(console, type);    

    return(
      <Grid container spacing={16}>
        <Grid item xs={12}>
          <Toolbar>
            <Link to="/admin">
              <Typography variant="title">Dashboard</Typography>
            </Link>
            
          </Toolbar>
        </Grid>
        <Grid item md={3} xs={12}>          
          <OrganizationList admin={true} newOrganizationLink={true} />                    
        </Grid>
        <Grid item md={9} xs={12}>        
          <Switch>
            <Route exact path='/admin'>
              <Dashboards.DefaultAdminDashboard />
            </Route>
            <Route exact path='/admin/org/new'>
              <Forms.Default mode={'new'} orgId={null} />
            </Route>
            <Route path='/admin/org/:orgId/:tab' render={ props =>
              <Forms.Default orgId={props.match.params.orgId} tab={props.match.params.tab} mode={'edit'} {...props} />              
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
  withRouter,
  withStyles(AdminDashboard.styles),
  withTheme()
)(AdminDashboard)