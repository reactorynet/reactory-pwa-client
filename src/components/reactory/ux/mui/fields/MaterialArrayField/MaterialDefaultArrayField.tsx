import React, { Fragment, useCallback, useState } from 'react';
import {
  Button,
  Icon,
  IconButton,
  Typography,
  Card,
  Box,
  Grid2,
  Paper,
  Toolbar,
  Tooltip,
  Accordion,
  List,
  ListItem,
  Stack,
} from '@mui/material'

import {
  Div,
  Section,
  Article,
  Paragraph
} from '@reactory/client-core/components/reactory/ux/mui/fields/HtmlContainers'

import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useReactory } from '@reactory/client-core/api/ApiProvider'
import { pullAt } from 'lodash';
import { 
  ArrayTemplateProps,
  ArrayTemplateState,
} from './types';
import { useRegistry } from '@reactory/client-core/components/reactory/form/components/hooks';
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';


const DEFAULT_OPTIONS: Reactory.Schema.IUISchemaOptions = {
  container: 'Grid',
  showToolbar: true,
  toolbarPosition: 'top', 
  toolbarVariant: 'dense',
  toolbarColor: 'default',
  toolbarSize: 'medium',
  toolbarAlign: 'right',
  buttons: [],
  containerProps: {
    size: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    spacing: 2,
    rowSpacing: 2,
    columnSpacing: 2,
    sx: {
      alignItems: 'stretch',
      justifyContent: 'flex-start',          
    },
    // wrap: 'wrap',
  },
  itemsContainer: 'Grid',
  itemsContainerProps: {
    container: true,
    size: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    spacing: 2,
    rowSpacing: 2,
    columnSpacing: 2,
    sx: {
      alignItems: 'stretch',
      justifyContent: 'flex-start',          
    },
    // wrap: 'wrap',  
  },
  itemProps: {
    size: { xs: 12, sm: 12, md: 6, lg: 4, xl: 3 },
  },
  allowAdd: true,
  allowDelete: true,
  allowReorder: true,
  enableDragAndDrop: true,
  dragDirection: 'vertical',
  showLabel: true,
  hidden: false,
  disableGutters: false,
  margin: 'normal',
  padding: 'normal', 
  showTitle: true,
  showDescription: true,
};

const MaterialDefaultArrayField: Reactory.Forms.ReactoryArrayFieldComponent = (props) => {
  const {
    idSchema,
    schema,
    formData = [],
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

  // Merge default options with provided options
  const options: Reactory.Schema.IUIArrayFieldOptions = {
    ...DEFAULT_OPTIONS,
    ...(uiSchema['ui:options'] as Reactory.Schema.IUIArrayFieldOptions || {})
  };

  const visible = !(options?.hidden === true);
  let buttons = null;
  if (props.uiSchema && props.uiSchema['ui:toolbar']) {
    buttons = props.uiSchema['ui:toolbar'].buttons.map((button) => {
      const onRaiseCommand = (evt) => {
        if (reactory) reactory.raiseFormCommand(button.command, button, { formData: props.formData, formContext: props.formContext });
      }
      return <Tooltip key={button.id} title={button.tooltip || button.id}><IconButton color={button.color || "secondary"} onClick={onRaiseCommand} size="large"><Icon>{button.icon}</Icon></IconButton></Tooltip>;
    });
  }


  // Handle item changes
  const onChangeForIndex = useCallback((index: number) => {
    return (value: any, errorSchema?: any) => {      
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
  }, [formData, onChange, props.errorSchema]);

  // Handle drag and drop reordering
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) {
      return;
    }

    if (result.source.index === result.destination.index) {
      return;
    }

    const newFormData = Array.from(formData);
    const [reorderedItem] = newFormData.splice(result.source.index, 1);
    newFormData.splice(result.destination.index, 0, reorderedItem);

    onChange(newFormData);
  }, [formData, onChange]);

  // Handle manual reordering (up/down buttons)
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formData.length) {
      return;
    }

    const newFormData = Array.from(formData);
    const [movedItem] = newFormData.splice(fromIndex, 1);
    newFormData.splice(toIndex, 0, movedItem);

    onChange(newFormData);
  }, [formData, onChange]);

  // Handle item deletion
  const deleteItem = useCallback((index: number) => {
    const newFormData = [...formData];
    newFormData.splice(index, 1);
    onChange(newFormData);
  }, [formData, onChange]);

  // Render individual array items
  const renderArrayFieldItem = useCallback((itemProps: any) => {
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
      isDragging = false,
      dragProvided,
      dragSnapshot,
    } = itemProps;

    const readOnly: boolean = readonly || parentSchema?.readonly === true;
    const orderable: boolean = !readOnly && itemSchema?.readonly !== true && Boolean(options.allowReorder);
    const removable: boolean = !readOnly && itemSchema?.readonly !== true && Boolean(options.allowDelete);

    const has = {
      moveUp: orderable && canMoveUp && !options.enableDragAndDrop,
      moveDown: orderable && canMoveDown && !options.enableDragAndDrop,
      remove: removable,
      toolbar: (orderable && !options.enableDragAndDrop) || removable
    };

    const SchemaField = registry.fields.SchemaField;
    const schemaFieldProps = {
      schema: itemSchema,
      uiSchema: itemUiSchema,
      formData: itemSchema.name === "$index" ? index : itemData,
      errorSchema: itemErrorSchema,
      idSchema: itemIdSchema,
      required: itemSchema.type !== "null" && itemSchema.type !== null,
      onChange: onChangeForIndex(index),
      onBlur: onBlur,
      onFocus: onFocus,
      registry: registry,
      disabled: disabled || itemProps.disabled,
      readonly: readOnly || itemProps.readonly,
      autofocus: autofocus,
      rawErrors: itemProps.rawErrors,
      formContext: itemProps.formContext,
      key: index
    };

    // Create toolbar with working handlers
    let toolbar = null;
    if (has.toolbar && !isDragging) {
      toolbar = (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
          {has.moveUp && (
            <Tooltip title="Move up">
              <IconButton 
                type="button" 
                onClick={() => moveItem(index, index - 1)}
                size="small"
                disabled={disabled}
              >
                <Icon>keyboard_arrow_up</Icon>
              </IconButton>
            </Tooltip>
          )}
          {has.moveDown && (
            <Tooltip title="Move down">
              <IconButton 
                type="button" 
                onClick={() => moveItem(index, index + 1)}
                size="small"
                disabled={disabled}
              >
                <Icon>keyboard_arrow_down</Icon>
              </IconButton>
            </Tooltip>
          )}
          {has.remove && (
            <Tooltip title="Remove">
              <IconButton 
                type="button" 
                onClick={() => deleteItem(index)}
                size="small"
                color="error"
                disabled={disabled}
              >
                <Icon>delete_outline</Icon>
              </IconButton>
            </Tooltip>
          )}
        </Box>
      );
    }

    // Apply item sizing from uiSchema
    const itemUiOptions = itemUiSchema?.['ui:options'] || {};
    const itemSize = (itemUiOptions as any)?.size || (options.itemProps as any)?.size;
    
    const gridProps: any = {
      size: itemSize || { xs: 12, sm: 12, md: 6, lg: 4, xl: 3 },
      key: `array-item-${index}`,
      sx: {
        opacity: isDragging ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      },
      item: true,
    };

    const content = (
        <>
          <SchemaField {...schemaFieldProps} />
          {toolbar}
        </>
    );

    // For grid layouts, wrap in Grid2 and apply drag providers at the Grid2 level
    if (options.itemsContainer === 'Grid') {
      const gridItem = (
        <Grid2 {...gridProps}>
          {content}
        </Grid2>
      );

      // Apply drag providers if available - modify the Grid2 props instead of wrapping
      if (dragProvided) {
        const dragGridProps = {
          ...gridProps,
          ref: dragProvided.innerRef,
          ...dragProvided.draggableProps,
          ...dragProvided.dragHandleProps,
          sx: {
            ...gridProps.sx,
            ...dragProvided.draggableProps.style,
            // Ensure flex properties are maintained even with drag styles
            display: gridProps.sx.display || 'flex',
            flexDirection: gridProps.sx.flexDirection || 'column',
            height: gridProps.sx.height || '100%',
          }
        };
        
        return (
          <Grid2 {...dragGridProps}>
            {content}
          </Grid2>
        );
      }

      return gridItem;
    }

    // For other containers (List, Stack, etc.), apply drag providers directly to content
    if (dragProvided) {
      return (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
        >
          {content}
        </div>
      );
    }

    return content;
  }, [options, readonly, disabled, registry, onChangeForIndex, moveItem, deleteItem]);
  // Get component from string name
  const getComponentFromString = useCallback((componentName: string): React.ComponentType<any> => {
    if (!componentName) return null;
    
    switch (componentName) {
      case 'Accordion': return Accordion;
      case 'Box': return Box;
      case 'Fragment': return Fragment;
      case 'Grid': return Grid2;
      case 'Paper': return Paper;
      case 'Card': return Card;
      case 'List': return List;
      case 'Stack': return Stack;
      case 'div': return Div;
      case 'section': return Section;
      case 'article': return Article;
      case 'p': return Paragraph;
      default: {
        if (componentName.indexOf('.') > 0) {
          return reactory.getComponent(componentName);
        }
        return null;
      }
    }
  }, [reactory]);
  
  // Resolve container components
  const Container: React.ComponentType<any> = typeof options.container === 'string' 
    ? (getComponentFromString(options.container as string) || Paper)
    : (options.container as React.ComponentType<any>) || Paper;
    
  const ItemsContainer: React.ComponentType<any> = typeof options.itemsContainer === 'string'
    ? (getComponentFromString(options.itemsContainer as string) || Grid2)
    : (options.itemsContainer as React.ComponentType<any>) || Grid2;
  // Render title and description
  const title = (options.showTitle !== false && schema.title && schema.title.length > 0) ? (
    <TitleField 
      idSchema={props.idSchema} 
      schema={props.schema}
      uiSchema={props.uiSchema}       
      required={required} />
  ) : null;

  const description = (options.showDescription !== false && schema.description && schema.description.length > 0) ? (
   <DescriptionField idSchema={props.idSchema} schema={props.schema} />
  ) : null;

  // Render toolbar
  const toolbar = options.showToolbar ? (
    <Toolbar variant={options.toolbarVariant as any || "dense"}>        
        {canAdd && (
          <Tooltip title="Add item">
            <IconButton
              onClick={onAddClick}
              disabled={disabled || readonly}
              color='primary'
              size="large">
              <Icon>add</Icon>
            </IconButton>
          </Tooltip>
        )}
        {buttons}
      </Toolbar>
  ) : null;

  // Don't render if hidden
  if (!visible) return null;

  // Render items with or without drag and drop
  const renderItems = () => {
    const items = formData?.map((item, index) => {
      const itemSchema = utils.retrieveSchema(schema.items, definitions, item);
      const itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
      const itemIdPrefix = `${idSchema.$id}_${index}`;
      const itemIdSchema = utils.toIdSchema(itemSchema, itemIdPrefix, definitions, item, idPrefix);
      
      const itemProps = {
        index,
        key: `item-${index}`,
        canMoveUp: index > 0,
        canMoveDown: index < formData.length - 1,
        itemSchema,
        itemIdSchema,
        itemErrorSchema,
        itemData: item,
        formData,
        parentSchema: schema,
        itemUiSchema: uiSchema.items,
        autofocus: autofocus && index === 0,
        onBlur,
        onFocus,
        disabled,
        readonly,
        rawErrors: rawErrors?.[index],
        formContext,
      };

      // Wrap in Draggable if drag and drop is enabled AND reordering is allowed
      if (options.enableDragAndDrop && options.allowReorder && !readonly && !disabled) {
        return (
          <Draggable 
            key={`item-${index}`} 
            draggableId={`item-${index}`} 
            index={index}
          >
            {(provided, snapshot) => 
              renderArrayFieldItem({
                ...itemProps,
                isDragging: snapshot.isDragging,
                dragProvided: provided,
                dragSnapshot: snapshot
              })
            }
          </Draggable>
        );
      }

      return renderArrayFieldItem(itemProps);
    }) || [];

    return items;
  };

  const itemsContent = options.enableDragAndDrop && options.allowReorder && !readonly && !disabled ? (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable 
        droppableId="array-items" 
        direction={options.dragDirection as any || "vertical"}
        renderClone={(provided, snapshot, rubric) => {
          const item = formData[rubric.source.index];
          const itemSchema = utils.retrieveSchema(schema.items, definitions, item);
          const itemIdPrefix = `${idSchema.$id}_${rubric.source.index}`;
          const itemIdSchema = utils.toIdSchema(itemSchema, itemIdPrefix, definitions, item, idPrefix);
          
          return renderArrayFieldItem({
            index: rubric.source.index,
            key: `item-clone-${rubric.source.index}`,
            canMoveUp: false,
            canMoveDown: false,
            itemSchema,
            itemIdSchema,
            itemErrorSchema: errorSchema ? errorSchema[rubric.source.index] : undefined,
            itemData: item,
            formData,
            parentSchema: schema,
            itemUiSchema: uiSchema.items,
            autofocus: false,
            onBlur,
            onFocus,
            disabled,
            readonly,
            rawErrors: rawErrors?.[rubric.source.index],
            formContext,
            isDragging: true,
            dragProvided: provided,
            dragSnapshot: snapshot
          });
        }}
      >
        {(provided, snapshot) => (
          <ItemsContainer
            {...provided.droppableProps} 
            ref={provided.innerRef}
            key={`array-item-list-${props.idSchema.$id}`}
            {...((options.itemsContainerProps as any) || {})}
            sx={{
              ...((options.itemsContainerProps as any)?.sx || {}),
              // Ensure Grid2 container properties are preserved during drag
              minHeight: snapshot.isDraggingOver ? '100px' : 'auto',
            }}
          >
            {renderItems()}
            {provided.placeholder}
          </ItemsContainer>
        )}
      </Droppable>
    </DragDropContext>
  ) : renderItems();

  return (
    <Container {...((options.containerProps as any) || {})} key={id}>
      {title}
      {description}
      {toolbar}
      {itemsContent}
    </Container>
  );
}

export default MaterialDefaultArrayField;