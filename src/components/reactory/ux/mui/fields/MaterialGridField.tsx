import React from 'react'
import { compose } from 'redux';
import { template } from 'lodash';

import MaterialObjectField from './MaterialObjectField';
import { retrieveSchema } from '@reactory/client-core/components/reactory/form/utils';
import { Grid, Paper } from '@mui/material'

import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

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

class MaterialGridField extends MaterialObjectField {

  static styles = theme => ({
    root: {
      padding: theme.spacing(1)
    }
  });

  render() {
    const {
      uiSchema,
      errorSchema,
      idSchema,
      required,
      disabled,
      readonly,
      onBlur,
      classes,
      formData
    } = this.props
    const { definitions, fields, formContext } = this.props.registry
    const { reactory } = formContext;
    const { SchemaField, TitleField, DescriptionField } = fields
    const schema = retrieveSchema(this.props.schema, definitions)
    const title = (schema.title === undefined) ? '' : schema.title

    const layout = uiSchema['ui:grid-layout'];

    let gridOptions: any = {
      spacing: 8,
      container: 'Paper',
      containerStyles: {
        padding: reactory.muiTheme.spacing(1)
      }
    };

    let uiOptions = {
      container: 'Paper',
      containerStyles: {

      }
    };

    if (uiSchema["ui:options"]) {
      uiOptions = { ...uiOptions, ...(uiSchema["ui:options"] || uiOptions) };
    }

    if (uiSchema['ui:grid-options']) {
      gridOptions = { ...gridOptions, ...uiSchema['ui:grid-options'] };
    }


    const grid_content = (
      <>
        {title ? <TitleField
          id={`${idSchema.$id}__title`}
          title={title}
          required={required}
          formContext={formContext}
          style={uiSchema["ui:titleStyle"] || {}} /> : null}
        {schema.description ?
          <DescriptionField
            id={`${idSchema.$id}__description`}
            description={schema.description}
            formContext={formContext} /> : null}
        {
          layout.map((row, index) => {
            let numberOfVisibleItems = 0;
            let items = Object.keys(row).map((name, index) => {
              const { doShow, ...rowProps } = row[name]
              let style = {}
              if (row.style)
                style = { ...row.style };

              let hide = false;

              if (doShow && !doShow({ formData })) {
                style = { display: 'none' }
                hide = true;
              }
              if (schema.properties[name]) {
                return (
                  <Grid {...rowProps} item key={index} style={style}>
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
                      readonly={readonly} />
                  </Grid>
                )
              } else {
                const { render, ...rowProps } = row[name]
                let UIComponent: any = () => null

                if (render) {
                  UIComponent = render
                } else {
                  hide = true;
                }

                if (hide === false) {
                  numberOfVisibleItems += 1;
                  return (
                    <Grid {...rowProps} item key={index} style={style}>
                      <UIComponent
                        name={name}
                        formData={formData}
                        errorSchema={errorSchema}
                        uiSchema={uiSchema}
                        schema={schema}
                        registry={this.props.registry}
                      />
                    </Grid>)
                }

                return null;
              }
            });

            return (
              <Grid container spacing={gridOptions.spacing} key={index}>
                {items}
              </Grid>
            )
          })
        }
      </>
    );


    let Container = null
    switch (gridOptions.container) {
      case "div": {
        return (<div style={gridOptions.containerStyles}>{grid_content}</div>)
      }
      case "Paper":
      default: {
        return (<Paper style={gridOptions.containerStyles} elevation={gridOptions.elevation || 1}>{grid_content}</Paper>)
      }
    }    
  }
}

// export const MaterialGridFieldComponent = compose(withReactory, withStyles(MaterialGridField.styles), withTheme)(MaterialGridField);

export default MaterialGridField;
