import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import uuid from 'uuid';
import { withTheme, withStyles } from 'material-ui/styles';
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from 'material-ui'
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
} from 'material-ui-icons'
import { DateHelpers } from '../../util';

import 'react-big-calendar/lib/css/react-big-calendar.css'
import { withApollo, Query, Mutation } from 'react-apollo';
import { UserSearchInputComponent } from '../../user';
import { withApi } from '../../../api/ApiProvider';
import { omitDeep } from '../../util';
// Setup the localizer by providing the moment (or globalize) Object
// to the correct localizer.


BigCalendar.momentLocalizer(moment); // or globalizeLocalizer

const CalendarStyles = (theme) => {
  return {
    Container: {
      padding:'10px',
      height: '550px',
      marginRight: '5px'      
    },   
  }
}



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

class DelegateGeneral extends Component {

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

const DelegateGeneralComponent = compose(
  withTheme(),
  withStyles(DelegateGeneral.styles),
  withApollo
)(DelegateGeneral)


/**
 * Class that will display an asssessment interface 
 */
class DelegateAssessments extends Component {

}

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
    const avatar = (<Avatar className={classes.avatar} >{delegate.firstName ? delegate.firstName.substring(0,1) : '*'}</Avatar>)
    const action = (<IconButton onClick={this.toggleExpand}><MoreVertIcon /></IconButton>)
    const title = (<Typography variant='subheading'>{delegate.firstName} {delegate.lastName}</Typography>)
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
                  <Tab label="Active Peers" />
                </Tabs>
              </AppBar>
              {tab === 0 && <TabContainer><DelegateGeneralComponent delegate={delegate} /></TabContainer>}
              {tab === 1 && <TabContainer>Assesments For Delegate</TabContainer>}
              {tab === 2 && <TabContainer>Active Peers</TabContainer>}
            </div>
          </Collapse>
        </CardContent>
        <CardActions>
          <IconButton onClick={ nilf }><Email /></IconButton>
          <IconButton onClick={ nilf }><PrintIcon /></IconButton>
          <IconButton onClick={ nilf } ><DeleteIcon /></IconButton>
        </CardActions>
      </Card>
    );
  }
}

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
  }

  static styles = theme => ({
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
  addNewDelegate = (evt) => {
    this.setState({survey: {...this.state.survey, delegates: [...this.state.survey.delegates, {...newDelegate}]}})
  }

  saveGeneral = (evt) => {    
    this.props.onSave(this.state.survey)
  } 

  render(){
    const { classes } = this.props;
    const { expanded, survey } = this.state;

    let delegateComponents = []

    if(survey.delegates) {
      delegateComponents = survey.delegates.map(( delegate, didx ) => {
        return (<DelegateAdminComponent key={didx} delegate={delegate} />)
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
                    <Input fullWidth id="surveytitle" value={survey.title} onChange={this.patchTitle} />
                  </FormControl>
                  <FormControl fullWidth className={classes.formControl}>
                    <InputLabel htmlFor="surveyType">Survey Type</InputLabel>
                    <Select
                      value={survey.surveyType}
                      onChange={this.patchSurveyType}
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

                  <FormControl fullWidth className={classes.formControl}>
                    <InputLabel htmlFor="leadershipBrand">Leadership Brand</InputLabel>
                    <Select
                      value={survey.leadershipBrand ? survey.leadershipBrand.id : '' }
                      onChange={this.patchSurveyType}
                      inputProps={{
                        name: 'leadershipBrand',
                        id: 'leadershipBrand',
                      }}
                    >
                      <option value="">Leadership Brand Not Set</option>
                      <option value={'TWR360'}>360 Individual Assessments</option>
                      <option value={'TWR180'}>180 Team Assessments</option>                      
                    </Select>
                  </FormControl>

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
                <IconButton onClick={this.saveGeneral}><Save /></IconButton>
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

class AdminCalendar extends Component {  
  render() {
    const { surveys } = this.props;
    return (
        <Paper className={this.props.classes.Container}>
            
            <div style={{display:'flex', justifyContent: 'flex-end'}}>
              <Button variant='fab' color='primary' onClick={this.props.onNewCaledarEntry || nilf} style={{marginTop: '25px', marginBottom: '25px'}}><AddIcon /></Button>
            </div>
        </Paper>
      )          
  }  
}

const ThemedCalendar = compose(
  withRouter,
  withTheme(),
  withStyles(CalendarStyles)
)(AdminCalendar)



const nilf = () => (0)

export const EditSurveyEntryForOrganization = compose(withApi)(({
  organization,
  api,
  survey,
  onCancel,
  onSaved
})=>{

  return (
    <Mutation mutation={api.mutation.Surveys.updateSurvey}>
      {(updateSurvey, {loading, data, error})=>{
          let surveyAdminProps = {
            survey: { ...newSurvey },
            onSave: (survey) => {
              updateSurvey(omitDeep({variables: { input: {...survey}, organizationId: organization.id }}))
            },
            onCancel
          };

          return <SurveyAdmin {...surveyAdminProps} />
      }}
    </Mutation>
  )
});

export const NewSurveyEntryForOrganization = compose(withApi)(({
  organization,
  api,
  onCancel = nilf,
  onSaved = nilf
})=>{

  return (
    <Mutation mutation={api.mutation.Surveys.createSurvey}>
      {(createSurvey, { loading, data, error }) => {

        let surveyAdminProps = {
          survey: { ...newSurvey },
          onSave: (survey) => {
            createSurvey(omitDeep({variables: { input: {...survey}, organizationId: organization.id }}))
          },
          onCancel
        };

        return <SurveyAdmin {...surveyAdminProps} />
      }}
    </Mutation>
  )
}); 

export const SurveyCalendarForOrganization = compose(withApi)(({organizationId, api, onCalendarEntrySelect = nilf, onNewCaledarEntry = nilf}) => {
  
  return (
      <Query query={api.queries.Surveys.surveysForOrganization} variables={{organizationId}}>
      {({loading, error, data}) => {
        if(loading) return <p>Loading Calendar, please wait.</p>
        if(error) return <p>{error.message}</p>

        const calendarProps = {
          onCalendarEntrySelect,
          onNewCaledarEntry,
          surveys: data.surveysForOrganization || []
        }
        return (<ThemedCalendar {...calendarProps} />)
      }}
      </Query>
    )
});


export default ThemedCalendar
