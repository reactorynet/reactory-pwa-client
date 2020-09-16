import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import { isNil, isArray } from 'lodash';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import {
  AppBar,
  Fab,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  Switch,
  Typography,
  Avatar,
  Button,
  Card,
  CardActions,
  CardHeader,
  CardContent,
  Collapse,
  IconButton,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Icon,
  Input,
  InputLabel,
  FormHelperText,
  FormControl,
  Select,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@material-ui/core'
import {
  ExpandMore,
  PlaylistAdd,
  ArrowBack,
  Email,
  Save,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Print as PrintIcon,
  Add as AddIcon,
} from '@material-ui/icons'
import { DateHelpers } from '../../util';

import 'react-big-calendar/lib/css/react-big-calendar.css'
import { withApollo, Query, Mutation } from 'react-apollo';
import { UserSearchInputComponent, UserProfile } from '../../user';
import { BrandListWithData } from '../../brands';
import { withApi } from '../../../api/ApiProvider';
import { ReactoryApi } from "../../../api/ReactoryApi";
import { omitDeep, getAvatar } from '../../util';
import { flattenSelections } from 'apollo-utilities';
// Setup the localizer by providing the moment (or globalize) Object
// to the correct localizer.


const localizer = momentLocalizer(moment); // or globalizeLocalizer




const newSurvey = {
  id: '',
  organization: null,
  title: '',
  surveyType: '360', //TWR360 TWR180 PLCDEF
  leadershipBrand: null,
  delegates: [],
  events: [],
  mode: 'test',
  status: 'new',
  startDate: moment().startOf('day').format('YYYY-MM-DD'),
  endDate: moment().add(7, 'days').endOf('day').format('YYYY-MM-DD')
};


const newDelegate = {
  delegate: {
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    avatar: null,
  },
  assessments: {
    assessor: {
      id: null,
      firstName: '',
      lastName: '',
      avatar: null,
    }
  },
  complete: false,
  launched: false,
  removed: false
};

function TabContainer(props) {
  return (
    <Typography component="div" style={{ padding: 8 * 3 }}>
      {props.children}
    </Typography>
  );
};

TabContainer.propTypes = {
  children: PropTypes.node.isRequired,
};

const styles = theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
});

class DelegateSearch extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      id: null,
      email: '',
      firstName: '',
      lastName: '',
      found: false,
    }

    this.doSearch = this.doSearch.bind(this)
  }

  static styles = theme => ({

  })

  doSearch = () => {

  }

  render() {
    return (
      <form>
        <UserSearchInputComponent onChange={this.doSearch} />
      </form>
    )
  }
}

const DelegateSearchComponent = compose(
  withTheme,
  withStyles(DelegateSearch.styles),
  withApollo
)(DelegateSearch)

const DelegateGeneral = ({ delegate }) => {

  return (
    <div>
      <Typography variant='heading'>{delegate.firstName} {delegate.lastName}</Typography>
      <Typography variant='subheading'>{delegate.email}</Typography>
    </div>
  )
}

/**
 * Class that will display an asssessment interface
 */
class DelegateAssessments extends Component {

}

const DelegateDetail = compose(withApi)(({ userId, surveyId, api, history }) => {
  return (
    <Query query={api.queries.Surveys.reportDetailForUser} variables={{ userId, surveyId }}>
      {({ loading, error, data }) => {
        if (loading === true) return (<p>Loading report data...</p>);
        //if(isNil(error) === false) return (<p>Error during load...</p>);
        const report = data.reportDetailForUser || { status: 'NO DATA' };
        return (
          <div>
            {<Typography variant="heading">{report.status}</Typography>}
          </div>
        );
      }}
    </Query>
  );
})

class DelegateAdmin extends Component {
  constructor(props, context) {
    super(props, context)
    this.state = {
      delegate: props.delegate || { ...newDelegate },
      surveyId: props.surveyId || null,
      expanded: false,
      tab: 0
    }
    this.tabChanged = this.tabChanged.bind(this)
    this.toggleExpand = this.toggleExpand.bind(this)
    this.componentDefs = this.props.api.getComponents(['core.InboxComponent'])
  }

  tabChanged = (evt, value) => {
    this.setState({ tab: value })
  }

  toggleExpand = (evt) => {
    this.setState({ expanded: !this.state.expanded });
  }

  render() {
    const { delegate, tab } = this.state
    const { classes } = this.props
    const { InboxComponent } = this.componentDefs
    const nilf = () => ({});
    const avatar = (<Avatar className={classes.avatar} src={getAvatar(delegate.delegate)}></Avatar>)
    const action = (<IconButton onClick={this.toggleExpand}><MoreVertIcon /></IconButton>)
    const title = (<Typography variant='subheading'>{delegate.delegate.firstName} {delegate.delegate.lastName}</Typography>)
    return (
      <Card>
        <CardHeader
          avatar={avatar}
          title={title}
          action={action}
        ></CardHeader>
        <CardContent>
          <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
            <div className={classes.root}>
              <AppBar position="static">
                <Tabs value={tab} onChange={this.tabChanged}>
                  <Tab label="Delegate Details" />
                  <Tab label="Assessments" />
                  <Tab label="Notifications" />
                </Tabs>
              </AppBar>
              {tab === 0 && <TabContainer><UserProfile profileId={delegate.delegate.id} /></TabContainer>}
              {tab === 1 && <TabContainer><DelegateDetail userId={delegate.delegate.id} surveyId={this.props.surveyId} /></TabContainer>}
              {tab === 2 && <TabContainer><InboxComponent userId={delegate.delegate.id} surveyId={this.props.surveyId} /></TabContainer>}
            </div>
          </Collapse>
        </CardContent>
        <CardActions>
          <IconButton onClick={nilf}><Email /></IconButton>
          <IconButton onClick={nilf} ><DeleteIcon /></IconButton>
        </CardActions>
      </Card>
    );
  }
}

DelegateAdmin.styles = (theme) => ({});

const DelegateAdminComponent = compose(
  withTheme,
  withStyles(DelegateAdmin.styles),
  withRouter,
  withApi
)(DelegateAdmin);

class SurveyAdmin extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      expanded: null,
      survey: props.survey || newSurvey,
      focusInput: null,
      busy: false,
      dirty: false,
    }
    this.onSurveyGeneralSubmit = this.onSurveyGeneralSubmit.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.patchTitle = this.patchTitle.bind(this)
    this.patchSurveyType = this.patchSurveyType.bind(this)
    this.onSaveGeneral = this.onSaveGeneral.bind(this)
    this.addNewDelegate = this.addNewDelegate.bind(this)
    this.leadershipBrandSelected = this.leadershipBrandSelected.bind(this);
    this.onDateRangeChanged = this.onDateRangeChanged.bind(this);
    this.onDateFocusChanged = this.onDateFocusChanged.bind(this);
    this.componentDefs = this.props.api.getComponents(['core.DateSelector', 'core.SingleColumnLayout', 'forms.TowerStoneSurveyConfig'])
  }

  static styles = theme => ({
    root: {

    },
    heading: {
      fontSize: theme.typography.pxToRem(15),
      flexBasis: '33.33%',
      flexShrink: 0,
    },
    secondaryHeading: {
      fontSize: theme.typography.pxToRem(15),
      color: theme.palette.text.secondary,
    },
    formControl: {
      marginTop: '5px',
      marginBottom: '5px'
    },
    group: {
      margin: `${theme.spacing(1)}px 0`,
    },
  })

  handleChange = panel => (event, expanded) => {
    this.setState({
      expanded: expanded ? panel : false,
    });
  };

  patchTitle = evt => this.setState({ survey: { ...this.state.survey, title: evt.target.value } })
  patchActive = evt => this.setState({ survey: { ...this.state.survey, active: evt.target.checked === true } })
  patchSurveyType = (evt) => { this.setState({ survey: { ...this.state.survey, surveyType: evt.target.value } }) }
  patchMode = evt => this.setState({ survey: { ...this.state.survey, mode: evt.target.value } })
  leadershipBrandSelected = brand => this.setState({ survey: { ...this.state.survey, leadershipBrand: brand } })
  addNewDelegate = (evt) => {
    this.setState({ survey: { ...this.state.survey, delegates: [...this.state.survey.delegates, { ...newDelegate }] } })
  }

  onSaveGeneral = (evt) => {
    this.props.onSave(this.state.survey);
  }

  onDateRangeChanged(startDate, endDate) {
    const updates = {
      survey: {
        ...this.state.survey,
        startDate: startDate || moment(this.state.survey.startDate),
        endDate: endDate || moment(this.state.survey.endDate),
      }
    }

    this.setState({ ...updates })
  }

  onDateFocusChanged(focusInput) {
    this.setState({ focusInput });
  }

  onSurveyGeneralSubmit(formData) {
    //console.log('Submit the form data for survey', formData)
  }


  render() {
    const { classes } = this.props;
    const { expanded, survey } = this.state;
    const { status, delegates } = survey
    const { DateSelector, SingleColumnLayout, TowerStoneSurveyConfig } = this.componentDefs;
    const complete = status === 'complete'
    let delegateComponents = []

    if (isArray(delegates) && survey.id !== null) {

    }

    return (
      <SingleColumnLayout>
        <ExpansionPanel expanded={expanded === 'panel1'} onChange={this.handleChange('panel1')}>
          <ExpansionPanelSummary expandIcon={<ExpandMore />}>
            <Typography className={classes.heading}>General</Typography>
            <Typography className={classes.secondaryHeading}>Configure basic settings for selected survey</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <SingleColumnLayout>
              <TowerStoneSurveyConfig data={survey} onSubmit={this.onSurveyGeneralSubmit}>
                <Fab type="submit" color="primary"><Icon>save</Icon></Fab>
              </TowerStoneSurveyConfig>
            </SingleColumnLayout>
          </ExpansionPanelDetails>
        </ExpansionPanel>
        {survey && survey.id ? <ExpansionPanel expanded={expanded === 'panel2'} onChange={this.handleChange('panel2')}>
          <ExpansionPanelSummary expandIcon={<ExpandMore />}>
            <Typography className={classes.heading}>Delegates</Typography>
            <Typography className={classes.secondaryHeading}>
              Manage delegates for this survey
            </Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <Grid container>
              <Grid xs={12} item>

              </Grid>
              <Grid xs={12} item>
                <Button variant={'fab'} color={'primary'} onClick={this.addNewDelegate}><AddIcon /></Button>
              </Grid>
            </Grid>
          </ExpansionPanelDetails>
        </ExpansionPanel> : null}
      </SingleColumnLayout>
    )
  }
}

const SurveyAdminComponent = compose(
  withTheme,
  withStyles(SurveyAdmin.styles),
  withRouter,
  withApollo,
  withApi,
)(SurveyAdmin)

const CalendarStyles = (theme) => {
  return {
    Container: {
      padding: theme.spacing(1),
      height: '550px',
    },
    card: {
      minWidth: 275,
    },
    bullet: {
      display: 'inline-block',
      margin: '0 2px',
      transform: 'scale(0.8)',
    },
    title: {
      fontSize: 14,
    },
    pos: {
      marginBottom: 12,
    },
  };
}


class AdminCalendar extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      selected: null,
      showConfirmDelete: false
    };
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onSelectEvent = this.onSelectEvent.bind(this);
    this.learnMore = this.learnMore.bind(this);
    this.newSurvey = this.newSurvey.bind(this);

    this.components = props.api.getComponents(['core.AlertDialog'])
  }

  onDoubleClick(eventObj, e) {
    const { selected } = this.state
    this.props.history.push(`/admin/org/${selected.organization.id}/surveys/${selected.id}`);
  }

  onSelectEvent(eventObj, e) {
    this.setState({ selected: eventObj })
  }

  learnMore(e) {
    const { selected } = this.state
    this.props.history.push(`/admin/org/${selected.organization.id}/surveys/${selected.id}`);
  }

  newSurvey() {
    this.props.history.push(`/admin/org/${this.props.organizationId}/surveys/new`);
  }

  deleteSurvey = (selectedSurvey) => {
    const { api, onDeleteSuccess } = this.props;
    api.graphqlMutation(api.mutations.Surveys.deleteSurvey, { id: selectedSurvey.id })
      .then(result => {
        const { data, errors } = result;
        if (errors)
          api.createNotification(`Error deleting survey. ${errors[0].message}`, { showInAppNotification: true, type: 'error' });

        if (data && data['deleteSurvey']) {
          api.createNotification(`Survey successfully deleted.`, { showInAppNotification: true, type: 'success' });
          onDeleteSuccess();
        }
      })
      .catch(error => {
        api.createNotification(`Error deleting survey. ${error}`, { showInAppNotification: true, type: 'error' });
      });
  }

  render() {
    const { surveys, classes } = this.props;
    const { AlertDialog } = this.components;
    const { selected, showConfirmDelete } = this.state;
    let info = null

    let confirmDialog = null;
    if (showConfirmDelete === true) {

      confirmDialog = (
        <AlertDialog
          open={true}
          title={'Delete Survey?'}
          content={`Are you sure you want to delete this survey?`}
          onAccept={() => this.deleteSurvey(selected)}
          onClose={() => this.setState({ showConfirmDelete: false })}
          cancelTitle="Cancel"
          acceptTitle="Yes"
          cancelProps={{ variant: "text", color: "#00b100" }}
          confirmProps={{ variant: "text", color: "#F50000" }}
        />
      );
    }

    if (isNil(selected) === false) {
      info = (
        <Grid item xs={12} sm={12} md={4}>
          <Paper className={this.props.classes.Container}>
            <Card className={classes.card}>
              <CardContent>
                <Typography className={classes.title} color="textSecondary" gutterBottom>
                  {selected.title} ||Status: <strong>{selected.complete === false ? 'OPEN' : 'COMPLETE'}</strong>
                </Typography>
                <Typography variant="h5" component="h2">
                  {selected.organization.name}
                </Typography>
                <Typography className={classes.pos} color="textSecondary">
                  {moment(selected.startDate).format('ddd DD MMM YYYY')} until {moment(selected.endDate).format('ddd DD MMM YYYY')}
                </Typography>
                <Typography component="p">
                  {selected.mode}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={this.learnMore}><Icon>find_in_page</Icon>MORE</Button>
                <Button size="small" onClick={() => { this.setState({ showConfirmDelete: true }) }}><Icon>delete_forever</Icon>DELETE SURVEY</Button>
              </CardActions>
            </Card>
          </Paper>
        </Grid>
      )
    }
    return (
      <Grid container spacing={0}>
        <Grid item xs={12} sm={12} md={info ? 8 : 12}>
          <Paper className={this.props.classes.Container}>
            <BigCalendar
              popup
              localizer={localizer}
              onSelectEvent={this.onSelectEvent}
              onDoubleClickEvent={this.onDoubleClick}
              events={surveys.map((entry) => ({
                ...entry,
                startDate: entry.startDate || moment().startOf('day').toDate(),
                endDate: entry.endDate || moment().startOf('day').toDate()
              })) || []}
              startAccessor='startDate'
              endAccessor='endDate'
              defaultDate={new Date()}
            />
            {
              this.props.byOrganization === true ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip title={'Click to add a new survey'}>
                    <Fab color='primary' onClick={this.newSurvey} style={{ marginTop: '25px', marginBottom: '25px' }}><AddIcon /></Fab>
                  </Tooltip>
                </div>
              ) : null}
          </Paper>
        </Grid>
        {info}
        {confirmDialog}
      </Grid>
    )
  }

  static propTypes = {
    organizationId: PropTypes.string,
    byOrganization: PropTypes.bool,
    surveys: PropTypes.array,
    api: PropTypes.instanceOf(ReactoryApi),
  }

  static defaultProps = {
    organizationId: null,
    byOrganization: false,
    surveys: []
  }
}

const ThemedCalendar = compose(
  withApi,
  withRouter,
  withTheme,
  withStyles(CalendarStyles)
)(AdminCalendar)



const nilf = () => (0)

export const EditSurveyEntryForOrganization = compose(withApi, withRouter)(({
  organization,
  api,
  surveyId,
  onCancel,
  onSaved,
  match,
}) => {
  return (
    <Query query={api.queries.Surveys.surveyDetail} variables={{ surveyId: match.params.surveyId }}>
      {({ loading, error, data }) => {
        if (loading) return <p>Loading Survey Details, please wait.</p>
        if (error) return <p>{error.message}</p>
        const survey = omitDeep(data.surveyDetail)
        return (
          <Mutation mutation={api.mutations.Surveys.updateSurvey}>
            {(updateSurvey, { loading, data, error }) => {
              let surveyAdminProps = {
                survey: { ...survey },
                onSave: (updated) => {
                  updateSurvey(omitDeep({ variables: { input: { ...updated }, organizationId: organization.id } }))
                },
                onCancel
              };

              return <SurveyAdminComponent {...surveyAdminProps} />
            }}
          </Mutation>);
      }}
    </Query>
  )
});

export const NewSurveyEntryForOrganization = compose(withApi)(({
  organizationId,
  api,
  onCancel = nilf,
  onSaved = nilf
}) => {

  return (
    <Mutation mutation={api.mutations.Surveys.createSurvey}>
      {(createSurvey, { loading, data, error }) => {

        let surveyAdminProps = {
          survey: { ...newSurvey, organization: organizationId },
          onSave: (survey) => {
            let newSurvey = { ...survey };
            delete newSurvey.delegates;
            delete newSurvey.active;
            delete newSurvey.events;
            newSurvey.startDate = survey.startDate.valueOf();
            newSurvey.endDate = survey.endDate.valueOf();
            newSurvey.organization = organizationId;
            newSurvey.leadershipBrand = newSurvey.leadershipBrand.id;
            createSurvey(omitDeep({ variables: { surveyData: { ...newSurvey }, id: organizationId } }))
          },
          onCancel
        };

        return <SurveyAdminComponent {...surveyAdminProps} />
      }}
    </Mutation>
  )
});

export const SurveyCalendarForOrganization = compose(withApi)(({ organizationId = null, api }) => {
  const byOrg = isNil(organizationId) === false;
  const query = byOrg === false ? api.queries.Surveys.surveysList : api.queries.Surveys.surveysForOrganization;
  const variables = byOrg === false ? {} : { organizationId };
  const dataEl = byOrg === false ? 'surveysList' : 'surveysForOrganization';
  return (
    <Query query={query} variables={variables}>
      {({ loading, error, data, refetch }) => {
        if (loading) return <p>Loading Calendar, please wait.</p>
        if (error) return <p>{error.message}</p>
        const calendarProps = {
          organizationId,
          byOrganization: byOrg,
          surveys: data[dataEl] || []
        }
        return (<ThemedCalendar onDeleteSuccess={() => { refetch() }} {...calendarProps} />)
      }}
    </Query>
  )
});


export default SurveyCalendarForOrganization
