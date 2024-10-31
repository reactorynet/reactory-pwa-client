import React from 'react';
import { Paper, Grid, Button, Icon } from '@mui/material';
import { useRegistry } from '@reactory/client-core/components/reactory/form/components/hooks';
import { ArrayTemplateProps, MaterialArrayFieldType } from './types';
import Reactory from '@reactory/reactory-core';



const MaterialDefaultFixedArrayField: MaterialArrayFieldType = (props) => {
  const { 
    idSchema,
    schema,
    children,
    canAdd,
    formData,
    uiSchema,
    onAddClick,
  } = props;
  // @ts-ignore
  const {
    TitleField,
    DescriptionField,
    ErrorField,
    Field,
  } = useRegistry<any[], Reactory.Schema.IArraySchema, Reactory.Schema.IUISchema>({
    idSchema: props.idSchema,
    schema: props.schema as Reactory.Schema.IArraySchema,
    formContext: props.formContext,
    uiSchema: props.uiSchema,
    formData: props.formData,
    disabled: props.disabled,
    errorSchema: props.errorSchema,
    rawErrors: props.rawErrors
  });
  return (
    <Paper className={props.className}>
      <TitleField 
        idSchema={idSchema}
        schema={schema}
        uiSchema={uiSchema}
        />
      <DescriptionField 
        schema={schema} 
        idSchema={idSchema} 
        formData={schema.description} />
      <Grid container spacing={4}
        key={`array-item-list-${props.idSchema.$id}`}>
        {children}
      </Grid>

      {canAdd && (
        <Button variant="outlined"
          onClick={onAddClick}
          disabled={props.disabled || props.readonly}
        ><Icon>add</Icon></Button>
      )}
    </Paper>
  );
}