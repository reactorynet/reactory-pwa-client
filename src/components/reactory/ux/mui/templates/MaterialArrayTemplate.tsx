import React, { useState, useEffect, useRef } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { styled, useTheme } from '@mui/material/styles';
import Draggable from 'react-draggable';
import { pullAt } from 'lodash';

import {  
  Icon,
  IconButton,
  Typography,
  Card,
  Grid2 as Grid,  
  Paper,
  Toolbar,  
} from '@mui/material'

import { withReactory } from '@reactory/client-core/api/ApiProvider'
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';
import Reactory from '@reactory/reactory-core';

interface ArrayTemplateProps<TData = Array<unknown>> {
  schema: Reactory.Schema.IArraySchema,
  uiSchema: Reactory.Schema.IUISchema,
  formContext: any,
  registry: Reactory.Forms.IReactoryFormUtilitiesRegistry,
  formData?: TData
  idSchema: Reactory.Schema.IDSchema
  onChange: (formData: TData) => void
  [key: string]: any
}

const PREFIX = 'MaterialArrayTemplate';

const classes = {
  root: `${PREFIX}-root`,
  appBar: `${PREFIX}-appBar`,
  dragHandle: `${PREFIX}-dragHandle`,
  toolbar: `${PREFIX}-toolbar`,
  arrayContainer: `${PREFIX}-arrayContainer`,
  fabButton: `${PREFIX}-fabButton`,
};

const Root = styled(Paper)(({ theme }) => ({
  [`& .${classes.root}`]: {
    padding: theme.spacing(1),
    minHeight: '200px',
  },
  [`& .${classes.appBar}`]: {
    marginTop: theme.spacing(14),
    top: 'auto',
    bottom: 0,
  },
  [`& .${classes.dragHandle}`]: {
    pointer: 'crosshair'
  },
  [`& .${classes.toolbar}`]: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  [`& .${classes.arrayContainer}`]: {
  },
  [`& .${classes.fabButton}`]: {
    position: 'relative',
    right: 0,
    marginRight: theme.spacing(1),
    float: 'right'
  },
}));

const MaterialArrayTemplate = (props: ArrayTemplateProps) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<any[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [expanded, setExpanded] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [onChangeTimer, setOnChangeTimer] = useState<any>(null);

  const registry = useRef<Reactory.Forms.IReactoryFormUtilitiesRegistry>();
  const utils = useRef<ReactoryFormUtilities>();

  useEffect(() => {
    if(props.formContext.reactory.utils.lodash.isArray(props.formData) === true) {
      setFormData([...props.formData]);
      setExpanded(props.formData.map(e => false));
      setSelected(props.formData.map(e => false));
    }
  }, [props.formData]);

  const onAddClicked = (e) => {
    const {
      formData = [],
      registry,
      schema,
    } = props;
    const newItem = utils.current.getDefaultFormState(schema.items, undefined, registry.definitions)

    let $formData = formData && formData?.length > 0 ? [...formData] : []

    $formData.push(newItem);
    props.onChange($formData)
  }

  const onChangeForIndex = (value, index, errorSchema) => {
    props.reactory.log('index item change', { index, value, errorSchema });
    const newData = props.formData.map((item, idx) => {
      if (idx === index) {
        if(typeof item === 'object') {
          return { ...item, ...value };      
        } else {
          return value;
        }
      } 
      return item;
    });

    if (props.onChange) props.onChange(newData);
  }

  const startOnChangeTimer = (forIndex: number) => {
    if(onChangeTimer) {
      clearTimeout(onChangeTimer)
    }
    
    let timeoutId = setTimeout(() => {
      if(isDirty) {
        props.onChange(formData);
      }
    }, 1800);

    setOnChangeTimer(timeoutId);
  }

  const renderArrayFieldItem = (props) => {
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
      onChangeForIndex(formData, index, errorSchema);
    }

    const expandForIndex = (index: number) => {
      let $nextState = { ...expanded };
      if($nextState && $nextState[index])
        setExpanded($nextState);
        startOnChangeTimer(index);
    };

    const selectForIndex = (index: number) => {
      // Select logic here
    }

    const SchemaField: React.FC<any> = registry.current.fields.SchemaField as React.FC;
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
        if(onFocus) onFocus(id, e)
      },
      registry: registry.current,
      disabled: props.disabled,
      readonly: props.readonly,
      autofocus: autofocus,
      rawErrors: props.rawErrors,
      formContext: props.formContext,
      key: index
    };

    const deleteItemClick = () => {
      let items = [...props.formData];
      pullAt(items, [index])
      props.onChange([...items])
    }

    const onMoveUpClick = () => {
      // Move up logic
    }

    const onMoveDownClick = () => {
      // Move down logic
    }

    const containerProps = {
      className: "array-item",
      disabled: props.disabled,
      draggable: true,
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
      onReorderClick: null,
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
        <SchemaField 
          {...schemaFieldProps} 
          containerProps={containerProps} 
          toolbar={toolbar}>
        </SchemaField>
        {toolbar}
      </Grid>
    )
  }

  const renderNormalArray = () => {
    const {
      DescriptionField,
      TitleField,
      canAdd,
      className,
      disabled,
      idSchema,
      items,
      onAddClick,
      readonly,
      required,
      schema,
      uiSchema,
      title,
      formContext,
      formData,
      errorSchema,
      registry,
      autofocus,
      onBlur,
      onFocus,
      idPrefix,      
    } = props;

    const { reactory } = formContext;
    
    const uiOptions: any = uiSchema['ui:options'] || null
    const uiWidget: string = uiSchema['ui:widget'] || null
    const definitions = (registry as Reactory.Forms.IReactoryFormUtilitiesRegistry).definitions;
    let ArrayComponent = null
    let componentProps: any = {};
    
    if (uiWidget !== null) {
      if (registry.widgets[uiWidget]) ArrayComponent = registry.widgets[uiWidget]
      if (!ArrayComponent && uiWidget.indexOf('.') > 0) {
        ArrayComponent = reactory.getComponent(uiWidget);
      }
      if (uiOptions && uiOptions.componentProps) {
        Object.keys(componentProps).map(property => {
          componentProps[property] = formData[uiOptions.componentProps[property]]
        })
      }
    }

    if (ArrayComponent === null) {
      ArrayComponent = (
        <Grid container spacing={2} size={{ xs: 12, sm: 12, md: 12 }}>
          {formData && formData.map && formData.map((item, index) => {                    
            let itemSchema = utils.current.retrieveSchema(schema.items, definitions, item);
            let itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
            let itemIdPrefix = idSchema.$id + "_" + index;
            let itemIdSchema = utils.current.toIdSchema(itemSchema, itemIdPrefix, definitions, item, idPrefix);
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
              autofocus: formContext.$focus === itemIdPrefix || autofocus && index === 0,
              onBlur: onBlur,
              onFocus: onFocus,
              classes: {},
              itemMeta: {
                selected: selected[index],
                exapanded: expanded[index],
              }   
            });
          })}
          <Grid size={{ xs: 12, sm: 12, md: 12 }} justifyContent={'center'}>
            {!formData || (formData && formData.length === 0) && uiOptions?.allowAdd !== false ? <Typography>Create a new item by clicking the <Icon>add</Icon> icon</Typography> : null}
          </Grid>
        </Grid>)
    }

    let $children = null;

    if (ArrayComponent && ArrayComponent.$$typeof) {
      $children = ArrayComponent
    }

    if (typeof ArrayComponent === "function") {
      $children = (<ArrayComponent {...{ ...props, ...componentProps }} />)
    }

    const $label = uiOptions?.showLabel !== false && <Typography variant="body1">{schema.title}</Typography>;

    if (uiOptions && uiOptions.container) {
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
        <Root>
          {$label}
          {$children}          
        </Root>
      );
    }
  }

  return renderNormalArray();
}

const MaterialArrayTemplateComponent = withReactory(MaterialArrayTemplate);

export default MaterialArrayTemplateComponent;