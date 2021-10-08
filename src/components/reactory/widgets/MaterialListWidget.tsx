import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { getDefaultFormState, retrieveSchema, toIdSchema, getDefaultRegistry } from  '@reactory/client-core/components/reactory/form/utils';
import { pullAt, isNil, template, isString } from 'lodash';
import { useHistory } from 'react-router'
import { withRouter, Link } from 'react-router-dom';
import uuid from 'uuid';
import {
  Avatar,
  Fab,
  FormLabel,
  Icon,
  IconButton,  
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  ListItemIcon,
  ListSubheader,
  Typography,
  Switch,
  Checkbox
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

class MaterialListWidget extends Component<any, any> {

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
    uiSchema: PropTypes.object,
  }

  static defaultProps = {
    formData: [],
    readOnly: false
  }

  registry: any = null;

  constructor(props) {
    super(props)
    this.registry = props.registry || getDefaultRegistry();
    this.state = {

    };

  }


  render() {
    const self = this;
    const { api, history } = self.props;
    const uiOptions: any = this.props.uiSchema['ui:options'] || {};
    const { formData, schema, uiSchema, idSchema } = this.props;
    let columns = [];

    let data = [];
    if (formData && formData.length > 0) {
      formData.forEach(row => {
        data.push({ ...row })
      });
    }

    const widgetsBefore = [];
    const widgetsAfter = [];
    
    if(schema.title && isString(schema.title) && schema.title.length > 0) {
      widgetsBefore.push((<FormLabel key={`${idSchema.$id}_Label`}>{schema.title}</FormLabel>));
    }

    if(uiOptions.allowAdd === true) {

      const addItem = () => {        
        const newItem = getDefaultFormState(schema.items, undefined, self.registry.definitions)
        self.props.onChange([...formData, newItem])
      };

      widgetsAfter.push(
        (<Fab key={`${idSchema.$id}_add_array`} variant={"round"} color={"primary"} onClick={addItem}>
          <Icon>add</Icon>
        </Fab>)
      )
    }

    let listProps = uiOptions.listProps || {};

    return (
      <Fragment>
        {widgetsBefore}
        <List {...listProps}>
          {data.map((item, itemIndex) => {
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
            let iconProps = {
            };
            let icon = null;
            const iconPosition = uiOptions.iconPosition || 'left';
            //@ts-ignore
            if (uiOptions.iconStyle) iconProps.style = uiOptions.iconStyle;
            //mapped from field value
            if (hasIcon && typeof uiOptions.iconField === 'string') {
              let iconKey = 'info'; //default
              if (typeof uiOptions.iconFieldMap === 'object') {
                if (item[uiOptions.iconField]) {
                  // iconKey = uiOptions.iconFieldMap[formData[uiOptions.iconField]] || uiOptions.iconFieldMap.default;
                  iconKey = uiOptions.iconFieldMap[item[uiOptions.iconField]] || uiOptions.iconFieldMap.default;
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

              if (iconPosition === 'left') widgetsLeft.push(icon);
              if (iconPosition === 'right') widgetsRight.push(icon);
            }

            //plain icon
            if (hasIcon && icon === null && typeof uiOptions.icon === 'string') {
              icon = (
                <ListItemIcon>
                  <Icon {...iconProps}>{uiOptions.icon}</Icon>
                </ListItemIcon>
              );

              if (iconPosition === 'left') widgetsLeft.push(icon);
              if (iconPosition === 'right') widgetsRight.push(icon);
            }

            /** TEXT **/
            let listItemTextProps = {
              primary: "",
              secondary: ""
            };

            try {
              listItemTextProps.primary = template(uiOptions.primaryText || '${item.text || item.primaryText}')({ props: this.props, item });
            }
            catch (templateError) {
              listItemTextProps.primary = `Bad Template ${templateError.message}`
            }

            try {
              listItemTextProps.secondary = template(uiOptions.secondaryText || '${item.secondaryText}')({ props: this.props, item });
            }
            catch (templateError) {
              listItemTextProps.secondary = `Bad Template ${templateError.message}`;
            }



            /** AVATAR */

            const hasAvatar = typeof uiOptions.avatarField === 'string';

            if (uiOptions.showAvatar === true) {

              const listItemAvatarProps = {};
              let avatarPosition = uiOptions.avatarPosition ? uiOptions.avatarPosition : 'left';
              let avatar = null;
              if (hasAvatar === true) {
                let avatarIcon = null;

                if (uiOptions.avatarAltField) {
                  //@ts-ignore
                  listItemAvatarProps.src = item[uiOptions.avatarSrcField];
                  //@ts-ignore
                  listItemAvatarProps.alt = item[uiOptions.avatarAltField];
                }

                if (uiOptions.avatarIconField && item[uiOptions.avatarIconField]) {
                  if (typeof uiOptions.avatarIconMap === 'object') {
                    avatarIcon = (<Icon>{uiOptions.avatarIconMap[item[uiOptions.avatarIconField]]}</Icon>)
                  } else {
                    avatarIcon = (<Icon>{item[uiOptions.avatarIconField]}</Icon>)
                  }
                }

                avatar = (
                  <ListItemAvatar>
                    <Avatar {...listItemAvatarProps}>
                      {avatarIcon ? avatarIcon : listItemTextProps.primary.substring(0, 1)}
                    </Avatar>
                  </ListItemAvatar>
                );

                if (avatar && avatarPosition === 'left') widgetsLeft.push(avatar);
                if (avatar && avatarPosition === 'right') widgetsRight.push(avatar);
              }

            }

            /** DROP DOWN / ACTION BUTTON */

            if (uiOptions.secondaryAction) {
              let secondaryActionWidget = null;
              if (typeof (uiOptions.secondaryAction) === 'object') {
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

                const actionClick = () => {
                  api.log('Secondary Action Clicked For List Item', item, 'debug');
                  if (typeof action === 'string' && action.indexOf('event:') === 0) {
                    //raise an event via AMQ / the form
                    const eventName = action.split(':')[1];
                    history.push({ pathname: path })
                    self.props.api.emit(eventName, { actionData, path });
                  }
                };

                let componentToRender = (
                  <IconButton onClick={actionClick}>
                    <Icon>{iconKey}</Icon>
                  </IconButton>
                )

                if (typeof action === 'string' && action.indexOf('mount:') === 0) {
                  
                  
                  if (isNil(componentFqn) === false && componentFqn !== undefined) {
                    const SecondaryItemComponent = api.getComponent(componentFqn);                                        
                                        
                    let secondaryComponentProps = {
                      formData: item,
                      ...uiOptions.secondaryAction.props,
                      onChange: (updatedItem) => {
                        let newState = [...data];
                        newState[itemIndex] = { ...newState[itemIndex], ...updatedItem };
                        self.props.onChange(newState);
                      }                                           
                    };
                    
                    if(uiOptions.secondaryAction.propsMap) {
                      let outputObject = self.props.api.utils.objectMapper(this.props, uiOptions.secondaryAction.propsMap);
                      secondaryComponentProps = { ...secondaryComponentProps, ...outputObject };
                    }
                    // secondaryComponentProps.componentProps = this.props.api.utils.objectMapper(item, objectmapDefinition)
                    componentToRender = <SecondaryItemComponent {...secondaryComponentProps} />
                  }
                }

                secondaryActionWidget = (
                  <ListItemSecondaryAction key={`${idSchema.$id}.${itemIndex}.secondary_action`}>
                    {componentToRender}
                  </ListItemSecondaryAction>)
              }

              if (secondaryActionWidget) {
                uiOptions.secondaryActionPosition && uiOptions.secondaryActionPosition === 'left' ? widgetsLeft.push(secondaryActionWidget) : widgetsRight.push(secondaryActionWidget);
              }
            }


            /** SELECTED  */
            if (uiOptions.selectOptions) {
              let selectVariant = 'toggle'; //switch, checkbox, highlight
              let selectedField = uiOptions.selectOptions.selectedField || 'selected'; //

              let SelectedWidget = null;
              /*
              switch(selectedVariant) {
                case 'switch': {
                  SelectedWidget = <Switch  checked={formData["selectedField"] === true} onChange={} />
                  break;
                }
                case 'checkbox': {
                  SelectedWidget = <Checkbox />
                  break;
                }
              }
              */
            }

            /** Root Item Properties */
            const listItemProps = {
              id: item.id ? item.id : uuid(),
              key: `${idSchema.$id}.${itemIndex}`
            };

            if (uiOptions && typeof uiOptions.listItemStyle === 'object') {
              //@ts-ignore
              listItemProps.style = { ...uiOptions.listItemStyle };
            }

            if (uiOptions && typeof uiOptions.listItemSelectedStyle)

              if (uiOptions && uiOptions.variant === 'button') {
                //@ts-ignore
                listItemProps.button = true;
              }

            return (
              <ListItem {...listItemProps}>
                {widgetsLeft}
                <ListItemText {...listItemTextProps} />
                {widgetsRight}
              </ListItem>
            )
          })}
        </List>
        {widgetsAfter}
      </Fragment>
    )
  }
}

//@ts-ignore
const MaterialListWidgetComponent = compose(withApi, withRouter, withTheme, withStyles(MaterialListWidget.styles))(MaterialListWidget)
export default MaterialListWidgetComponent
