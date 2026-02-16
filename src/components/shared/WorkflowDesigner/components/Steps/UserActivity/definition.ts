import { StepDefinition, PortType } from '../../../types';

export const UserActivityStepDefinition: StepDefinition = {
  id: 'user_activity',
  name: 'User Activity',
  category: 'interaction',
  description: 'Wait for user interaction or approval',
  icon: 'person',
  color: '#ff5722',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'data',
      type: PortType.INPUT,
      dataType: 'any',
      description: 'Data to present to user'
    }
  ],
  outputPorts: [
    {
      name: 'approved',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Path when user approves'
    },
    {
      name: 'rejected',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Path when user rejects'
    },
    {
      name: 'response',
      type: PortType.OUTPUT,
      dataType: 'any',
      description: 'User response data'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'User Activity'
      },
      activityType: {
        type: 'string',
        title: 'Activity Type',
        enum: ['approval', 'form', 'notification', 'task'],
        default: 'approval'
      },
      assignTo: {
        type: 'object',
        title: 'Assign To',
        properties: {
          type: {
            type: 'string',
            enum: ['user', 'role', 'group'],
            default: 'user'
          },
          id: {
            type: 'string',
            title: 'User/Role/Group ID'
          }
        }
      },
      title: {
        type: 'string',
        title: 'Title',
        description: 'Activity title shown to user'
      },
      description: {
        type: 'string',
        title: 'Description',
        description: 'Activity description'
      },
      formSchema: {
        type: 'object',
        title: 'Form Schema',
        description: 'JSON schema for user input form'
      },
      timeout: {
        type: 'number',
        title: 'Timeout (hours)',
        description: 'Hours before activity times out',
        minimum: 1,
        maximum: 168,
        default: 24
      },
      notifications: {
        type: 'object',
        title: 'Notifications',
        properties: {
          email: {
            type: 'boolean',
            title: 'Send Email',
            default: true
          },
          slack: {
            type: 'boolean',
            title: 'Send Slack Message',
            default: false
          }
        }
      }
    },
    required: ['name', 'activityType', 'assignTo']
  },
  defaultProperties: {
    name: 'User Activity',
    activityType: 'approval',
    timeout: 24,
    notifications: {
      email: true,
      slack: false
    }
  },
  uiSchema: {
    'ui:order': ['name', 'activityType', 'assignTo', 'title', 'description', 'formSchema', 'timeout', 'notifications'],
    description: {
      'ui:widget': 'textarea',
      'ui:options': {
        rows: 3
      }
    },
    formSchema: {
      'ui:widget': 'textarea',
      'ui:options': {
        rows: 5
      },
      'ui:help': 'JSON Schema for user input form'
    }
  },
  tags: ['interaction', 'user', 'approval', 'manual', 'activity']
};
