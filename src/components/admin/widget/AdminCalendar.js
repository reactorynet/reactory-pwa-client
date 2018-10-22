import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import uuid from 'uuid';
import { isNil, isArray } from 'lodash';
import { withTheme, withStyles } from '@material-ui/core/styles';
import BigCalendar from 'react-big-calendar';
import moment from 'moment';
import {  
  AppBar,
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
  Card, CardActions,
  CardHeader, CardContent,
  Collapse, IconButton,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
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
import { omitDeep, getAvatar } from '../../util';
// Setup the localizer by providing the moment (or globalize) Object
// to the correct localizer.


BigCalendar.momentLocalizer(moment); // or globalizeLocalizer




const newSurvey = {
  id: null,
  title: '',
  surveyType: 'TS360', //TWR360 TWR180 PLCDEF
  leadershipBrand: null,
  delegates: [],
  events: [],
  mode: 'test',
  active: false,
  startDate: null,  
  endDate: null
}


const newDelegate = {
  id: uuid(),
  userId: null,  
  firstName: null,
  lastName: null,
  email: null,  
  assessors: [],
  availablePeers: [],
  peersInvited: false,
  peersConfirmed: false,
  assessments: []
}

function TabContainer(props) {
  return (
    <Typography component="div" style={{ padding: 8 * 3 }}>
      {props.children}
    </Typography>
  );
}

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

  constructor(props, context){
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

  render(){
    return (
      <form>
        <UserSearchInputComponent onChange={this.doSearch} />
      </form>
    )
  }
}

const DelegateSearchComponent = compose(
  withTheme(),
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
      { ({ loading, error, data }) => {
          if(loading === true) return (<p>Loading report data...</p>);
          //if(isNil(error) === false) return (<p>Error during load...</p>);
          const report = data.reportDetailForUser || { status : 'NO DATA'};
          return (
          <div>
            { <Typography variant="heading">{report.status}</Typography> }
          </div>  
            );
      }}
      </Query>
  );
})

class DelegateAdmin extends Component {
  constructor(props, context){
    super(props, context)
    this.state = {
      delegate: props.delegate || {...newDelegate},
      surveyId: props.surveyId || null,      
      expanded: false,
      tab: 0
    }
    this.tabChanged = this.tabChanged.bind(this)
    this.toggleExpand = this.toggleExpand.bind(this)
  }
  
  tabChanged = (evt, value) => {
    this.setState({ tab: value })
  }

  toggleExpand = (evt) => {
    this.setState({expanded: !this.state.expanded});
  }

  render(){
    const { delegate, tab } = this.state
    const { classes } = this.props

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
                </Tabs>
              </AppBar>              
              {tab === 0 && <TabContainer><UserProfile profileId={delegate.delegate.id} /></TabContainer>}
              {tab === 1 && <TabContainer><DelegateDetail userId={delegate.delegate.id} surveyId={this.props.surveyId}/></TabContainer>}
            </div>
          </Collapse>
        </CardContent>
        <CardActions>
          <IconButton onClick={ nilf }><Email /></IconButton>
          <IconButton onClick={ nilf } ><DeleteIcon /></IconButton>
        </CardActions>
      </Card>
    );
  }
}

DelegateAdmin.styles = (theme) => ({});

const DelegateAdminComponent = compose(
  withTheme(),
  withStyles(DelegateAdmin.styles),
  withApollo,
  withRouter
)(DelegateAdmin);

class SurveyAdmin extends Component {

  constructor(props, context){
    super(props, context)
    this.state = {
      expanded: null,
      survey: props.survey || newSurvey,
    }
    this.handleChange = this.handleChange.bind(this)
    this.patchTitle = this.patchTitle.bind(this)
    this.patchStartDate = this.patchStartDate.bind(this)
    this.patchEndDate = this.patchEndDate.bind(this)
    this.patchSurveyType = this.patchSurveyType.bind(this)
    this.saveGeneral = this.saveGeneral.bind(this)
    this.addNewDelegate = this.addNewDelegate.bind(this)
    this.leadershipBrandSelected = this.leadershipBrandSelected.bind(this);
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
    }
  })

  handleChange = panel => (event, expanded) => {
    this.setState({
      expanded: expanded ? panel : false,
    });
  };

  patchTitle = evt => this.setState({survey: {...this.state.survey, title: evt.target.value}})
  patchStartDate = evt => this.setState({survey: {...this.state.survey, startDate: moment(evt.target.value).format('YYYY-MM-DD')}})
  patchEndDate = evt => this.setState({survey: {...this.state.survey, endDate: moment(evt.target.value).format('YYYY-MM-DD')}})
  patchActive = evt => this.setState({survey: {...this.state.survey, active: evt.target.checked === true  }})
  patchSurveyType = (evt) => { this.setState({ survey: {...this.state.survey, surveyType: evt.target.value } }) }
  patchMode = evt => this.setState({survey: {...this.state.survey, mode: evt.target.value}})
  leadershipBrandSelected = brand => this.setState({survey: {...this.state.survey, leadershipBrand: brand}})
  addNewDelegate = (evt) => {
    this.setState({survey: {...this.state.survey, delegates: [...this.state.survey.delegates, {...newDelegate}]}})
  }

  saveGeneral = (evt) => {    
    this.props.onSave(this.state.survey)
  } 

  render(){
    const { classes } = this.props;
    const { expanded, survey } = this.state;
    const { status, delegates } = survey
    
    const complete = status === 'complete'
    let delegateComponents = []

    if(isArray(delegates)) {
      delegateComponents = survey.delegates.map(( delegate, didx ) => {
        return (<DelegateAdminComponent key={didx} delegate={delegate} surveyId={survey.id}/>)
      })
    }

    return (
      <div className={classes.root}>
        <ExpansionPanel expanded={expanded === 'panel1'} onChange={this.handleChange('panel1')}>
          <ExpansionPanelSummary expandIcon={<ExpandMore />}>
            <Typography className={classes.heading}>General</Typography>
            <Typography className={classes.secondaryHeading}>Configure basic settings for selected survey</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <Grid container>
              <Grid item xs={12}>
                <form style={{width:'100%'}}>
                  <FormControl fullWidth className={classes.formatControl}>
                    <InputLabel htmlFor="surveytitle">Survey Title</InputLabel>
                    <Input fullWidth id="surveytitle" value={survey.title} onChange={this.patchTitle} disabled={complete} />
                  </FormControl>
                  <FormControl fullWidth className={classes.formControl}>
                    <InputLabel htmlFor="surveyType">Survey Type</InputLabel>
                    <Select
                      value={survey.surveyType}
                      onChange={this.patchSurveyType}
                      disabled={complete}
                      inputProps={{
                        name: 'surveyType',
                        id: 'surveyType',
                      }}
                    >
                      <option value="">Survey Type</option>
                      <option value={'TWR360'}>360 Individual Assessments</option>
                      <option value={'TWR180'}>180 Team Assessments</option>                      
                    </Select>
                  </FormControl>
                  <hr/>
                  <Typography variant="label">Leadership Brand</Typography>
                  <BrandListWithData
                    organizationId={this.props.match.params.organizationId}
                    selected={survey.leadershipBrand && survey.leadershipBrand.id ? survey.leadershipBrand.id : null}
                    selectionOnly={true}
                    onSelect={this.leadershipBrandSelected}
                      />                  

                  <TextField
                    id="startDate"
                    label="Start Date"
                    type="date"
                    fullWidth
                    defaultValue={moment().format('YYYY-MM-DD')}
                    className={classes.textField}
                    value={survey.startDate ? moment(survey.startDate).format('YYYY-MM-DD') : ''}
                    onChange={this.patchStartDate}
                    InputLabelProps={{
                      shrink: true,
                    }}                    
                  />
                  <TextField
                    id="endDate"
                    label="Start Date"
                    type="date"
                    fullWidth
                    defaultValue={moment().format('YYYY-MM-DD')}
                    value={survey.endDate ? moment(survey.endDate).format('YYYY-MM-DD') : ''}
                    className={classes.textField}
                    onChange={this.patchEndDate}
                    InputLabelProps={{
                      shrink: true,
                    }}                
                  />  
                  
                  <FormControl fullWidth>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={this.state.survey.active}
                          onChange={this.patchActive}
                          color="primary"
                          fullWidth
                        />
                      }
                      label={this.state.survey.active === false ? "Click to activate survey (requires save)" : "Click to disable survey (requires save)"}
                    />        
                  </FormControl>

                  <FormControl component="fieldset" required className={classes.formControl}>
                    <FormLabel component="legend">Mode</FormLabel>
                    <RadioGroup
                      aria-label="mode"
                      name="mode"
                      className={classes.group}
                      value={this.state.survey.mode}
                      onChange={this.patchMode}
                    >
                      <FormControlLabel value="test" control={<Radio />} label="Test Mode" />
                      <FormControlLabel value="live" control={<Radio />} label="Live Mode" />                      
                    </RadioGroup>
                  </FormControl>   
                </form>     
              </Grid>
              <Grid item xs={12}>
                <IconButton onClick={this.saveGeneral}  disabled={complete}><Save /></IconButton>
              </Grid>
            </Grid>
          </ExpansionPanelDetails>
        </ExpansionPanel>
        <ExpansionPanel expanded={expanded === 'panel2'} onChange={this.handleChange('panel2')}>
          <ExpansionPanelSummary expandIcon={<ExpandMore />}>
            <Typography className={classes.heading}>Delegates</Typography>
            <Typography className={classes.secondaryHeading}>
              Manage delegates for this survey
            </Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>            
            <Grid container>
              <Grid xs={12} item>
                {delegateComponents}
              </Grid>
              <Grid xs={12} item>
                <Button variant={'fab'} color={'primary'} onClick={this.addNewDelegate}><AddIcon /></Button>
              </Grid>
            </Grid>            
          </ExpansionPanelDetails>
        </ExpansionPanel>
        <ExpansionPanel expanded={expanded === 'panel3'} onChange={this.handleChange('panel3')}>
          <ExpansionPanelSummary expandIcon={<ExpandMore />}>
            <Typography className={classes.heading}>Timeline</Typography>
            <Typography className={classes.secondaryHeading}>
              A history of activities against this
            </Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            Timeline of activities goes here
          </ExpansionPanelDetails>
        </ExpansionPanel>        
      </div>
    )
  }
}

const SurveyAdminComponent = compose(
  withTheme(),
  withStyles(SurveyAdmin.styles),
  withRouter,
  withApollo
)(SurveyAdmin)

const CalendarStyles = (theme) => {
  return {
    Container: {
      padding: theme.spacing.unit,
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
  }
}


class AdminCalendar extends Component {
  
  constructor(props, context){
    super(props, context)
    this.state = {
      selected: null      
    };
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onSelectEvent = this.onSelectEvent.bind(this);
    this.learnMore = this.learnMore.bind(this);
    this.newSurvey = this.newSurvey.bind(this);
  }
  
  onDoubleClick(eventObj, e){
    const { selected } = this.state
    this.props.history.push(`/admin/org/${selected.organization.id}/surveys/${selected.id}`);
  }

  onSelectEvent(eventObj, e){
    this.setState({selected: eventObj})
  }

  learnMore(e){
    const { selected } = this.state
    this.props.history.push(`/admin/org/${selected.organization.id}/surveys/${selected.id}`);
  }

  newSurvey(){
    this.props.history.push(`/admin/org/${this.props.organizationId}/surveys/new`);
  }

  render() {
    const { surveys, classes } = this.props;
    const { selected } = this.state;
    let info = null
    if(isNil(selected) === false) {
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
                    <Button size="small" onClick={this.learnMore}>MORE</Button>
              </CardActions>
            </Card>
          </Paper>
        </Grid>
      )
    }
    return (
      <Grid container spacing={0}>
        <Grid item xs={12} sm={12} md={ info ? 8 : 12}>
          <Paper className={this.props.classes.Container}>
              <BigCalendar
                popup
                onSelectEvent={this.onSelectEvent}
                onDoubleClickEvent={this.onDoubleClick}              
                events={surveys || []}
                startAccessor='startDate'
                endAccessor='endDate'
                defaultDate={new Date()}
              />
              {
                this.props.byOrganization === true ? (
                <div style={{display:'flex', justifyContent: 'flex-end'}}>
                <Tooltip title={'Click to add a new survey'}>
                  <Button variant='fab' color='primary' onClick={this.newSurvey} style={{marginTop: '25px', marginBottom: '25px'}}><AddIcon /></Button>
                </Tooltip>
                </div>
              ) : null }            
          </Paper>
        </Grid>
        {info}
    </Grid>
      )          
  }
  
  static propTypes = { 
    organizationId: PropTypes.string,
    byOrganization: PropTypes.bool,
    surveys: PropTypes.array    
  }

  static defaultProps = {
    organizationId: null,
    byOrganization: false,
    surveys: []
  }
}

const ThemedCalendar = compose(
  withRouter,
  withTheme(),
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
})=>{
  return (
    <Query query={api.queries.Surveys.surveyDetail} variables={{surveyId: match.params.surveyId}}>
    {({loading, error, data}) => {
      if(loading) return <p>Loading Survey Details, please wait.</p>
      if(error) return <p>{error.message}</p>
      const survey = omitDeep(data.surveyDetail)
      return (
      <Mutation mutation={api.mutations.Surveys.updateSurvey}>
        {(updateSurvey, {loading, data, error})=>{
          let surveyAdminProps = {
            survey: { ...survey },
            onSave: (updated) => {
              updateSurvey(omitDeep({variables: { input: {...updated}, organizationId: organization.id }}))
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
})=>{

  return (
    <Mutation mutation={api.mutations.Surveys.createSurvey}>
      {(createSurvey, { loading, data, error }) => {

        let surveyAdminProps = {
          survey: { ...newSurvey },
          onSave: (survey) => {
            debugger;
            createSurvey(omitDeep({variables: { input: {...survey}, organizationId }}))
          },
          onCancel
        };

        return <SurveyAdminComponent {...surveyAdminProps} />
      }}
    </Mutation>
  )
}); 

export const SurveyCalendarForOrganization = compose(withApi)(({organizationId = null, api}) => {
  // debugger //eslint-disable-line
  const byOrg = isNil(organizationId) === false;
  const query = byOrg === false ? api.queries.Surveys.surveysList : api.queries.Surveys.surveysForOrganization;
  const variables = byOrg === false ? {} : { organizationId };
  const dataEl = byOrg === false ? 'surveysList' : 'surveysForOrganization';
  

  return (
      <Query query={query} variables={variables}>
      {({loading, error, data}) => {
        if(loading) return <p>Loading Calendar, please wait.</p>
        if(error) return <p>{error.message}</p>        
        const calendarProps = {
          organizationId,
          byOrganization: byOrg,
          surveys: data[dataEl] || []
        }
        return (<ThemedCalendar {...calendarProps} />)
      }}
      </Query>
    )
});


export default SurveyCalendarForOrganization
