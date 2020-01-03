import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types'
import { pullAt, isNil, template } from 'lodash';
import { withRouter, Link } from 'react-router-dom';
import uuid from 'uuid';
import {
  Avatar,
  Icon,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  ListItemIcon,
  ListSubheader,
  Typography 
} from '@material-ui/core';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { compose } from 'redux';
import { withStyles, withTheme } from '@material-ui/core/styles';


function LinkIconButton(link, icon) {
  let history = useHistory();

  function handleClick() {
    history.push(link);
  }

  return (
    <IconButton onClick={handleClick}>
      <Icon>{icon}</Icon>  
    </IconButton>
  );
}

class MaterialListWidget extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    chip: {
      margin: theme.spacing(1),
    },
    newChipInput: {
      margin: theme.spacing(1)
    }
  });

  static propTypes = {
    formData: PropTypes.array,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: [],
    readOnly: false
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      
    };

  }


  render(){
    const self = this;
    const { api, history } = self.props;
    const uiOptions = this.props.uiSchema['ui:options'] || {};
    const { formData } = this.props;
    let columns = [];
        
    
    let data = [];
    if(formData && formData.length) {
      formData.forEach( row => {
        data.push({...row})
      });
    }

    let listProps = uiOptions.listProps || {};

    return (

        <List {...listProps}>
          {data.map( item => {
            //Create a list item entry using the uiOptions for the widget

            const widgetsLeft = []; //widgets to render left of text
            const widgetsRight = []; //widgets to render right of text

            /*
              ** ICON MANAGEMENT **
              iconField: 'actionType',
              iconFieldMap: {
                'default': 'history',
                'client-visit': 'face',
                'email': 'email',
                'follow-up-call': 'voicemail',
              },
              iconStyle,
              iconPosition: 'left' || 'right'
            */

            const hasIcon = typeof uiOptions.icon === 'string' || typeof uiOptions.iconField === 'string';
            let iconProps = {};
            let icon = null;
            const iconPosition = uiOptions.iconPosition || 'left';
        
            if(uiOptions.iconStyle) iconProps.style = uiOptions.iconStyle;
     
            //mapped from field value
            if(hasIcon && typeof uiOptions.iconField === 'string') {
              let iconKey = 'info'; //default
              if(typeof uiOptions.iconFieldMap === 'object'){
                if(item[uiOptions.iconField]) {
                  iconKey = uiOptions.iconFieldMap[formData[uiOptions.iconField]] || uiOptions.iconFieldMap.default;
                  iconKey = iconKey || 'info';
                  
                  icon = (
                    <ListItemIcon>
                      <Icon {...iconProps}>{iconKey}</Icon>
                    </ListItemIcon>
                  );
                } else {
                  iconKey = uiOptions.iconFieldMap.default;
                  iconKey = iconKey || 'info';                  
                  icon = (
                    <ListItemIcon>
                      <Icon {...iconProps}>{iconKey}</Icon>
                    </ListItemIcon>
                  );
                  // api.log('Filed Mapping for Icon on Widget has no field on object matching the name', {item, props: this.props}, 'warning');
                }
              } else {
                iconKey = item[uiOptions.iconField] || 'info';

                icon = (
                  <ListItemIcon>
                    <Icon {...iconProps}>{iconKey}</Icon>
                  </ListItemIcon>
                );
              }
                      
              if(iconPosition === 'left') widgetsLeft.push(icon);
              if(iconPosition === 'right') widgetsRight.push(icon);
            }

            //plain icon
            if(hasIcon && icon === null && typeof uiOptions.icon === 'string') {
              icon = (
                <ListItemIcon>
                  <Icon {...iconProps}>{uiOptions.icon}</Icon>
                </ListItemIcon>
              );

              if(iconPosition === 'left') widgetsLeft.push(icon);
              if(iconPosition === 'right') widgetsRight.push(icon);
            }

            /** TEXT **/          
            let listItemTextProps = {
              primary: "",
              secondary: ""
            };            
            
            try 
            {
              listItemTextProps.primary = template(uiOptions.primaryText || '${item.text || item.primaryText}')({ props: this.props, item });
            } 
            catch (templateError) 
            { 
              listItemTextProps.primary = `Bad Template ${templateError.message}`
            }
            
            try 
            {
              listItemTextProps.secondary = template(uiOptions.secondaryText || '${item.secondaryText}')({ props: this.props, item });
            } 
            catch (templateError) 
            {
              listItemTextProps.secondary = `Bad Template ${templateError.message}`;
            }
            
            
            
            /** AVATAR */

            const hasAvatar = typeof uiOptions.avatarField === 'string';
            
            if(uiOptions.showAvatar === true) {

              const listItemAvatarProps = {};
              let avatarPosition = uiOptions.avatarPosition ? uiOptions.avatarPosition : 'left';
              let avatar = null;
              if(hasAvatar === true) {
                let avatarIcon = null;

                if(uiOptions.avatarAltField) {
                  listItemAvatarProps.src = item[uiOptions.avatarSrcField]; 
                  listItemAvatarProps.alt = item[uiOptions.avatarAltField];
                }
                
                if(uiOptions.avatarIconField && item[uiOptions.avatarIconField]) {
                  if(typeof uiOptions.avatarIconMap === 'object') {
                    avatarIcon = (<Icon>{uiOptions.avatarIconMap[item[uiOptions.avatarIconField]]}</Icon>) 
                  } else {
                    avatarIcon = (<Icon>{item[uiOptions.avatarIconField]}</Icon>)
                  }                                
                }
                              
                avatar = (
                  <ListItemAvatar>
                    <Avatar {...listItemAvatarProps}>
                    {avatarIcon ? avatarIcon : listItemTextProps.primary.substring(0,1)}
                    </Avatar>
                  </ListItemAvatar>
                )

                if(avatar && avatarPosition === 'left') widgetsLeft.push(avatar)
                if(avatar && avatarPosition === 'right') widgetsRight.push(avatar)                
              }

            }
                                                            
            /** DROP DOWN / ACTION BUTTON */
            
            if(uiOptions.secondaryAction) {
              let secondaryActionWidget = null;                            
              if(typeof(uiOptions.secondaryAction) === 'object') {
                const { 
                  label, 
                  iconKey,
                  componentFqn,                   
                  action,
                  actionData,
                  link
                } = uiOptions.secondaryAction;
                let secondaryActionIconKey = 'info'
                const path = template(link)({ item, props: this.props });

                const actionClick = ()=>{
                  api.log('Secondary Action Clicked For List Item', item, 'debug');
                  if(typeof action === 'string' && action.indexOf('event:')  === 0){
                    //raise an event via AMQ / the form 
                    const eventName = action.split(':')[1];
                    history.push({ pathname: path })
                    api.emit(eventName, { actionData, path });                    
                  }                                    
                };
                
                let componentToRender = (
                  <IconButton onClick={actionClick}>                      
                    <Icon>{iconKey}</Icon>                                            
                  </IconButton>       
                )

                if(typeof action === 'string' && action.indexOf('mount:')  === 0){
                  if(isNil(componentFqn) === false && componentFqn !== undefined) {
                    const SecondaryItemComponent = api.getComponent(componentFqn);
                    let objectmapDefinition = uiOptions.secondaryAction.props.componentProps || {}
                    const secondaryComponentProps = {
                      formData: item,
                      ...uiOptions.secondaryAction.props                                            
                    };
                    debugger;

                    //secondaryComponentProps.componentProps = this.props.api.utils.objectMapper(item, objectmapDefinition)

                    componentToRender = <SecondaryItemComponent { ...secondaryComponentProps } />                    
                  }
                }
                

                
                secondaryActionWidget = (
                  <ListItemSecondaryAction>                    
                    {componentToRender}                     
                  </ListItemSecondaryAction>)
              }
                                                                 
              if(secondaryActionWidget) {
                uiOptions.secondaryActionPosition && uiOptions.secondaryActionPosition === 'left' ? widgetsLeft.push(secondaryActionWidget) : widgetsRight.push(secondaryActionWidget);                                  
              }
            }

            
            /** Root Item Properties */
            const listItemProps = {
              id: item.id ? item.id : uuid(),              
            };

            if(uiOptions && typeof uiOptions.listItemStyle === 'object') {
              listItemProps.style = { ...uiOptions.listItemStyle };
            }

            if(uiOptions && uiOptions.variant === 'button') {
              listItemProps.button = true;
            }
            
            return (
              <ListItem {...listItemProps}>                
                { widgetsLeft }
                <ListItemText {...listItemTextProps} />
                { widgetsRight }
              </ListItem>
            )
          })}
        </List>
    )
  }
}
const MaterialListWidgetComponent = compose(withApi, withRouter, withTheme, withStyles(MaterialListWidget.styles))(MaterialListWidget)
export default MaterialListWidgetComponent
