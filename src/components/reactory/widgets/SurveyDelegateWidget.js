import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import classnames from 'classnames';
import om from 'object-mapper';
import MaterialTable, { MTableToolbar } from 'material-table';
import { isArray, isFunction, sort, findIndex, countBy, isNil, filter } from 'lodash';
import {
  Avatar,
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
  LinearProgress
} from '@material-ui/core';
import gql from 'graphql-tag';
import { UserListItem } from '../../user/Lists';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import { nil } from '../../util';
import moment from 'moment';
import hdate from 'human-date';

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
      formData: props.formData || [],
      groupBy: 'status', //status, last-action, next-action
      selected: {

      }
    };
    this.componentDefs = props.api.getComponents([
      'core.ErrorMessage', 
      'towerstone.SurveyDelegateWidget', 
      'core.DropDownMenu', 
      'core.FullScreenModal',      
      'core.UserListWithSearch',
      'core.Profile',
      'core.AssessmentList',
      'core.AssessmentTable',
      'core.SpeedDial',
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
    this.getBasicModalView = this.getBasicModalView.bind(this)
    this.doAction = this.doAction.bind(this)
  }

  componentDidCatch(error, info){
    console.error('Error in SurveyDelegateWidget', {error, info})
  }

  getSecondaryAction(delegateEntry){
    const { DropDownMenu } = this.componentDefs;
    const self = this;
    const onMenuItemSelect = (evt, menuItem) => {
      // //console.log('trigger menu item', {menuItem, delegateEntry})
      switch(menuItem.id){
        case 'sendinvite': {
          self.sendCommunicationToDelegate(delegateEntry);
          //this.sendInviteEmails(delegateEntry)          
          break;
        }
        case 'launch': {
          self.launchSurveyForDelegate(delegateEntry);
          //this.launchSurvey(delegateEntry)
          break;
        }
        case 'stop': {
          
          //this.stopSurvey(delegateEntry)
          break;
        }
        case 'view-assessments': {          
          this.setState({ activeEntry: delegateEntry, modal: true, modalType: 'basic' });
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
        case 'report': 
        default: {
          this.generateReport(delegateEntry)
          break;
        }
      }
    };

    const menus = [
      { title: 'View Delegate Details', icon: 'account_circle', id: 'view-details', key: 'view-details' },                      
      { title: 'Remove from Survey', icon: 'delete_outline', id: 'remove', key:'remove' },
    ];

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
        menus.push({ title: 'Send Invite', icon: 'mail', id: 'sendinvite', key:'send-invite' });
        break;
      }
      case 'launched': {
        menus.push({ title: 'Send Reminders', icon: 'mail_outline', id: 'send-reminder', key:'reminder' });        
        menus.push({ title: 'View Assessment Details', icon: 'assignment', id: 'view-assessments', key:'view-assessments' });
        break;
      }
      default: {
        break;
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

  getBasicModalView() {
    const { activeEntry } = this.state;
    const { DropDownMenu } = this.componentDefs;
    

    return (
    <Fragment>
      <Paper className={this.props.classes.root} elevation={2}>
        <UserListItem key={activeEntry.id} user={activeEntry.delegate} />
        <hr/>
        <Typography variant="caption">Assessments</Typography>
        <List>
          {
            activeEntry.assessments.map( ( assessment ) => {
              const onMenuItemSelect = (evt, menuItem) => {
                switch(menuItem.id){
                  case "send-reminder": {          
                    break;
                  }
                  case "remove": {
                    break;
                  }
                  case "details": {
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
                  id: 'remove', 
                  key:'remove'
                },
                {
                  title: 'Details', 
                  icon: 'search', 
                  id: 'details', 
                  key:'details'
                }
              ];
              
              if(assessment.complete !== true) {
                menus.push({
                  title: 'Send Reminders', 
                  icon: 'mail_outline', 
                  id: 'send-reminder', 
                  key:'reminder'
                });
              }
                                                
              const dropdown = <DropDownMenu menus={menus} onSelect={onMenuItemSelect} />

              const { assessor } = assessment;
              return (
              <UserListItem 
                key={ assessor.id } 
                user={ assessor } 
                message={ assessment.complete ? 'Assessment complete' : 'Pending' } 
                secondaryAction={ dropdown } />
              );
            })
          }
        </List>
      </Paper>
    </Fragment>)
  }

  getDetailView(){    
    const { Profile } = this.componentDefs
    const { activeEntry } = this.state;

    return (<Profile profileId={activeEntry.delegate.id} withPeers={true} mode="admin" />);
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
      case 'basic' : {
        if(activeEntry === null) return null;
        component = this.getBasicModalView();
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
    const { ErrorMessage, AssessmentTable, SpeedDial } = this.componentDefs;
    const { formData } = this.state;
    const self = this;
    let data = [];
    formData.map((entry) => { 
      if(entry.delegate && entry.delegate.id) data.push({...entry}) 
    }); 
    
  
    if(isArray(data) === true){

      const table = (
        <MaterialTable
              columns={[                
                  {
                      title: 'Delegate', 
                      render: (rowData) => {
                        const fullName = rowData && rowData.delegate ? `${rowData.delegate.firstName} ${rowData.delegate.lastName}`  : 'No Delegate'
                        const avatar = rowData && rowData.delegate ? <Avatar src={api.getAvatar(rowData.delegate)} />  : 'No Delegate'
                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexGrow: 1 }}>
                            {avatar}
                            <Typography variant="body2">{fullName}</Typography>
                          </div>
                        );
                      }
                  },                
                  {
                    title: 'Message',
                    render: (rowData) => {
                      return rowData && rowData.message ? rowData.message : 'No Message';
                    },
                  },
                  {
                    title: 'Status', 
                    render: (rowData) => {
                      return rowData && rowData.status ? rowData.status.toUpperCase() : 'NEW';
                    },
                  },
                  {
                    title: 'Last Action',
                    render: (rowData) => {
                      return rowData.lastAction;
                    },
                  },
                  {
                    title: 'Next Action',
                    render: (rowData) => {
                      return rowData.nextAction;
                    },
                  },
                  {
                    title: 'Peers Confirmed', 
                    render: (rowData) => {
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
              ]}
          />
      );
  
      const secondaryAction = (<IconButton></IconButton>);
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
          title: 'Launched',
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
      const statusList = [
        {
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
        }
      ];

      const renderDelegateItem = (delegateEntry, status) => {
        

        const itemDetailClicked = (e) => {
          console.log('Item detail clicked', e);
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
        
        switch(status.key){                        
          case 'launched': {
            let statusCount = countBy(delegateEntry.assessments, 'complete')
            console.log('Status Count', statusCount);
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
          case 'invite-sent':
          case 'new':
          default: {
            let peersConfirmed = false;
            let hasPeers = false;
            console.log('Rendering for delegate Entry', delegateEntry);
            if(delegateEntry.peers) {
              hasPeers = true;
              peersConfirmed = moment.isMoment(moment(delegateEntry.peers.confirmedAt))
            }

            if(hasPeers === false) {
              userMessage = (<span>{delegateEntry.message}<br/>No peers available for user</span>);
            } else {
              if(peersConfirmed === false) {
                userMessage = (<span>{delegateEntry.message}<br/>User has peers but has not confimed them yet</span>);
              }                              
              else {
                userMessage = (<span>{delegateEntry.message}<br/>Peers confirmed {hdate.relativeTime(delegateEntry.peers.confirmedAt)}</span>);
              }                              
            }                          
            break;
          }
        }
        return (
          <UserListItem
            key={delegateEntry.id}
            user={delegateEntry.delegate}
            primaryText={`${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} [${delegateEntry.delegate.email}]`} 
            message={userMessage} 
            secondaryAction={secondaryItem}  
            checkbox={true}
            selected={isSelected}
            onSelectChanged={selectUser}            
             />
        );
      }

      

      const list = (        
        <List subheader={ <li /> }>                    
          {
            statusList.map(status => {
              let removedItems = null;
              
              if(status.key === "removed") {
                removedItems = filter(data, (elem) => { return elem.removed === true}).map((delegateEntry, index) => {
                  return renderDelegateItem(delegateEntry, status);
                });
              }

              return (<li key={status.key} className={classes && classes.userListSubheader ? classes.userListSubheader : ''}>
                <ul>
                  <ListSubheader>
                    <Paper style={{display: 'flex', justifyContent: 'flex-start', margin: self.props.theme.spacing.unit, padding: self.props.theme.spacing.unit }}>                      
                      <Avatar color="primary" style={{marginRight: self.props.theme.spacing.unit * 2}}><Icon>{status.icon}</Icon></Avatar>
                      <Typography color="primary" variant="caption" style={{marginLeft: 'auto'}}>{status.title}</Typography>                      
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

      const speedDialActions = [
        {
          key: 'add-new-delegate',
          title: 'Add Delegate',
          clickHandler: (evt)=>{
            this.addDelegateClicked();
          },
          icon: <Icon>group_add</Icon>
        },
        {
          key: 'send-invites',
          title: 'Send Invites',
          clickHandler: evt => {
            console.log('Send invites to all new charnas');
          },
          icon: <Icon>email</Icon>
        },
        {
          key: 'launch',
          title: 'Launch for delegates',
          clickHandler: evt => {
            console.log('Launch for selected charnas');
          },
          icon: <Icon>flight_takeoff</Icon>
        },
        {
          key: 'send-reminder',
          title: 'Send reminders',
          clickHandler: evt => {
            console.log('Launch for selected charnas');
          },
          icon: <Icon>alarm</Icon>
        },
        {
          key: 'close',
          title: 'Close for delegates',
          clickHandler: evt => {
            console.log('Launch for selected charnas');
          },
          icon: <Icon>close</Icon>
        },
        {
          key: 'send-feedback',
          title: 'Release feedback report',
          clickHandler: evt => {
            console.log('Launch for selected charnas');
          },
          icon: <Icon>assignment_turned_in</Icon>
        },
      ];

      return (
        <Paper className={this.props.classes.root}>
          {list} 
          {<SpeedDial actions={speedDialActions} icon={<Icon>golf_course</Icon>} />}
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
    root: {
      padding: theme.spacing.unit * 2
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


export const SurveyDelegatesComponent = compose(withApi, withTheme(), withStyles(SurveyDelegates.styles))(SurveyDelegates)


export default {
  SurveyDelegatesComponent,
  SurveyDelegateComponent
}


