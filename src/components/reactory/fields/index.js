const GridFields = require('./GridField');
export default {
  MaterialStringField: require('./MaterialStringField'),
  MaterialTitleField: require('./MaterialTitleField').default,
  MaterialDescriptionField: require('./MaterialTitleField').MaterialDescriptionField,
  MaterialArrayField: require('./MaterialArrayField'),
  MaterialBooleanField: require('./MaterialBooleanField'),
  MaterialObjectField: require('./MaterialObjectField'),
  MaterialSchemaField: require('./MaterialSchemaField'),
  MaterialGridField: GridFields.MaterialGridFieldComponent,
  BootstrapGridField: GridFields.BootstrapGridField
}