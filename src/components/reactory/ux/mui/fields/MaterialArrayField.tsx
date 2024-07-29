import React, { Fragment } from 'react';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';
import { pullAt } from 'lodash';
import {  
  Icon,
  IconButton,
  Typography,
  Card,
  Grid,  
  Paper,
  Toolbar,  
} from '@mui/material'

import MaterialArrayClassField from '../templates/MaterialArrayTemplate';

const Div = ({ children, ...props }) => { 
  return (
    <div {...props}>
      {children}
    </div>
  )
}

const Section = ({ children, ...props }) => { 
  return (
    <section {...props}>
      {children}
    </section>
  )
}

const Article = ({ children, ...props }) => { 
  return (
    <article {...props}>
      {children}
    </article>
  )
}

const Paragraph = ({ children, ...props }) => { 
  return (
    <p {...props}>
      {children}
    </p>
  )
}

const DEFAULT_OPTIONS: Reactory.Schema.IUISchemaOptions = { 
  container: 'Paper'
};

interface ArrayTemplateState {
  formData: any[],
  isDirty: boolean
  expanded: boolean[],
  selected: boolean[],
  onChangeTimer: any
}

interface ArrayTemplateProps<TData = Array<unknown>> {
  schema: Reactory.Schema.IArraySchema,
  uiSchema: Reactory.Schema.IUISchema,
  formContext: any,
  registry: {
    
  },
  formData?: TData
  idSchema: Reactory.Schema.IDSchema
  onChange: (formData: TData) => void
  [key: string]: any
}


const MaterialArrayField: React.FC<ArrayTemplateProps> = (props)=> {
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
    errorSchema,
    autofocus,
    onBlur,
    onFocus,
    idPrefix,
    onChange,      
  } = props;
  const reactory = useReactory();
  const [
    state, 
    setState
  ] = React.useState<ArrayTemplateState>({ formData, isDirty: false, expanded: [], selected: [], onChangeTimer: null });
  const uiOptions: Reactory.Schema.IUISchemaOptions | null = (uiSchema['ui:options'] as Reactory.Schema.IUISchemaOptions) || null
  const uiWidget: string | null = uiSchema['ui:widget'] || null;
  const utils = reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');
  const registry = utils.getDefaultRegistry();
  
  let Container: React.ComponentType<any> = null;
  let ArrayComponent: React.ComponentType<any> = null;
  let ArrayElementComponent: React.ComponentType<any> = null;

  const { container = 'none'} = uiSchema['ui:options'] as Reactory.Schema.IUISchemaOptions || DEFAULT_OPTIONS;
  const definitions = registry.definitions;
  

  let arrayComponentProps: any = {};
  if (uiWidget !== null) {
    if (!ArrayComponent && uiWidget.indexOf('.') > 0) {
      ArrayComponent = reactory.getComponent(uiWidget);
    } else {
      if (registry.widgets[uiWidget]) ArrayComponent = registry.widgets[uiWidget]
    } 
    
    if (uiOptions && uiOptions.componentProps) {  //map properties to the component
      Object.keys(arrayComponentProps).map(property => {
        arrayComponentProps[property] = formData[uiOptions.componentProps[property]]
      })
    }
  }

  

  const renderArrayFieldItem = (itemProps) => {
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
    } = itemProps;

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
      // this.onChangeForIndex(formData, index, errorSchema);
    }

    const expandForIndex = (index: number) => {
      ////console.log('Expand for index', index);
      // let $nextState = { ...this.state.expanded };
      // if($nextState && $nextState[index])
      // this.setState( { expanded: $nextState }, () => {
      //   that.startOnChangeTimer(index);
      // } );
    };

    const selectForIndex = (index: number) => {
      ////console.log('Select for index', index);
      //this.setState({ selected: { ...this.state.selected, index: selected[index] === true ? false : true } });
    }

    const SchemaField = registry.fields.SchemaField;
    const schemaFieldProps = {
      schema: itemSchema,
      uiSchema: itemUiSchema,
      formData: itemSchema.name === "$index" ? index : itemData,
      errorSchema: itemErrorSchema,
      idSchema: itemIdSchema,
      required: itemSchema.type !== "null" || itemSchema.type !== null,
      onChange: (formData: any, errorSchema: any) => {
        changeForIndex(formData, errorSchema);
      },
      onBlur: (id, e) => {
        if(onBlur) onBlur(id, e)
      },
      onFocus: (id, e) => {
        // formContext.$focus = id;
        if(onFocus) onFocus(id, e)
      },
      registry: registry,
      disabled: itemProps.disabled,
      readonly: itemProps.readonly,
      autofocus: autofocus,
      rawErrors: itemProps.rawErrors,
      formContext: itemProps.formContext,
      key: index
    };

    const deleteItemClick = () => {
      //console.log('deleting item');
      let items = [...formData];
      pullAt(items, [index])
      onChange([...items])
    }

    const onMoveUpClick = () => {

    }

    const onMoveDownClick = () => {

    }

    const onReorderClick = (index: number, direction: 'up' | 'down') => { 
      let items = [...formData];
      let item = items[index];
      pullAt(items, [index])
      if (direction === 'up') {
        items.splice(index - 1, 0, item);
      } else {
        items.splice(index + 1, 0, item);
      }
      onChange([...items])
    }

    const containerProps = {
      className: "array-item",
      disabled: props.disabled,
      draggable: true,
      //dragHandle: props.classes.dragHandle,
      hasToolbar: has.toolbar,
      toolbarPosition: "bottom",
      hasMoveUp: has.moveUp,
      hasMoveDown: has.moveDown,
      hasRemove: has.remove,
      expanded: state.expanded[index] === true,
      selected: state.selected[index] === true,
      onExpand: expandForIndex,
      onSelect: selectForIndex,
      index: index,
      onDropIndexClick: deleteItemClick,
      onReorderClick: onReorderClick,
      readonly: props.readonly
    }

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

  const children = formData?.map((item, index) => {                    
    let itemSchema = utils.retrieveSchema(schema.items, definitions, item);
    let itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
    let itemIdPrefix = idSchema.$id + "_" + index;
    // debugger
    let itemIdSchema = utils.toIdSchema(itemSchema, itemIdPrefix, definitions, item, idPrefix);
    return renderArrayFieldItem({
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
        selected: state.selected[index],
        exapanded: state.expanded[index],
      }   
    });
  });

  if (ArrayComponent === null) {      
    ArrayComponent = ({ children }) => (
      <Grid container spacing={2} item sm={12} md={12}>
        {children}        
      </Grid>)
  }

  switch(container) {
    case 'Fragment': { 
      Container = Fragment;
      break;
    }
    case 'Grid': {
      Container = Grid;
      break;
    }
    case 'Paper': {
      Container = Paper;
      break;
    }
    case 'Card': {
      Container = Card;
      break;
    }
    case 'div': {
      Container = Div;
      break;
    }
    case 'section': {
      Container = Section;
      break;
    }
    case 'article': {
      Container = Article;
      break;
    }
    case 'p': {
      Container = Paragraph;
      break;
    }
    default: {
      if ((container as string).indexOf('.') > 0) {
        Container = reactory.getComponent(container as string);
      }
      break;
    }
  }

  if (!Container) Container = Paper;

  let containerProps = {}
  // @ts-ignore
  return (
    <Container {...containerProps}>
      {children}
    </Container>
  );
};

export default MaterialArrayField;

//export default MaterialArrayClassField;