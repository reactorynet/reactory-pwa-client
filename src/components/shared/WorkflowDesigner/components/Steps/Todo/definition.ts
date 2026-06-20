import { StepDefinition, PortType } from '../../../types';

export const TodoStepDefinition: StepDefinition = {
  id: 'todo',
  name: 'Todo',
  category: 'action',
  description: 'Create, update, list or fetch todo items',
  icon: 'checklist',
  color: '#26a69a',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'todo', type: PortType.OUTPUT, dataType: 'object', description: 'The resulting todo item(s)' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'Todo' },
      action: { type: 'string', title: 'Action', enum: ['create', 'update', 'list', 'get'], default: 'create' },
      listId: { type: 'string', title: 'List Id', description: 'Identifier of the todo list' },
      title: { type: 'string', title: 'Title' },
      description: { type: 'string', title: 'Description' },
      status: {
        type: 'string',
        title: 'Status',
        enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
        default: 'pending',
      },
      todoId: { type: 'string', title: 'Todo Id', description: 'Identifier of an existing todo (update/get)' },
      assignee: { type: 'string', title: 'Assignee' },
    },
    required: ['name', 'action', 'listId'],
  },
  defaultProperties: { name: 'Todo', action: 'create', status: 'pending' },
  uiSchema: {
    'ui:order': ['name', 'action', 'listId', 'title', 'description', 'status', 'todoId', 'assignee'],
    action: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'create', value: 'create', label: 'Create' },
          { key: 'update', value: 'update', label: 'Update' },
          { key: 'list', value: 'list', label: 'List' },
          { key: 'get', value: 'get', label: 'Get' },
        ],
      },
    },
    status: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'pending', value: 'pending', label: 'Pending' },
          { key: 'in_progress', value: 'in_progress', label: 'In Progress' },
          { key: 'completed', value: 'completed', label: 'Completed' },
          { key: 'failed', value: 'failed', label: 'Failed' },
          { key: 'cancelled', value: 'cancelled', label: 'Cancelled' },
        ],
      },
    },
  },
  tags: ['action', 'todo', 'task', 'checklist'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'dipSwitch',
        labelPrefix: 'TODO',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0x26a69a, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { pinCount: 3 },
        dimensions: { width: 110, height: 70 },
      },
    },
  },
};
