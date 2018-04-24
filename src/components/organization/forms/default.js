import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Field, reduxForm } from 'redux-form';
import { graphql, withApollo, ApolloClient } from 'react-apollo';
import gql from 'graphql-tag';

import { 
  Button, Grid, Paper, 
  FormControl, FormHelperText, Input, InputLabel } from 'material-ui';
import { withStyles, withTheme } from 'material-ui/styles';
import Dropzone from 'react-dropzone';

const RenderField = ( { input, label, classes, type, meta: { touched, error}, fullWidth, help, disabled } ) => {
  let controlProps = {}
  if(fullWidth) controlProps.fullWidth = true;
  if(disabled) controlProps.disabled = true;
  return (
    <FormControl {...controlProps}>
      <InputLabel>{label}</InputLabel>
      <Input {...input} type={type} placeholder={label}/>
      <FormHelperText>{help}</FormHelperText>
    </FormControl>
  )
}

const DropZoneRender = ( props  ) => {
  const { input, label, classes, type, meta: { touched, error}, fullWidth, help, disabled } = props
  console.log(props);
  let controlProps = {}
  if(fullWidth) controlProps.fullWidth = true;
  if(disabled) controlProps.disabled = true;

  const dropped = (eventData) => {
    console.log(eventData);
  }

  return (
    <div className={classes.dropzoneContainer}>
      <Dropzone onDrop={dropped}>

      </Dropzone>
    </div>
  )
}

const FormStyles = ( theme ) => {
  return {
    formContainer: {
      margin: theme.spacing.unit,
      padding: theme.spacing.unit
    },
    dropzoneContainer: {
      margin: theme.spacing.unit * 1.5
    }
  }
};


class OrganizationForm extends Component {

  static propTypes = {
    initialValues: PropTypes.object
  }
  
  render(){
    const { handleSubmit, pristine, reset, submitting, classes } = this.props;
    return (
    <Paper className={classes.formContainer}>
      <form onSubmit={handleSubmit}>
        <Grid container>
          <Grid item xs={12} md={9}>
            <Field 
                name="id"
                label="ID"
                fullWidth={true}
                disabled={true}
                classes={classes}
                component={RenderField}
              />

              <Field
                name="name"
                label="Company Name"
                fullWidth={true}
                classes={classes}
                component={RenderField}
              />                            
          </Grid>
          <Grid item xs={12} md={3}>
            <Field
                  name="logo"
                  label="Logo"
                  classes={classes}                  
                  component={DropZoneRender}
                />
          </Grid>
          <Grid item xs={12}>
            <Button type="button" disabled={pristine || submitting} onClick={reset}>Clear</Button>
            <Button type="submit" disabled={pristine || submitting}>Submit</Button>          
          </Grid>
        </Grid>                                  
      </form>
    </Paper>);
  }  
};

let DefaultFormComponent = compose(  
  withTheme(),  
  withStyles(FormStyles),
  reduxForm({
    form: 'organizationWithId', // a unique identifier for this form
  })  
)(OrganizationForm);


class DefaultFormContainer extends Component {

  static mapStateToProps = (state, props) => {
    console.log(state, props);
    return {

    }
  }

  static mapDispatchToProps = ( dispatch ) => {
    return {

    }
  }

  constructor(props){
    super(props)
    this.state = { errors: [] }
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit(values) {
    console.log(values)
  }

  render(){
    let initialValues = { id: 'SYSTEM ASSIGNED'};
    if(this.props.organization && this.props.organization.loading === false) initialValues = { ...this.props.organization.organizationWithId }
    return (
      <DefaultFormComponent onSubmit={this.handleSubmit} initialValues={ initialValues }/>
    )
  }
}

const loadQuery = gql`
  query organizationWithId($id: String!){
    organizationWithId(id: $id) {
      id
      code
      name
      logo
      legacyId
      createdAt
      updatedAt
    }
  }`;

const queryOptions = props => ({
  skip: props.orgId === null || props.mode === 'new',
  variables: {
    id: props.orgId
  },
  fetchPolicy: 'cache-and-network'
});

export default compose(
  graphql(loadQuery, {name: 'organization', options: queryOptions } ),
  connect(DefaultFormContainer.mapStateToProps, DefaultFormContainer.mapDispatchToProps),    
)(DefaultFormContainer);
