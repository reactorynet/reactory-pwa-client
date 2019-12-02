import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withRouter, Route, Switch } from 'react-router'
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import gql from 'graphql-tag';

import classNames from 'classnames';
import {
  AppBar, Badge, Fab, Tabs, Tab,
  Button, CircularProgress, Grid, Paper, Icon, Form, IconButton,
  FormControl, FormHelperText, Input, InputLabel, TextField, Typography, Tooltip,
  Toolbar,
} from '@material-ui/core';
import green from '@material-ui/core/colors/green';

import SaveIcon from '@material-ui/icons/Save'

//import SwipeableViews from 'react-swipeable-views';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Dropzone from 'react-dropzone';
import { isNil, isEmpty, find, remove, findIndex, sortBy } from 'lodash';
import { withApi } from '../../api/ApiProvider'
import { ReactoryApi } from "../../api/ReactoryApi";
import { CDNOrganizationResource, CenteredContainer } from '../../components/util';
import { styles } from '../shared'
import BusinessUnitGrapQL from './graphql'


const { queries, mutations } = BusinessUnitGrapQL;

class BusinessUnitForm extends Component {

  static Styles = theme => {
    return styles(theme, {
      fabProgress: {
        color: green[500],
        position: 'absolute',
        top: -6,
        left: -6,
        zIndex: 1,
      },
      buttonSuccess: {
        backgroundColor: green[500],
        '&:hover': {
          backgroundColor: green[700],
        },
      },
      buttonProgress: {
        color: green[500],
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
      },
    })
  }

  static propTypes = {
    organization: PropTypes.object.isRequired,
    businessUnit: PropTypes.object,
    api: PropTypes.object
  }

  static defaultProps = {
    businessUnit: { id: 'new', name: '', description: '', owner: null, organization: null, members: [] }
  }

  constructor(props, context) {
    super(props, context)
    this.state = {
      businessUnit: { ...props.businessUnit, organization: props.organization },
      dirty: false,
      busy: false,
      updated: false,
    };

    this.onToggleUserMembership = this.onToggleUserMembership.bind(this);
    this.onBusinessUnitDescriptionChange = this.onBusinessUnitDescriptionChange.bind(this);
    this.onBusinessUnitNameChange = this.onBusinessUnitNameChange.bind(this);
    this.onSaveBusinessUnit = this.onSaveBusinessUnit.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.componentDefs = props.api.getComponents(['core.UserListWithSearch', 'core.BasicModal', 'core.CompanyLogo']);
  }

  onToggleUserMembership(item, index) {
    //console.log('Toggling user membership', { item, index });    
    const { businessUnit } = this.state;
    let members = [...businessUnit.members];
    const memberFound = findIndex(members, { id: item.id });
    if(memberFound >= 0){
      members = remove(members, (member) => { return member.id !== item.id })
    } else {
      members = sortBy([...members, item], ['firstName', 'lastName', 'email']);
    }

    this.setState({ businessUnit: { ...businessUnit, members }, dirty: true });
  }

  onBusinessUnitNameChange(evt) {
    const { businessUnit } = this.state;
    this.setState({ businessUnit: { ...businessUnit, name: evt.target.value }, dirty: true, updated: false })
  }

  onBusinessUnitDescriptionChange(evt) {
    const { businessUnit } = this.state;
    this.setState({ businessUnit: { ...businessUnit, description: evt.target.value }, dirty: true, updated: false })
  }

  onSaveBusinessUnit() {
    const { businessUnit } = this.state
    const { organization, api } = this.props
    const that = this;
    const businessUnitInput = {
      name: businessUnit.name,
      description: businessUnit.description,
      organization: organization.id,
      owner: api.getUser().id,
      avatar: null,
      members: businessUnit.members.map(member => member.id)
    }

    const mutation = {
      mutation: businessUnit.id === 'new' ? mutations.createBusinessUnit : mutations.updateBusinessUnit,
      variables: {
        input: businessUnitInput,
      },
      refetchQueries: [
        { query: queries.businessUnitsForOrganization, variables: { id: organization.id } }
      ]
    };

    if (businessUnit.id !== 'new') {
      mutation.variables.id = businessUnit.id
    }

    that.setState({ busy: true }, ()=>{
      that.props.api.client.mutate(mutation).then(data => {
        that.setState({ busy: false, message: 'Business Unit Saved', displayMessage: true, messageIcon: 'exclamation', updated: true, dirty: false });
      }).catch((mutateError) => {
        that.setState({ busy: false, message: 'Saving of Business Unit Failed', displayMessage: true, messageIcon: 'exclamation', updated: false })
      })
    })
    
  }

  onCancel() {
    this.props.history.goBack();
  }

  render() {
    const { UserListWithSearch, BasicModal, CompanyLogo } = this.componentDefs;
    const { classes } = this.props;
    const { businessUnit, dirty, message, displayMessage, busy, updated } = this.state;
    const { organization } = businessUnit;

    const buttonClassname = classNames({
      [classes.buttonSuccess]: updated,
    });

    let modal = null
    
    if (displayMessage === true) {
      modal = (
        <BasicModal title="Error">
          <Typography>{message}</Typography>
        </BasicModal>
      )
    }
    return (
      <Fragment>
        <Grid container spacing={8}>
          <Grid item xs={12}>
            <Paper className={classes.root900} style={{ margin: 'auto' }}>
              <TextField
                id="full-width"
                label="Business Unit Name"
                InputLabelProps={{
                  shrink: true,
                }}
                placeholder="Name"
                helperText="Please a business unit name"
                fullWidth
                margin="normal"
                onChange={this.onBusinessUnitNameChange}
                value={businessUnit.name} />

              <TextField
                id="full-width"
                label="Business Unit Description"
                InputLabelProps={{
                  shrink: true,
                }}
                placeholder="Description"
                helperText="Please enter a company name"
                fullWidth
                multiline
                rowsMax={4}
                margin="normal"
                onChange={this.onBusinessUnitDescriptionChange}
                value={businessUnit.description} />

              <Toolbar>
                <Button type="button" onClick={this.onCancel}>
                  <Icon>arrow_left</Icon>
                  Back
                </Button>
                <Fab type="button"
                  disabled={dirty === false || businessUnit.name === '' || busy === true}
                  onClick={this.onSaveBusinessUnit}
                  className={buttonClassname}
                  >
                  {updated === true && dirty === false ? <Icon>check</Icon> : <SaveIcon />}
                </Fab>
                {busy && <CircularProgress size={68} className={classes.fabProgress} />}
              </Toolbar>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <UserListWithSearch
              organizationId={organization.id}
              multiSelect={true}
              onUserSelect={this.onToggleUserMembership}
              selected={businessUnit.members.map(member => member.id) || []}
              businessUnitFilter={false}
              showFilters={false} />
          </Grid>
        </Grid>
        {modal}
      </Fragment >
    )
  }
}

const BusinessUnitFormComponent = compose(withApi, withRouter, withStyles(BusinessUnitForm.Styles), withTheme)(BusinessUnitForm)

const BusinessUnitFormWithQueryComponent = compose(withRouter)((props, context) => {
  const { businessUnitId } = props.match.params
  //console.log('matching business unit id', businessUnitId)
  return (<Query query={gql`query BusinessUnitWithId($id: String!){
    businessUnitWithId(id: $id){
      id
      name
      description
      avatar
      organization {
        id
        name
        logo
      }
      owner {
        id
        firstName
        lastName
        avatar
      }
      members {
        id
        firstName
        lastName
        avatar
      }
    }
  }`} variables={{ id: businessUnitId }}>
    {({ loading, data, errors }) => {
      if (loading) return <p>Loading</p>
      if (errors) return <p>{errors}</p>

      const businessUnit = data.businessUnitWithId
      return (
        <BusinessUnitFormComponent organization={businessUnit.organization} businessUnit={businessUnit} mode='edit' />
      )
    }}
  </Query>)
});

export default {
  BusinessUnitFormComponent,
  BusinessUnitFormWithQuery: BusinessUnitFormWithQueryComponent
}

