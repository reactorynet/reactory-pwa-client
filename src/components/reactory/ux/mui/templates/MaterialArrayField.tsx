import React, { Component, Fragment } from "react";
import {
  IconButton,
  Icon,
  Paper,
  Grid,
  Button,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import includes from "lodash/includes";
import UnsupportedField from '@reactory/client-core/components/reactory/form/components/fields/UnsupportedField';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryFormUtilities } from "components/reactory/form/types";

function ArrayFieldTitle({ TitleField, idSchema, title, required }) {
  if (!title) {
    // See #312: Ensure compatibility with old versions of React.
    return <div />;
  }
  const id = `${idSchema.$id}__title`;
  return <TitleField id={id} title={title} required={required} />;
}

function ArrayFieldDescription({ DescriptionField, idSchema, description }) {
  if (!description) {
    // See #312: Ensure compatibility with old versions of React.
    return <div />;
  }
  const id = `${idSchema.$id}__description`;
  return <DescriptionField id={id} description={description} />;
}

// Used in the two templates
function DefaultArrayItem(props) {
  return (
    <Paper key={props.index} className={props.className}>
      <Fragment>
        {props.children}
      </Fragment>
      {props.hasToolbar && (
        <Toolbar>
          {(props.hasMoveUp || props.hasMoveDown) && (
            <IconButton
              tabIndex={-1}
              disabled={props.disabled || props.readonly || !props.hasMoveUp}
              onClick={props.onReorderClick(props.index, props.index - 1)}
              size="large"><Icon>keyboard_arrow_up</Icon></IconButton>
          )}

          {(props.hasMoveUp || props.hasMoveDown) && (
            <IconButton
              tabIndex={-1}
              disabled={
                props.disabled || props.readonly || !props.hasMoveDown
              }
              onClick={props.onReorderClick(props.index, props.index + 1)}
              size="large"><Icon>keyboard_arrow_down</Icon></IconButton>
          )}

          {props.hasRemove && (
            <IconButton
              tabIndex={-1}
              disabled={props.disabled || props.readonly}
              onClick={props.onDropIndexClick(props.index)}
              size="large"><Icon>delete_outline</Icon></IconButton>
          )}
        </Toolbar>
      )}
    </Paper>
  );
}

function DefaultFixedArrayFieldTemplate(props) {
  return (
    <Paper className={props.className}>
      <ArrayFieldTitle
        key={`array-field-title-${props.idSchema.$id}`}
        TitleField={props.TitleField}
        idSchema={props.idSchema}
        title={props.uiSchema["ui:title"] || props.title}
        required={props.required}
      />

      {(props.uiSchema["ui:description"] || props.schema.description) && (
        <Typography
          variant="body1"
          key={`field-description-${props.idSchema.$id}`}>
          {props.uiSchema["ui:description"] || props.schema.description}
        </Typography>
      )}

      <Grid container spacing={4}
        key={`array-item-list-${props.idSchema.$id}`}>
        {props.items && props.items.map(DefaultArrayItem)}
      </Grid>

      {props.canAdd && (
        <Button variant="outlined"
          onClick={props.onAddClick}
          disabled={props.disabled || props.readonly}
        ><Icon>add</Icon></Button>
      )}
    </Paper>
  );
}

function DefaultNormalArrayFieldTemplate(props) {
  let visible = true;
  if (props.uiSchema && props.uiSchema['ui:options'] && props.uiSchema['ui:options'].hidden === true) visible = false;
  let buttons = null;
  if (props.uiSchema && props.uiSchema['ui:toolbar']) {
    buttons = props.uiSchema['ui:toolbar'].map((button) => {
      const api = props.formContext.api
      const onRaiseCommand = (evt) => {
        if (api) api.raiseFormCommand(button.command, button, { formData: props.formData, formContext: props.formContext });
      }
      return <Tooltip key={button.id} title={button.tooltip || button.id}><IconButton color={button.color || "secondary"} onClick={onRaiseCommand} size="large"><Icon>{button.icon}</Icon></IconButton></Tooltip>;
    });
  }

  if (visible === false) return null
  return (
    <Fragment>
      <Toolbar variant="dense">
        <ArrayFieldTitle
          key={`array-field-title-${props.idSchema.$id}`}
          TitleField={props.TitleField}
          idSchema={props.idSchema}
          title={props.uiSchema["ui:title"] || props.title}
          required={props.required}
        />
        {props.canAdd && (
          <IconButton
            onClick={props.onAddClick}
            disabled={props.disabled || props.readonly}
            style={{ float: 'right' }}
            color='secondary'
            size="large"><Icon>add</Icon></IconButton>
        )}
        {buttons}
      </Toolbar>
      {(props.uiSchema["ui:description"] || props.schema.description) && (
        <ArrayFieldDescription
          key={`array-field-description-${props.idSchema.$id}`}
          DescriptionField={props.DescriptionField}
          idSchema={props.idSchema}
          description={
            props.uiSchema["ui:description"] || props.schema.description
          }
        />
      )}

      <Fragment
        key={`array-item-list-${props.idSchema.$id}`}>
        {props.items && props.items.map(p => DefaultArrayItem(p))}
      </Fragment>


    </Fragment>
  );
}

interface ArrayFieldProps {
  reactory: Reactory.Client.ReactorySDK,
  schema: Reactory.Schema.IArraySchema,
  uiSchema: Reactory.Schema.IUISchema,
  formContext: any,
  registry: any,
  formData?: any[]
  idSchema: Reactory.Schema.IDSchema
  [key: string]: any
}

class ArrayField extends Component<ArrayFieldProps, any> {
  static defaultProps = {
    uiSchema: {},
    formData: [],
    idSchema: {},
    required: false,
    disabled: false,
    readonly: false,
    autofocus: false,
  };

  static propTypes: {
    schema: Reactory.Schema.IArraySchema;
    uiSchema: Reactory.Schema.IUISchema;
  };

  utils: ReactoryFormUtilities;

  constructor(props: ArrayFieldProps) {
    super(props);
    this.utils = props.reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');
  }

  get itemTitle() {
    const { schema } = this.props;
    return schema.items.title || schema.items.description || "Item";
  }

  isItemRequired(itemSchema) {
    if (Array.isArray(itemSchema.type)) {
      // While we don't yet support composite/nullable jsonschema types, it's
      // future-proof to check for requirement against these.
      return !includes(itemSchema.type, "null");
    }
    // All non-null array item types are inherently required by design
    return itemSchema.type !== "null";
  }

  canAddItem(formItems) {
    const { schema, uiSchema } = this.props;
    let { addable } = this.utils.getUiOptions(uiSchema);
    if (addable !== false) {
      // if ui:options.addable was not explicitly set to false, we can add
      // another item if we have not exceeded maxItems yet
      // @ts-ignore
      if (schema.maxItems !== undefined) {
        // @ts-ignore
        addable = formItems.length < schema.maxItems;
      } else {
        addable = true;
      }
    }
    return addable;
  }

  onAddClick = event => {
    event.preventDefault();
    const { schema, formData, registry = this.utils.getDefaultRegistry() } = this.props;
    const { definitions } = registry;
    let itemSchema = schema.items;
    if (this.utils.isFixedItems(schema) && this.utils.allowAdditionalItems(schema)) {
      // @ts-ignore
      itemSchema = schema.additionalItems;
    }
    this.props.onChange([
      ...formData,
      this.utils.getDefaultFormState(itemSchema, undefined, definitions),
    ]);
  };

  onDropIndexClick = index => {
    return event => {
      if (event) {
        event.preventDefault();
      }
      const { formData, onChange } = this.props;
      // refs #195: revalidate to ensure properly reindexing errors
      let newErrorSchema;
      if (this.props.errorSchema) {
        newErrorSchema = {};
        const errorSchema = this.props.errorSchema;
        for (let idx in errorSchema) {
          let i: number = parseInt(idx);
          if (i < index) {
            newErrorSchema[i] = errorSchema[i];
          } else if (i > index) {
            newErrorSchema[i - 1] = errorSchema[i];
          }
        }
      }
      onChange(formData.filter((_, i) => i !== index), newErrorSchema);
    };
  };

  onReorderClick = (index, newIndex) => {
    return event => {
      if (event) {
        event.preventDefault();
        event.target.blur();
      }
      const { formData, onChange } = this.props;
      let newErrorSchema;
      if (this.props.errorSchema) {
        newErrorSchema = {};
        const errorSchema = this.props.errorSchema;
        for (let i in errorSchema) {
          if (i == index) {
            newErrorSchema[newIndex] = errorSchema[index];
          } else if (i == newIndex) {
            newErrorSchema[index] = errorSchema[newIndex];
          } else {
            newErrorSchema[i] = errorSchema[i];
          }
        }
      }
      onChange(
        formData.map((item, i) => {
          // i is string, index and newIndex are numbers,
          // so using "==" to compare
          if (i == newIndex) {
            return formData[index];
          } else if (i == index) {
            return formData[newIndex];
          } else {
            return item;
          }
        }),
        newErrorSchema
      );
    };
  };

  onChangeForIndex = index => {
    return (value, errorSchema) => {
      const { formData, onChange } = this.props;
      const newFormData = formData.map((item, i) => {
        // We need to treat undefined items as nulls to have validation.
        // See https://github.com/tdegrunt/jsonschema/issues/206
        const jsonValue = typeof value === "undefined" ? null : value;
        return index === i ? jsonValue : item;
      });
      onChange(
        newFormData,
        errorSchema &&
        this.props.errorSchema && {
          ...this.props.errorSchema,
          [index]: errorSchema,
        }
      );
    };
  };

  onSelectChange = value => {
    this.props.onChange(value);
  };

  render() {
    const {
      schema,
      uiSchema,
      idSchema,
      registry = this.utils.getDefaultRegistry(),
    } = this.props;
    const { definitions } = registry;
    if (!schema.hasOwnProperty("items")) {
      return (
        <UnsupportedField
          schema={schema}
          idSchema={idSchema}
          reason="Missing items definition"
        />
      );
    }
    if (this.utils.isFixedItems(schema)) {
      return this.renderFixedArray();
    }
    if (this.utils.isFilesArray(schema, uiSchema, definitions)) {
      return this.renderFiles();
    }
    if (this.utils.isMultiSelect(schema, definitions)) {
      return this.renderMultiSelect();
    }
    return this.renderNormalArray();
  }

  renderNormalArray() {
    const {
      schema,
      uiSchema,
      formData,
      formContext,
      errorSchema,
      idSchema,
      name,
      required,
      disabled,
      readonly,
      autofocus,
      registry = this.utils.getDefaultRegistry(),
      onBlur,
      onFocus,
      idPrefix,
      rawErrors,
      onChange,
      api,
    } = this.props;

    let toolbar = null;
    const title = schema.title === undefined ? name : schema.title;
    let { ArrayFieldTemplate, definitions, fields } = registry;

    let mapped_props = {};

    if (uiSchema && uiSchema['ui:widget']) {
      const uiOptions = uiSchema['ui:options'];
      let componentProps = {}
      ArrayFieldTemplate = registry.widgets[uiSchema['ui:widget']]

      if (!ArrayFieldTemplate && formContext.api) {
        ArrayFieldTemplate = formContext.reactory.getComponent(uiSchema['ui:widget']);
      }

      // @ts-ignore
      if (uiOptions && uiOptions.componentProps) {  //map properties to the component
        Object.keys(componentProps).map(property => {
          // @ts-ignore
          componentProps[property] = formData[uiOptions.componentProps[property]]
        })
      }

      // @ts-ignore
      if (uiOptions && uiOptions.componentPropsMap) {
        // @ts-ignore
        mapped_props = api.utils.objectMapper(this.props, uiOptions.componentPropsMap)
      }

      // @ts-ignore
      if (uiOptions && uiOptions.container) {
        //resolve Container from API
        // @ts-ignore
        const Container = formContext.reactory.getComponent(uiOptions.container)
        let containerProps = {}
        // @ts-ignore
        if (uiOptions.containerProps) {
          // @ts-ignore
          containerProps = { ...uiOptions.containerProps }
        }
        if (Container) {
          return (
            <Container {...containerProps}>
              {toolbar}
              {ArrayFieldTemplate !== null ? <ArrayFieldTemplate {...{ ...this.props, ...componentProps, ...mapped_props }} /> : null}
            </Container>);
        } else {
          return (
            <Paper {...containerProps}>
              {toolbar}
              {ArrayFieldTemplate !== null ? <ArrayFieldTemplate {...{ ...this.props, ...componentProps, ...mapped_props }} /> : null}
            </Paper>);
        }
      }
    }
    const { TitleField, DescriptionField } = fields;
    const itemsSchema = this.utils.retrieveSchema(schema.items, definitions);
    const arrayProps = {
      canAdd: this.canAddItem(formData),
      items: (formData || []).map((item, index) => {
        const itemSchema = this.utils.retrieveSchema(schema.items, definitions, item);
        const itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
        const itemIdPrefix = idSchema.$id + "_" + index;
        const itemIdSchema = this.utils.toIdSchema(
          itemSchema,
          itemIdPrefix,
          definitions,
          item,
          idPrefix
        );
        return this.renderArrayFieldItem({
          index,
          canMoveUp: index > 0,
          canMoveDown: index < formData.length - 1,
          itemSchema: itemSchema,
          itemIdSchema,
          itemErrorSchema,
          itemData: item,
          itemUiSchema: uiSchema.items,
          autofocus: autofocus && index === 0,
          onBlur,
          onFocus,
        });
      }),
      className: `field field-array field-array-of-${itemsSchema.type}`,
      DescriptionField,
      disabled,
      idSchema,
      uiSchema,
      onAddClick: this.onAddClick,
      onChange,
      readonly,
      required,
      schema,
      title,
      TitleField,
      formContext,
      formData,
      rawErrors,
      ...mapped_props
    };

    // Check if a custom render function was passed in

    const Component = ArrayFieldTemplate || DefaultNormalArrayFieldTemplate;
    return (
      <Fragment>
        {toolbar}
        <Component {...arrayProps} />
      </Fragment>);
  }

  renderMultiSelect() {
    const {
      schema,
      idSchema,
      uiSchema,
      formData,
      disabled,
      readonly,
      autofocus,
      onBlur,
      onFocus,
      registry = this.utils.getDefaultRegistry(),
      rawErrors,
    } = this.props;
    const items = this.props.formData;
    const { widgets, definitions, formContext } = registry;
    const itemsSchema = this.utils.retrieveSchema(schema.items, definitions, formData);
    const enumOptions = this.utils.optionsList(itemsSchema);
    const { widget = "select", ...options } = {
      ...this.utils.getUiOptions(uiSchema),
      enumOptions,
    };
    const Widget = this.utils.getWidget(schema, widget, widgets);
    return (
      <Widget
        id={idSchema && idSchema.$id}
        multiple
        onChange={this.onSelectChange}
        onBlur={onBlur}
        onFocus={onFocus}
        options={options}
        schema={schema}
        value={items}
        disabled={disabled}
        readonly={readonly}
        formContext={formContext}
        autofocus={autofocus}
        rawErrors={rawErrors}
      />
    );
  }

  renderFiles() {
    const { utils } = this;
    const {
      schema,
      uiSchema,
      idSchema,
      name,
      disabled,
      readonly,
      autofocus,
      onBlur,
      onFocus,
      registry = utils.getDefaultRegistry(),
      rawErrors,
    } = this.props;
    const title = schema.title || name;
    const items = this.props.formData;
    const { widgets, formContext } = registry;
    const { widget = "files", ...options } = utils.getUiOptions(uiSchema);
    const Widget = utils.getWidget(schema, widget, widgets);
    return (
      <Widget
        options={options}
        id={idSchema && idSchema.$id}
        multiple
        onChange={this.onSelectChange}
        onBlur={onBlur}
        onFocus={onFocus}
        schema={schema}
        title={title}
        value={items}
        disabled={disabled}
        readonly={readonly}
        formContext={formContext}
        autofocus={autofocus}
        rawErrors={rawErrors}
      />
    );
  }

  renderFixedArray() {
    const { utils } = this;
    const {
      schema,
      uiSchema,
      formData,
      errorSchema,
      idPrefix,
      idSchema,
      name,
      required,
      disabled,
      readonly,
      autofocus,
      registry = utils.getDefaultRegistry(),
      onBlur,
      onFocus,
      rawErrors,
    } = this.props;
    const title = schema.title || name;
    let items = this.props.formData;
    const { ArrayFieldTemplate, definitions, fields, formContext } = registry;
    const { TitleField } = fields;
    // @ts-ignore
    const itemSchemas = schema.items.map((item, index) =>
      utils.retrieveSchema(item, definitions, formData[index])
    );
    const additionalSchema = utils.allowAdditionalItems(schema)
      //@ts-ignore
      ? utils.retrieveSchema(schema.additionalItems, definitions, formData)
      : null;

    if (!items || items.length < itemSchemas.length) {
      // to make sure at least all fixed items are generated
      items = items || [];
      items = items.concat(new Array(itemSchemas.length - items.length));
    }

    // These are the props passed into the render function
    const arrayProps = {
      canAdd: this.canAddItem(items) && additionalSchema,
      // @ts-ignore
      className: this.props.classes && this.props.uiSchema && uiSchema['className'] ? this.props.classes[uiSchema['className']] : null,
      disabled,
      idSchema,
      formData,
      items: items.map((item, index) => {
        const additional = index >= itemSchemas.length;
        const itemSchema = additional
          // @ts-ignore
          ? utils.retrieveSchema(schema.additionalItems, definitions, item)
          : itemSchemas[index];
        const itemIdPrefix = idSchema.$id + "_" + index;
        const itemIdSchema = utils.toIdSchema(
          itemSchema,
          itemIdPrefix,
          definitions,
          item,
          idPrefix
        );
        const itemUiSchema = additional
          ? uiSchema.additionalItems || {}
          : Array.isArray(uiSchema.items)
            ? uiSchema.items[index]
            : uiSchema.items || {};
        const itemErrorSchema = errorSchema ? errorSchema[index] : undefined;

        return this.renderArrayFieldItem({
          index,
          canRemove: additional,
          canMoveUp: index >= itemSchemas.length + 1,
          canMoveDown: additional && index < items.length - 1,
          itemSchema,
          itemData: item,
          itemUiSchema,
          itemIdSchema,
          itemErrorSchema,
          autofocus: autofocus && index === 0,
          onBlur,
          onFocus,
        });
      }),
      onAddClick: this.onAddClick,
      readonly,
      required,
      schema,
      uiSchema,
      title,
      TitleField,
      formContext,
      rawErrors,
    };

    // Check if a custom template template was passed in
    const Template = ArrayFieldTemplate || DefaultFixedArrayFieldTemplate;
    return <Template {...arrayProps} />;
  }

  renderArrayFieldItem(props) {
    const {
      index,
      canRemove = true,
      canMoveUp = true,
      canMoveDown = true,
      itemSchema,
      itemData,
      itemUiSchema,
      itemIdSchema,
      itemErrorSchema,
      autofocus,
      onBlur,
      onFocus,
      rawErrors,
    } = props;
    const {
      disabled,
      readonly,
      uiSchema,
      registry = this.utils.getDefaultRegistry(),
    } = this.props;
    const {
      fields: { SchemaField },
    } = registry;
    const { orderable = true, removable = true } = {
      orderable: true,
      removable: true,
      // @ts-ignore
      ...uiSchema["ui:options"],
    };
    const has: any = {
      moveUp: orderable && canMoveUp,
      moveDown: orderable && canMoveDown,
      remove: removable && canRemove,
    };
    has.toolbar = Object.keys(has).some(key => has[key]);

    return {
      children: (
        <SchemaField
          schema={itemSchema}
          uiSchema={itemUiSchema}
          formData={itemData}
          errorSchema={itemErrorSchema}
          idSchema={itemIdSchema}
          required={this.isItemRequired(itemSchema)}
          onChange={this.onChangeForIndex(index)}
          onBlur={onBlur}
          onFocus={onFocus}
          registry={this.props.registry}
          disabled={this.props.disabled}
          readonly={this.props.readonly}
          autofocus={autofocus}
          rawErrors={rawErrors}
        />
      ),
      //@ts-ignore
      className: props.classes && props.uiSchema && uiSchema['className'] ? props.classes[uiSchema['className']] : null,
      disabled,
      hasToolbar: has.toolbar,
      hasMoveUp: has.moveUp,
      hasMoveDown: has.moveDown,
      hasRemove: has.remove,
      index,
      onDropIndexClick: this.onDropIndexClick,
      onReorderClick: this.onReorderClick,
      readonly,
    };
  }
}

export default withReactory(ArrayField);