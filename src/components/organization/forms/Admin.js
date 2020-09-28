import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withRouter, Route, Switch } from 'react-router'
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import gql from 'graphql-tag';

import {
  Avatar,
  AppBar, Tabs, Tab,
  Button, Grid, Paper, Icon,
  FormControl, FormHelperText,
  Input, InputLabel,
  TextField, Typography, Tooltip,
  Toolbar,
} from '@material-ui/core';

import SaveIcon from '@material-ui/icons/Save'

//import SwipeableViews from 'react-swipeable-views';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Dropzone from 'react-dropzone';
import { isNil, isEmpty, indexOf, remove, filter } from 'lodash';

import { UserListWithData, EditProfile, CreateProfile, UserProfile } from '../../user/index'
import { BrandListWithData, EditBrand, newBrand, CreateBrand } from '../../brands'
import Templates from '../../template'
import AdminCalendar, { SurveyCalendarForOrganization, EditSurveyEntryForOrganization, NewSurveyEntryForOrganization } from '../../admin/widget/AdminCalendar'
import Settings from './settings'
import { withApi } from '../../../api/ApiProvider'
import { ReactoryApi } from "../../../api/ReactoryApi";
import { CDNOrganizationResource, CenteredContainer } from '../../util';
import { styles } from '../../shared'
import { ThumbUpSharp } from '@material-ui/icons';

const { EmailTemplateEditorComponent, TemplateListComponent } = Templates;

const FormStyles = (theme) => {

  return styles(theme, {
    formContainer: {
      margin: theme.spacing.unit,
      padding: theme.spacing.unit
    },
    dropZone: {
      position: 'unset !important',
      width: '100% !important',
      height: 'unset !important',
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
      paddingBottom: theme.spacing.unit * 1.5
    },
    logo: {
      maxHeight: '200px'
    },
  })
};

const DefaultOrganization = {
  id: null,
  code: 'your-code',
  name: 'Your Company Name',
  logo: null,
}


class OrganizationForm extends Component {
  constructor(props, context) {
    super(props, context)
    this.state = {
      organization: this.props.organization || null,
      pristine: true,
      submitting: false
    }

    this.updateOrganizationName = this.updateOrganizationName.bind(this)
    this.updateOrganizationCode = this.updateOrganizationCode.bind(this)
    this.updateOrganizationPicture = this.updateOrganizationPicture.bind(this)
    this.dropped = this.dropped.bind(this)
    this.updateOrganization = this.updateOrganization.bind(this)
    this.componentDefs = this.props.api.getComponents(['core.BasicModal', 'core.Loading', 'forms.OrganizationForm']);
  }

  componentWillReceiveProps(props) {

    if (!this.state.organization && props.organization.organizationWithId) {
      this.setState({ organization: props.organization.organizationWithId });
      return;
    }

    if (this.state.organization && props.organization.organizationWithId && this.state.organization.id !== props.organization.organizationWithId.id) {
      this.setState({ organization: props.organization.organizationWithId });
      return;
    }
  }

  static propTypes = {
    organization: PropTypes.object,
    match: PropTypes.object,
    client: PropTypes.object,
    api: PropTypes.instanceOf(ReactoryApi).isRequired
  }


  dropped = (acceptedFiles) => {
    const that = this;
    let preview = null;
    let file = acceptedFiles[0];
    let reader = new FileReader();
    reader.addEventListener("load", function () {
      preview = reader.result;
      let organization = { ...that.state.organization };
      organization.logo = preview;
      that.setState({ organization, pristine: false });
    }, false);

    if (file) {
      reader.readAsDataURL(file);
    }
  }

  updateOrganizationName = (evt) => (this.setState({ organization: { ...this.state.organization, name: evt.target.value }, pristine: false }));
  updateOrganizationCode = (evt) => (this.setState({ organization: { ...this.state.organization, code: evt.target.value }, pristine: false }));
  updateOrganizationPicture = (picture) => (this.setState({ organization: { ...this.state.organization, logo: picture }, pristine: false }));
  updateOrganization = (evt) => {

    this.props.api.log(`Admin.updateOrganization (evt) `, { evt }, 'debugger')
    debugger
    const { client } = this.props;
    const { organization } = this.state;
    const that = this;
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
      },
      refetchQueries: [{ query: this.props.api.queries.Organization.allOrganizations }]
    }

    if (organization.id === null) {
      delete options.variables.id
      delete options.variables.input.id
      options.mutation = createQuery
    }

    client.mutate(options).then((result) => {
      //console.log('Mutation Result', result);

      let organization = that.props.match.params.organizationId === 'new' ? result.data.createOrganization : result.data.updateOrganization;
      this.setState({ organization: { ...organization } })
      if (!organization.id) that.props.history.push(`/admin/org/${organization.id}/general`)
    }).catch((error) => {
      console.error('Mutation error', error);
      that.setState({ message: error, messageTitle: 'Error saving organization' });
    })

    /**
     * <form>
            <Grid container spacing={8}>
              <Tooltip title="Drag and drop a file on the logo area.">
                <Grid item xs={12}>

                </Grid>
              </Tooltip>
              <Grid item xs={12} md={6}>
                <Paper className={classes.root600}>
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
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper>

                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Button type="button" disabled={pristine || submitting || organization.name === ''} onClick={this.updateOrganization}>
                  <SaveIcon />
                  Save
              </Button>
              </Grid>
            </Grid>
          </form>
     *
     *  */
  }



  render() {
    const { classes } = this.props;
    const { organization, pristine, submitting, message } = this.state;
    const { BasicModal, Loading, OrganizationForm } = this.componentDefs;

    if (this.props.organization.loading) return <Loading message="Loading organization data" />
    let modal = null
    if (message) {
      modal = <BasicModal title={this.state.messageTitle || 'Note'}>{message}</BasicModal>
    }

    return (
      <Paper className={classes.formContainer}>
        <OrganizationForm formData={organization} mode={organization.id === null ? 'new' : 'edit'} />
      </Paper>);
  }
};

let DefaultFormComponent = compose(
  withApi,
  withRouter,
  withTheme,
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

  surveyComponent = null;

  static propTypes = {
    match: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    api: PropTypes.instanceOf(ReactoryApi),
    organization: PropTypes.object.isRequired,
    tab: PropTypes.string
  }

  static defaultProps = {
    organization: DefaultOrganization,
    tab: 'general'
  }

  static styles = theme => { }

  constructor(props) {
    super(props)
    this.state = {
      errors: [],
      tab: 0,
      leadershipBrand: null,
      leadershipBrandMode: 'new',
      employee: null,
      employeeMode: 'list',
      survey: null,
      surveyMode: 'calendar',
      selectedEmployees: [],
      showConfirmDelete: false,
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
    this.onOrganizationSaved = this.onOrganizationSaved.bind(this)
    this.getAdminUserToolbar = this.getAdminUserToolbar.bind(this)
    this.onCancelDeleteEmployees = this.onCancelDeleteEmployees.bind(this);
    this.onConfirmDeleteEmployees = this.onConfirmDeleteEmployees.bind(this);
    this.onDeleteSelectedEmployees = this.onDeleteSelectedEmployees.bind(this);

    this.componentDefs = this.props.api.getComponents([
      'core.UserListWithSearch',
      'core.SpeedDial',
      'core.ReactoryForm',
      'core.BusinessUnitList',
      'core.BusinessUnitForm',
      'core.BusinessUnitFormWithQuery',
      'core.CompanyLogo',
      'core.BasicModal',
      'towerstone.TowerStoneLeadershipBrandConfig',
      'towerstone.TowerStoneSurveyConfig',
      'towerstone.TowerStoneSurveySettings',
      'towerstone.TowerStoneSurveyDelegateConfig',
      'towerstone.TowerStoneSurveyCalendarConfig',
      'towerstone.TowerStoneSurveyTemplatesForm',
      'mores.LeadershipBrandFactoryWidget',
      'towerstone.TemplateEditor',
    ])
  }

  handleSubmit(values) {
    //console.log(values)
  }

  handleChange = (event, value) => {
    this.props.history.push(`/admin/org/${this.props.organization.id}/${value}`)
  };

  handleChangeIndex = index => {
    this.setState({ value: index });
  };

  onNewBrand = () => {
    this.setState({ leadershipBrand: { ...newBrand }, leadershipBrandMode: 'new' }, () => {
      this.props.history.push(`/admin/org/${this.props.organization.id}/brands/new`);
    });
  }

  onBrandSelected = (brand) => {
    this.setState({ leadershipBrand: brand, leadershipBrandMode: 'edit' }, () => {
      this.props.history.push(`/admin/org/${this.props.organization.id}/brands/${brand.id}`);
    });
  }

  onDeleteSelectedEmployees = () => {

    this.setState({ showConfirmDelete: true });
    this.forceUpdate();
  };

  onEmployeeSelected = (user, uid, options) => {
    if (options && options.toggle) {
      //toggle selection
      const { selectedEmployees } = this.state;
      if (indexOf(this.state.selectedEmployees, user.id) < 0) {
        this.setState({ selectedEmployees: [...selectedEmployees, user.id] });
      } else {
        let _employees = filter(this.state.selectedEmployees, (id) => { return id !== user.id });
        this.setState({ selectedEmployees: _employees });
      }
    } else {
      if (user.__isnew) this.props.history.push(`/admin/org/${this.props.organization.id}/employees/new`);
      else this.props.history.push(`/admin/org/${this.props.organization.id}/employees/${user.id}`);
    }

  }

  onConfirmDeleteEmployees = () => {
    const { api } = this.props;
    const that = this;

    let promises = this.state.selectedEmployees.forEach(id => {
      return new Promise((resolve, reject) => {
        const mutation = gql` mutation DeleteUserMutation($id: String!){
            deleteUser(id: $id)
        }`;

        api.graphqlMutation(mutation, { id }).then(result => {
          if (result.errors) {
            resolve(id);
          } else {
            reject(result.errors);
          }
        }).catch(error => {
          reject(error);
        });
      });
    });

    Promise.all(promises).then(results => {
      that.setState({ message: `${results.length}, user(s) deleted`, selectedEmployees: [], showConfirmDelete: false });
      that.forceUpdate();
    }).catch(error => {
      that.setState({ error: true, message: `An error occured while deleting some of the user records ${error.message}`, showConfirmDelete: false });
    });
  }

  onCancelDeleteEmployees = () => {
    this.setState({ showConfirmDelete: false });
  }

  onClearEmployeeSelection = () => {
    this.setState({ employee: null, employeeMode: 'list' })
  }

  onCalendarEntrySelect = (survey) => {
    this.setState({ survey: survey, surveyMode: survey.__isnew ? 'new' : 'edit' })
  }

  onClearSurveySelect = () => {
    this.setState({ survey: null, surveyMode: 'calendar' })
  }

  onCancelBrandEdit = () => {
    this.props.history.push(`/admin/org/${this.props.orgId}/brands/`);
    this.setState({ leadershipBrand: null })
  }

  onOrganizationSaved = () => {

  }

  getAdminUserToolbar(props) {
    const { profile } = props;
    return (
      <Toolbar>
        {profile.firstName} {profile.lastName} admin
      </Toolbar>
    )
  }

  componentDidMount() {
    const self = this;
    const { api } = self.props;
    // api.on('DelegateActionComplete', () => {
      // console.log('DELEGATE ACTION COMPLETE  -  EMIT CAUGHT DO SOMETHING!!!!!!!!!!');
      // const comp = self.surveyComponent;
      // comp.props.refresh();
      // debugger;
    // });
  }

  componentWillUnmount() {
    const { api } = this.props;
    // api.removeListener(eventName);
  }

  render() {
    const { classes, theme, tab, match, organization, mode, api } = this.props;
    const {
      leadershipBrand,
      leadershipBrandMode,
      employee,
      employeeMode,
      survey,
      surveyMode,
    } = this.state;
    const that = this;
    const organizationId = organization.id;

    const {
      UserListWithSearch,
      SpeedDial,
      ReactoryForm,
      BusinessUnitList,
      BusinessUnitForm,
      CompanyLogo,
      BusinessUnitFormWithQuery,
      TowerStoneLeadershipBrandConfig,
      TowerStoneSurveyConfig,
      TowerStoneSurveyDelegateConfig,
      TowerStoneSurveyCalendarConfig,
      TemplateEditor,
      TowerStoneSurveySettings,
      TowerStoneSurveyTemplatesForm,
      LeadershipBrandFactoryWidget,
      BasicModal
    } = that.componentDefs;
    const isNew = mode === 'new';
    return (
      <div className={classes.root}>
        <Typography variant="h4" color="primary">Active Organisation: {organization.name}</Typography>
        <AppBar position="static" color="default">
          <Tabs
            value={tab}
            onChange={this.handleChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth">
            <Tab label="General" value={'general'} />
            <Tab label="Business Units" value={'business-units'} disabled={isNew === true} />
            <Tab label="Employees" value={'employees'} disabled={isNew === true} />
            <Tab label="Brands" value={'brands'} disabled={isNew === true} />
            <Tab label="Surveys" value={'surveys'} disabled={isNew === true} />
            <Tab label="Templates" value={'templates'} disabled={isNew === true} />
          </Tabs>
        </AppBar>
        <TabContainer>
          <Switch>
            <Route exact path={'/admin/org/:organizationId'} component={DefaultFormComponent} />
            <Route path={'/admin/org/:organizationId/general'} >
              <Fragment>
                <DefaultFormComponent organization={this.props.organization} onSaved={this.onOrganizationSaved} />
              </Fragment>
            </Route>
            <Route path={'/admin/org/:organizationId/business-units*'}>
              <Switch>
                <Route exact path={'/admin/org/:organizationId/business-units'}>
                  <BusinessUnitList organizationId={organizationId} />
                </Route>
                <Route exact path={'/admin/org/:organizationId/business-units/new'}>
                  <BusinessUnitForm mode={'new'} organization={organization} businessUnitId={'new'} />
                </Route>
                <Route exact path={'/admin/org/:organizationId/business-units/:businessUnitId'}>
                  <BusinessUnitFormWithQuery mode={'edit'} organization={organization} businessUnitId={match.params.businessUnitId} />
                </Route>
              </Switch>
            </Route>
            <Route path={'/admin/org/:organizationId/employees'}>
              <Switch>
                <Route exact path={'/admin/org/:organizationId/employees'}>
                  <Fragment>
                    <UserListWithSearch
                      organizationId={organizationId}
                      onUserSelect={that.onEmployeeSelected}
                      onDeleteUsersClick={that.onDeleteSelectedEmployees}
                      allowDelete={true}
                      multiSelect={true}
                      selected={that.state.selectedEmployees}
                    />

                    {
                      that.state.showConfirmDelete === true && <BasicModal open={true} onClose={() => { that.setState({ showConfirmDelete: false }) }}>
                        <Typography variant="body1">{that.state.selectedEmployees.length > 1 ? "Are you sure you wish to delete these accounts" : "Delete this account"}</Typography>
                        <Button variant="raised" color="primary" onClick={that.onConfirmDeleteEmployees}>Yes</Button>
                        <Button variant="flat" onClick={that.onCancelDeleteEmployees}>No</Button>
                      </BasicModal>
                    }
                    {
                      isNil(that.state.message) === false && <BasicModal open={true} onClose={() => { that.setState({ message: null }) }}>
                        <Typography variant="body1">{that.state.selectedEmployees.length > 1 ? "Are you sure you wish to delete these accounts" : "Delete this account"}</Typography>
                        <Button variant="raised" color="primary" onClick={that.onConfirmDeleteEmployees}>Yes</Button>
                        <Button variant="flat" onClick={that.onCancelDeleteEmployees}>No</Button>
                      </BasicModal>
                    }

                  </Fragment>
                </Route>
                <Route exact path={'/admin/org/:organizationId/employees/new'}>
                  <CreateProfile onCancel={that.onClearEmployeeSelection} mode="admin" organizationId={organizationId} profileTitle="New Employee" />
                </Route>
                <Route exact path={'/admin/org/:organizationId/employees/:profileId'} >
                  <UserProfile organizationId={organizationId} mode="admin" profileTitle="Manage Employee" beforeComponents={this.getAdminUserToolbar} />
                </Route>
              </Switch>
            </Route>
            <Route path={'/admin/org/:organizationId/brands'} >
              <Switch>
                <Route exact path={'/admin/org/:organizationId/brands'}>
                  <BrandListWithData organizationId={organizationId} onSelect={that.onBrandSelected} onNewSelected={this.onNewBrand} />
                  <LeadershipBrandFactoryWidget organization_id={organizationId} onUpdated={() => { that.forceUpdate() }} />
                </Route>
                <Route exact path={'/admin/org/:organizationId/brands/new'}>
                  <TowerStoneLeadershipBrandConfig mode="new" formContext={{ mode: 'new' }} />
                </Route>
                <Route exact path={'/admin/org/:organizationId/brands/:brandId'} render={(props) => {
                  return (<TowerStoneLeadershipBrandConfig mode="edit" organizationId={props.match.params.organizationId} brandId={props.match.params.brandId} formContext={{ mode: 'edit', brandId: props.match.params.brandId }} data={{ id: props.match.params.brandId }} />)
                }} />
              </Switch>
            </Route>
            <Route path={'/admin/org/:organizationId/surveys'}>
              <Switch>
                <Route exact path={'/admin/org/:organizationId/surveys/new'}>
                  <TowerStoneSurveyConfig
                    mode="new"
                    organizationId={organizationId}
                    formContext={{ organizationId, match: this.props.match }}
                    formData={{ organization: organization }}
                    style={{ maxWidth: '85%' }} />
                </Route>
                <Route exact path={'/admin/org/:organizationId/surveys'}>
                  <SurveyCalendarForOrganization {...this.props} organizationId={organizationId} />
                </Route>
                <Route path={'/admin/org/:organizationId/surveys/:surveyId'} render={(props) => {


                  this.surveyComponent = <TowerStoneSurveySettings
                    mode="edit"
                    surveyId={props.match.params.surveyId}
                    organizationId={organizationId}
                    formContext={{ organizationId, surveyId: props.match.params.surveyId }}
                    formData={{}}
                    {...this.props}
                  />

                  return (
                    <Fragment>
                      <TowerStoneSurveyConfig
                        mode="edit"
                        surveyId={props.match.params.surveyId}
                        organizationId={organizationId}
                        formContext={{ organizationId, surveyId: props.match.params.surveyId }}
                        formData={{ organization: organizationId, id: props.match.params.surveyId }}
                        style={{ maxWidth: '85%' }} />

                      <TowerStoneSurveyDelegateConfig
                        mode="edit"
                        surveyId={props.match.params.surveyId}
                        organizationId={organizationId}
                        formContext={{ organizationId, surveyId: props.match.params.surveyId }}
                        data={[]}
                      />

                      {this.surveyComponent}

                      <TowerStoneSurveyTemplatesForm
                        mode="edit"
                        surveyId={props.match.params.surveyId}
                        organizationId={organizationId}
                        formContext={{ organizationId, surveyId: props.match.params.surveyId }}
                      />

                    </Fragment>
                  )
                }}>

                </Route>
              </Switch>
            </Route>
            <Route path={'/admin/org/:organizationId/templates'} component={TemplateListComponent} />
            <Route path={'/admin/org/:organizationId/templates/:templateId'} render={(props) => {
              return (<TemplateEditor templateId={props.match.tempateId} />)
            }} />
          </Switch>
        </TabContainer>
      </div>
    )
  }
}

const DefaultFormContainerComponent = compose(
  withApi,
  withRouter,
  withTheme,
  withStyles(DefaultFormContainer.styles)
)(DefaultFormContainer)

const loadQuery = gql`
  query organization($id: String!){
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
      code
      name
      logo
    }
  }
`;


const createQuery = gql`
 mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      id
      code
      name
      logo
    }
  }
`;


const queryOptions = props => ({
  skip: props.orgId === null || props.orgId === 'new',
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


const AdminForm = ({ organizationId, api, tab, mode = 'new' }) => {
  if (mode === 'new') return <DefaultFormContainerComponent organization={DefaultOrganization} tab={'general'} mode={'new'} />

  return (
    <Query query={loadQuery} variables={{ id: organizationId }} skip={mode === 'new'} options={{ displayName: 'OrganizationQry' }}>
      {({ loading, error, data }) => {
        if (loading === true) return (<p>Loading...</p>)
        if (error) return error.message

        const organization = data && data.organizationWithId ? data.organizationWithId : DefaultOrganization;
        return (<DefaultFormContainerComponent organization={organization} tab={tab} mode={mode} />)
      }}
    </Query>);
}

export default compose(
  withApi,
)(AdminForm);
