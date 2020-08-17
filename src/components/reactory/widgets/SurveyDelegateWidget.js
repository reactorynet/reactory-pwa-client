import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import classnames from 'classnames';
import om from 'object-mapper';
import MaterialTable, { MTableToolbar } from 'material-table';
import { isArray, isFunction, sort, findIndex, countBy, isNil, filter, sortBy } from 'lodash';
import {
  Avatar,
  Button,
  Paper,
  Typography, 
  Toolbar,
  Icon, 
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListSubheader,
  Tabs,
  Tab,
  LinearProgress,
  Grid
} from '@material-ui/core';
import gql from 'graphql-tag';
import { UserListItem } from '../../user/Lists';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import { ReactoryApi } from "../../../api/ReactoryApi";
import { nil } from '../../util';
import moment from 'moment';
import hdate from 'human-date';


import { Reactory } from '@reactory/server-core/types/reactory';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';
import { isThrowStatement } from 'typescript';

const assessmentExportOptions =  {
  filename: 'Assessment Report - ${formData.assessment.delegate.firstName} ${formData.assessment.delegate.lastName}.xlsx',
  sheets: [
    {
      name: 'Assessments',
      index: 0,
      arrayField: 'assessments',
      startRow: 1,
      columns: [        
        {
          title: 'delegate', 
          propertyField: 'delegate',
          format: '',
          width: 30,
          type: 'string',
          required: true,
          style: {}
        },
      ]
    },
  ]             
};

const assessmentExcelExport = {
  title: 'Excel Export',
  frameProps: {
    height: '100%',
    width: '100%',
    styles: {
      height: '100%',
      width: '100%',
    },
    url: `blob`,
    method: 'get'      
  },
  engine: 'excel',    
  useClient: true,
  mappingType: 'om',
  mapping: {
    'formData.assessments': 'sheets.Assessments',    
  },
  exportOptions: assessmentExportOptions
};



const getSurveyType = (props) => {
  const { formContext } = props;
  let surveyType = '360';
  
  if(formContext.$formData && formContext.$formData.surveyType) surveyType = formContext.$formData.surveyType;
  
  return surveyType.toLowerCase();
}


const getSurveyProps = (props) => {

  const surveyType = getSurveyType(props);

  let is180 = false;
  let is360 = false;
  let isPLC = false;
  let isCulture = false;
  let isCustom = false;
  let delegateReportName = "towerstone.TowerStone360"

  switch(surveyType){
    case "180":{
      is180 = true;
      delegateReportName = "towerstone.TowerStoneTeam180"
      break;
    }
    case "team180": {
      is180 = true;
      delegateReportName = "mores.MoresTeam180"
      break;
    }
    case "culture": {
      delegateReportName = "mores.MoresCultureSurvey"
      isCulture = true;
      break;
    }
    case "360": {
      delegateReportName = "mores.MoresCultureSurvey"
      is360 = true;
      break;
    }
    case "l360": {
      delegateReportName = "mores.MoresLeadership360"
      is360 = true;
      break;
    }
    case "i360": {
      delegateReportName = "mores.MoresIndividual360"
      is360 = true;
      break;
    }
    case "plc": {
      delegateReportName = "towerstone.TowerStone360"
      isPLC = true;
      break;
    }
    default: {
      delegateReportName = "towerstone.TowerStone360"
      isCustom = true;
      break;
    }
  }

  return {
    is180,
    is360,
    isPLC,
    isCulture,
    isCustom,
    surveyType,
    delegateReportName
  }

};

class SurveyDelegate extends Component {
  
  static styles = theme => {
    return {

    }
  }

  constructor(props, context){
    super(props, context);
    this.componentDefs = props.api.getComponents(['core.Loading', 'towerstone.SurveyDelegateWidget'])

  }

  render(){
    const { SurveyDelegateWidget } = this.componentDefs;
    const { props } = this;
    //console.log('Rendering Survey Delegate Widget', { SurveyDelegateWidget, props });
    return (<SurveyDelegateWidget />)
  }
}

export const SurveyDelegateComponent = compose(withApi, withTheme, withStyles(SurveyDelegate.styles))(SurveyDelegate);

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

const ReportTypes = {
  DelegateReport: "towerstone.TowerStone360",
  MoresIndividual360: "mores.MoresIndividual360",
  MoresLeader360: "mores.MoresLeadership360",
  MoresCulture: "mores.MoresCultureSurvey",
  MoresTeam180: "mores.MoresTeam180",
  SurveyStatusReport: "towerstone.SurveyStatus"
};

const BasicModalViewModes = {
  ReportPreview: "report_preview",
  ReportDownload: "report_download",
  AddDelegates: "add_delegates"
};

class SurveyDelegates extends Component {
  
  static propTypes = {
    formData: PropTypes.array.isRequired,    
    api: PropTypes.instanceOf(ReactoryApi),
    onChange: PropTypes.func
  };

  static defaultProps = {
    formData: [],
  };  

  constructor(props, context){
    super(props, context)
    const state = {
      activeEntry: null,
      modal: false,
      modalType: 'add',
      busy: false,
      message: '',
      activeTab: 'assessments',
      formData: props.formData || [],
      groupBy: 'status', //status, last-action, next-action
      selected: {

      },
      deleteConfirm: {

      },      
      surveyProps: getSurveyProps(props)
    };           

    state.reportType = state.surveyProps.delegateReportName;
    
    this.state = state;

    this.componentDefs = props.api.getComponents([
      'core.ErrorMessage', 
      'towerstone.SurveyDelegateWidget',
      'towerstone.Assessment',
      'core.DropDownMenu', 
      'core.FullScreenModal',      
      'core.UserListWithSearch',
      'core.Profile',
      'core.AssessmentList',
      'core.AssessmentTable',
      'core.SpeedDial',
      'core.ReportViewer'
    ]);
    this.getSecondaryAction = this.getSecondaryAction.bind(this)
    this.generateReport = this.generateReport.bind(this)
    this.getDetailView = this.getDetailView.bind(this)
    this.getActiveModalView = this.getActiveModalView.bind(this)
    this.addDelegateClicked = this.addDelegateClicked.bind(this)
    this.enabledDelegateForSurvey = this.enabledDelegateForSurvey.bind(this)
    this.sendCommunicationToDelegate = this.sendCommunicationToDelegate.bind(this)
    this.launchSurveyForDelegate = this.launchSurveyForDelegate.bind(this)
    this.removeDelegateFromSurvey = this.removeDelegateFromSurvey.bind(this);
    this.getBasicModalView = this.getBasicModalView.bind(this);
    this.removeAssessorForDelegate = this.removeAssessorForDelegate.bind(this);
    this.renderDelegateItem = this.renderDelegateItem.bind(this);
    this.doAction = this.doAction.bind(this);
    this.addAssessorClicked = this.addAssessorClicked.bind(this);
  }
 
  componentDidCatch(error, info){
    const { api } = this.props;
    api.log(`SurveyDelegateWidget Caught Error`, { error, info }, 'error');    
  }

  getSecondaryAction(delegateEntry){
    const { DropDownMenu } = this.componentDefs;
    const { api } = this.props;
    api.log(`SurveyDelegateWidget getSecondaryAction`, { delegateEntry }, 'debug');    
    const self = this;        
    const { surveyProps } = this.state;

    const onMenuItemSelect = (evt, menuItem) => {
      api.log('trigger menu item', {menuItem, delegateEntry}, 'debug')
      switch(menuItem.id){
        case 'sendinvite': {
          self.sendCommunicationToDelegate(delegateEntry);
          //this.sendInviteEmails(delegateEntry)          
          break;
        }
        case 'relaunch': {
          self.launchSurveyForDelegate(delegateEntry, true);
          //self.sendCommunicationToDelegate(delegateEntry, 'launch');
          break;
        }
        case 'launch': {
          self.launchSurveyForDelegate(delegateEntry);
          //this.launchSurvey(delegateEntry)
          break;
        }
        case 'send-reminder': {
          self.sendCommunicationToDelegate(delegateEntry, 'send-reminder');
          break;
        }
        case 'stop': {          
          this.stopSurvey(delegateEntry)
          break;
        }
        case 'view-assessments': {          
          this.setState({ activeEntry: delegateEntry, modal: true, modalType: 'basic', basicModalViewMode: 'assessments', assessment: null });
          break;
        }
        case 'view-details': {
          this.setState({ activeEntry: delegateEntry, modal: true, modalType: 'details' });
          break;
        }
        
        case 'remove': {  
          this.removeDelegateFromSurvey(delegateEntry, delegateEntry.removed === true);
          break;
        }
        case 'report_preview': {         
          debugger 
          this.setState({ activeEntry: delegateEntry, modal: true, modalType: 'basic', basicModalViewMode: 'report_preview', reportType: surveyProps.delegateReportName });
          break;
        }
        case 'report': 
        default: {
          this.setState({ activeEntry: delegateEntry, modal: true, modalType: 'basic', basicModalViewMode: 'report_download', reportType: surveyProps.delegateReportName });
          break;
        }
      }
    };

    const menus = [
      { title: 'View Delegate Details', icon: 'account_circle', id: 'view-details', key: 'view-details' },                      
      { title: 'Remove from Survey', icon: 'delete_outline', id: 'remove', key:'remove' },
    ];

    let requiresInviteMail = false;
        
    switch(delegateEntry.status.toLowerCase()){
      case 'invite-sent': {
        menus.push({ title: 'Launch for delegate', icon: 'flight_takeoff', id: 'launch', key:'launch' });
        menus.push({ title: 'Re-send invite', icon: 'mail', id: 'sendinvite', key:'send-invite' });
        break;
      }
      case 'complete': {
        menus.push({ title: 'Generate Reports', icon: 'assessment', id: 'report', key:'report' });
        break;
      }
      case 'new': {
        if(surveyProps.is360) menus.push({ title: 'Send Invite', icon: 'mail', id: 'sendinvite', key:'send-invite' });
        if(surveyProps.isCulture === true || surveyProps.is180 === true) {
          menus.push({ title: 'Launch for delegate', icon: 'flight_takeoff', id: 'launch', key:'launch' });
        }
        break;
      }
      case 'launched':
      case 'launched-assessor':
      case 'launched-delegate': {
        menus.push({ title: 'Send Reminders', icon: 'mail_outline', id: 'send-reminder', key:'reminder' });
        menus.push({ title: 'Re-send Launch', icon: 'flight_takeoff', id: 'relaunch', key:'relaunch' });        
        menus.push({ title: 'View Assessment Details', icon: 'assignment', id: 'view-assessments', key:'view-assessments' });
        menus.push({ title: 'Download Report', icon: 'cloud_download', id: 'report', key:'report' });
        menus.push({ title: 'Preview Report', icon: 'assessment', id: 'report_preview', key:'report' })
        break;
      }
      default: {
        break;
      }
    }
        
    return (<DropDownMenu menus={menus} onSelect={onMenuItemSelect} />)    
  }

  generateReport(reportType = ReportTypes.SurveyStatusReport){
    console.log('Generate Report');
    if(this.props.formData.length === 0) return;
    
    this.setState({ basicModalViewMode: 'report_preview', reportType, modal: true, modalType: 'basic', activeEntry: this.props.formData[0]  });
  }

  getBasicModalView( ) {
    const self = this;
    const { activeEntry, assessment, basicModalViewMode, reportType, surveyProps } = self.state;
    const { DropDownMenu, Assessment, ReportViewer, FullScreenModal } = self.componentDefs;
    const { api } = this.props;
    
    //src: http://localhost:4000/pdf/towerstone/delegate-360-assessment?x-client-key=${this.props.api.CLIENT_KEY}&x-client-pwd=${this.props.api.CLIENT_PWD}

    let modalviewComponent = null;
    let reportData = {
      surveyId: self.props.formContext.surveyId,
      delegateId: activeEntry.id
    };

    switch(reportType) {
      case ReportTypes.SurveyStatusReport: delete reportData.delegateId; break;            
    }

    const [ nameSpace, name ] = reportType.split(".");

    switch(basicModalViewMode) {
      case 'report_preview': {
        modalviewComponent = (<ReportViewer 
          folder={nameSpace} 
          report={name || ReportTypes.DelegateReport} 
          method="get" 
          delivery="inline"           
          waitingText="Loading Report Data, please wait." 
          data={reportData} />)  
        break;
      }
      case 'report_download': {
        modalviewComponent = (<ReportViewer 
          folder={nameSpace} 
          report={name || ReportTypes.DelegateReport} 
          method="get" 
          delivery="download"           
          waitingText="Loading Report Data, please wait." 
          data={reportData} />)
        break;
      }
      case 'assessments':
      case 'assessment-details':
      default: {

        const closeAssessmentModal = () => { self.setState({ assessment: null,  basicModalViewMode: 'assessments'}) };
        let detailAssessmentComponent = <Typography> Select an assessment to view the details </Typography>;
        
        if(assessment && (assessment.id || assessment._id)) {
          detailAssessmentComponent = (
            <FullScreenModal open={true} title={`Assessment Details as Admin`} onClose={closeAssessmentModal}>
            <Assessment assessmentId={assessment.id || assessment._id}  mode="admin" />
            </FullScreenModal>
          )
        }

        let reportViewer = null;

        const closeExcelReport = (evt) => {
          self.setState({ showExcelReport: false });
        };

        if(self.state.showExcelReport === true) {
          reportViewer = (<ReportViewer
            engine={'excel'}          
            exportDefinition={assessmentExcelExport}
            useClient={true}
            data={{formData: self.state.excelReportData }}
            onClose={closeExcelReport}
          />);
        }
        
        const downloadExcelReport = () => {

          debugger

          const surveyId = self.props.formContext.$formData.id;
          const delegateId = activeEntry.id

          api.graphqlQuery(`query ReactoryGetCachedItem($key: String!){
            ReactoryGetCachedItem(key: $key) {
              key
              ttl
              item
            }
          }`, { key: `towerstone.survey@${surveyId}/${delegateId}` } ).then((response) => {
            api.log(`Cache data response`, {response}, 'debug');

            if(response && response.data && response.data.ReactoryCacheGetItem) {
              self.setState({ excelReportData: response.data.ReactoryGetCachedItem.item, showExcelReport: true })
            } else {
              api.createNotification(`Could not fetch report data, please generate PDF report first, before downloading excel`, { showInAppNotification: true, canDismiss: true, type: 'warning'})
            }           
          }).catch((err) => {
            api.createNotification(`Could not fetch report data, check code ${err.message}`, { showInAppNotification: true, canDismiss: true, type: 'warning'})
          })
          
        };

        modalviewComponent = (
          <Paper className={this.props.classes.root} elevation={2}>
            <UserListItem key={activeEntry.id} user={activeEntry.delegate} />
            <Toolbar><Button onClick={downloadExcelReport}><Icon>functions</Icon> Download Excel Report</Button></Toolbar>
            <hr/>
            <Typography variant="caption">Assessments</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <List>
                {
                  activeEntry.assessments.map( ( _assessment, aidx ) => {
                    const onMenuItemSelect = (evt, menuItem) => {
                      
                      switch(menuItem.id){
                        case "send-reminder": {          
                          break;
                        }
                        case "remove-assessment": {
                          self.removeAssessorForDelegate(activeEntry, _assessment);
                          break;
                        }
                        case "details": {
                          self.setState({ assessment: _assessment, basicModalViewMode: 'assessment-details' })
                          break;
                        }
                        case "unlock_assessment": {                                                    
                            api.graphqlMutation(gql`mutation SetAssessmentComplete($id: String!, $complete: Boolean){
                              setAssessmentComplete(id: $id, complete: $complete) {
                                complete
                                updatedAt
                              }
                            }`, {
                              id: _assessment.id,
                              complete: false
                            }).then(response => {
                              let isOpen = false;
                              if (response.data.setAssessmentComplete && response.data.setAssessmentComplete) isOpen = response.data.setAssessmentComplete.complete === false;

                              if(isOpen === true) {
                                api.createNotification(`Assessment has been re-opened`, { 
                                  showInAppNotification: true,
                                  type: 'success',
                                  canDissmiss: true,
                                  timeout: 2000
                                 })
                              }
                            }).catch(mutateError => {
                              api.log(`Could not execute the mutation`, {mutateError}, 'error' );
                              self.setState({ completing: false, completeError: 'Could not update the assessment status' });
                            })                          

                          break;
                        }
                        default: {
                          break;
                        }
                      }
                    };
                
                    const menus = [
                      {
                        title: 'Remove', 
                        icon: 'delete_outline', 
                        id: 'remove-assessment', 
                        key:'remove-assessment'
                      },
                      {
                        title: 'Details', 
                        icon: 'search', 
                        id: 'details', 
                        key:'details'
                      }
                    ];
                    
                    if(_assessment.complete !== true) {
                      menus.push({
                        title: 'Send Reminders', 
                        icon: 'mail_outline', 
                        id: 'send-reminder', 
                        key:'reminder'
                      });

                      menus.push({
                        title: 'Send Launch', 
                        icon: 'take_off', 
                        id: 'launch', 
                        key:'launch'
                      });
                    } else {
                      menus.push({
                        title: 'Open Assessment', 
                        icon: 'lock_open', 
                        id: 'unlock_assessment', 
                        key:'unlock_assessment'
                      });
                    }
                                                      
                    const dropdown = <DropDownMenu menus={menus} onSelect={onMenuItemSelect} />
      
                    const { assessor } = _assessment;
                    return (
                    <UserListItem 
                      key={ aidx } 
                      user={ assessor } 
                      message={ _assessment.complete === true ? 'Assessment complete' : 'Pending' } 
                      secondaryAction={ dropdown } />);
                  })
                }
              </List>
              </Grid>              
              <Grid item sm={12} md={9}>
              <Typography variant="caption">Details</Typography>
                {detailAssessmentComponent}
              </Grid>
            </Grid>                                               
            {reportViewer}
          </Paper>
        );

        break;
      }
    }

    return modalviewComponent;      
  }

  getDetailView(){    
    const { Profile } = this.componentDefs
    const { activeEntry } = this.state;

    return (<Profile profileId={activeEntry.delegate.id} withPeers={true} mode="admin" />);
  }

  getActiveModalView(){
    const { FullScreenModal, UserListWithSearch } = this.componentDefs;
    const { activeEntry, modal, modalType, basicModalViewMode, userAddType, formData } = this.state;    
    const { formContext, onChange, api } = this.props;
    const self = this;
    
    const closeModal = () => { 
      self.setState({modal: false}, () => {
        if(formContext && formContext.refresh) formContext.refresh();
      });
    }

    const userSelected = (userToAdd ) => {
      //console.log('Add user to delegates', { userToAdd, p: this.props });

      self.doAction({ id: "", delegate: userToAdd}, "add", { userAddType: userAddType }, 'Adding delegate to survey', false, false);
    };

    let component = null;

    let excludedUsers = [];
    if(formData && isArray(formData)) {
      excludedUsers = formData.map( entry =>  {
        if(entry && entry.delegate ) return entry.delegate.id;
      })
    }

    let modalTitle = activeEntry && activeEntry.delegate ? `Assessment Details: ${activeEntry.delegate.firstName} ${activeEntry.delegate.lastName}` : `Select Delegates For Survey`;

    switch(modalType){
      case 'add': {
        component = (
          <UserListWithSearch 
            organizationId={formContext.organizationId}
            multiSelect={false}
            onUserSelect={userSelected}
            onAcceptSelection={closeModal}
            selected={excludedUsers}
            excluded={excludedUsers}
            formProps={{ mode: 'admin' }}
            businessUnitFilter={false}
            showFilters={false} />)

        if(userAddType === 'delegate') {
          modalTitle  = 'Select Delegates For Survey'
        } else {
          modalTitle  = 'Select Assessors For Survey'
        }        
        break;
      }
      case 'basic' : {
        switch(basicModalViewMode) {
          case BasicModalViewModes.ReportDownload: modalTitle = 'Survey Status Report Download'; break;
          case BasicModalViewModes.ReportPreview:  modalTitle = 'Survey Status Report Preview'; break;          
        }
        
        component = self.getBasicModalView();
        break;        
      }
      case 'detail':
      default: {
        if(activeEntry === null) return null;
        component = self.getDetailView();
        break;
      }
    }



    return (
      <FullScreenModal 
        open={this.state.modal === true} 
        onClose={closeModal} 
        title={ modalTitle }>
        {component}
      </FullScreenModal>
    )
  }

  addDelegateClicked(){
    this.setState({ modal: true, modalType: 'add', userAddType: 'delegate' })
  }

  addAssessorClicked(){
    this.setState({ modal: true, modalType: 'add', userAddType: 'assessor' })
  }

  doAction(delegateEntry, action = 'send-invite', inputData = {}, busyMessage = 'Working...', batch = false, refresh = true, done = ()=>{}){
    const { api, formContext } = this.props;
    api.log('SurveyDelegateWidget.doAction(delegateEntry, action, inputData, busyMessage)', {delegateEntry, action, inputData, busyMessage, batch}, 'debug');
    
    const self = this;    
    const doMutation = () => {      

      const mutation = gql`mutation SurveyDelegateAction($entryId: String!, $survey: String!, $delegate: String!, $action: String!, $inputData: Any){
        surveyDelegateAction(entryId: $entryId, survey: $survey, delegate: $delegate, action: $action, inputData: $inputData) {
          id
          delegate {
            id
            firstName
            lastName
            email
            avatar 
          }
          team
          peers {
            id
          }        
          notifications {
            id
          }
          assessments {
            id          
          }
          status
          launched 
          complete
          removed
          message
          updatedAt        
          lastAction
        }
      }`;
      
      

      if(batch === true && isArray(delegateEntry)) {

        let promises = delegateEntry.map( entry => {
          const variables = {
            survey: self.props.formContext.surveyId,
            entryId: entry.id,
            delegate: entry.delegate.id,
            action,
            inputData: {
              relaunch: entry.relaunch === true,
              ...inputData
            }      
          };

          return api.graphqlMutation(mutation, variables);
        });
        
        Promise.all(promises).then(( promiseResults ) => {
          api.log("Promises returned", promiseResults, 'debug');
          self.setState({ displayError: false, message: '', busy: false }, () => {
            if(self.props.formContext && isFunction(self.props.formContext.refresh) === true){
              self.props.formContext.refresh();
            }
          });
        }).catch((promiseError) => {
          api.log('Error processing batch', promiseError, 'error');
          self.setState({ displayError: true, message: 'An error occured doing a batch update', busy: false });
        });

      } else {
        api.log('Single use action');
        const variables = {
          survey: this.props.formContext.surveyId,
          entryId: delegateEntry.id,
          delegate: delegateEntry.delegate.id,
          action,
          inputData: {
            relaunch: delegateEntry.relaunch === true,
            ...inputData
          }      
        };

        api.graphqlMutation(mutation, variables).then((mutationResult) => {
          //console.log('DelegateEntry Result From Mutation', mutationResult)
          if(mutationResult.data && mutationResult.data.surveyDelegateAction) {
            debugger
            let formData = [...self.state.formData]  
            if(action === "add") {
              formData.push({...mutationResult.data.surveyDelegateAction});
              api.createNotification(`Added`, { 
                body: `User ${mutationResult.data.surveyDelegateAction.delegate.firstName} added to survey`, showInAppNotification: true, type: 'success' });
            } else {
              const indexToUpdate = findIndex(self.state.formData, {'id': delegateEntry.id });          
              formData[indexToUpdate] = {...formData[indexToUpdate], ...mutationResult.data.surveyDelegateAction };
            }
            
            self.setState({ displayError: false, message: '', busy: false, formData }, ()=> {
              if(self.props.formContext && isFunction(self.props.formContext.refresh && refresh === true) === true){
                self.props.formContext.refresh();
              }
            });
          }
        }).catch((mutationError) => {
          self.setState({ displayError: true, message: 'An error occured while ....', busy: false })
        });
      }      
    };

    this.setState({ busy: true, message: busyMessage }, () => {      
      doMutation(); 
    });
  }

  sendCommunicationToDelegate(delegateEntry, communication = 'send-invite'){
    this.doAction(delegateEntry, communication, {}, `Sending invite to ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} for participation`);
  }

  launchSurveyForDelegate(delegateEntry, relaunch = false){    
    this.doAction({ ...delegateEntry, relaunch }, 'launch', {}, `Launching surveys for delegate ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName}`);
  }

  removeDelegateFromSurvey(delegateEntry, permanent){    
    this.doAction(delegateEntry, 'remove', { permanent }, `Removing delegate ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} from survey`, false, true);
  }

  enabledDelegateForSurvey(delegateEntry){
    this.doAction(delegateEntry, 'enable', {}, `Adding delegate ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} from survey`);
  }

  removeAssessorForDelegate(delegateEntry, assessment) {
    this.props.api.log('SurveyDelegateWidget.removeAssessorForDelegate(delegateEntry, assessment)', { delegateEntry, assessment });
    if(delegateEntry && assessment) {
      this.doAction(delegateEntry, 'remove-assessor', { assessmentId: assessment.id  || assessment._id }, `Removing Assessor From Survey`)
    }
  }

  renderDelegateItem(delegateEntry, status) {
    const { classes, api, formContext } = this.props;
    const { ErrorMessage, AssessmentTable, SpeedDial } = this.componentDefs;
    const { formData, selected, surveyProps } = this.state;
    const self = this;

    const { 
      is360,
      isPLC,
      is180,
      isCulture,
      surveyType
    } = surveyProps;


    let backgroundColor = null;

    const itemDetailClicked = (e) => {
      api.log('Item detail clicked', e, 'debug');
      self.setState({ activeEntry: delegateEntry, modal: true, modalType: 'basic' });
    };
                                                      
    let secondaryItem = (<IconButton onClick={itemDetailClicked}><Icon>more_vert</Icon></IconButton>);
    secondaryItem = self.getSecondaryAction(delegateEntry);

    const selectUser = e => {
      console.log(`User select clicked ${delegateEntry.delegate.firstName}`);
      const _selected = {...this.state.selected};
      if(_selected.hasOwnProperty(delegateEntry.delegate.id)) {
        _selected[delegateEntry.delegate.id].selected = !_selected[delegateEntry.delegate.id].selected;                  
      } else {
        _selected[delegateEntry.delegate.id] = {
          selected: true
        }
      }

      self.setState({selected: _selected});
    }

    const isSelected = this.state.selected.hasOwnProperty(delegateEntry.delegate.id) === true ? this.state.selected[delegateEntry.delegate.id].selected === true : false;
    let userMessage = null;
    

    let statusCount = { true: 0, false: 0 };// 
    let allComplete = false;
    if(delegateEntry.assessments && isArray(delegateEntry.assessments) === true) {
      statusCount = countBy(delegateEntry.assessments, 'complete');
      allComplete = statusCount.true === delegateEntry.assessments.length && delegateEntry.assessments.length > 0;
    } 

    if(allComplete === true) {
      backgroundColor = "darkseagreen";
    }
     

    api.log(`(${statusCount.true}) assessments complete for ${delegateEntry.delegate.firstName}`, delegateEntry, 'debug')
    switch(status.key){                        
      case 'launched': {
        //console.log('Status Count', statusCount);
        userMessage = (
        <span>{delegateEntry.message}<br/>
        {statusCount.true || 0} / {delegateEntry.assessments.length} assessment(s) complete.
        </span>);
        break;
      }
      case 'closed': {
        userMessage = (<span>{delegateEntry.message}</span>)
        break;
      }
      case 'feedback-complete': {
        userMessage = (<span>{delegateEntry.message}</span>)
        break;
      }
      case 'launched-assessor':          
      {
        if(is180) {
          userMessage = `Launched as team assessor ${allComplete === true ? 'and completed assessement' : 'and has not completed assessment'}`                        
        }
        break;
      }  
      case 'launched-delegate': {
        if(is180) {
          userMessage = `Launched as team delegate ${allComplete === true ? 'and completed assessement' : 'and has not completed assessment'}`              
        }
        break;
      }
      case 'invite-sent':
      case 'new':
      default: {
        if(!is180 && !isCulture) {
          let peersConfirmed = false;
          let hasPeers = false;
          console.log('Rendering for delegate Entry', delegateEntry);
          if(nil(delegateEntry.peers) === false) {
            hasPeers = true;
            peersConfirmed = moment(delegateEntry.peers.confirmedAt).isValid() === true              
          } 

          if(hasPeers === false) {
            userMessage = (<span>{delegateEntry.message}<br/>No peers available for user</span>);              
            backgroundColor = "gold";
          } else {
            if(peersConfirmed === false) {
              userMessage = (<span>{delegateEntry.message}<br/>User has peers but has not confimed them yet</span>);
              backgroundColor = "antiquewhite";
            }                              
            else {                                
              userMessage = (<span>{delegateEntry.message}<br/>Peers confirmed {delegateEntry.peers.confirmedAt} ({hdate.relativeTime(delegateEntry.peers.confirmedAt)})</span>);
              backgroundColor = "darkseagreen";
            }                              
          }
        }                                             
        break;
      }
    }
    return (
      <UserListItem
        key={delegateEntry.id || delegateEntry._id}
        user={delegateEntry.delegate}
        primaryText={`${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} [${delegateEntry.delegate.email}]`} 
        message={userMessage} 
        secondaryAction={secondaryItem}  
        checkbox={true}
        selected={isSelected}
        onSelectChanged={selectUser}
        style={{ padding: '0px', backgroundColor }}            
         />
    );
  }
 

  render(){
    const { classes, api, formContext } = this.props;
    const { ErrorMessage, AssessmentTable, SpeedDial } = this.componentDefs;
    const { formData, selected, surveyProps } = this.state;
    const self = this;
    const { renderDelegateItem } = self;
    let data = [];

    formData.map((entry) => { 
      if(entry.delegate && entry.delegate.id) data.push({...entry}) 
    }); 
                      
    if(isArray(data) === true){

      

      data = sortBy(data, (delegateEntry) => { return `${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName}` })            
            
      const { 
        is360,
        isPLC,
        is180,
        isCulture,
        surveyType
      } = surveyProps;

      /**

        {
            "id": "5ca572e75cde0605aff9e697",
            "delegate": {
              "id": "5c74cab034c6f61d47d440c0",
              "email": "werner.weber@gmail.com",
              "firstName": "Werner",
              "lastName": "Weber",
              "avatar": "profile_5c74cab034c6f61d47d440c0_default.jpeg",
              "__typename": "User"
            },
            "status": "invite-sent",
            "peers": {
              "id": "",
              "organization": {
                "id": "5c74cce434c6f61d47d4425a",
                "name": "TowerStone",
                "__typename": "Organization"
              },
              "user": {
                "id": "5c74cab034c6f61d47d440c0",
                "firstName": "Werner",
                "lastName": "Weber",
                "__typename": "User"
              },
              "confirmedAt": "2019-04-18T20:15:58+02:00",
              "allowEdit": false,
              "__typename": "UserPeers"
            },
            "message": "Sent invitation to Werner Weber for Testing Werner Local @ 2019-04-15 06:38:01",
            "launched": false,
            "complete": false,
            "removed": false,
            "lastAction": "send-invite",
            "nextAction": "close",
            "assessments": [
              
            ],
            "__typename": "DelegateEntry"
          }

       */

      const lastActionList = [
        {
          key: 'added',
          title: 'Added to Survey',
          description: '',
          icon: ''
        },
        { 
          key: 'invitation-sent',
          title: 'Invitation Sent',
          description: '',
          icon: ''
        },
        { 
          key: 'invite-failed',
          title: 'Invitation Failed',
          description: '',
          icon: ''
        },
        { 
          key: 'launched',
          title: 'Launched',
          description: '',
          icon: ''
        },
        { 
          key: 'launch-fail',
          title: 'Launch Failed',
          description: '',
          icon: ''
        },
        { 
          key: 'reminded',
          title: 'Reminded',
          description: '',
          icon: ''
        },
        { 
          key: 'closed',
          title: 'Survey Closed for Delegate',
          description: '',
          icon: ''
        },      
        { 
          key: 'removed',
          title: 'Removed',
          description: '',
          icon: ''
        },
      ]
      //new, invite-sent, launched, 
     
      
      const selectedDelegates = filter(data, (delegateEntry) => { return self.state.selected.hasOwnProperty(delegateEntry.delegate.id) === true });

      let statusList = [];
      let speedDialActions = [
        {
          key: 'add-new-delegate',
          title: 'Add Delegate',
          clickHandler: (evt)=>{
            this.addDelegateClicked();
          },
          icon: <Icon>group_add</Icon>,
          enabled: true,
          ordinal: 0,
        },        
        {
          key: 'send-invites',
          title: 'Send Invites',
          clickHandler: evt => {
            self.doAction(selectedDelegates, "send-invite", null ,`Sending invitations for ${selectedDelegates.length} delegates, please wait`, true);
          },
          icon: <Icon>email</Icon>,
          enabled: selectedDelegates.length > 0,
          ordinal: 1,
        },
        {
          key: 'launch',
          title: 'Launch for delegates',
          clickHandler: evt => {
            self.doAction(selectedDelegates, "launch", null ,`Launching for ${selectedDelegates.length} delegates, please wait`, true);
          },
          icon: <Icon>flight_takeoff</Icon>,
          enabled: selectedDelegates.length > 0,
          ordinal: 2,
        },
        {
          key: 'send-reminder',
          title: 'Send reminders',
          clickHandler: evt => {
            self.doAction(selectedDelegates, "send-reminder", null ,`Sending Reminders for ${selectedDelegates.length} delegates, please wait`, true);
          },
          icon: <Icon>alarm</Icon>,
          enabled: selectedDelegates.length > 0,
          ordinal: 3,
        },
        {
          key: 'close',
          title: 'Close for delegates',
          clickHandler: evt => {
            self.doAction(selectedDelegates, "close", null ,`Closing survey for ${selectedDelegates.length} delegates, please wait`, true);
          },
          icon: <Icon>close</Icon>,
          enabled: selectedDelegates.length > 0,
          ordinal: 4,
        },       
        {
          key: 'status-report',
          title: 'Status Report',
          clickHandler: evt => {
            self.generateReport();
          },
          icon: <Icon>print</Icon>,
          enabled: true,
          ordinal: 5,
        },
      ];

      if(is360 === true || isPLC === true) {
        statusList = [{
          key: 'new',
          title: 'Added to survey',
          icon: 'new_releases',          
        },
        {
          key: 'invite-sent',
          title: 'Invitation Sent',
          icon: 'email',          
        },
        {
          key: 'launched',
          title: 'Launched',
          icon: 'flight_takeoff'
        },
        {
          key: 'closed',
          title: 'Closed',
          icon: 'not_interested'
        },
        {
          key: 'feedback-complete',
          title: 'Feedback Completed',
          icon: 'comment'
        },
        {
          key: 'removed',
          title: 'Removed / Disabled for Survey',
          icon: 'delete_outline'
        }];       
      }

      if(isCulture) {
        statusList = [{
          key: 'new',
          title: 'Added to survey',
          icon: 'new_releases',          
        },      
        {
          key: 'launched',
          title: 'Launched',
          icon: 'flight_takeoff'
        },              
        {
          key: 'closed',
          title: 'Closed',
          icon: 'not_interested'
        },
        {
          key: 'feedback-complete',
          title: 'Feedback Completed',
          icon: 'comment'
        },
        {
          key: 'removed',
          title: 'Removed / Disabled for Survey',
          icon: 'delete_outline'
        }];       
      }

      if(is180 === true) {        
        statusList = [ 
          {
            key: 'new',
            title: 'Added to survey',
            icon: 'new_releases',          
          },                   
          {
            key: 'new-delegate',
            title: `Added to ${formContext.$formData.delegateTeamName || 'Delegates'}`,
            icon: 'new_releases',          
          },
          {
            key: 'new-assessor',
            title: `Added to ${formContext.$formData.assessorTeamName || 'Assessors'}`,
            icon: 'new_releases',          
          },
          {
            key: 'invite-sent',
            title: 'Invitation Sent',
            icon: 'email',          
          },
          {
            key: 'launched-assessor',
            title: `Launched for ${formContext.formData.delegateTeamName || 'Assessors'}`,
            icon: 'flight_takeoff'
          },
          {
            key: 'launched-delegate',
            title: `Launched for ${formContext.formData.assessorTeamName || 'Assessors'}`,
            icon: 'flight_takeoff'
          },          
          {
            key: 'removed',
            title: 'Removed / Disabled for Survey',
            icon: 'delete_outline'
          }
        ];

        speedDialActions.push( {
          key: 'add-new-assessor',
          title: 'Add Assessor',
          clickHandler: (evt)=>{
            this.addAssessorClicked();
          },
          icon: <Icon>group_add</Icon>,
          enabled: true,
          ordinal: -1,
        });

      }              

     
      
      const list = (        
        <List subheader={ <li /> }>                    
          {
            statusList.map(status => {
              let removedItems = null;
              
              if(status.key === "removed") {
                removedItems = sortBy(filter(data, (elem) => { return elem.removed === true}), (delegateEntry) => {  return `${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName}` }).map((delegateEntry, index) => {
                  return renderDelegateItem(delegateEntry, status);
                });
              }

              const toggleWithStatus = e => {
                let _selectedPatch = { };
                filter(data, (elem) => { return elem.status.toLowerCase() === status.key && elem.removed !== true }).map( (delegateEntry, index) => {                                         
                  if(selected.hasOwnProperty(delegateEntry.delegate.id) === true) {
                    _selectedPatch[delegateEntry.delegate.id] = {
                      selected: !selected[delegateEntry.delegate.id].selected
                    };
                  } else {
                    _selectedPatch[delegateEntry.delegate.id] = {
                      selected: true
                    }
                  }                    
                  self.setState({ selected: {...selected, ..._selectedPatch }});
                });                
              };

              return (<li key={status.key} className={classes && classes.userListSubheader ? classes.userListSubheader : ''}>
                <ul style={{ margin: "0px", padding: '0px' }}>
                  <ListSubheader style={{ padding: "0px" }}>
                    <Paper style={{display: 'flex', justifyContent: 'flex-start' }}>                      
                      <Tooltip title="Click to toggle the select status">
                        <IconButton color="primary" onClick={toggleWithStatus} style={{marginRight: self.props.theme.spacing(2)}}>
                          <Icon>{status.icon}</Icon>
                        </IconButton>
                      </Tooltip>
                      <Typography color="primary" variant="caption" style={{marginLeft: 'auto', marginRight: self.props.theme.spacing(1), paddingTop: self.props.theme.spacing(1) }}>{status.title}</Typography>                      
                    </Paper>                    
                  </ListSubheader>
                  {
                    filter(data, (elem) => { return elem.status.toLowerCase() === status.key && elem.removed !== true }).map( (delegateEntry, index) => {                                         
                      return renderDelegateItem(delegateEntry, status);
                    })
                  }
                  {removedItems}                                                      
                </ul>
              </li>);
            })
            
          }
        </List>
      )
         
      return (
        <React.Fragment className={this.props.classes.root}>
          {list}
          {self.state.busy && self.state.message && <Typography variant="caption" color="secondary"><Icon>info</Icon>{self.state.message}</Typography>} 
          {<SpeedDial actions={sortBy(speedDialActions, e => e.ordinal )} icon={<Icon>golf_course</Icon>} />}
          {self.getActiveModalView()}
        </React.Fragment>
      )
    } else {
      return <ErrorMessage message="Expecting array data" />
    }
    
  }
}


SurveyDelegates.styles = (theme) => {
  return {
    root: {
      padding: theme.spacing(1)
    },
    container: {
      margin: 'auto',
      minWidth: '320px',
      maxWidth: '100%'
    },  
    delegateStatusNew: {
      backgroundColor: 'cadetblue'
    },
    delegateStatusInviteSent: {
      backgroundColor: 'aliceblue'
    },
    delegateStatusLaunched: {
      backgroundColor: 'bisque',
    },
    delegateStatusComplete: {
      backgroundColor: 'darkturquoise',
    },
  }
};


export const SurveyDelegatesComponent = compose(withApi, withTheme, withStyles(SurveyDelegates.styles))(SurveyDelegates)


export default {
  SurveyDelegatesComponent,
  SurveyDelegateComponent
}


