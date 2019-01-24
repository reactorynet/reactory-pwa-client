import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import classnames from 'classnames';
import om from 'object-mapper';
import MaterialTable, { MTableToolbar } from 'material-table';
import { isArray, isFunction } from 'lodash';
import {
  Avatar,
  Paper,
  Typography,
  Toolbar,
  List,
  Icon, 
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@material-ui/core';
import gql from 'graphql-tag';
import { UserListItem } from '../../user/Lists';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import { nil } from '../../util';

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
    console.log('Rendering Survey Delegate Widget', { SurveyDelegateWidget, props });
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

  static styles = (theme) => {
    return {
      container: {
        'margin': 'auto',
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
  

  constructor(props, context){
    super(props, context)
    this.state = {
      activeEntry: null,
      modal: false,
      modalType: 'add',
      busy: false,
      message: '',
      activeTab: 'assessments'
    };
    this.componentDefs = props.api.getComponents([
      'core.ErrorMessage', 
      'towerstone.SurveyDelegateWidget', 
      'core.DropDownMenu', 
      'core.FullScreenModal',
      'core.BasicModal',
      'core.UserListWithSearch',
      'core.Profile',
      'core.AssessmentList',
    ]);
    this.getSecondaryAction = this.getSecondaryAction.bind(this)
    this.sendInviteEmails = this.sendInviteEmails.bind(this)
    this.launchSurvey = this.launchSurvey.bind(this)
    this.stopSurvey = this.stopSurvey.bind(this)
    this.generateReport = this.generateReport.bind(this)
    this.getDetailView = this.getDetailView.bind(this)
    this.getActiveModalView = this.getActiveModalView.bind(this)
    this.addDelegateClicked = this.addDelegateClicked.bind(this)

    this.sendCommunicationToDelegate = this.sendCommunicationToDelegate.bind(this)
    this.launchSurveyForDelegate = this.launchSurveyForDelegate.bind(this)
    this.removeDelegateFromSurvey = this.removeDelegateFormSurvey.bind(this)
    this.doAction = this.doAction.bind(this)
  }

  componentDidCatch(error, info){
    console.log('Error in SurveyDelegateWidget', {error, info})
  }

  getSecondaryAction(delegateEntry){
    const { DropDownMenu } = this.componentDefs;
    const onMenuItemSelect = (evt, menuItem) => {
      // console.log('trigger menu item', {menuItem, delegateEntry})
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
    console.log('Send Invite Emails', delegateEntry);    
  }

  launchSurvey(delegateEntry){
    console.log('Launch Survey', delegateEntry);
  }

  stopSurvey(delegateEntry){
    console.log('Stop Survey', delegateEntry);
  }

  addDelegate(delegateEntry){
    console.log('Show Delegate Add', delegateEntry);
  }

  generateReport(delegateEntry){
    console.log('Generate Report', delegateEntry);
  }

  getDetailView(delegateEntry){
    
    const { Profile, AssessmentList } = this.componentDefs
    const { activeTab, activeEntry } = this.state;
    console.log('Getting detailed view', activeEntry);

    const handleTabChange = (e, value) => {
      console.log('TabChange', {e, value});      
      this.setState({activeTab: value});
    }

    return (
      <Fragment>
        <Tabs value={activeTab} onChange={handleTabChange}>
           <Tab value="assessments" label="Assessments"/>
           <Tab value="user" label={`${activeEntry.delegate.firstName} Profile & Peers`}/>           
        </Tabs>
        { activeTab === 'assessments' && 
          <TabContainer>
            <AssessmentList assessments={activeEntry.assessments} />
          </TabContainer>
        }
        { activeTab === 'user' && 
          <TabContainer>
            <Profile profileId={activeEntry.delegate.id} withPeers={true} />
          </TabContainer> 
        }        
      </Fragment>
      )
  }

  getActiveModalView(){
    const { FullScreenModal, UserListWithSearch } = this.componentDefs;
    const { activeEntry, modal, modalType } = this.state;    
    const { formContext, formData, onChange, api } = this.props;

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
      console.log('variables for mutation', { variables, formContext, formData });
      const options = {};
      
                  
      api.graphqlMutation(gql(mutation), variables, options).then((result) => {
          console.log('Updated delegates', { result, variables });
        }).catch((err) => {
          console.error('Error in setting delegates for survey', { err, variables });
        });
      });
    }

    

    const userSelected = (userToAdd ) => {
      console.log('Add user to delegates', { userToAdd, p: this.props });
      let found = null;
      const entries = [];
      formData.map((delegateEntry) => {
        if(delegateEntry.delegate.id === userToAdd.id){
          //remove
          found = delegateEntry
        } else {
          entries.push(delegateEntry)
        }        
      });

      if(nil(found) === false) {
        entries.push({ ...found, removed: true })
      }

      if(isFunction(onChange) === true) onChange(entries)            
    };

    let component = null;

    switch(modalType){
      case 'add': {
        component = (
          <UserListWithSearch 
            organizationId={formContext.organizationId}
            multiSelect={true}
            onUserSelect={userSelected}
            onAcceptSelection={closeModal}
            selected={formData ? formData.map( e => e.delegate.id ): []}
            businessUnitFilter={false}
            showFilters={false} />)
        break;
      }
      case 'detail':
      default: {
        component = this.getDetailView();
        break;
      }
    }

    return (
      <FullScreenModal 
        open={this.state.modal === true} 
        onClose={closeModal} 
        title={ activeEntry && activeEntry.delegate ? `Assessment Details: ${activeEntry.delegate.firstName} ${activeEntry.delegate.lastName}` : `Waiting for selection...` }>
        {component}
      </FullScreenModal>
    )
  }

  addDelegateClicked(){
    this.setState({ modal: true, modalType: 'add' })
  }

  doAction(delegateEntry, action = 'send-invite', inputData = {}, busyMessage = 'Working...'){
    const { api, formContext } = this.props;
    const self = this;
    const mutation = gql(`mutation SurveyDelegateAction($entryId: String!, $survey: String!, $delegate: String!, $action: String!, $inputData: Any){
      surveyDelegateAction(entryId: $entryId, survey: $survey, delegate: $delegate, action: $action, inputData: $inputData){

      }
    }`);

    const variables = {
      survey: formContext.formData.id,
      entryId: delegateEntry.id,
      delegate: delegateEntry.delegate.id,
      action      
    };

    const doMutation = () => {
      api.graphqlMutation(mutation, variables).then((mutationResult) => {
        console.log('Any Result From Mutation', mutationResult)        
      }).catch((mutationError) => {
        self.setState({ displayError: true, message: 'An error occured while ....', busy: false })
      });
    }

    self.setState({ busy: true, message: busyMessage }, doMutation)    
  }

  sendCommunicationToDelegate(delegateEntry){
    this.doAction(delegateEntry, 'sendInvite', {}, `Sending invite to ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} for participation`);
  }

  launchSurveyForDelegate(delegateEntry){
    this.doAction(delegateEntry, 'launch', {}, `Launching surveys for delegate ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName}`);
  }

  removeDelegateFromSurvey(delegateEntry){
    this.doAction(delegateEntry, 'remove', {}, `Removing delegate ${delegateEntry.delegate.firstName} ${delegateEntry.delegate.lastName} from survey`);
  }

  render(){
    const { formData, classes, api } = this.props;
    const { ErrorMessage } = this.componentDefs;
    const self = this;
    let data = [];
    formData.map((entry) => ( data.push({...entry})));
    // console.log('Rendering SurveyDelegateWidget', data);
    if(isArray(formData) === true){
      return (
        <Paper>                    
          <MaterialTable
            columns={[
                {
                  title: 'Avatar', render: (rowData) => {
                    return rowData && rowData.delegate ? <Avatar src={api.getAvatar(rowData.delegate)} />  : 'No Delegate'
                  }
                },
                {
                    title: 'Delegate', render: (rowData) => {
                        return rowData && rowData.delegate ? `${rowData.delegate.firstName} ${rowData.delegate.lastName}`  : 'No Delegate'
                    }
                },
                {
                  title: 'Email', render: (rowData) => {
                      return rowData && rowData.delegate ? `${rowData.delegate.email}`  : 'No Delegate'
                  }
                },
                {
                    title: 'Status', render: (rowData) => {
                        return rowData && rowData.status ? rowData.status : 'New'
                    }
                },                
            ]}                    
            data={data}
            components={{
              Toolbar: props => {

                return (
                  <div>
                    <MTableToolbar {...props}/>
                    <Toolbar>
                      <IconButton color="primary" onClick={this.sendInviteEmails}><Icon>mail</Icon></IconButton>
                      <IconButton color="primary" onClick={this.launchSurvey}><Icon>flight_take_off</Icon></IconButton>
                      <IconButton color="primary" onClick={this.stopSurvey}><Icon>flight_land</Icon></IconButton>
                      <IconButton color="primary" onClick={this.addDelegateClicked}><Icon>add</Icon></IconButton>
                    </Toolbar>
                  </div>
                )
              },
            }}
            title="Delegates"
            actions={[
                rowData =>({
                    icon: 'search',
                    tooltip: 'Click to view details for the delegate',
                    disabled: rowData.status === 'complete',
                    onClick: (event, rowData) => {                      
                      self.setState({ activeEntry: rowData, modal: true, modalType: 'detail' })
                    },
                }),
                rowData => ({
                  icon: 'mail',
                  tooltip: 'Click to send invite',
                  disabled: rowData.status === 'complete',
                  onClick: (event, rowData) => {
                    console.log('Send invites for all confirmed delegates', rowData)
                    self.sendCommunicationToDelegate(rowData)
                  }
                }),
                rowData => ({
                  icon: 'flight_takeoff',
                  tooltip: 'Click to launch for delegate',
                  disabled: rowData.status === 'complete',
                  onClick: (event, rowData) => {
                    self.launchSurveyForDelegate(rowData)
                  }
                }),
                rowData => ({
                  icon: 'trash',
                  tooltip: 'Click to remove delegate from survey',
                  disabled: rowData.status !== 'new',
                  onClick: (event, rowData) => {
                    self.removeDelegateFromSurvey(rowData)
                  }
                })

            ]}/>         
          {self.getActiveModalView()}
        </Paper>
      )
    } else {
      return <ErrorMessage message="Expecting array data" />
    }
    
  }
}


export const SurveyDelegatesComponent = compose(withApi, withTheme(), withStyles(SurveyDelegates.styles))(SurveyDelegates)


export default {
  SurveyDelegatesComponent,
  SurveyDelegateComponent
}


