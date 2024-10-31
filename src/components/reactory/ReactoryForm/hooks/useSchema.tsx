import { useEffect, useState } from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  ReactoryFormSchemaHook,
} from '../types';
import {
  DefaultLoadingSchema
} from '../constants';


/**
 * returns a schema object for the form. Form requires
 * either a schema input, or a form id to fetch the schema
 * from the reactory server.
 * 
 * A schema can also be provided via the uiSchemaActiveMenuItem.
 * 
 * Translations and other schema transformations are applied 
 * here.
 * @param props - the props object: { schema, uiSchemaActiveMenuItem, formId } 
 * @returns 
 */
export const useSchema: ReactoryFormSchemaHook<unknown> = (props) => {

  const {
    schema: initialSchema,
    uiSchemaActiveMenuItem,
    formId,
  } = props;

  const reactory = useReactory();
  
  const [busy, setIsBusy] = useState<boolean>(true);
  const [formDefinition, setFormDefinition] = useState<Reactory.Forms.IReactoryForm>(reactory.form(formId));

  useEffect(() => { 
    setFormDefinition(reactory.form(formId));
  }, [formId]);

  useEffect(() => {
    setIsBusy(formDefinition?.__complete__ === false);
  }, [formDefinition]);

  let _schema: Reactory.Schema.AnySchema = 
    formDefinition?.schema as Reactory.Schema.AnySchema || 
    initialSchema || 
    DefaultLoadingSchema;

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