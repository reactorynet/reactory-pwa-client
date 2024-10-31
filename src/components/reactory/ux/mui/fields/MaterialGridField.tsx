import React from 'react';
import { Grid, Paper, Typography } from '@mui/material'
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';
import { useReactory } from '@reactory/client-core/api';
import Reactory from '@reactory/reactory-core';

const MaterialGridField: Reactory.Forms.ReactoryFieldComponent<object> = (props) => { 
  const reactory = useReactory();
  const utils = reactory.getComponent('core.ReactoryFormUtilities') as ReactoryFormUtilities;
  const {
    uiSchema,
    formData,
    errorSchema,
    idSchema,
    name,
    required,
    disabled,
    readonly,
    idPrefix,
    onBlur,
    onFocus,
    registry = utils.getDefaultRegistry(),
    onChange,
  } = props
  const { definitions, fields, formContext } = props.registry
  const { SchemaField, TitleField, DescriptionField } = fields
  
  if (!utils) return <></>
  const schema = utils.retrieveSchema(props.schema, definitions)
  const title = (schema.title === undefined) ? '' : schema.title

  const layout = uiSchema['ui:grid-layout'];

  const isRequired = (name: string) => {
    const schema = props.schema;
    return (
      Array.isArray(schema.required) && schema.required.indexOf(name) !== -1
    );
  }

  const onPropertyChange = (name: string) => {
    
    return (value, errorSchema) => {
      reactory.debug(`onPropertyChange ${name}`, { value });
      let nextFormData = {};
      if (formData) {
        nextFormData = { ...formData };
      }
      nextFormData[name] = value;
      onChange(
        nextFormData,
        errorSchema &&
        props.errorSchema && {
          ...props.errorSchema,
          [name]: errorSchema,
        }
      );
    };
  };

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
    // @ts-ignore
    uiOptions = { ...uiOptions, ...(uiSchema["ui:options"] || uiOptions) };
  }

  if (uiSchema['ui:grid-options']) {
    gridOptions = { ...gridOptions, ...uiSchema['ui:grid-options'] };
  }

  const getAvailableKey = (preferredKey, formData) => {
    var index = 0;
    var newKey = preferredKey;
    while (formData.hasOwnProperty(newKey)) {
      newKey = `${preferredKey}-${++index}`;
    }
    return newKey;
  };

  const onKeyChange = (oldValue) => {
    return (value, errorSchema) => {
      value = getAvailableKey(value, formData);
      const newFormData = { ...formData };
      const property = newFormData[oldValue];
      delete newFormData[oldValue];
      newFormData[value] = property;
      onChange(
        newFormData,
        errorSchema &&
        errorSchema && {
          ...errorSchema,
          [value]: errorSchema,
        }
      );
    };
  };


  const grid_content = (
    <>
      {title ? <TitleField
        id={`${idSchema.$id}__title`}
        idSchema={idSchema}
        schema={schema}
        uiSchema={uiSchema}
        title={title as string}
        required={required}
        formContext={formContext}
        style={(uiSchema["ui:title"] as Reactory.Schema.UITitleFieldOptions)?.jss || {}} /> : null}
      {schema.description ?
        <DescriptionField
          id={`${idSchema.$id}__description`}
          schema={schema}
          idSchema={idSchema}
          description={schema.description as string}
          formContext={formContext} /> : null}
      {
        layout.map((row, index) => {
          let numberOfVisibleItems = 0;
          let items = Object.keys(row).map((name, index) => {              

            const { doShow, ...rowProps } = row[name] as Reactory.Schema.IGridFieldLayout;
            let style = {}
            if (row.style)
              style = { ...row.style };

            let hide = false;

            if (doShow && !doShow({ formData })) {
              style = { display: 'none' }
              hide = true;
            }
            
            if(schema.type !== "array") {
              if (schema.properties[name]) {
                return (
                  <Grid {...rowProps} item key={index} style={style}>
                    <SchemaField
                      key={name}
                      name={name}
                      required={isRequired(name)}
                      schema={schema.properties[name]}
                      uiSchema={uiSchema[name] as Reactory.Schema.IUISchema}
                      errorSchema={errorSchema[name]}
                      idSchema={idSchema[name]}
                      idPrefix={idPrefix}
                      formData={formData && formData[name] ? formData[name] : null}
                      onKeyChange={onKeyChange(name)}
                      onChange={onPropertyChange(name)}
                      onBlur={onBlur}
                      onFocus={onFocus}
                      registry={registry}
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
                      <SchemaField
                      key={name}
                      name={name}
                      required={isRequired(name)}
                      schema={schema.properties[name]}
                      uiSchema={uiSchema[name] as Reactory.Schema.IUISchema}
                      errorSchema={errorSchema[name]}
                      idSchema={idSchema[name]}
                      idPrefix={idPrefix}
                      formData={formData && formData[name] ? formData[name] : null}
                      onKeyChange={onKeyChange(name)}
                      onChange={onPropertyChange(name)}
                      onBlur={onBlur}
                      onFocus={onFocus}
                      registry={registry}
                      disabled={disabled}
                      readonly={readonly} />
                    </Grid>)
                }

                return null;
              }
            } else {
              return (<Grid {...rowProps} item key={index} style={style}>
                <Typography variant="h6">Grid Layout not available for array types. Arrays are by default wrapped in a grid container.</Typography>
                </Grid>)
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


export default MaterialGridField;
