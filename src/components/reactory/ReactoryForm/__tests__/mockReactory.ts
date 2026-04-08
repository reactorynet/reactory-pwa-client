/**
 * Shared mock fixtures for ReactoryForm tests.
 * Provides a mock Reactory SDK and common test form definitions.
 */

export const createMockReactorySDK = (overrides: Record<string, any> = {}) => ({
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  i18n: {
    t: (key: string) => key,
    language: 'en',
  },
  utils: {
    nil: (v: any) => v === null || v === undefined,
    lodash: {
      isNil: (v: any) => v === null || v === undefined,
      isArray: Array.isArray,
      isString: (v: any) => typeof v === 'string',
      isEmpty: (v: any) => !v || (typeof v === 'object' && Object.keys(v).length === 0),
      find: jest.fn(),
      template: (str: string) => () => str,
      cloneDeep: (v: any) => JSON.parse(JSON.stringify(v)),
      get: jest.fn(),
      filter: jest.fn(),
      throttle: (fn: any) => fn,
    },
    template: (str: string) => () => str,
    objectMapper: jest.fn((data: any) => data),
    parseObjectMap: jest.fn((map: any) => map),
    localForage: {
      setItem: jest.fn(),
      getItem: jest.fn(),
    },
  },
  getComponent: jest.fn(() => null),
  getComponents: jest.fn(() => ({})),
  componentRegister: {},
  form: jest.fn(),
  formTranslationMaps: {},
  formValidationMaps: {},
  featureFlags: {
    isEnabled: jest.fn(() => false),
  },
  amq: {
    onReactoryPluginLoaded: jest.fn(),
  },
  on: jest.fn(),
  removeListener: jest.fn(),
  graphqlQuery: jest.fn(),
  graphqlMutation: jest.fn(),
  ...overrides,
});

export const createMockFormDefinition = (overrides: Record<string, any> = {}): any => ({
  id: 'test.TestForm@1.0.0',
  name: 'TestForm',
  nameSpace: 'test',
  version: '1.0.0',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      email: { type: 'string', title: 'Email' },
    },
  },
  uiSchema: {},
  uiSchemas: [],
  graphql: null,
  widgetMap: [],
  fieldMap: [],
  components: [],
  uiFramework: 'material',
  __complete__: true,
  defaultFormValue: { name: '', email: '' },
  ...overrides,
});

export const createMockFormProps = (overrides: Record<string, any> = {}): any => ({
  formId: 'test.TestForm@1.0.0',
  mode: 'edit',
  ...overrides,
});
