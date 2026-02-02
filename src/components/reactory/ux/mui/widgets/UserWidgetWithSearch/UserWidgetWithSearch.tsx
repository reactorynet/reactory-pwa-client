import React, { Fragment, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types'
import { compose } from 'redux'
import { styled, useTheme } from '@mui/material/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

const PREFIX = 'UserWidgetWithSearch';

const classes = {
  root: `${PREFIX}-root`,
  formControl: `${PREFIX}-formControl`,
  selectEmpty: `${PREFIX}-selectEmpty`,
};

const Root = styled('div')(({ theme }) => ({
  [`& .${classes.root}`]: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  [`& .${classes.formControl}`]: {
    minWidth: 120,
  },
  [`& .${classes.selectEmpty}`]: {
    marginTop: theme.spacing(2),
  },
}));

const UserWidgetWithSearch = (props: any) => {
  const theme = useTheme();
  const [modal, setModal] = useState(false);
  const [user, setUser] = useState(null);
  const [showNewUser, setShowNewUser] = useState(false);
  
  const componentDefs = useRef(null);

  useEffect(() => {
    componentDefs.current = props.api.getComponents([
      'core.Logo',
      'core.UserWithQuery',
      'core.FullScreenModal',
      'core.BasicDialog',
      'core.Profile',
      'core.UserListWithSearch',
      'core.CreateProfile', 
      'towerstone.SurveyDelegateWidget'
    ]);
  }, [props.api]);

  const getModal = () => {
    const { FullScreenModal, UserListWithSearch, BasicDialog, CreateProfile } = componentDefs.current;
    const { formContext, formData, onChange, uiSchema } = props;

    const closeModal = () => { 
      setModal(false);
    }    

    const userSelected = (user) => {
      setUser(user);
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

    let userlistProps: any = {
      organizationId: formContext.organizationId,
      multiSelect: false,
      onUserSelected: userSelected,
      onNewUserClick: newUserClicked,
      selected: formData ? [formData.id]:[],
      businessUnitFilter: false,
      showFilters: false,
    };

    if(uiSchema['ui:graphql']) {
      userlistProps.graphql = uiSchema['ui:graphql'];
      userlistProps.formContext = formContext;
      userlistProps.uiSchema = uiSchema;
      userlistProps.formData = formData;
    }

    return (
      <FullScreenModal open={modal === true} onClose={closeModal} title="Employees">
        <UserListWithSearch { ...userlistProps } />
      </FullScreenModal>
    )
  }
  
  const { UserWithQuery } = componentDefs.current || {};
  const { formData } = props;

  const showModal = () => {      
    setModal(!modal);
  }
  
  let userId = formData
  if(typeof formData === "object" && formData.id) userId = formData.id;

  const modalComponent = getModal();    
  
  return (
    <Root> 
      {modalComponent}
      <UserWithQuery userId={userId} onClick={showModal} />        
    </Root>     
  )
}

const UserWidgetWithSearchComponent = compose(
  withReactory
)(UserWidgetWithSearch)
export default UserWidgetWithSearchComponent
