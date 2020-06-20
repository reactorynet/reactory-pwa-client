import materialFieldTemplate from './MaterialFieldTemplate';

export default {
  MaterialObjectTemplate: require('./MaterialObjectTemplate'),
  MaterialFieldTemplate: materialFieldTemplate,
  MaterialArrayFieldTemplate: require('./MaterialArrayField'),
  MaterialErrorListTemplate: require('./MaterialFormErrorTemplate').MaterialFormTemplateComponent,
}
