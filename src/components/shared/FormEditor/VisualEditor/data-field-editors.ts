// import { Reactory } from '@reactory/reactory-core';

export const commonGraphElementProperties = {
  name: {
    type: 'string',
    title: 'Name',
    description: 'The name of the graph data element'
  },
  text: {
    type: 'string',
    title: 'Query/Mutation Text',
    description: 'The GraphQL query or mutation string'
  },
  resultMap: {
    type: 'string', // JSON string for object map
    title: 'Result Map (JSON)',
    description: 'Map result data to correct data object'
  },
  variables: {
    type: 'string', // JSON string for object map
    title: 'Variables (JSON)',
    description: 'Map form data/context to query variables'
  },
  resultType: {
    type: 'string',
    title: 'Result Type',
    enum: ['string', 'number', 'date', 'object', 'array'],
    default: 'object'
  },
  resultKey: {
    type: 'string',
    title: 'Result Key',
    description: 'Key to extract single value from result'
  }
};

export const queryProperties = {
  ...commonGraphElementProperties,
  queryMessage: {
    type: 'string',
    title: 'Query Message',
    description: 'Message displayed while updating'
  },
  autoQuery: {
    type: 'boolean',
    title: 'Auto Query',
    description: 'Execute query automatically on mount'
  },
  autoQueryDelay: {
    type: 'integer',
    title: 'Auto Query Delay (ms)'
  },
  useWebsocket: {
    type: 'boolean',
    title: 'Use Websocket'
  }
};

export const mutationProperties = {
  ...commonGraphElementProperties,
  updateMessage: {
    type: 'string',
    title: 'Update Message'
  },
  onSuccessUrl: {
    type: 'string',
    title: 'Success Redirect URL'
  },
  onSuccessRedirectTimeout: {
    type: 'integer',
    title: 'Redirect Timeout (ms)',
    default: 500
  },
  onSuccessMethod: {
    type: 'string',
    title: 'Success Method',
    enum: ['refresh', 'redirect', 'event', 'notification', 'none'],
    default: 'notification'
  }
};

export const getQueryEditorSchema = () => ({
  type: 'object',
  properties: queryProperties,
  required: ['name', 'text']
});

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

export const getMutationEditorSchema = () => ({
  type: 'object',
  properties: mutationProperties,
  required: ['name', 'text']
});

export const getDataEditorUISchema = () => ({
  'ui:form': {
    style: { padding: '16px' }
  },
  text: {
    'ui:widget': 'textarea',
    'ui:options': { rows: 8, format: 'graphql' }
  },
  resultMap: {
    'ui:widget': 'textarea',
    'ui:options': { rows: 4, format: 'json' },
    'ui:help': 'Enter valid JSON object map'
  },
  variables: {
    'ui:widget': 'textarea',
    'ui:options': { rows: 4, format: 'json' },
    'ui:help': 'Enter valid JSON variable map'
  }
});
