import React, { Component, Fragment } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { orderProperties, retrieveSchema, getDefaultRegistry } from 'react-jsonschema-form/lib/utils';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Input,
  Paper,
  CardHeader,
} from '@material-ui/core'

const DefaultObjectFieldTemplate = (props) => {
  var TitleField = props.TitleField,
    DescriptionField = props.DescriptionField;

  return (
    <Card>
      <CardHeader title={props.schema.title} />
      <CardContent>
        <Typography gutterBottom component="p">{props.schema.description}</Typography>
        {props.properties.map((property) => {
          return property.content
        })}
      </CardContent>
    </Card>
  );

  /*
    "fieldset",
    null,
    (props.uiSchema["ui:title"] || props.title) && _react2.default.createElement(TitleField, {
      id: props.idSchema.$id + "__title",
      title: props.title || props.uiSchema["ui:title"],
      required: props.required,
      formContext: props.formContext
    }),
    props.description && _react2.default.createElement(DescriptionField, {
      id: props.idSchema.$id + "__description",
      description: props.description,
      formContext: props.formContext
    }),
    props.properties.map(function (prop) {
      return prop.content;
    })
  );
  */
}

class ObjectTemplate extends Component {

  static styles = (theme) => ({
    root: {
      padding: theme.spacing.unit
    }
  })

  constructor(props, context) {
    super(props, context)

    this.isRequired = this.isRequired.bind(this)
    this.onPropertyChange = this.onPropertyChange.bind(this)
  }

  isRequired(name) {
    const schema = this.props.schema;
    return Array.isArray(schema.required) && schema.required.indexOf(name) !== -1;
  }

  onPropertyChange(){

  }

  render() {
    const {
      classes,
      autofocus,
      disabled,
      errorSchema,
      formData,
      idPrefix,
      idSchema,
      name,
      onBlur,
      onChange,
      onFocus,
      rawErrors,
      readOnly,
      registry,
      required,
      uiSchema,
      hidden
    } = this.props
    const that = this;
    const { definitions, fields, formContext } = registry || getDefaultRegistry();
    const { SchemaField, TitleField, DescriptionField } = fields;

    const schema = retrieveSchema(this.props.schema, definitions, formData);
    let title = schema.title === undefined ? name : schema.title;
    let description = uiSchema["ui:description"] || schema.description;

    const orderedProperties = orderProperties(Object.keys(schema.properties), uiSchema["ui:order"]);

    var Template = registry.ObjectFieldTemplate || DefaultObjectFieldTemplate;

    var templateProps = {
      title: uiSchema["ui:title"] || title,
      description: description,
      TitleField: TitleField,
      DescriptionField: DescriptionField,
      properties: orderedProperties.map(function (name) {
        const onPropertyChange = () => { that.onPropertyChange(name); };
        return {
          content: React.createElement(SchemaField, {
            key: name,
            name: name,
            required: that.isRequired(name),
            schema: schema.properties[name],
            uiSchema: uiSchema[name],
            errorSchema: errorSchema[name],
            idSchema: idSchema[name],
            idPrefix: idPrefix,
            formData: formData[name],
            onChange: onPropertyChange,
            onBlur: onBlur,
            onFocus: onFocus,
            registry: registry,
            disabled: disabled,
            readonly: readOnly
          }),
          name: name,
          readonly: readOnly,
          disabled: disabled,
          required: required
        };
      }),
      required: required,
      idSchema: idSchema,
      uiSchema: uiSchema,
      schema: schema,
      formData: formData,
      formContext: formContext
    };
    return React.createElement(Template, templateProps);
  }
}

const MaterialObjectTemplate = compose(
  withApi,
  withStyles(ObjectTemplate.styles),
  withTheme())(ObjectTemplate)

const MaterialObjectTemplateFunction = (props) => {
  return (<MaterialObjectTemplate {...props} />)
}
export default MaterialObjectTemplateFunction