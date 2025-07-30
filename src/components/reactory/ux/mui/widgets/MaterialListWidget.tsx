import React, { useEffect } from 'react';
import { isNil, template, isString } from 'lodash';
import { useNavigate } from 'react-router'

import * as uuid from 'uuid';
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
  Checkbox,
  Theme,
  Pagination
} from '@mui/material';

import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { compose } from 'redux';
import { withStyles, withTheme, makeStyles } from '@mui/styles';
import Reactory from '@reactory/reactory-core';
import { ReactoryFormUtilities } from 'components/reactory/form/types';


function LinkIconButton(link, icon) {
  let navigate = useNavigate();

  function handleClick() {
    navigate(link);
  }

  return (
    <IconButton onClick={handleClick} size="large">
      <Icon>{icon}</Icon>
    </IconButton>
  );
}

type MaterialListItemStyleFunction = (item: TAny, formContext: Reactory.Client.IReactoryFormContext<TAny>, index: number, items: TAny[]) => StyleSheet;
type MaterialListItemObjectValueProvider = (item: TAny, formContext: Reactory.Client.IReactoryFormContext<TAny>, index: number, items: TAny[]) => any;
type MaterialListItemStringValueProvider = (item: TAny, formContext: Reactory.Client.IReactoryFormContext<TAny>, index: number, items: TAny[]) => string;
interface IMaterialListWidgetOptions<T> {
  /**
   * String field template to use for primary text
   */
  primaryText?: string | MaterialListItemStringValueProvider,
  /**
   * String field template for secondary text
   */
  secondaryText?: string | MaterialListItemStringValueProvider,
  /**
   * String field template for avatar
   */
  avatar?: string | MaterialListItemStringValueProvider,

  /**
   * String field template for the avatar alt
   */
  avatarAlt?: string | MaterialListItemStringValueProvider,
  /**
   * position of the avatar
   */
  avatarPosition?: string | "right" | "left",
  /**
   * avatar source field. Use this field to specify which property 
   * should be used on the item as the source for the avatar
   */
  avatarSrcField?: string | MaterialListItemStringValueProvider,

  /**
   * The alt field name or provider function
   */
  avatarAltField?: string | MaterialListItemStringValueProvider,
  /**
   * Dropdown field / action button for the list item
   */
  dropdown?: string | MaterialListItemStringValueProvider,
  /**
   * Boolean to indicate if the list data must be 
   * fetched by the component
   */
  remoteData?: boolean,
  /**
   * variable map to use for the input
   */
  variables?: object,
  /**
   * Result map to use when converting the data
   */
  resultMap?: object,
  /**
   * Key to use for to extract the array from the result
   */
  resultKey?: string,
  /**
   * Properties to pass to the List object
   */
  listProps?: any,
  /**
   * The name of the query on the graphql definition
   */
  query?: string,
  /**
   * Pagination settings for the list item
   */
  pagination?: {
    /**
     * Page size 
     */
    pageSize?: 25,
    /**
     * the variant will determine how the paging is managed
     */
    variant?: string | "page" | "infinte",
    /**
     * The result key to use for extracting the pagination field
     */
    resultKey?: string,
    /**
     * Object map for mapping the result
     */
    resultMap?: any
  },
  /**
   * The icon property
   */
  icon?: string | MaterialListItemStringValueProvider,
  /**
   * Icon classname 
   */
  iconClassname?: string | MaterialListItemStringValueProvider,
  /**
   * The field name on the item to be referenced for the icon
   */
  iconField?: string | MaterialListItemStringValueProvider,
  /**
   * a map that is used to map the value in the item field
   * to an icon
   */
  iconFieldMap?: {
    [key: string]: string | MaterialListItemStringValueProvider
  },
  /**
   * Stylesheet for the icon formatting
   */
  iconStyle?: StyleSheet | MaterialListItemStyleFunction,
  /**
   * Position of icon
   */
  iconPosition?: string | "left" | "right",
  /**
   * any custom jss we want to use when creating the list item
   */
  jss?: any,
  /**
   * A custom component that we may want to use for the item instead of the default 
   * list item.
   */
  listItemsComponent?: string,

  secondaryAction?: {
    label?: string | MaterialListItemStringValueProvider,
    iconKey?: string | MaterialListItemStringValueProvider,
    componentFqn?: string | MaterialListItemStringValueProvider,
    component?: MaterialListItemObjectValueProvider,
    action?: string | MaterialListItemStringValueProvider,
    actionData?: any | MaterialListItemObjectValueProvider,
    link?: string | MaterialListItemStringValueProvider,
    props?: any,
    propsMap?: any
  },
  [key: string]: any
};

const DefaultListOptions: IMaterialListWidgetOptions<any> = {
  primaryText: "${item.title}",
  secondaryText: '${item.description}',
  remoteData: false,
  pagination: {
    pageSize: 25,
    variant: "page"
  }
}


type ListType<T> = T[]

interface IMateriaListWidgetProps<T> {
  reactory: Reactory.Client.ReactorySDK,
  formData: ListType<TAny>,
  schema: Reactory.Schema.IArraySchema,
  uiSchema: any,
  onChange: (formData: ListType<TAny>) => void,
  idSchema: {
    $id: string
  },
  history: any,
  theme: Theme,
  formContext: Reactory.Client.IReactoryFormContext<TAny>,
  registry: any,
}

interface TAny {
  id?: string,
  [key: string]: any
}

const DefaultPaging = {
  page: 1,
  pageSize: 25,
  hasNext: false,
  total: 0
}

//@ts-ignore
function MaterialListWidget<T>(props: IMateriaListWidgetProps<T>) {

  const { theme, history, formData, schema, uiSchema = {}, idSchema, reactory, formContext } = props;

  const getOptions = (): IMaterialListWidgetOptions<any> => {
    let uiOptions: any = uiSchema['ui:options'] || {};

    let _options = { ...DefaultListOptions, ...uiOptions };
    if (uiOptions.pagination) {
      _options.pagination = { ...DefaultListOptions.pagination, ...uiOptions.pagination }
    }

    return _options;
  }

  const utils = reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');

  const [data, setData] = React.useState<ListType<TAny>>(reactory.utils.lodash.isNil(formData) === true ? [] : formData);
  const [error, setError] = React.useState<string>(null);
  const [paging, setPaging] = React.useState<any>(DefaultPaging)
  const [listening, setListening] = React.useState<boolean>(false);
  const registry: any = props.registry || utils.getDefaultRegistry();
  const options: IMaterialListWidgetOptions<any> = getOptions();

  const getGraphDefinition = () => {
    if (formContext.graphql && formContext.graphql.queries && options.query) {
      return formContext.graphql.queries[options.query];
    }
  }

  const getRemoteData = () => { 

    if (formContext.graphql && formContext.graphql.queries && options.query) {
      const query = formContext.graphql.queries[options.query];
      let variables: any = {};


      if (options.variables || query.variables) variables = reactory.utils.objectMapper({ ...props, paging }, options.variables || query.variables)
      //@ts-ignore
      reactory.graphqlQuery(query.text, variables, { fetchPolicy: 'network-only' }).then(({ data, errors = [] }) => {
        if (errors.length > 0) {
          setError(`Could not all or some of the data, please try again`);
        }
        let _paging = { ...paging };
        
        if (data && data[query.name]) {
          let _formData = data[query.name];
          if (reactory.utils.lodash.isArray(_formData) === true) {
            if (options.resultMap || query.resultMap) {
              let result = reactory.utils.objectMapper(data[query.name], {}, options.resultMap || query.resultMap);
              if (reactory.utils.lodash.isArray(_formData) === true) _formData = result;
            } 
          } else {
            if (options.resultKey || query.resultKey) {
              _formData = data[query.name][options.resultKey || query.resultKey];
            }

            if (options.resultMap || query.resultMap && _formData) {
              //debugger
              let result = reactory.utils.objectMapper(_formData, {}, options.resultMap || query.resultMap);
              if (reactory.utils.lodash.isArray(_formData) === true) _formData = result;
              if(result.data) _formData = result.data;
              if(result.paging) _paging = result.paging;
            }

            if (options?.pagination?.resultKey) {
              _paging = data[options.resultKey]
            }

            if (options?.pagination?.resultMap) {
              _paging = reactory.utils.objectMapper(_paging, {}, options.pagination.resultMap);
            }

            if (JSON.stringify(paging) !== JSON.stringify(_paging)) {
              setPaging(_paging);
            }

          }

          setData(_formData);
        }
      }).then()
    }
  }


  let sheet = {
    root: {
      display: 'flex',
      justifyContent: 'center',
    },
    chip: {
      margin: theme.spacing(1),
    },
    newChipInput: {
      margin: theme.spacing(1)
    }
  };

  if (options.jss) {
    sheet = { ...sheet, ...options.jss };
  }

  const useStyles = makeStyles(sheet);

  const classes = useStyles(props)

  const widgetsBefore = [];
  const widgetsAfter = [];

  let uiTitle = uiSchema["ui:title"];

  if (schema.title && isString(schema.title) && schema.title.length > 0) {
    if (options.showTitle !== false) {
      widgetsBefore.push((<FormLabel className={classes[options.titleClass]} key={`${idSchema.$id}_Label`}>{reactory.i18n.t(uiTitle || options.title || schema.title)}</FormLabel>));
    }
  }

  if (options.allowAdd === true) {

    const addItem = () => {
      const newItem = utils.getDefaultFormState(schema.items, undefined, registry.definitions)
      if (props.onChange) props.onChange([...formData, newItem])
    };

    widgetsAfter.push(
      (<Fab key={`${idSchema.$id}_add_array`} variant={"circular"} color={"primary"} onClick={addItem}>
        <Icon>add</Icon>
      </Fab>)
    )
  }


  if (options.pagination) {
    if (options.pagination.variant === "page") {

      let pageCount = Math.floor((paging.total / (paging.pageSize || 25)));

      if ((pageCount * (paging.pageSize || 25) < paging.total)) pageCount += 1;


      const onPageChanged = (evt, page) => {
        setPaging({ ...paging, page });
      }

      widgetsAfter.push(<div style={{ display: 'flex', justifyContent: 'center' }}>
        <Pagination count={pageCount} page={paging.page} onChange={onPageChanged} shape="rounded" />
      </div>)
    }
  }

  useEffect(() => {

    if (options.remoteData === true) {
      getRemoteData();
      if (formContext.graphql && formContext.graphql.queries && options.query) {
        const query = formContext.graphql.queries[options.query];
        if (query.refreshEvents && query.refreshEvents.length > 0 && listening === false) {
          query.refreshEvents.forEach((e) => {
            reactory.on(e.name, getRemoteData)
          });
        }
      }
    }

    return () => {
      if (formContext.graphql && formContext.graphql.queries && options.query) {
        const query = formContext.graphql.queries[options.query];
        if (query.refreshEvents && query.refreshEvents.length > 0) {
          query.refreshEvents.forEach((e) => {
            reactory.removeListener(e.name, getRemoteData)
          });
        }
      }
    }
  }, [])

  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(props.formData)) {
      props.onChange(data);
    }
  }, [data])

  useEffect(() => {
    if (options.remoteData === true && options.pagination) {
      getRemoteData();
    }
  }, [paging.page])

  let listProps = options.listProps || {};

  let emptyListItem = null;
  if (data.length === 0 && options.showEmptyListItem !== false) emptyListItem = (<ListItem><ListItemText>{options.emptyListItemText || "No Data"}</ListItemText></ListItem>)
  return (
    <div className={classes[options.className]}>
      {widgetsBefore}
      <List {...listProps} className={classes[listProps.className || "list"]}>
        {emptyListItem}
        {data?.map && data.map((item: TAny, itemIndex) => {
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


          const hasIcon = reactory.utils.lodash.isNil(options.icon || options.iconField) === false;
          let iconProps = {};
          let icon = null;
          const iconPosition = options.iconPosition || 'left';
          //@ts-ignore
          if (options.iconStyle) iconProps.style = options.iconStyle;
          //mapped from field value
          if (hasIcon === true) {
            let iconKey: string = 'info'; //default
            let iconField: string = null;
            let iconFieldValue: string = null;

            if (typeof options.iconField === "function") {
              iconField = options.iconField(item, formContext, itemIndex, data);
            }

            if (typeof options.iconField === "string") {
              iconField = options.iconField;
            }

            if (reactory.utils.lodash.isNil(iconField) === false) {
              iconFieldValue = item[iconField];

              if (typeof options.iconFieldMap === 'object') {
                if (iconFieldValue) {
                  // iconKey = options.iconFieldMap[formData[options.iconField]] || options.iconFieldMap.default;
                  if (typeof options.iconFieldMap[iconFieldValue] === "function") {
                    //@ts-ignore
                    const f: MaterialListItemStringValueProvider<any> = options.iconFieldMap[iconFieldValue];
                    iconKey = f(item, formContext, itemIndex, data);
                  } else {
                    if (typeof options.iconFieldMap[iconFieldValue] === "string") {
                      //@ts-ignore
                      iconKey = options.iconFieldMap[iconFieldValue];
                    }
                  }

                  iconKey = iconKey || 'info';

                  icon = (
                    <ListItemIcon>
                      <Icon {...iconProps}>{iconKey}</Icon>
                    </ListItemIcon>
                  );
                } else {
                  if (options.iconFieldMap.default) {
                    if (typeof options.iconFieldMap.default === "function") {
                      iconKey = options.iconFieldMap.default(item, formContext, itemIndex, data);
                    } else {
                      iconKey = options.iconFieldMap.default;
                    }
                  }

                  iconKey = iconKey || 'info';
                }
              } else {
                iconKey = iconFieldValue || 'info';
              }
            } else {
              if (options.icon) {
                if (typeof options.icon === "function") {
                  iconKey = options.icon(item, formContext, itemIndex, data);
                } else {
                  iconKey = options.icon
                }
              }
            }

            icon = (
              <ListItemIcon>
                <Icon {...iconProps}>{iconKey}</Icon>
              </ListItemIcon>
            );


            if (iconPosition === 'left') widgetsLeft.push(icon);
            if (iconPosition === 'right') widgetsRight.push(icon);
          }

          //plain icon
          if (hasIcon && icon === null && typeof options.icon === 'string') {
            icon = (
              <ListItemIcon>
                <Icon {...iconProps}>{options.icon}</Icon>
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

          let $primaryText = '${item.text || item.primaryText}';
          let $secondaryText = '${item.description || item.secondaryText}';

          try {
            if (typeof options.primaryText === "string") $primaryText = options.primaryText;
            if (typeof options.primaryText === "function") $primaryText = options.primaryText(item, formContext, itemIndex, data);

            listItemTextProps.primary = template(reactory.i18n.t($primaryText))({ props: props, item, reactory, itemIndex, data });
          }
          catch (templateError) {
            reactory.log(`Error parsing primary text template ${$primaryText}`, { options });
            listItemTextProps.primary = `Bad Template ${templateError.message}`;
          }

          try {
            if (typeof options.secondaryText === "string") $secondaryText = options.secondaryText;
            if (typeof options.secondaryText === "function") $secondaryText = options.secondaryText(item, formContext, itemIndex, data);
            listItemTextProps.secondary = template($secondaryText)({ props: props, item, reactory });
          }
          catch (templateError) {
            reactory.log(`Error parsing secondary text template ${$secondaryText}`, { options });
            listItemTextProps.secondary = `Bad Template ${templateError.message}`;
          }


          /** AVATAR */
          const hasAvatar = reactory.utils.lodash.isNil(options.avatarSrcField || options.avatar) === false;
          if (options.showAvatar === true) {

            const listItemAvatarProps = {
              src: '',
              alt: ''
            };
            let avatarPosition = options.avatarPosition ? options.avatarPosition : 'left';
            let avatar = null;
            if (hasAvatar === true) {
              let avatarIcon: any = null;

              if (options.avatarSrcField) {
                //@ts-ignore
                listItemAvatarProps.src = item[options.avatarSrcField];
              }

              if (options.avatarAltField) {
                //@ts-ignore
                listItemAvatarProps.alt = item[options.avatarAltField];
              }

              if (options.avatarIconField && item[options.avatarIconField]) {
                if (typeof options.avatarIconMap === 'object') {
                  avatarIcon = (<Icon>{options.avatarIconMap[item[options.avatarIconField]]}</Icon>)
                } else {
                  avatarIcon = (<Icon>{item[options.avatarIconField]}</Icon>)
                }
              }

              if (options.avatar) {
                if (typeof options.avatar === "function") {
                  listItemAvatarProps.src = options.avatar(item, formContext, itemIndex, data);
                } else {
                  listItemAvatarProps.src = reactory.utils.template(options.avatar)({ ...props, item, itemIndex, data });
                }
              }

              if (options.avatarAlt) {
                if (typeof options.avatarAlt === "function") {
                  listItemAvatarProps.alt = reactory.utils.template(options.avatarAlt(item, formContext, itemIndex, data))({ ...props, item, itemIndex, data });
                } else {
                  listItemAvatarProps.alt = reactory.utils.template(options.avatarAlt)({ ...props, item, itemIndex, data });
                }
              }

              avatar = (
                <ListItemAvatar key={`${idSchema.$id}.avatar.${itemIndex}`}>
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
          if (options.secondaryAction) {
            let secondaryActionWidget = null;
            if (typeof (options.secondaryAction) === 'object') {
              const {
                label,
                iconKey,
                component,
                componentFqn,
                action,
                actionData,
                link
              } = options.secondaryAction;

              if (component && typeof component === "function") {
                secondaryActionWidget = component(item, formContext, itemIndex, data);
              } else {

                let secondaryActionIconKey = 'info'

                let $link: string = typeof link === "function" ?
                  link(item, formContext, itemIndex, data) :
                  link;

                const path = template($link)({ item, props: props, data });

                const actionClick = () => {
                  reactory.log('Secondary Action Clicked For List Item', item);
                  if (typeof action === 'string' && action.indexOf('event:') === 0) {
                    //raise an event via AMQ / the form
                    const eventName = action.split(':')[1];
                    history.push({ pathname: path })
                    reactory.emit(eventName, { actionData, path });
                  }
                };


                let componentToRender = (
                  <IconButton onClick={actionClick} size="large">
                    <Icon>{iconKey}</Icon>
                  </IconButton>
                )


                if (isNil(componentFqn) === false && componentFqn !== undefined) {
                  const SecondaryItemComponent = reactory.getComponent<any>(componentFqn as string);
                  
                  let secondaryComponentProps = {
                    formData: item,
                    ...options.secondaryAction.props,
                    onChange: (updatedItem) => {
                      let newState = [...data];
                      newState[itemIndex] = { ...newState[itemIndex], ...updatedItem };
                      props.onChange(newState);
                    }
                  };

                  if (options.secondaryAction.propsMap) {
                    let outputObject = reactory.utils.objectMapper({...props, item, data, itemIndex}, options.secondaryAction.propsMap);
                    secondaryComponentProps = { ...secondaryComponentProps, ...outputObject };
                  }

                  // secondaryComponentProps.componentProps = this.props.api.utils.objectMapper(item, objectmapDefinition)
                  componentToRender = <SecondaryItemComponent {...secondaryComponentProps} />
                }

                // if (typeof action === 'string' && action.indexOf('mount') === 0) {   
                // }

                secondaryActionWidget = (
                  <ListItemSecondaryAction key={`${idSchema.$id}.${itemIndex}.secondary_action`}>
                    {componentToRender}
                  </ListItemSecondaryAction>)

              }

              if (secondaryActionWidget) {
                options.secondaryActionPosition && options.secondaryActionPosition === 'left' ? widgetsLeft.push(secondaryActionWidget) : widgetsRight.push(secondaryActionWidget);
              }
            }

            
          }


          /** SELECTED  */
          if (options.selectOptions) {
            let selectVariant = 'toggle'; //switch, checkbox, highlight
            let selectedField = options.selectOptions.selectedField || 'selected'; //

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
            id: item.id ? item.id : uuid.v4(),
            key: `${idSchema.$id}.${itemIndex}`
          };

          if (options && typeof options.listItemStyle === 'object') {
            //@ts-ignore
            listItemProps.style = { ...options.listItemStyle };
          }

          if (options && typeof options.listItemSelectedStyle)

            if (options && options.variant === 'button') {
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
    </div>
  );
}

//@ts-ignore
const MaterialListWidgetComponent = compose(withReactory, withTheme)(MaterialListWidget)
export default MaterialListWidgetComponent
