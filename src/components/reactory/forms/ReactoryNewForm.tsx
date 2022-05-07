import React from 'react';
import Form from '@reactory/client-core/components/reactory/form';
import ReactoryNewForm from '../formDefinitions/ReactoryNewFormInput';

export default () => {
  return <Form schema={ReactoryNewForm.schema} uiSchema={ReactoryNewForm.uiSchema || {}} />
}