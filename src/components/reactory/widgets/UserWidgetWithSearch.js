import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import objectMapper from 'object-mapper'
import { pullAt, find, isString, isObject } from 'lodash'
import {
  FormControl,
} from '@material-ui/core';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import * as utils from '../../util';

class UserWidgetWithSearch extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  });

  static propTypes = {
    formData: PropTypes.string,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: null,
    readOnly: false
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      modal: false,
      user: null,
      showNewUser: false,
    };
    this.getModal = this.getModal.bind(this);
    this.componentDefs = props.api.getComponents([
      'core.Logo',
      'core.UserWithQuery',
      'core.FullScreenModal',
      'core.BasicDialog',
      'core.Profile',
      'core.UserListWithSearch',
      'core.CreateProfile', 
      'towerstone.SurveyDelegateWidget'
    ])
  }

  getModal(){
    const that = this;
    const { FullScreenModal, UserListWithSearch, BasicDialog, CreateProfile } = this.componentDefs;
    const { showNewUser } = this.state;
    const closeModal = () => { 
      this.setState({modal: false});
      this.forceUpdate();
    }
    const { formContext, formData, onChange, uiSchema } = this.props;

    const userSelected = (user) => {
      this.setState({ user }, ()=>{
        onChange(user.id)
        closeModal()
      })
    };

    const newUserClicked = () => {
      that.setState({ showNewUser: true });
    };

    let newUserModal = null;
    if(showNewUser === true) {
      newUserModal = (
      <BasicDialog open={showNewUser} title="New User">
        <CreateProfile avatarEnabled={false} />
      </BasicDialog>)
    }

    return (
      <FullScreenModal open={this.state.modal === true} onClose={closeModal} title="Employees">
        <UserListWithSearch 
          organizationId={formContext.organizationId}
          multiSelect={false}
          onUserSelect={userSelected}
          onNewUserClick={newUserClicked}
          selected={formData ? [formData.id]:[]}
          businessUnitFilter={false}
          showFilters={false} />
      </FullScreenModal>
    )
  }

  render(){
    //console.log('rendering User Widget with search');
    const self = this
    const { UserWithQuery, SurveyDelegateWidget } = this.componentDefs;
    const { formData, uiSchema } = this.props;

    const showModal = () => {      
      self.setState({ modal: !self.state.modal })
    }
    let userId = formData
    if(isObject(formData) && formData.id) userId = formData.id;

    const modal = this.getModal();    
    return (
      <Fragment> 
        {modal}
        <UserWithQuery userId={userId} onClick={showModal} />        
      </Fragment>
    )     
  }
}
const UserWidgetWithSearchComponent = compose(
  withApi,
  withTheme,
  withStyles(UserWidgetWithSearch.styles)
  )(UserWidgetWithSearch)
export default UserWidgetWithSearchComponent
