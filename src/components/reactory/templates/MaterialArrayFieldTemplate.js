import React, { Component, Fragment } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { getDefaultFormState, retrieveSchema, toIdSchema, getDefaultRegistry } from 'react-jsonschema-form/lib/utils'

import {
  AppBar,
  Button,
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
} from '@material-ui/core'

import { withApi } from '../../../api/ApiProvider'

class ArrayTemplate extends Component {

  static styles = (theme) => ({
    root: {
      padding: theme.spacing.unit,
      minHeight: '200px',
    },
    appBar: {
      marginTop: theme.spacing.unit * 14,
      top: 'auto',
      bottom: 0,
    },
    toolbar: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fabButton: {
      position: 'absolute',
      top: -30,
      left: 0,
      right: 0,
      margin: '0 auto',
    },
  })

  static defaultProps = {
    formData: []
  }

  constructor(props, context) {
    super(props, context)
    this.onAddClicked = this.onAddClicked.bind(this)
    this.renderNormalArray = this.renderNormalArray.bind(this)
    this.renderArrayFieldItem = this.renderArrayFieldItem.bind(this)
    this.registry = props.registry || getDefaultRegistry();
  }

  /**
   * The event fired when clicking the add button on the array container
   * @param {React.SynthecticEvent} e 
   */
  onAddClicked(e) {
    console.log('Add Clicked ', e)
    debugger;
    const {
      formData, //The formData for this array. 
      registry,
      schema,
    } = this.props;
    const newItem = getDefaultFormState(schema.items, undefined, registry.definitions)
    this.props.onChange([...formData, newItem])
  }

  onChangeForIndex(index, value, errorSchema){
    console.info('index item change', { index, value, errorSchema })
    //this.props.onChange(formData.map())
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

    console.log('Rendering array item', { props });

    let orderable = true;
    let removable = true;
    let canRemove = true;

    const has = {
      moveUp: orderable && canMoveUp,
      moveDown: orderable && canMoveDown,
      remove: removable && canRemove,
      toolbar: false,
    };

    const SchemaField = this.registry.fields.SchemaField;
    const schemaFieldProps = {
      schema: itemSchema,
      uiSchema: itemUiSchema,
      formData: itemData,
      errorSchema: itemErrorSchema,
      idSchema: itemIdSchema,
      required: itemSchema.type !== "null" || itemSchema.type !== null,
      onChange: this.onChangeForIndex,
      onBlur: onBlur,
      onFocus: onFocus,
      registry: this.registry,
      disabled: this.props.disabled,
      readonly: this.props.readonly,
      autofocus: autofocus,
      rawErrors: this.props.rawErrors,
    };

    const containerProps = {
      className: "array-item",
      disabled: this.props.disabled,
      hasToolbar: has.toolbar,
      hasMoveUp: has.moveUp,
      hasMoveDown: has.moveDown,
      hasRemove: has.remove,
      index: index,
      onDropIndexClick: this.onDropIndexClick,
      onReorderClick: this.onReorderClick,
      readonly: this.props.readonly
    }
    
    return (
      <SchemaField {...schemaFieldProps}>

      </SchemaField>
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
    debugger;
    const uiOptions = uiSchema['ui:options'] || null
    const definitions = registry.definitions;
    let ArrayComponent = null
    let componentProps = {}
    if (uiOptions !== null) {
      if (uiOptions.componentFqn) ArrayComponent = api.getComponent(uiOptions.componentFqn);
      if (uiOptions.componentProps) {  //map properties to the component
        Object.keys(componentProps).map(property => {
          componentProps[property] = formData[uiOptions.componentProps[property]]
        })
      }
    }

    if (ArrayComponent === null) {
      ArrayComponent = () => (
        <Grid item sm={12} md={12}>
          {formData.map((item, index) => {
            debugger;
            console.log('Rendering item', { item, index })
            let itemSchema = retrieveSchema(schema.items, definitions, item);
            let itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
            let itemIdPrefix = idSchema.$id + "_" + index;
            let itemIdSchema = toIdSchema(itemSchema, itemIdPrefix, definitions, item, idPrefix);
            return this.renderArrayFieldItem({
              index: index,
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
              onFocus: onFocus
            });
          })}
        </Grid>)
    }

    console.log('schema and uiSchema', { schema, uiSchema, ArrayComponent, formData, onAddClick });
    return (
      <Paper className={classes.root}>
        <Grid container spacing={8}>
          {ArrayComponent !== null ? <ArrayComponent {...componentProps} /> : null}
        </Grid>
        <AppBar position="relative" color="primary" className={classes.appBar}>
          <Toolbar className={classes.toolbar}>
            <Button variant="fab" color="secondary" disabled={canAdd === false} aria-label="Add" className={classes.fabButton} onClick={this.onAddClicked}>
              <Icon>add</Icon>
            </Button>
          </Toolbar>
        </AppBar>
      </Paper>
    );
  }


  render() {
    return this.renderNormalArray();
  }
}

const MaterialArrayTemplate = compose(
  withApi,
  withStyles(ArrayTemplate.styles),
  withTheme())(ArrayTemplate);

export default (props) => {
  return (<MaterialArrayTemplate {...props} />)
};
