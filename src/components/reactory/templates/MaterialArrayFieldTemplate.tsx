import React, { Component, Fragment } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';
import Draggable from 'react-draggable';
import { pullAt } from 'lodash';
import { getDefaultFormState, retrieveSchema, toIdSchema, getDefaultRegistry } from '@reactory/client-core/components/reactory/form/utils';

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
} from '@material-ui/core'

import { withApi } from '@reactory/client-core/api/ApiProvider'

class ArrayTemplate extends Component<any, any> {

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

  constructor(props, context) {
    super(props)

    this.onAddClicked = this.onAddClicked.bind(this)
    this.renderNormalArray = this.renderNormalArray.bind(this)
    this.renderArrayFieldItem = this.renderArrayFieldItem.bind(this)
    this.registry = props.registry || getDefaultRegistry();
    this.onChangeForIndex = this.onChangeForIndex.bind(this);
    this.state = {
      expanded: {

      },
      selected: {

      },
    };
  }

  /**
   * The event fired when clicking the add button on the array container
   * @param {React.SynthecticEvent} e 
   */
  onAddClicked(e) {
    //console.log('Add Clicked ', e)
    ;
    const {
      formData, //The formData for this array. 
      registry,
      schema,
    } = this.props;
    const newItem = getDefaultFormState(schema.items, undefined, registry.definitions)
    this.props.onChange([...formData, newItem])
  }

  onChangeForIndex(value, index, errorSchema) {
    //console.info('index item change', { index, value, errorSchema })
    //this.props.onChange(formData.map())
    const newData = this.props.formData.map((item, idx) => {
      if (idx === index) return { ...item, ...value };
      return item;
    });

    if (this.props.onChange) this.props.onChange(newData);
  }

  renderArrayFieldItem(props) {

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
      onBlur,
      onFocus,
      parentSchema,
    } = props;

    const {
      selected,
      expanded
    } = this.state
    ////console.log('Rendering array item', { props });

    let orderable = true;
    let removable = true;
    let canRemove = true;

    const has = {
      moveUp: orderable && canMoveUp,
      moveDown: orderable && canMoveDown,
      remove: removable && canRemove,
      toolbar: true,
    };

    const changeForIndex = (formData, errorSchema) => {
      this.onChangeForIndex(formData, index, errorSchema);
    }

    const expandForIndex = (index) => {
      ////console.log('Expand for index', index);
      this.setState({ expanded: { ...this.state.expanded, index: expanded[index] === true ? false : true } });
    };

    const selectForIndex = (index) => {
      ////console.log('Select for index', index);
      this.setState({ selected: { ...this.state.selected, index: selected[index] === true ? false : true } });
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
      onBlur: onBlur,
      onFocus: onFocus,
      registry: this.registry,
      disabled: this.props.disabled,
      readonly: this.props.readonly,
      autofocus: autofocus,
      rawErrors: this.props.rawErrors,
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
      dragHandle: props.classes.dragHandle,
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
          {has.moveUp === true ? <IconButton type="button"><Icon>keyboard_arrow_up</Icon></IconButton> : null}
          {has.moveDown === true ? <IconButton type="button"><Icon>keyboard_arrow_down</Icon></IconButton> : null}
          {has.remove === true ? <IconButton type="button" onClick={deleteItemClick}><Icon>delete_outline</Icon></IconButton> : null}
        </Toolbar>
      )
    }
    return (
      <Fragment key={index}>
        <SchemaField {...schemaFieldProps} containerProps={containerProps} toolbar={toolbar}>
        </SchemaField>
        {toolbar}
      </Fragment>
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
      classes,
      errorSchema,
      registry,
      autofocus,
      onBlur,
      onFocus,
      idPrefix,
      api
    } = this.props;
    ;
    const uiOptions = uiSchema['ui:options'] || null
    const uiWidget = uiSchema['ui:widget'] || null
    const definitions = registry.definitions;
    let ArrayComponent = null
    let componentProps = {}
    if (uiWidget !== null) {
      if (registry.widgets[uiWidget]) ArrayComponent = registry.widgets[uiWidget]
      if (!ArrayComponent) {
        ArrayComponent = api.getComponent(uiWidget);
      }
      if (uiOptions && uiOptions.componentProps) {  //map properties to the component
        Object.keys(componentProps).map(property => {
          componentProps[property] = formData[uiOptions.componentProps[property]]
        })
      }
    }

    if (ArrayComponent === null) {
      ArrayComponent = () => (
        <Grid spacing={2} item sm={12} md={12}>
          {formData && formData.map && formData.map((item, index) => {          
            let itemSchema = retrieveSchema(schema.items, definitions, item);
            let itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
            let itemIdPrefix = idSchema.$id + "_" + index;
            let itemIdSchema = toIdSchema(itemSchema, itemIdPrefix, definitions, item, idPrefix);
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
              autofocus: autofocus && index === 0,
              onBlur: onBlur,
              onFocus: onFocus,
              classes: this.props.classes
            });
          })}
          {!formData || (formData && formData.length === 0) ? <Typography>Create a new {this.props.schema.title} by clicking the <Icon>add</Icon> icon</Typography> : null}
        </Grid>)
    }

    if (uiOptions && uiOptions.container) {
      //resolve Container from API
      const Container = api.getComponent(uiOptions.container)
      let containerProps = {}
      if (uiOptions.containerProps) {
        containerProps = { ...uiOptions.containerProps }
      }
      if (Container) {
        return (
          <Container {...containerProps}>
            {ArrayComponent !== null ? <ArrayComponent {...{ ...this.props, ...componentProps }} /> : null}
          </Container>);
      } else {
        return (
          <Paper className={classes.root} {...containerProps}>
            {ArrayComponent !== null ? <ArrayComponent {...{ ...this.props, ...componentProps }} /> : null}
          </Paper>);
      }
    } else {
      //default behaviour
      return (
        <Paper className={classes.root}>
          <Typography variant="h4">{schema.title}</Typography>
          <Grid container spacing={8}>
            {ArrayComponent !== null ? <ArrayComponent {...componentProps} /> : null}
          </Grid>
          <Tooltip title={`Click here to add a new ${schema.title}`}>
            <Button color="secondary" variant="outlined" disabled={canAdd === false} aria-label="Add" className={classes.fabButton} onClick={this.onAddClicked}>
              <Icon>add</Icon>
            </Button>
          </Tooltip>
        </Paper>
      );
    }
  }

  render() {
    return this.renderNormalArray();
  }
}

const MaterialArrayTemplate = compose(
  withApi,
  withStyles(ArrayTemplate.styles),
  withTheme)(ArrayTemplate);

export default (props) => {
  return (<MaterialArrayTemplate {...props} />)
};
