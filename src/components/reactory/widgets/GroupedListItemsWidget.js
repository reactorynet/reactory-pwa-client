
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { throttle, uniq } from 'lodash';
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
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';


class GroupListItemWidget extends Component {

  static styles = theme => ({
    root: {
      width: '85%',
    },
    slider: {
      padding: '22px 0px',
      margin: 'auto'
    },    
  });
  
  constructor(props, context) {
    super(props, context)
    this.state = {
        items: props.formData || [],
    }        
  }

  getGroups(){

  }

  render() {
    const { classes, uiSchema, schema } = this.props;
    const { value } = this.state;
    
    let options = {
      groupKey: 'group',

    };

    if(uiSchema['ui:options']) options = {...options, ...uiSchema['ui:options']}
    
    return (
      <List subheader={ <li /> }>

      </List>      
    );
  }
}

GroupListItemWidget.propTypes = {
  classes: PropTypes.object,
};

export const GroupListItemWidgetComponent = withStyles(GroupListItemWidget.styles)(GroupListItemWidget);
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
              </li>
              );    
            })
          }                
          </List>
 * 
 */