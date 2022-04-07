const GridFields = require('./GridField');

export default {
  MaterialStringField: require('./MaterialStringField').default,
  MaterialTitleField: require('./MaterialTitleField').default,
  MaterialDescriptionField: require('./MaterialTitleField').MaterialDescriptionField,
  MaterialArrayField: require('./MaterialArrayField').default,
  MaterialBooleanField: require('./MaterialBooleanField').default,
  MaterialObjectField: require('./MaterialObjectField').default,
  MaterialSchemaField: require('./MaterialSchemaField').default,
  MaterialGridField: GridFields.MaterialGridFieldComponent,
  BootstrapGridField: GridFields.BootstrapGridField,
  MaterialTabbedField: require('./MaterialTabbedField').default
}