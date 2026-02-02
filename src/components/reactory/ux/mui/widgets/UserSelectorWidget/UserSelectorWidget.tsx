import React, { Fragment, useState, useEffect } from 'react'
import objectMapper from 'object-mapper'
import { isArray, pullAt, find, isString, isObject } from 'lodash'
import {
  FormControl,
  Button,
} from '@mui/material';

import { compose } from 'redux'
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';


const UserSelector = (props: any) => {
  const theme = useTheme();
  
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showNewUser, setShowNewUser] = useState(false);
  
  const componentDefs = props.api.getComponents([
    'core.Logo',
    'core.UserWithQuery',
    'core.FullScreenModal',
    'core.BasicDialog',
    'core.Profile',
    'core.UserListWithSearch',
    'core.CreateProfile',     
  ]);

  const getModal = () => {
    const { FullScreenModal, UserListWithSearch, BasicDialog, CreateProfile } = componentDefs;
    const closeModal = () => { 
      setModal(false);
    }
    const { formContext, formData, onChange, uiSchema } = props;

    const userSelected = (user) => {
      setSelected(user);
      onChange(user.id);
      closeModal();
    };

    const newUserClicked = () => {
      setShowNewUser(true);
    };

    let newUserModal = null;
    if(showNewUser === true) {
      newUserModal = (
      <BasicDialog open={showNewUser} title="New User">
        <CreateProfile avatarEnabled={false} />
      </BasicDialog>)
    }

    return (
      <FullScreenModal open={modal === true} onClose={closeModal} title="Employees">
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

  const { UserWithQuery, SurveyDelegateWidget } = componentDefs;
  const { formData, uiSchema } = props;

  const showModal = () => {      
    setModal(!modal);
  }
  let userId = formData
  if(typeof formData === "object" && formData.id) userId = formData.id;

  const modalElement = getModal();    

  const selectedCount = isArray(formData) ? formData.length : 0;

  return (
    <Fragment> 
      { modalElement }
      <Button onClick={showModal}>{selectedCount > 0 ? `${selectedCount} Reps Selected` : `No Reps Selected`}</Button>        
    </Fragment>
  );
};
export default UserSelector;
