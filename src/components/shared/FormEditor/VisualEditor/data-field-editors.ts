// Schema definitions for the data-provider editor (ProviderSettingsDialog).
//
// NOTE: the per-query/mutation editor schemas that used to live here were
// replaced by the structured visual editors (GraphElementEditor / RESTCallEditor)
// and removed. Only the provider-level schema remains.

export const providerProperties = {
  alias: {
    type: 'string',
    title: 'Provider Alias',
    description: 'Unique key for this provider (e.g. "primary", "crm_api")'
  },
  type: {
    type: 'string',
    title: 'Provider Type',
    enum: ['graphql', 'rest', 'local', 'grpc', 'socket', 'none'],
    default: 'graphql'
  },
  options: {
    type: 'string', // JSON string for options
    title: 'Options (JSON)',
    description: 'Provider specific configuration options'
  }
};

export const getProviderEditorSchema = () => ({
  type: 'object',
  properties: providerProperties,
  required: ['alias', 'type']
});

export const getProviderEditorUISchema = () => ({
  'ui:form': {
    style: { padding: '16px' }
  },
  options: {
    'ui:widget': 'textarea',
    'ui:options': { rows: 8, format: 'json' },
    'ui:help': 'Enter valid JSON options'
  }
});
