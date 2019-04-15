import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import classnames from 'classnames';
import om from 'object-mapper';
import MaterialTable, { MTableToolbar } from 'material-table';
import { isArray, isFunction, sort, findIndex, countBy } from 'lodash';
import {
  Avatar,
  Paper,
  Typography,
  Toolbar,
  Icon, 
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  LinearProgress
} from '@material-ui/core';
import gql from 'graphql-tag';
import { UserListItem } from '../../user/Lists';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import { nil } from '../../util';
import moment from 'moment';

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

export const SurveyDelegateComponent = compose(withApi, withTheme(), withStyles(SurveyDelegate.styles))(SurveyDelegate);

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
    this.state = {
      activeEntry: null,
      modal: false,
      modalType: 'add',
      busy: false,
      message: '',
      activeTab: 'assessments',
      formData: props.formData || []
    };
    this.componentDefs = props.api.getComponents([
      'core.ErrorMessage', 
      'towerstone.SurveyDelegateWidget', 
      'core.DropDownMenu', 
      'core.FullScreenModal',      
      'core.UserListWithSearch',
      'core.Profile',
      'core.AssessmentList',
      'core.AssessmentTable'
    ]);
    this.getSecondaryAction = this.getSecondaryAction.bind(this)
    this.sendInviteEmails = this.sendInviteEmails.bind(this)
    this.launchSurvey = this.launchSurvey.bind(this)
    this.stopSurvey = this.stopSurvey.bind(this)
    this.generateReport = this.generateReport.bind(this)
    this.getDetailView = this.getDetailView.bind(this)
    this.getActiveModalView = this.getActiveModalView.bind(this)
    this.addDelegateClicked = this.addDelegateClicked.bind(this)
    this.enabledDelegateForSurvey = this.enabledDelegateForSurvey.bind(this)
    this.sendCommunicationToDelegate = this.sendCommunicationToDelegate.bind(this)
    this.launchSurveyForDelegate = this.launchSurveyForDelegate.bind(this)
    this.removeDelegateFromSurvey = this.removeDelegateFromSurvey.bind(this)
    this.doAction = this.doAction.bind(this)
  }

  componentDidCatch(error, info){
    console.error('Error in SurveyDelegateWidget', {error, info})
  }

  getSecondaryAction(delegateEntry){
    const { DropDownMenu } = this.componentDefs;
    const onMenuItemSelect = (evt, menuItem) => {
      // //console.log('trigger menu item', {menuItem, delegateEntry})
      switch(menuItem.id){
        case 'sendinvite': {
          this.sendInviteEmails(delegateEntry)
          break;
        }
        case 'launch': {
          this.launchSurvey(delegateEntry)
          break;
        }
        case 'stop': {
          this.stopSurvey(delegateEntry)
          break;
        }
        case 'report': 
        default: {
          this.generateReport(delegateEntry)
          break;
        }
      }
    };

    const menus = [
                
      
    ];

    switch(delegateEntry.status){
      case 'invite-sent': {
        menus.push({ title: 'Stop Survey', icon: 'flight_land', id: 'stop', key:'stop' })
        break;
      }
      case 'complete': {
        menus.push({ title: 'Generate Reports', icon: 'assessment', id: 'report', key:'report' })
        break;
      }
      case 'new':
      default: {
        menus.push({ title: 'Send Invite', icon: 'mail', id: 'sendinvite', key:'sendinvite' })      
        menus.push({ title: 'Launch Survey', icon: 'flight_take_off', id: 'launch', key:'launch' })
      }
    }
    
    return (<DropDownMenu menus={menus} onSelect={onMenuItemSelect} />)    
  }

  sendInviteEmails(delegateEntry){
    //console.log('Send Invite Emails', delegateEntry);    
  }

  launchSurvey(delegateEntry){
    //console.log('Launch Survey', delegateEntry);
  }

  stopSurvey(delegateEntry){
    //console.log('Stop Survey', delegateEntry);
  }

  addDelegate(delegateEntry){
    //console.log('Show Delegate Add', delegateEntry);
  }

  generateReport(delegateEntry){
    //console.log('Generate Report', delegateEntry);
  }

  getDetailView(){    
    const { Profile } = this.componentDefs
    const { activeEntry } = this.state;

    return (<Profile profileId={activeEntry.delegate.id} withPeers={true} />);
  }

  getActiveModalView(){
    const { FullScreenModal, UserListWithSearch } = this.componentDefs;
    const { activeEntry, modal, modalType, formData } = this.state;    
    const { formContext, onChange, api } = this.props;
    const self = this;
    const closeModal = () => { 
      this.setState({modal: false}, () => {
      
      const mutation = `mutation SetDelegatesForSurvey($id: String!, $delegates: [DelegateInput], $replace: Boolean){
        setDelegatesForSurvey(id: $id, delegates: $delegates, replace: $replace){
          id
          organization {
            id
            name
          }
          delegates {                
            delegate {
              id
              firstName
              lastName
              avatar
              email
            }
          }                          
        }
      }`;

      const variables = om({formContext, formData },  {
        'formContext.surveyId': 'id',
        'formData.organization': 'organization.id',
        'formData[].id': 'delegates[].id',
        'formData[].delegate.id': 'delegates[].delegate',
        'formData[].launched': 'delegates[].launched',
        'formData[].complete': 'delegates[].complete',
        'formData[].removed': 'delegates[].removed',
      });
      variables.replace = false
      //console.log('variables for mutation', { variables, formContext, formData });
      const options = {};
      
                  
      api.graphqlMutation(gql(mutation), variables, options).then((result) => {
          //console.log('Updated delegates', { result, variables });
        }).catch((err) => {
          console.error('Error in setting delegates for survey', { err, variables });
        });
      });
    }

    const userSelected = (userToAdd ) => {
      //console.log('Add user to delegates', { userToAdd, p: this.props });
      self.doAction({ id: "", delegate: userToAdd }, "add"); 
    };

    let component = null;

    let excludedUsers = [];
    if(formData && isArray(formData)) {
      excludedUsers = formData.map( entry =>  {
        if(entry && entry.delegate ) return entry.delegate.id;
      })
    }

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
        break;
      }
      case 'detail':
      default: {
        if(activeEntry === null) return null;
        component = this.getDetailView();
        break;
      }
    }

    return (
      <FullScreenModal 
        open={this.state.modal === true} 
        onClose={closeModal} 
        title={ activeEntry && activeEntry.delegate ? `Assessment Details: ${activeEntry.delegate.firstName} ${activeEntry.delegate.lastName}` : `Select Delegates For Survey` }>
        {component}
      </FullScreenModal>
    )
  }

  addDelegateClicked(){
    this.setState({ modal: true, modalType: 'add' })
  }

  doAction(delegateEntry, action = 'send-invite', inputData = {}, busyMessage = 'Working...'){
    //console.log('SurveyDelegateWidget.doAction(delegateEntry, action, inputData, busyMessage)', {delegateEntry, action, inputData, busyMessage});
    const { api, formContext } = this.props;
    const self = this;
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
    
    const variables = {
      survey: this.props.formContext.surveyId,
      entryId: delegateEntry.id,
      delegate: delegateEntry.delegate.id,
      action      
    };

    const doMutation = () => {
      //console.log('SurveyDelegateWidget.doAction(...).doMutation()', {mutation, variables});
      api.graphqlMutation(mutation, variables).then((mutationResult) => {
        //console.log('DelegateEntry Result From Mutation', mutationResult)
        if(mutationResult.data && mutationResult.data.surveyDelegateAction) {
          //debugger;
          let formData = [...self.state.formData]  
          if(action === "add") {
            formData.push({...mutationResult.data.surveyDelegateAction});
          } else {
            const indexToUpdate = findIndex(self.state.formData, {'id': delegateEntry.id });          
            formData[indexToUpdate] = {...formData[indexToUpdate], ...mutationResult.data.surveyDelegateAction };
          }
          
          self.setState({ displayError: false, message: '', busy: false, formData });
        }
      }).catch((mutationError) => {
        self.setState({ displayError: true, message: 'An error occured while ....', busy: false })
      });
    };

    this.setState({ busy: true, message: busyMessage }, () => {
      //console.log('State updated', new Date().valueOf()) 
      doMutation(); 
    });
  }

  sendCommunicationToDelegate(delegateEntry, communication = 'send-invite'){
    this.doAction(delegateEntry, communication, {}, `Sending invite to ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} for participation`);
  }

  launchSurveyForDelegate(delegateEntry){
    this.doAction(delegateEntry, 'launch', {}, `Launching surveys for delegate ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName}`);
  }

  removeDelegateFromSurvey(delegateEntry, permanent){    
    this.doAction(delegateEntry, 'remove', { permanent }, `Removing delegate ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} from survey`);
  }

  enabledDelegateForSurvey(delegateEntry){
    this.doAction(delegateEntry, 'enable', {}, `Adding delegate ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} from survey`);
  }

  render(){
    const { classes, api } = this.props;
    const { ErrorMessage, AssessmentTable } = this.componentDefs;
    const { formData } = this.state;
    const self = this;
    let data = [];
    formData.map((entry) => { 
      if(entry.delegate && entry.delegate.id) data.push({...entry}) 
    });     
    if(isArray(data) === true){
      return (
        <Paper>                    
          <MaterialTable
            columns={[                
                {
                    title: 'Delegate', render: (rowData) => {
                      const fullName = rowData && rowData.delegate ? `${rowData.delegate.firstName} ${rowData.delegate.lastName}`  : 'No Delegate'
                      const avatar = rowData && rowData.delegate ? <Avatar src={api.getAvatar(rowData.delegate)} />  : 'No Delegate'
                        return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexGrow: 1 }}>
                          {avatar}
                          <Typography variant="body2">{fullName}</Typography>
                        </div>)
                        
                    }
                },                
                {
                  title: 'Message', render: (rowData) => {
                    return rowData && rowData.message ? rowData.message : 'No Message';
                  },
                },
                {
                    title: 'Status', render: (rowData) => {
                        return rowData && rowData.status ? rowData.status.toUpperCase() : 'NEW';
                    },
                },                
                {
                  title: 'Last Action', render: (rowData) => {
                    return rowData.lastAction;
                  },
                },
                {
                  title: 'Next Action', render: (rowData) => {
                    return rowData.nextAction;
                  },
                },
                {
                  title: 'Peers Confirmed', render: (rowData) => {
                    if(rowData.peers === null) return 'No Peers Defined';                    
                    return rowData.peers.confirmedAt === null ? 'Not confirmed' : moment(rowData.peers.confirmedAt).format("YYYY-MM-DD");
                }
              }               
            ]}                    
            data={data}
            components={{
              Toolbar: props => {
                return (
                  <div>
                    <MTableToolbar {...props}/>
                    <Toolbar>
                      <Tooltip title='Click here to trigger suggested email'><IconButton color="primary" onClick={this.sendInviteEmails}><Icon>mail</Icon></IconButton></Tooltip>
                      <Tooltip title='Click here to add a new delegate to this survey'><IconButton color="primary" onClick={this.addDelegateClicked}><Icon>add</Icon></IconButton></Tooltip>
                    </Toolbar>
                  </div>
                )
              },
            }}
            title="Delegates"
            detailPanel={ rowData => {
              return (
                  <Fragment>
                    <Typography variant="h5">Delegate assessment details for {rowData.delegate.firstName} {rowData.delegate.lastName}</Typography>
                    <LinearProgress variant="determinate" value={rowData.assessments.length > 0 ? Math.floor(((countBy(rowData.assessments, { complete: true }) * 100) / rowData.assessments.length)) : 0 }/>
                    <AssessmentTable assessments={rowData.assessments} />
                  </Fragment>
                )
            }}
            actions={[
                rowData => {
                  if(rowData.removed === true) return null;

                  return {
                    icon: 'search',
                    tooltip: 'Click to view details for the delegate',
                    onClick: (event, rowData) => {                      
                      self.setState({ activeEntry: rowData, modal: true, modalType: 'detail' })
                    }
                  }                  
                },
                rowData => {
                  if(rowData.removed === true) return null; 
                  
                  return {
                    icon: 'mail',
                    tooltip: 'Click to send invite',
                    disabled: rowData.status === 'complete',
                    onClick: (event, rowData) => {
                      //console.log('Send invites for all confirmed delegates', rowData)
                      self.sendCommunicationToDelegate(rowData)
                    }
                  }
                },
                rowData => {
                  if(rowData.removed === true) return null; 
                  
                  return {
                    icon: 'flight_takeoff',
                    tooltip: 'Click to launch for delegate',
                    disabled: rowData.status === 'complete',
                    onClick: (event, rowData) => {
                      self.launchSurveyForDelegate(rowData)
                    }
                  }
                },
                rowData => {
                  if(rowData.removed === true) {
                    return {
                      icon: 'restore',
                      tooltip: 'Click to re-add user to survey',
                      disabled: rowData.status === 'complete',
                      onClick: (event, rowData) => {
                        self.enabledDelegateForSurvey(rowData)
                      }  
                    }
                  }; 
                  
                  return {
                    icon: 'delete_outline',
                    tooltip: 'Click to remove / disable delegate in survey',                    
                    onClick: (event, rowData) => {
                      self.removeDelegateFromSurvey(rowData)
                    }
                  }
                },
                rowData => {
                  if(rowData.removed === false) return null;
                  
                  return {
                    icon: 'delete_outline',
                    tooltip: 'Click to completely remove the delegate from the survey',                    
                    onClick: (event, rowData) => {
                      self.removeDelegateFromSurvey(rowData, true)
                    }
                  }
                }                                
            ]}/>         
          {self.getActiveModalView()}
        </Paper>
      )
    } else {
      return <ErrorMessage message="Expecting array data" />
    }
    
  }
}


SurveyDelegates.styles = (theme) => {
  return {
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


export const SurveyDelegatesComponent = compose(withApi, withTheme(), withStyles(SurveyDelegates.styles))(SurveyDelegates)


export default {
  SurveyDelegatesComponent,
  SurveyDelegateComponent
}


