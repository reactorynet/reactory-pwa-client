import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withRouter, Route, Switch } from 'react-router'
import { connect } from 'react-redux';
import { Field, reduxForm } from 'redux-form';
import { graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';

import {
  AppBar, Tabs, Tab, 
  Button, Grid, Paper, 
  FormControl, FormHelperText, Input, InputLabel, TextField, Typography } from 'material-ui';

import SaveIcon from 'material-ui-icons/Save'

import SwipeableViews from 'react-swipeable-views';
import { withStyles, withTheme } from 'material-ui/styles';
import Dropzone from 'react-dropzone';
import { isNil, isEmpty } from 'lodash';

import { UserListWithData, EditProfile, CreateProfile } from '../../user/index'
import { BrandListWithData, EditBrand, newBrand, CreateBrand } from '../../brands'
import Templates from '../../template'
import AdminCalendar, { SurveyCalendarForOrganization } from '../../admin/widget/AdminCalendar'
import Settings from './settings'
import { runInThisContext } from 'vm';

const { EmailTemplateEditorComponent, TemplateListComponent } = Templates;
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
    },
    logoContainer: {
      maxHeight: '260px',
      minHeight: '200px',
      justifyContent: 'center',
      display: 'flex',
      paddingTop: theme.spacing.unit * 1.5,
      paddingBottom:  theme.spacing.unit * 1.5      
    },
    logo: {      
      maxHeight: '200px'      
    }
  }
};


class OrganizationForm extends Component {
  constructor(props, context){
    super(props, context)
    console.log('OrganizationForm', props, context)
    this.state = {
      organization: props.initialValues,
      pristine: true,
      submitting: false
    }

    this.updateOrganizationName = this.updateOrganizationName.bind(this)
    this.updateOrganizationCode = this.updateOrganizationCode.bind(this)
    this.updateOrganizationPicture = this.updateOrganizationPicture.bind(this)
    this.dropped = this.dropped.bind(this)
    this.updateOrganization = this.updateOrganization.bind(this)
  }

  static propTypes = {
    initialValues: PropTypes.object,
    client: PropTypes.object
  }

  componentWillReceiveProps(props){
    console.log('new props', {s: this.state, props})
    if(this.state.organization.id !== props.initialValues.id){
      this.setState({organization: {...props.initialValues}})
    }
  }
  
  dropped = (acceptedFiles) => {
    const that = this;
    let preview = null;
    let file    = acceptedFiles[0];
    let reader  = new FileReader();
    reader.addEventListener("load", function () {
        preview = reader.result;
        let organization = that.state.organization;
        organization.logo = preview;
        that.setState({organization, pristine: false});
    }, false);

    if (file) {
        reader.readAsDataURL(file);
    }
  }
  
  updateOrganizationName = (evt) => (this.setState({organization: {...this.state.organization, name: evt.target.value }, pristine: false}));
  updateOrganizationCode = (evt) => (this.setState({organization: {...this.state.organization, code: evt.target.value}, pristine: false}));
  updateOrganizationPicture = (picture) => (this.setState({organization: {...this.state.organization, logo: picture }, pristine: false})); 
  updateOrganization = (evt) => {
    const { client } = this.props;
    const { organization } = this.state;    
    const input = {      
      code: organization.code,
      name: organization.name,
      logo: organization.logo,
      legacyId: -1
    };

    const options = {
      mutation: updateQuery,
      variables: {
        input,
        id: organization.id,
        refetchQueries: ['allOrganization']
      }
    }

    client.mutate(options).then((result) => {
      console.log('Mutation Result', result);
    }).catch((error) => {
      console.error('Mutation error', error);
    })
  }

  render(){
    const { classes } = this.props;
    const { organization, pristine, submitting } = this.state;

    if(isNil(organization)) return <p>Loading...</p>
    return (
    <Paper className={classes.formContainer}>
      <form>
        <Grid container>
          <Grid item xs={12}>
            <Paper className={classes.logoContainer}>
              { isEmpty(organization.logo) === true ? <p style={{textAlign: 'center', paddingTop: '30px'}}>Upload Logo</p> : <img src={organization.logo} className={classes.logo} alt={organization.name} />}
            </Paper>
          </Grid>
          <Grid item xs={12} md={9}>
          <TextField
              id="full-width"
              label="Company Code"
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Shortcode"
              helperText="Please enter company shortcode"
              fullWidth
              margin="normal"
              onChange={this.updateOrganizationCode} 
              value={organization.code} />   

            <TextField
              id="full-width"
              label="Company Name"
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Company Name"
              helperText="Please enter a company name"
              fullWidth
              margin="normal"
              onChange={this.updateOrganizationName} 
              value={organization.name} />                         
          </Grid>
          <Grid item xs={12} md={3}>
            <div className={classes.dropzoneContainer}>
              <Dropzone onDrop={this.dropped}>

              </Dropzone>
              <Typography variant="caption">Drag and Drop Logo</Typography>
            </div>
          </Grid>
          <Grid item xs={12}>
            <Button type="button" disabled={pristine || submitting || organization.name === ''} onClick={this.updateOrganization}>
              <SaveIcon />
              Save
            </Button>          
          </Grid>
        </Grid>                                  
      </form>
    </Paper>);
  }  
};

let DefaultFormComponent = compose(  
  withTheme(),  
  withStyles(FormStyles), 
  withApollo,   
)(OrganizationForm);

function TabContainer({ children, dir }) {
  return (
    <Typography component="div" dir={dir} style={{ padding: 8 * 3 }}>
      {children}
    </Typography>
  );
}

class DefaultFormContainer extends Component {
  
  static propTypes = {
    match: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired
  }

  constructor(props){
    super(props)
    this.state = { 
      errors: [], 
      tab: 0,
      leadershipBrand: null,
      leadershipBrandMode: 'new',
      employee: null,
      employeeMode: 'list',
      survey: null,
      surveyMode: 'calendar'
    };
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.handleChangeIndex = this.handleChangeIndex.bind(this)
    this.onNewBrand = this.onNewBrand.bind(this)
    this.onBrandSelected = this.onBrandSelected.bind(this)
    this.onCancelBrandEdit = this.onCancelBrandEdit.bind(this)
    this.onEmployeeSelected = this.onEmployeeSelected.bind(this)
    this.onClearEmployeeSelection = this.onClearEmployeeSelection.bind(this)
    this.onCalendarEntrySelect = this.onCalendarEntrySelect.bind(this)
    this.onClearSurveySelect = this.onClearSurveySelect.bind(this)
  }

  handleSubmit(values) {
    console.log(values)
  }

  handleChange = (event, value) => {    
    this.props.history.push(`/admin/org/${this.props.orgId}/${value}`)
  };

  handleChangeIndex = index => {
    this.setState({ value: index });
  };

  onNewBrand = ( brand ) => {
    this.setState({ leadershipBrand: {...newBrand}, leadershipBrandMode: 'new' })
  }

  onBrandSelected = ( brand ) => {    
    this.setState({ leadershipBrand: brand, leadershipBrandMode: 'edit' })
  }

  onEmployeeSelected = ( user ) => {
    this.setState({ employee: user, employeeMode: user.__isnew ? 'new' : 'edit' })
  }

  onClearEmployeeSelection = () => {
    this.setState({ employee: null, employeeMode: 'list' })
  }

  onCalendarEntrySelect = ( survey ) => {
    this.setState({ survey: survey, surveyMode: survey.__isnew ? 'new' : 'edit' })
  }

  onClearSurveySelect = () => {
    this.setState({ survey: null, surveyMode: 'calendar' })
  }

  onCancelBrandEdit = () => {
    this.setState({ leadershipBrand: null })
  }

  render(){
    let initialValues = { id: null, name: null };
    const { classes, theme, tab, match } = this.props;
    const { 
      leadershipBrand,
      leadershipBrandMode,
      employee, 
      employeeMode,
      survey,
      surveyMode, 
    } = this.state;

    let LeadershipBrandComponent = null;
    let EmployeeComponent = null;
    let SurveyComponent = null;

    if(!isNil(this.props.organization) && !this.props.organization.loading) initialValues = { ...this.props.organization.organizationWithId }
    
    if(leadershipBrand){
      switch(leadershipBrandMode){        
        case 'edit': {
          LeadershipBrandComponent = <EditBrand organizationId={initialValues.id} leadershipBrand={leadershipBrand} onCancel={this.onCancelBrandEdit} />
          break;
        }
        case 'new': 
        default: {
          LeadershipBrandComponent = <CreateBrand organizationId={initialValues.id} leadershipBrand={leadershipBrand} onCancel={this.onCancelBrandEdit}/>          
        }        
      }
    }

    
    switch(employeeMode){
      case 'edit': {
        EmployeeComponent = <EditProfile onCancel={this.onClearEmployeeSelection} profile={employee} organizationId={initialValues.id} />
        break
      }
      case 'new': {
        EmployeeComponent = <CreateProfile onCancel={this.onClearEmployeeSelection} profile={employee} organizationId={initialValues.id} />
        break
      }
      case 'list':
      default: {
        EmployeeComponent = <UserListWithData onUserSelect={this.onEmployeeSelected} organizationId={initialValues.id} />
        break
      }
    }

    /**
     * 
     *  { tab === 'employees' ? <TabContainer dir={theme.direction}>
          {EmployeeComponent}
        </TabContainer>  : null }
        
        { tab === 'brands' ? <TabContainer dir={theme.direction}>
          <Grid container>
            <Grid item xs={12}>
              {leadershipBrand ? 
              LeadershipBrandComponent :
              <BrandListWithData organizationId={initialValues.id} onNewSelected={this.onNewBrand} onSelect={this.onBrandSelected} /> }
            </Grid>            
          </Grid>
        </TabContainer> : null }
                                
        { tab === 'surveys' ? 
        <TabContainer dir={theme.direction}>
          <SurveyCalendarForOrganization organization={initialValues} onNewCalendarEntry={this.onNewCalendarEntry} onSelect={this.onCalendarEntrySelect} />
        </TabContainer> : null }

        { tab === 'templates' ? 
        <TabContainer>
          <TemplateListComponent />
        </TabContainer> : null }

        { tab === 'configuration' ? 
        <TabContainer dir={theme.direction}>
          <Settings />
        </TabContainer> : null }       
     * 
     */
    console.log('Location', {l: match.location});
    return (
      <div className={classes.root}>        
        <AppBar position="static" color="default">
          <Tabs
            value={tab}
            onChange={this.handleChange}
            indicatorColor="primary"
            textColor="primary"
            fullWidth
          >
            <Tab label="General" value={'general'}/>
            <Tab label="Employees" value={'employees'} />
            <Tab label="Brands" value={'brands'} />
            <Tab label="Surveys" value={'surveys'}/>
            <Tab label="Templates" value={'templates'}/>
            <Tab label="Configuration" value={'configuration'} />
          </Tabs>
        </AppBar>
        <TabContainer>
          <p>{match.location}</p>
          <Switch>
            <Route exact path={'/admin/org/:organizationId'} component={DefaultFormComponent} />
            <Route path={'/admin/org/:organizationId/general'} component={DefaultFormComponent} />
            <Route path={'/admin/org/:organizationId/employees'} component={EmployeeComponent} />
            <Route path={'/admin/org/:organizationId/brands'} component={LeadershipBrandComponent} />
            <Route path={'/admin/org/:organizationId/surveys'} component={SurveyCalendarForOrganization} />
            <Route path={'/admin/org/:organizationId/templates'} component={TemplateListComponent} />
            <Route path={'/admin/org/:organizationId/configuration'} component={Settings} />
          </Switch>
        </TabContainer>                        
      </div>
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

const updateQuery = gql`
 mutation UpdateOrganization($input: UpdateOrganizationInput!, $id: String!) {
    updateOrganization(id: $id, input: $input) {
      id
    }
  }
`;

const queryOptions = props => ({
  skip: props.orgId === null || props.mode === 'new',
  variables: {
    id: props.orgId
  },
  fetchPolicy: 'cache-and-network'
});

const CompanyAdminStyles = (theme) => {
  return {
    root: {

    }
  }
};


export default compose(
  withRouter,
  withTheme(),
  withStyles(CompanyAdminStyles),
  graphql(loadQuery, {name: 'organization', options: queryOptions } ),    
)(DefaultFormContainer);
