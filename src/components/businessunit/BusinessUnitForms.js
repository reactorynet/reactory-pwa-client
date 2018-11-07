import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withRouter, Route, Switch } from 'react-router'
//import { connect } from 'react-redux';
//import { Field, reduxForm } from 'redux-form';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import gql from 'graphql-tag';


import {
  AppBar, Badge, Tabs, Tab,
  Button, Grid, Paper, Icon, Form, IconButton,
  FormControl, FormHelperText, Input, InputLabel, TextField, Typography, Tooltip,
  Toolbar,
} from '@material-ui/core';

import SaveIcon from '@material-ui/icons/Save'

//import SwipeableViews from 'react-swipeable-views';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Dropzone from 'react-dropzone';
import { isNil, isEmpty, find, remove, findIndex, sortBy } from 'lodash';
import { withApi, ReactoryApi } from '../../api/ApiProvider'
import { CDNOrganizationResource, CenteredContainer } from '../../components/util';
import { styles } from '../shared'
import BusinessUnitGrapQL from './graphql'

const { queries, mutations } = BusinessUnitGrapQL;

class BusinessUnitForm extends Component {

  static Styles = theme => {
    return styles(theme, {

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
    };

    this.onToggleUserMembership = this.onToggleUserMembership.bind(this);
    this.onBusinessUnitDescriptionChange = this.onBusinessUnitDescriptionChange.bind(this);
    this.onBusinessUnitNameChange = this.onBusinessUnitNameChange.bind(this);
    this.onSaveBusinessUnit = this.onSaveBusinessUnit.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.componentDefs = props.api.getComponents(['core.UserListWithSearch', 'core.BasicModal']);
  }

  onToggleUserMembership(item) {
    const { businessUnit } = this.state;
    let members = [...businessUnit.members]
    const memberFound = findIndex(members, { id: item.id })
    members = memberFound >= 0 ? remove(members, { id: item.id }) : sortBy([...members, item], ['firstName', 'lastName', 'email']);
    this.setState({ businessUnit: { ...businessUnit, members } })
  }

  onBusinessUnitNameChange(evt) {
    const { businessUnit } = this.state;
    this.setState({ businessUnit: { ...businessUnit, name: evt.target.value } })
  }

  onBusinessUnitDescriptionChange(evt) {
    const { businessUnit } = this.state;
    this.setState({ businessUnit: { ...businessUnit, description: evt.target.value } })
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

    if(businessUnit.id !== 'new'){
      mutation.variables.id = businessUnit.id
    }

    this.props.api.client.mutate(mutation).then(data => {

    }).catch((mutateError) => {
      this.setState({ busy: false, message: 'Saving of Business Unit Failed', displayMessage: true, messageIcon: 'exclamation' })
    })
  }

  onCancel() {
    this.props.history.goBack();
  }

  render() {
    const { UserListWithSearch, BasicModal } = this.componentDefs;
    const { classes, organization } = this.props;
    const { businessUnit, dirty, message, displayMessage } = this.state;
    let modal = null

    if(displayMessage === true) {
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
                placeholder="BU Name"
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
                  Cancel
              </Button>
                <Button type="button"
                  disabled={dirty || businessUnit.name === ''}
                  onClick={this.onSaveBusinessUnit}>
                  <SaveIcon />
                  Save
              </Button>
              </Toolbar>
            </Paper>
          </Grid>          
          <Grid item xs={12}>
            <UserListWithSearch organizationId={organization.id} multiSelect={true} onItemSelected={this.onToggleUserMembership} selected={businessUnit.members || []} showFilters={false} />
          </Grid>
        </Grid>
        {modal}
      </Fragment >
    )
  }
}

const BusinessUnitFormComponent = compose(withApi, withStyles(BusinessUnitForm.Styles), withTheme())(BusinessUnitForm)

const BusinessUnitFormWithQueryComponent = (props, context) => {
  const { businessUnitId } = props
  return (<Query query={gql`query BusinessUnitWithId($id: String!){
    businessUnitWithId(id: $id){
      id
      name
      description
      avatar
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
    {({loading, data, errors}) => {
      if(loading) return <p>Loading</p>
      if(errors) return <p>{errors}</p>

      const businessUnit = data.businessUnitWithId
      return (
        <BusinessUnitFormComponent organization={businessUnit.organization} businesssUnit={businessUnit} mode='edit'/>
      )
    }}
  </Query>)
}

export default {
  BusinessUnitFormComponent,
  BusinessUnitFormWithQuery: BusinessUnitFormWithQueryComponent
}

