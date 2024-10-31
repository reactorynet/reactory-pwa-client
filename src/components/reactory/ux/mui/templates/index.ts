
import MaterialFieldTemplate from './MaterialFieldTemplate';
import MaterialArrayFieldTemplate from './MaterialArrayTemplate';
import MaterialDateFieldTemplate from './MaterialDateFieldTemplate';
import MaterialErrorListTemplate from './MaterialFormErrorList';
import MaterialObjectTemplate from './MaterialObjectTemplate';

const templates: Reactory.Forms.IReactoryTemplates = { 
  ArrayFieldTemplate: MaterialArrayFieldTemplate,
  FieldTemplate: MaterialFieldTemplate,
  DateFieldTemplate: MaterialDateFieldTemplate,
  ErrorListTemplate: MaterialErrorListTemplate,
  ObjectTemplate: MaterialObjectTemplate,
  FormErrorList: MaterialErrorListTemplate,  
}

export default templates;
