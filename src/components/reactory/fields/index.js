const GridFields = require('./GridField');
export default {
  MaterialStringField: require('./MaterialStringField'),
  MaterialTitleField: require('./MaterialTitleField'),
  MaterialArrayField: require('./MaterialArrayField').default,
  MaterialBooleanField: require('./MaterialBooleanField').default,
  MaterialGridField: GridFields.MaterialGridField,
  BootstrapGridField: GridFields.BootstrapGridField
}