import React, { Fragment } from 'react';
import {
  Button,
  Icon,
  IconButton,
  Typography,
  Card,
  Box,
  Grid,
  Paper,
  Toolbar,
  Tooltip,
} from '@mui/material'
import { useReactory } from '@reactory/client-core/api/ApiProvider'
import { pullAt } from 'lodash';
import { 
  ArrayTemplateProps,
  ArrayTemplateState,
} from './types';
import { useRegistry } from '@reactory/client-core/components/reactory/form/components/hooks';
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';

const MaterialDefaultArrayField: Reactory.Forms.ReactoryArrayFieldComponent = (props) => {
  const {
    idSchema,
    schema,
    formData,
    errorSchema,
    uiSchema,
    canAdd,
    onAddClick,
    onChange,
    onBlur,
    onFocus,
    onKeyChange,
    autofocus,
    idPrefix,    
    rawErrors,
    className,
    formContext,
    disabled,
    readonly,
    required,
    style,
    id,
    jss,
    name,
    registry,
    definitions,
  } = props;
  const reactory = useReactory();
  const utils = reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');
  const { 
    DescriptionField,
    TitleField,
    ErrorField,
    Field
  } = useRegistry({
    idSchema: props.idSchema,
    schema: props.schema,
    formContext: props.formContext,
    uiSchema: props.uiSchema,
    formData: props.formData,
    disabled: props.disabled,
    errorSchema: props.errorSchema,
    rawErrors: props.rawErrors
  });

  const options: Reactory.Schema.IUIArrayFieldOptions = uiSchema['ui:options'] as Reactory.Schema.IUIArrayFieldOptions;
  const [
    state,
    setState
  ] = React.useState<ArrayTemplateState>({ 
    formData, 
    isDirty: false, 
    expanded: [], 
    selected: [], 
    onChangeTimer: null 
  });

  let visible = true;
  if (options?.hidden === true) visible = false;
  let buttons = null;
  if (props.uiSchema && props.uiSchema['ui:toolbar']) {
    buttons = props.uiSchema['ui:toolbar'].buttons.map((button) => {
      const onRaiseCommand = (evt) => {
        if (reactory) reactory.raiseFormCommand(button.command, button, { formData: props.formData, formContext: props.formContext });
      }
      return <Tooltip key={button.id} title={button.tooltip || button.id}><IconButton color={button.color || "secondary"} onClick={onRaiseCommand} size="large"><Icon>{button.icon}</Icon></IconButton></Tooltip>;
    });
  }


  const onChangeForIndex = (index) => {
    return (value, errorSchema) => {      
      const newFormData = formData.map((item, i) => {
        // We need to treat undefined items as nulls to have validation.
        // See https://github.com/tdegrunt/jsonschema/issues/206
        const jsonValue = typeof value === "undefined" ? null : value;
        return index === i ? jsonValue : item;
      });
      onChange(
        newFormData,
        errorSchema &&
        props.errorSchema && {
          ...props.errorSchema,
          [index]: errorSchema,
        }
      );
    };
  };

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
      onBlur = () => { },
      onFocus = () => { },
      parentSchema,
    } = itemProps;

    let readOnly: boolean = parentSchema?.readonly === true;
    let orderable: boolean = !readOnly && itemSchema?.readonly === false && (canMoveUp || canMoveDown);
    let removable: boolean = !readOnly && itemSchema?.readonly === false;

    let itemUiOptions: any = { toolbar: !readOnly };
    if (itemUiSchema && itemUiSchema["ui:options"]) {
      itemUiOptions = { ...itemUiOptions, ...itemUiSchema["ui:options"] }
    }

    const has = {
      moveUp: orderable && canMoveUp,
      moveDown: orderable && canMoveDown,
      remove: removable,
      toolbar: itemUiOptions.toolbar === true
    };


    const changeForIndex = (nextData, errorSchema) => {
      reactory.log('ArrayField changeForIndex', { formData, errorSchema });
      let $nextState: ArrayTemplateState = {
        ...state,
        formData: [...formData],
        isDirty: true
      };
      $nextState.formData[index] = nextData;
      setState($nextState);
      // onChange($nextState.formData);
    }

    const expandForIndex = (index: number) => {
      reactory.log('ArrayField expandForIndex', index);
      // let $nextState = { ...this.state.expanded };
      // if($nextState && $nextState[index])
      // this.setState( { expanded: $nextState }, () => {
      //   that.startOnChangeTimer(index);
      // } );
    };

    const selectForIndex = (index: number) => {
      reactory.log('Select for index', index);
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
      onBlur: () => {
        if (onBlur) onBlur()
      },
      onFocus: () => {
        // formContext.$focus = id;
        if (onFocus) onFocus()
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
        <SchemaField {...schemaFieldProps}>
        </SchemaField>
        {toolbar}
      </Grid>
    )
  }

  if (visible === false) return null
  return (
    <Box>
      <Toolbar variant="dense">
        <TitleField idSchema={props.idSchema} schema={props.schema} />
        {canAdd && (
          <IconButton
            onClick={props.onAddClick}
            disabled={props.disabled || props.readonly}
            style={{ float: 'right' }}
            color='secondary'
            size="large"><Icon>add</Icon></IconButton>
        )}
        {buttons}
      </Toolbar>
      <DescriptionField idSchema={props.idSchema} schema={props.schema} />
      <Fragment
        key={`array-item-list-${props.idSchema.$id}`}>
        {props.formData?.map((item, index) => {
          let itemSchema = utils.retrieveSchema(schema.items, definitions, item);
          let itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
          let itemIdPrefix = idSchema.$id + "_" + index;
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
            autofocus: formContext.$focus === itemIdPrefix.$id || autofocus && index === 0,
            onBlur: onBlur,
            onFocus: onFocus,
            onChange: onChangeForIndex(index),
            classes: {},
            itemMeta: {
              selected: state.selected[index],
              exapanded: state.expanded[index],
            }
          });
        })}
      </Fragment>
    </Box>
  );
}

export default MaterialDefaultArrayField;