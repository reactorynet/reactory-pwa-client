import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { withRouter, Route, Switch } from 'react-router'
import { compose } from 'redux'
import {withStyles, withTheme} from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import TextField from 'material-ui/TextField'
import Toolbar from 'material-ui/Toolbar'
import Grid from 'material-ui/Grid' 
import List, { ListItem, ListItemSecondaryAction, ListItemText } from 'material-ui/List'
import Avatar from 'material-ui/Avatar'
import { OrganizationList } from '../organization';


class AdminDashboard extends Component {

  static styles = theme => ({
    dashboardRoot: {
      backgroundColor: theme.palette.primary.light
    }
  })

  static propTypes = {

  }

  handleOrganizationSelect = (organization) => {
    this.props.history.push(`/admin/org/${organization.id}`)  
  } 

  render(){
    const { classes } = this.props;
    return(
      <Grid container spacing={16}>
        <Grid item xs={12}>
          <Toolbar>
            <Typography variant="title">Admin</Typography>            
          </Toolbar>
        </Grid>
        <Grid item md={3} xs={12}>
          <OrganizationList onOrganizationClick={this.handleOrganizationSelect}/>
        </Grid>
        <Grid item md={6} xs={12}>
          
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