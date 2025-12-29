import React from 'react';
import { Grid2 as Grid, Paper, Typography } from '@mui/material'
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';
import { useReactory } from '@reactory/client-core/api';
import Reactory from '@reactory/reactory-core';
import i18n, { TOptions as I18nFormatOptions } from "i18next";

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
  let title = (schema.title === undefined) ? '' : schema.title 
  let titleStyle = {};
  if (uiSchema["ui:title"] && typeof uiSchema["ui:title"] === 'string') { 
    title = uiSchema?.["ui:title"];
  } else if (uiSchema["ui:title"] && typeof uiSchema["ui:title"] === 'object') { 
    if (typeof uiSchema["ui:title"].title === "string") title = uiSchema["ui:title"].title;
    if (typeof uiSchema["ui:title"].title === "object") { 
      title = uiSchema["ui:title"].title.key;
      let titleOptions: I18nFormatOptions = {};
      titleOptions = { ...titleOptions, ...uiSchema["ui:title"].title.options };
    }
    if (typeof uiSchema["ui:title"].jss === "object") {
      titleStyle = { ...titleStyle, ...uiSchema["ui:title"].jss };
    }
  }

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
    spacing: 1,
    container: 'Paper',
    containerStyles: {
      padding: reactory?.muiTheme?.spacing(1) || '8px',
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
        style={titleStyle} /> : null}
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
            let sizeProps: any = { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 };
            if (rowProps.size) {
              sizeProps = { ...sizeProps, ...rowProps.size };
            } else {
              // backwards compatibility
              // @ts-ignore
              if (rowProps.xs) {
                // @ts-ignore
                sizeProps.xs = rowProps.xs;
                delete rowProps.xs;
              }
              // @ts-ignore
              if (rowProps.sm) {
                // @ts-ignore
                sizeProps.sm = rowProps.sm;
                delete rowProps.sm;
              }
              // @ts-ignore
              if (rowProps.md) {
                // @ts-ignore
                sizeProps.md = rowProps.md;
                delete rowProps.md;
              }
              // @ts-ignore
              if (rowProps.lg) {
                // @ts-ignore
                sizeProps.lg = rowProps.lg;
                delete rowProps.lg;
              }
              // @ts-ignore
              if (rowProps.xl) {
                // @ts-ignore
                sizeProps.xl = rowProps.xl;
                delete rowProps.xl;
              }
            }
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
                  <Grid {...rowProps} size={sizeProps} key={index} style={style} sx={rowProps.sx}>
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
                    <Grid {...rowProps} key={index} style={style}>
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
              return (<Grid {...rowProps} key={index} style={style}>
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

  switch (gridOptions.container) {
    case "div": {
      return (<div style={gridOptions.containerStyles}>{grid_content}</div>)
    }
    case "Paper":
    default: {
      return (<Paper 
        style={gridOptions.containerStyles} 
        elevation={gridOptions.elevation || 1} 
        {...gridOptions.containerProps}>{grid_content}</Paper>)
    }
  }
}


export default MaterialGridField;
