import { useEffect, useState } from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  ReactoryFormSchemaHook,
} from './types';
import {
  DefaultLoadingSchema
} from './constants';

export const useSchema: ReactoryFormSchemaHook<unknown> = ({
  schema: initialSchema,
  uiSchemaActiveMenuItem,
  formId,
}) => {

  const reactory = useReactory();
  
  const [busy, setIsBusy] = useState<boolean>(true);
  const [formDefinition, setFormDefinition] = useState<Reactory.Forms.IReactoryForm>(reactory.form(formId));

  useEffect(() => { 
    setFormDefinition(reactory.form(formId));
  }, [formId]);

  useEffect(() => {
    setIsBusy(formDefinition.__complete__ === false);
  }, [formDefinition]);

  let _schema = initialSchema || DefaultLoadingSchema;
  if (formDefinition.__complete__ === true) { 
    _schema = formDefinition.schema as Reactory.Schema.AnySchema;
  }

  if (uiSchemaActiveMenuItem) {
    const {
      schema = null,
      schemaMergeStragegy = 'merge',
    } = uiSchemaActiveMenuItem;
    
    if(schema && schemaMergeStragegy === 'merge') {
      _schema = { ..._schema, ...schema };
    } 

    if(schema && schemaMergeStragegy === 'replace') {
      _schema = schema;
    }

    if(schema && schemaMergeStragegy === 'remove') {
      _schema = { ..._schema };
      Object.keys(schema).forEach((key) => {
        delete _schema[key];
      });
    }
  }

  return {
    schema: _schema,
    busy,
  }
};