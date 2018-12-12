const GridFields = require('./GridField');
export default {
  MaterialStringField: require('./MaterialStringField'),
  MaterialTitleField: require('./MaterialTitleField'),
  MaterialArrayField: require('./MaterialArrayField').default,
  MaterialBooleanField: require('./MaterialBooleanField').default,
  MaterialObjectField: require('./MaterialObjectField').default,
  MaterialSchemaField: require('./MaterialSchemaField').default,
  MaterialGridField: GridFields.MaterialGridFieldComponent,
  BootstrapGridField: GridFields.BootstrapGridField
}