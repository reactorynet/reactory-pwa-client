import MaterialArrayField from "./MaterialArrayField";
import MaterialBooleanField from "./MaterialBooleanField";
import MaterialDescriptionField from "./MaterialDescriptionField";
import MaterialGridField from './MaterialGridField';
import MaterialNumberfield from "./MaterialNumberfield";
import MaterialObjectFieldClass from "./MaterialObjectField";
import MaterialSchemaField from './MaterialSchemaField';
import MaterialStringField from './MaterialStringField';
import MaterialTabbedField from "./MaterialTabbedField";
import MaterialTitleField from "./MaterialTitleField";
import MaterialUnsupportedField from './MaterialUnsupportedField';

const fields: Reactory.Forms.IReactoryFields = {
  ArrayField: MaterialArrayField,
  BooleanField: MaterialBooleanField,
  DescriptionField: MaterialDescriptionField,
  GridLayout: MaterialGridField,  
  NumberField: MaterialNumberfield,
  ObjectField: MaterialObjectFieldClass,
  SchemaField: MaterialSchemaField,
  StringField: MaterialStringField,
  TabbedLayout: MaterialTabbedField,
  TitleField: MaterialTitleField,
  UnsupportedField: MaterialUnsupportedField,
};

export default fields;