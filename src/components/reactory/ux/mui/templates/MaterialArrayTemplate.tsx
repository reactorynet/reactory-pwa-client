import React, { Component, Fragment } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { makeStyles, withStyles, withTheme } from '@mui/styles';
import Draggable from 'react-draggable';
import { pullAt } from 'lodash';
// import { getDefaultFormState, retrieveSchema, toIdSchema, getDefaultRegistry } from '@reactory/client-core/components/reactory/form/utils';

import {
  AppBar,
  Button,
  Fab,
  Icon,
  IconButton,
  Typography,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  Input,
  Paper,
  Toolbar,
  Tooltip,
} from '@mui/material'

import { withReactory } from '@reactory/client-core/api/ApiProvider'
import { ReactoryFormUtilities } from 'components/reactory/form/types';

interface ArrayTemplateState {
  formData: any[],
  isDirty: boolean
  expanded: boolean[],
  selected: boolean[],
  onChangeTimer: any
}

interface ArrayTemplateProps {
  reactory: Reactory.Client.ReactorySDK,
  schema: Reactory.Schema.IArraySchema,
  uiSchema: Reactory.Schema.IUISchema,
  formContext: any,
  registry: any,
  formData?: any[]
  idSchema: Reactory.Schema.IDSchema
  [key: string]: any
}
class ArrayTemplate extends Component<ArrayTemplateProps, ArrayTemplateState> {

  static styles: any = (theme) => ({
    root: {
      padding: theme.spacing(1),
      minHeight: '200px',
    },
    appBar: {
      marginTop: theme.spacing(14),
      top: 'auto',
      bottom: 0,
    },
    dragHandle: {
      pointer: 'crosshair'
    },
    toolbar: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    arrayContainer: {

    },
    fabButton: {
      position: 'relative',
      right: 0,
      marginRight: theme.spacing(1),
      float: 'right'
    },
  })

  static defaultProps = {
    formData: []
  }

  registry: any;
  onReorderClick: any;
  utils: ReactoryFormUtilities;

  constructor(props: ArrayTemplateProps) {
    super(props)
    this.utils = props.reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');
    this.onAddClicked = this.onAddClicked.bind(this)
    this.renderNormalArray = this.renderNormalArray.bind(this)
    this.renderArrayFieldItem = this.renderArrayFieldItem.bind(this)
    this.registry = props.registry || this.utils.getDefaultRegistry();
    this.onChangeForIndex = this.onChangeForIndex.bind(this);
    this.startOnChangeTimer = this.startOnChangeTimer.bind(this);
    
    this.state = this.stateFromProps(props);    
  }

  stateFromProps(props: ArrayTemplateProps) {
    
    let $state: ArrayTemplateState = {
      formData: [],
      isDirty: false,
      expanded: [],
      selected: [],
      onChangeTimer: null
    };

    
    if(props.formContext.reactory.utils.lodash.isArray(props.formData) === true) {
      $state.formData = [...props.formData];
      $state.expanded = $state.formData.map(e => false);
      $state.selected = [...$state.expanded];
    }

    return $state;
  }

  // shouldComponentUpdate(nextProps: Readonly<ArrayTemplateProps>, nextState: Readonly<ArrayTemplateState>, nextContext: any): boolean {
  //   const { state, props } = this;
  //   const { reactory } = props.formContext;
  //   //the only time we return false is when our incoming formData is different from our internal state version.
  //   if(state?.formData?.length === nextProps?.formData?.length) {
  //     let isSame: boolean = true;
  //     state.formData.forEach((e, i) => {
  //       const f = nextProps.formData[i];
  //       const isEq = reactory.utils.deepEquals(e,f);
  //       if(isEq === false) {          
  //         isSame = false
  //       }
  //     });

  //     return !isSame;
  //   }

  //   if(state.)
    
  //   return true;
  // }

  /**
   * The event fired when clicking the add button on the array container
   * @param {React.SynthecticEvent} e 
   */
    onAddClicked(e) {
      
    const {
      formData = [], //The formData for this array - default to empty array in the event of the value being undefined 
      registry,
      schema,
      
    } = this.props;
    const newItem = this.utils.getDefaultFormState(schema.items, undefined, registry.definitions)

    let $formData = formData && formData?.length > 0 ? [...formData] : []

    $formData.push(newItem);
    this.props.onChange($formData)
  }

  onChangeForIndex(value, index, errorSchema) {
    //console.info('index item change', { index, value, errorSchema })
    //this.props.onChange(formData.map())
    const that = this;
    const newData = this.props.formData.map((item, idx) => {
      if (idx === index) {
        return { ...item, ...value };      
      } 
      return item;
    });

    //this.setState({ isDirty: true, formData: newData }, () => { that.startOnChangeTimer(index) });
    if (this.props.onChange) this.props.onChange(newData);
  }

  startOnChangeTimer(forIndex: number){
    if(this.state.onChangeTimer) {
      clearTimeout(this.state.onChangeTimer)
    }
    const that = this;
    const { onChange, formContext } = that.props;
    
    let timeoutId = setTimeout(() => {
      if(that.state.isDirty) {
        onChange(that.state.formData);
      }
    }, 1800);

    this.setState({ onChangeTimer: timeoutId });
  }

  renderArrayFieldItem(props) {
    
    const that = this;

    const {
      index,
      canMoveUp,
      canMoveDown,
      itemSchema,
      itemIdSchema,
      itemErrorSchema,
      itemData,
      itemUiSchema,
      autofocus,
      onBlur = () => {},
      onFocus = () => {},
      parentSchema,
    } = props;

    const {
      selected,
      expanded
    } = this.state
    ////console.log('Rendering array item', { props });

    let readOnly: boolean = parentSchema?.readonly === true;    
    let orderable: boolean = !readOnly && itemSchema?.readonly === false && (canMoveUp || canMoveDown);
    let removable: boolean = !readOnly && itemSchema?.readonly === false;    

    let itemUiOptions: any = { toolbar: !readOnly };
    if(itemUiSchema && itemUiSchema["ui:options"]) {
      itemUiOptions = { ...itemUiOptions, ...itemUiSchema["ui:options"]}
    }

    const has = {
      moveUp: orderable && canMoveUp,
      moveDown: orderable && canMoveDown,
      remove: removable,
      toolbar: itemUiOptions.toolbar === true
    };

    
    const changeForIndex = (formData, errorSchema) => {
      this.onChangeForIndex(formData, index, errorSchema);
    }

    const expandForIndex = (index: number) => {
      ////console.log('Expand for index', index);
      let $nextState = { ...this.state.expanded };
      if($nextState && $nextState[index])
      this.setState( { expanded: $nextState }, () => {
        that.startOnChangeTimer(index);
      } );
    };

    const selectForIndex = (index: number) => {
      ////console.log('Select for index', index);
      //this.setState({ selected: { ...this.state.selected, index: selected[index] === true ? false : true } });
    }

    const SchemaField = this.registry.fields.SchemaField;
    const schemaFieldProps = {
      schema: itemSchema,
      uiSchema: itemUiSchema,
      formData: itemSchema.name === "$index" ? index : itemData,
      errorSchema: itemErrorSchema,
      idSchema: itemIdSchema,
      required: itemSchema.type !== "null" || itemSchema.type !== null,
      onChange: changeForIndex,
      onBlur: (id, e) => {
        // formContext.$focus = null;
        if(onBlur) onBlur(id, e)
      },
      onFocus: (id, e) => {
        // formContext.$focus = id;
        if(onFocus) onFocus(id, e)
      },
      registry: this.registry,
      disabled: this.props.disabled,
      readonly: this.props.readonly,
      autofocus: autofocus,
      rawErrors: this.props.rawErrors,
      formContext: this.props.formContext,
      key: index
    };

    const deleteItemClick = () => {
      //console.log('deleting item');
      let items = [...this.props.formData];
      pullAt(items, [index])
      this.props.onChange([...items])
    }

    const onMoveUpClick = () => {

    }

    const onMoveDownClick = () => {

    }

    const containerProps = {
      className: "array-item",
      disabled: this.props.disabled,
      draggable: true,
      //dragHandle: props.classes.dragHandle,
      hasToolbar: has.toolbar,
      toolbarPosition: "bottom",
      hasMoveUp: has.moveUp,
      hasMoveDown: has.moveDown,
      hasRemove: has.remove,
      expanded: expanded[index] === true,
      selected: selected[index] === true,
      onExpand: expandForIndex,
      onSelect: selectForIndex,
      index: index,
      onDropIndexClick: deleteItemClick,
      onReorderClick: this.onReorderClick,
      readonly: this.props.readonly
    }

    //console.log('Rendering Default Array Container', { containerProps, schemaFieldProps, props });



    let toolbar = null
    if (has.toolbar) {
      toolbar = (
        <Toolbar>
          {has.moveUp === true ? <IconButton type="button" size="large"><Icon>keyboard_arrow_up</Icon></IconButton> : null}
          {has.moveDown === true ? <IconButton type="button" size="large"><Icon>keyboard_arrow_down</Icon></IconButton> : null}
          {has.remove === true ? <IconButton type="button" onClick={deleteItemClick} size="large"><Icon>delete_outline</Icon></IconButton> : null}
        </Toolbar>
      )
    }

    const gridProps: any = {
      key: index,
      item: true,
      xs: itemUiOptions?.size?.xs || 12,
      sm: itemUiOptions?.size?.sm || 12,
      md: itemUiOptions?.size?.md || 6,
      lg: itemUiOptions?.size?.lg || 3,
      xl: itemUiOptions?.size?.xl || 3,      
    };
    
    return (      
      <Grid {...gridProps}>
        <SchemaField {...schemaFieldProps} containerProps={containerProps} toolbar={toolbar}>
        </SchemaField>
        {toolbar}
      </Grid>
    )
  }

  renderNormalArray() {
    const {
      DescriptionField, //The DescriptionField from the registry (in case you wanted to utilize it)
      TitleField, //The TitleField from the registry (in case you wanted to utilize it).
      canAdd, //A boolean value stating whether new elements can be added to the array.
      className, //The className string.
      disabled, //A boolean value stating if the array is disabled.
      idSchema, //Object
      items, //An array of objects representing the items in the array. Each of the items represent a child with properties described below.
      onAddClick, //(event) => void, //A function that adds a new item to the array.
      readonly, //A boolean value stating if the array is read-only.
      required, //A boolean value stating if the array is required.
      schema, //The schema object for this array.
      uiSchema, //The uiSchema object for this array field.
      title, //A string value containing the title for the array.
      formContext, //The formContext object that you passed to Form.
      formData, //The formData for this array. 
      //classes,
      errorSchema,
      registry,
      autofocus,
      onBlur,
      onFocus,
      idPrefix,      
    } = this.props;

    const { utils } = this;
    
    const { reactory } = formContext;

    const classes = {
      root: ""
    };

    const { 
      //formData,
      isDirty,
      expanded,
      selected,
    } = this.state;
    
    const uiOptions: any = uiSchema['ui:options'] || null
    const uiWidget: string = uiSchema['ui:widget'] || null
    const definitions = registry.definitions;
    let ArrayComponent = null
    let componentProps: any = {};
    if (uiWidget !== null) {
      if (registry.widgets[uiWidget]) ArrayComponent = registry.widgets[uiWidget]
      if (!ArrayComponent && uiWidget.indexOf('.') > 0) {
        ArrayComponent = reactory.getComponent(uiWidget);
      }
      if (uiOptions && uiOptions.componentProps) {  //map properties to the component
        Object.keys(componentProps).map(property => {
          componentProps[property] = formData[uiOptions.componentProps[property]]
        })
      }
    }

    if (ArrayComponent === null) {
      
      ArrayComponent = (
        <Grid container spacing={2} item sm={12} md={12}>
          {formData && formData.map && formData.map((item, index) => {                    
            let itemSchema = utils.retrieveSchema(schema.items, definitions, item);
            let itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
            let itemIdPrefix = idSchema.$id + "_" + index;
            // debugger
            let itemIdSchema = utils.toIdSchema(itemSchema, itemIdPrefix, definitions, item, idPrefix);
            return this.renderArrayFieldItem({
              index: index,
              key: index,
              canMoveUp: index > 0,
              canMoveDown: index < formData.length - 1,
              itemSchema: itemSchema,
              itemIdSchema: itemIdSchema,
              itemErrorSchema: itemErrorSchema,
              itemData: item,
              formData: formData,
              parentSchema: schema,
              itemUiSchema: uiSchema.items,
              //@ts-ignore
              autofocus:  formContext.$focus === itemIdPrefix.$id || autofocus && index === 0,
              onBlur: onBlur,
              onFocus: onFocus,
              classes: {},
              itemMeta: {
                selected: selected[index],
                exapanded: expanded[index],
              }   
            });
          })}
          <Grid item justifyContent={'center'}>
            {!formData || (formData && formData.length === 0) && uiOptions?.allowAdd !== false ? <Typography>Create a new item by clicking the <Icon>add</Icon> icon</Typography> : null}
          </Grid>
        </Grid>)
    }

    let $children = null;

    if (ArrayComponent && ArrayComponent.$$typeof) {
      $children = ArrayComponent
    }

    if (typeof ArrayComponent === "function") {
      $children = (<ArrayComponent {...{ ...this.props, ...componentProps }} />)
    }

    const $label = uiOptions?.showLabel !== false && <Typography variant="body1">{schema.title}</Typography>;

    if (uiOptions && uiOptions.container) {
      //resolve Container from API
      let Container = null;
      if(uiOptions.container.indexOf('.') > 0) Container = reactory.getComponent(uiOptions.container)
      let containerProps = {}
      if (uiOptions.containerProps) {
        containerProps = { ...uiOptions.containerProps }
      }
      if (Container) {
        return (
          <Container {...containerProps}>
            {$children}
          </Container>);
      } else {

        switch(uiOptions.container) {
          case "div": {
            return (
              <div {...containerProps}>
                {$label}
                {$children}
              </div>);
          }
          case "p": {
            return (
              <p {...containerProps}>
                {$label}
                {$children}
              </p>);
          }
          case "section": {
            return (
              <section {...containerProps}>
                {$label}
                {$children}
              </section>);
          }
          case "article": {
            return (
              <article {...containerProps}>
                {$label}
                {$children}
              </article>);
          }
          default: {
            return (
              <Paper {...containerProps}>
                {$label}
                {$children}
              </Paper>);
          }
        }
      }
    } else {
      return (
        <Paper>
          {$label}
          {$children}          
        </Paper>
      );
    }
  }

  render() {
    return this.renderNormalArray();
  }
}

const MaterialArrayTemplate = withReactory(ArrayTemplate);

export default MaterialArrayTemplate;