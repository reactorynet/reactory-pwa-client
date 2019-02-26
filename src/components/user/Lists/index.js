import React from 'react'
import PropTypes from 'prop-types'
import {
  Avatar,
  IconButton,
  Icon,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,  
} from '@material-ui/core';
import { getAvatar } from '../../util';

export const UserListItem = (props) => {
  const { user, selected, key, onClick, message, secondaryAction } = props
  
  if(!user) {
    return (<ListItem button onClick={onClick} key={key}>
      <Avatar alt={"No user avaialble"} src={getAvatar(user)} />
      <ListItemText primary={"None"} secondary={ "User not set" }/>
    </ListItem>)
  }
  
  const displayText = `${user.firstName} ${user.lastName}`
  const hasMessage = typeof message === 'string'

  let secondaryComponent = null;
  if(secondaryAction) {
    secondaryComponent = (<ListItemSecondaryAction>{secondaryAction}</ListItemSecondaryAction>);
  }

  return (
    <ListItem selected={user.isSelected} onClick={onClick} key={key} className={props.className}>
      <Avatar alt={displayText} src={getAvatar(user)} />
      <ListItemText primary={ user.isNew ? 'NEW' : displayText} secondary={ hasMessage === true ? message : user.email }/>
      { secondaryComponent }
    </ListItem>
  )
}

UserListItem.propTypes = {
  key: PropTypes.string.isRequired,
  user: PropTypes.object,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  secondaryAction: PropTypes.object,
  onSecondaryItemClicked: PropTypes.func,
}

export default {
  UserListItem
}