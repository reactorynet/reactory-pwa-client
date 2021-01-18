import React from 'react'
import PropTypes from 'prop-types'
import {
  Avatar,
  Checkbox,
  IconButton,
  Icon,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,  
} from '@material-ui/core';
import {
  isNil
} from 'lodash';
import { getAvatar } from '../../util';

export const UserListItem = (props) => {
  const { user, selected, key, onClick, onSecondaryClick, message, secondaryAction, checkbox, onSelectChanged, primaryText, style = {}} = props
  
  if(!user) {
    return (<ListItem button onClick={onClick} key={key}>
      <Avatar alt={"No user avaialble"} src={getAvatar(user, `No user available`)} />
      <ListItemText primary={"None"} secondary={ "User not set" }/>
    </ListItem>)
  }
  
  const displayText = primaryText || `${user.firstName} ${user.lastName}`;
  const hasMessage = isNil(message) === false

  let secondaryComponent = null;
  if(secondaryAction) {
    secondaryComponent = (<ListItemSecondaryAction onClick={onSecondaryClick}>{secondaryAction}</ListItemSecondaryAction>);
  }

  let checkboxComponent = null;
  if(checkbox === true) {
    checkboxComponent = <Checkbox checked={selected === true} onChange={onSelectChanged} />
  }

  return (
    <ListItem selected={user.isSelected} onClick={onClick} key={key || user.id} className={props.className} style={style}>
      {checkboxComponent}
      <Avatar alt={displayText} src={getAvatar(user, `${user.firstName} ${user.lastName}`)} />
      <ListItemText primary={ displayText } secondary={ hasMessage === true ? message : user.email } style={{marginLeft: '8px'}}/>
      { secondaryAction }
    </ListItem>
  )
}

UserListItem.propTypes = {
  key: PropTypes.string.isRequired,
  user: PropTypes.object,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  onSelectChanged: PropTypes.func, 
  secondaryAction: PropTypes.object,
  onSecondaryItemClicked: PropTypes.func,
}

UserListItem.defaultProps = {
  onSelectChanged: () => {}
}

export default {
  UserListItem
}