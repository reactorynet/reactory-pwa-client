const GridFields = require('./GridField');
export default {
  MaterialStringField: require('./MaterialStringField'),
  MaterialTitleField: require('./MaterialTitleField'),
  MaterialArrayField: require('./MaterialArrayField').default,
  MaterialGridField: GridFields.MaterialGridField,
  BootstrapGridField: GridFields.BootstrapGridField
}