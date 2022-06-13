import React from 'react';
import Form from '../form';
import ObjectFieldTemplate, { MaterialPaperObjectTemplate } from '../ux/mui/templates/MaterialObjectTemplate'
import FieldTemplate from '../ux/mui/templates/MaterialFieldTemplate';
import ReactoryNewForm from '../formDefinitions/ReactoryNewFormInput';
import { ReactoryForm } from '../ReactoryFormComponent'

export default () => {

  return <ReactoryForm formDef={ReactoryNewForm} />
  
  // return <Form 
  //     schema={ReactoryNewForm.schema}
  //     ObjectField={ObjectFieldTemplate}
  //     FieldTemplate={FieldTemplate}
  //    />
}