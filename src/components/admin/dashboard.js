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
import { OrganizationList, Forms } from '../organization';
//import schemas, { FieldTemplate } from './schemas';
import Dashboards from '../dashboards';
import { withApi } from '../../api/ApiProvider'
import { ReactoryApi } from "../../api/ReactoryApi";

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