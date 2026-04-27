import Reactory from '@reactorynet/reactory-core';
// Side-effect import: augments Reactory.Forms.IReactoryForm with
// `options.engine` typing.
import '@reactory/client-core/components/reactory/form-engine/types';


const ReactoryNewForm: Reactory.Forms.IReactoryForm =  {
  id: 'core.ReactoryNewFormInput',
  name: 'ReactoryNewFormInput',
  nameSpace: 'core',
  version: '1.0.0',
  // Phase 3 first migration. This form is internal-only (used only by
  // the FormEditor 'create new form' dialog), has 4 string fields, and
  // exercises the v5 engine without depending on heavy widgets.
  // Roll back by setting engine: 'fork'.
  options: {
    engine: 'v5',
  },
  schema: {
    type: 'object',
    title: 'New Form Input',
    properties: {
      name: { type: 'string', title: 'Form Name', description: 'Provide a form name that does not contain any spaces, or special characters i.e. MyNewFormName' },
      nameSpace: { type: 'string', title: 'Form Name Space', description: 'Provide a namespace for the form, default will be form', defaultValue: 'form' },
      version: { type: 'string', title: 'Form Version', description: 'Provide a version number for your form', defaultValue: '1.0.0' },
      storage: { type: 'string', title: 'Form Storage', description: 'Decide where you want to store your form', defaultValue: 'local' },
    }
  },
  __complete__: true
}

export default ReactoryNewForm;