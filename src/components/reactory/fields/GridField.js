import React from 'react'
import ObjectField from 'react-jsonschema-form/lib/components/fields/ObjectField'
import { retrieveSchema } from 'react-jsonschema-form/lib/utils'
import { Grid, GridList } from '@material-ui/core'
import { Col } from 'react-bootstrap'

function DefaultObjectFieldTemplate(props) {
  const { TitleField, DescriptionField } = props;
  return (
    <fieldset>
      {(props.uiSchema["ui:title"] || props.title) && (
        <TitleField
          id={`${props.idSchema.$id}__title`}
          title={props.title || props.uiSchema["ui:title"]}
          required={props.required}
          formContext={props.formContext}
        />
      )}
      {props.description && (
        <DescriptionField
          id={`${props.idSchema.$id}__description`}
          description={props.description}
          formContext={props.formContext}
        />
      )}
      {props.properties.map(prop => prop.content)}
    </fieldset>
  );
}

export class BootstrapGridField extends ObjectField {
  state = { firstName: 'hasldf' }
  render() {
    const {
      uiSchema,
      errorSchema,
      idSchema,
      required,
      disabled,
      readonly,
      onBlur,
      formData
    } = this.props
    const { definitions, fields, formContext } = this.props.registry
    const { SchemaField, TitleField, DescriptionField } = fields
    const schema = retrieveSchema(this.props.schema, definitions)
    const title = (schema.title === undefined) ? '' : schema.title

    const layout = uiSchema['ui:layout']

    return (
      <fieldset>
        {title ? <TitleField
            id={`${idSchema.$id}__title`}
            title={title}
            required={required}
            formContext={formContext}/> : null}
        {schema.description ?
          <DescriptionField
            id={`${idSchema.$id}__description`}
            description={schema.description}
            formContext={formContext}/> : null}
        {
          layout.map((row, index) => {
            return (
              <div className="row" key={index}>
                {
                  Object.keys(row).map((name, index) => {
                    const { doShow, ...rowProps } = row[name]
                    let style = {}
                    if (doShow && !doShow({ formData })) {
                      style = { display: 'none' }
                    }
                    debugger
                    if (schema.properties[name]) {
                      return (
                          <Col {...rowProps} key={index} style={style}>
                            <SchemaField
                               name={name}
                               required={this.isRequired(name)}
                               schema={schema.properties[name]}
                               uiSchema={uiSchema[name]}
                               errorSchema={errorSchema[name]}
                               idSchema={idSchema[name]}
                               formData={formData[name]}
                               onChange={this.onPropertyChange(name)}
                               onBlur={onBlur}
                               registry={this.props.registry}
                               disabled={disabled}
                               readonly={readonly}/>
                          </Col>
                      )
                    } else {
                      const { render, ...rowProps } = row[name]
                      let UIComponent = () => null

                      if (render) {
                        UIComponent = render
                      }

                      return (
                            <Grid {...rowProps} key={index} style={style}>
                              <UIComponent
                                name={name}
                                formData={formData}
                                errorSchema={errorSchema}
                                uiSchema={uiSchema}
                                schema={schema}
                                registry={this.props.registry}
                              />
                            </Grid>
                      )
                    }
                  })
                }
              </div>
            )
          })
        }</fieldset>
    )
  }
};

export class MaterialGridField extends ObjectField {
  state = { firstName: 'hasldf' }
  render() {
    const {
      uiSchema,
      errorSchema,
      idSchema,
      required,
      disabled,
      readonly,
      onBlur,
      formData
    } = this.props
    const { definitions, fields, formContext } = this.props.registry
    const { SchemaField, TitleField, DescriptionField } = fields
    const schema = retrieveSchema(this.props.schema, definitions)
    const title = (schema.title === undefined) ? '' : schema.title

    const layout = uiSchema['ui:layout']

    return (
      <fieldset>
        {title ? <TitleField
            id={`${idSchema.$id}__title`}
            title={title}
            required={required}
            formContext={formContext}/> : null}
        {schema.description ?
          <DescriptionField
            id={`${idSchema.$id}__description`}
            description={schema.description}
            formContext={formContext}/> : null}
        {
          layout.map((row, index) => {
            return (
              <div className="row" key={index}>
                {
                  Object.keys(row).map((name, index) => {
                    const { doShow, ...rowProps } = row[name]
                    let style = {}
                    if (doShow && !doShow({ formData })) {
                      style = { display: 'none' }
                    }
                    debugger
                    if (schema.properties[name]) {
                      return (
                          <Grid {...rowProps} key={index} style={style}>
                            <SchemaField
                               name={name}
                               required={this.isRequired(name)}
                               schema={schema.properties[name]}
                               uiSchema={uiSchema[name]}
                               errorSchema={errorSchema[name]}
                               idSchema={idSchema[name]}
                               formData={formData[name]}
                               onChange={this.onPropertyChange(name)}
                               onBlur={onBlur}
                               registry={this.props.registry}
                               disabled={disabled}
                               readonly={readonly}/>
                          </Grid>
                      )
                    } else {
                      const { render, ...rowProps } = row[name]
                      let UIComponent = () => null

                      if (render) {
                        UIComponent = render
                      }

                      return (
                            <Grid {...rowProps} key={index} style={style}>
                              <UIComponent
                                name={name}
                                formData={formData}
                                errorSchema={errorSchema}
                                uiSchema={uiSchema}
                                schema={schema}
                                registry={this.props.registry}
                              />
                            </Grid>
                      )
                    }
                  })
                }
              </div>
            )
          })
        }</fieldset>
    )
  }
}

export default {
  BootstrapGridField,
  MaterialGridField
}