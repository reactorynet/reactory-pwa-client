
import React, { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import { throttle, uniq } from 'lodash';
import { styled } from '@mui/material/styles';
import {  
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  FormControl,
  InputLabel,
  Input,
  InputAdornment,
  IconButton,
  Icon,
} from '@mui/material';
import { compose } from 'redux';

const PREFIX = 'GroupListItemWidget';

const classes = {
  root: `${PREFIX}-root`,
  slider: `${PREFIX}-slider`,
};

const Root = styled('div')(({ theme }) => ({
  [`& .${classes.root}`]: {
    width: '85%',
  },
  [`& .${classes.slider}`]: {
    padding: '22px 0px',
    margin: 'auto'
  },    
}));

const GroupListItemWidget = (props: any) => {
  const [items, setItems] = useState(props.formData || []);

  const getGroups = () => {
    // Implementation for getting groups
  };

  const { uiSchema, schema } = props;
  
  let options = {
    groupKey: 'group',
  };

  if(uiSchema['ui:options']) options = {...options, ...uiSchema['ui:options']}
  
  return (
    <Root>
      <List subheader={ <li /> }>
        {/* List content will go here */}
      </List>      
    </Root>
  );
}

export const GroupListItemWidgetComponent = compose()(GroupListItemWidget);
export default GroupListItemWidgetComponent

/***
 * 
 * 
 * <List subheader={ <li /> }>
          { 
            availableAlphabet.map( ( letter, index ) => {
              return (
              <li key={letter} className={classes && classes.userListSubheader ? classes.userListSubheader : ''}>
                <ul>
                  <ListSubheader>{letter}</ListSubheader>
                  {
                    filter(users, user => user.firstName.substring(0,1).toUpperCase() === letter).map((user, uid) => {
                    const raiseUserSelected = () => {
                      if(onUserSelect) onUserSelect(user, uid)
                    }
                    
                    const raiseUserChecked = () => {
                      if(onUserSelect) onUserSelect(user, uid, { toggle: true })
                    }


                    const nilf = () => {};
                    const isSelected = intersection(selected, [user.id]).length === 1;
                    const exclude = intersection(excluded, [user.id]).length === 1;
                    const displayText = `${user.firstName} ${user.lastName}`;

                    if(exclude === true) return null;
                                                          
                    return (
                      <ListItem selected={isSelected} onClick={ multiSelect === false ? raiseUserSelected : nilf  } dense button key={uid}>
                        <Avatar alt={displayText} src={getAvatar(user)} onClick={ raiseUserSelected } />
                        <ListItemText primary={ user.__isnew ? 'NEW' : displayText} onClick={ raiseUserSelected } secondary={ user.__isnew ? 'Click here to add a new user / employee' : user.email}/>                  
                        { multiSelect === true ? 
                        <Checkbox
                          checked={isSelected}
                          tabIndex={-1}
                          disableRipple
                          onClick={raiseUserChecked}
                          /> : null }
                        { isFunction(secondaryAction) === true ? 
                          secondaryAction(user) : 
                          secondaryAction }
                      </ListItem>
                    )
                  })
                }
                </ul>                  
              </li>);    
            })
          }                
          </List>
 * 
 */