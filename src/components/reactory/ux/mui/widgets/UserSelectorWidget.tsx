import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import objectMapper from 'object-mapper'
import { isArray, pullAt, find, isString, isObject } from 'lodash'
import {
  FormControl,
  Button,
} from '@mui/material';

import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';


class UserSelector extends Component<any, any> {
  
  static styles = (theme): any => ({
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
    formData: PropTypes.any,
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

  componentDefs: any

  constructor(props){
    super(props)
    this.state = {
      modal: false,
      selected: null,
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
          multiSelect={true}
          onUserSelect={userSelected}
          onNewUserClick={newUserClicked}
          selected={formData ? [formData.id]:[]}
          businessUnitFilter={true}
          showFilters={true} />
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
    if(typeof formData === "object" && formData.id) userId = formData.id;

    const modal = this.getModal();    

    const selectedCount = isArray(formData) ? formData.length : 0;

    return (
      <Fragment> 
        { modal }
        <Button onClick={showModal}>{selectedCount > 0 ? `${selectedCount} Reps Selected` : `No Reps Selected`}</Button>        
      </Fragment>
    )     
  }
}
const UserSelectorWidget = compose(
  withReactory,
  withTheme,
  withStyles(UserSelector.styles)
  )(UserSelector)
export default UserSelectorWidget
