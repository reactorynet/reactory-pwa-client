import React, { Component } from 'react'
// import PropTypes from 'prop-types'
import { withRouter, Route, Switch, RouteComponentProps } from 'react-router'
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
import ReactoryApi from "../../api/ReactoryApi";
import Reactory from '@reactory/client-core/types/reactory';

interface IReactoryDashboardProperties extends RouteComponentProps {
  organization?: Reactory.IOrganization,
  rootPath?: string, 
  classes?: any,
}

class AdminDashboard extends Component<IReactoryDashboardProperties, any> {


  constructor(props, context){
    super(props, context);   
  }

  static styles = theme => ({
    dashboardRoot: {
      marginTop: theme.spacing(1)
    }
  })

  static defaultProps = {
    organization: null,
    rootPath: 'admin',
  }

  handleOrganizationSelect(organization){
    this.props.history.push(`/${this.props.rootPath}/org/${organization.id}/general`)  
  } 

  render(){

    const { rootPath, classes } = this.props;

    return(
      <Grid container spacing={8} className={classes.dashboardRoot}>        
        <Grid item xs={12} sm={12} md={3} lg={2}>            
          <OrganizationList admin={true} newOrganizationLink={true}/>                    
        </Grid>
        <Grid item xs={12} sm={12} md={9} lg={10} >        
          <Switch>
            <Route exact path={`/${rootPath}/`}>
              <Dashboards.DefaultAdminDashboard />
            </Route>
            <Route exact path={`/${rootPath}/org/new/general`}>
              <Forms.Default mode={'new'} tab={'general'} />
            </Route>
            <Route path={`/${rootPath}/org/:organizationId/:tab`} render={ props =>
              <Forms.Default organizationId={props.match.params.organizationId} tab={props.match.params.tab} mode={'edit'} {...props} />              
            } />                        
          </Switch> 
        </Grid>        
      </Grid>
    )
  }

 
}

export default compose(
  withApi,
  withRouter,
  withStyles(AdminDashboard.styles),
  withTheme
)(AdminDashboard)