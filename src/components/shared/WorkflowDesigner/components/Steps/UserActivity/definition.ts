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
        description: 'JSON schema for user input form',
        properties: {},
        additionalProperties: true
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
    activityType: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'approval', value: 'approval', label: 'Approval', icon: 'check_circle' },
          { key: 'form', value: 'form', label: 'Form Input', icon: 'dynamic_form' },
          { key: 'notification', value: 'notification', label: 'Notification', icon: 'notifications' },
          { key: 'task', value: 'task', label: 'Task', icon: 'task_alt' }
        ]
      }
    },
    assignTo: {
      type: {
        'ui:widget': 'SelectWidget',
        'ui:options': {
          selectOptions: [
            { key: 'user', value: 'user', label: 'Specific User', icon: 'person' },
            { key: 'role', value: 'role', label: 'Role', icon: 'badge' },
            { key: 'group', value: 'group', label: 'Group', icon: 'group' }
          ]
        }
      },
      id: {
        'ui:placeholder': 'user@domain.com, role-name, or group-id',
        'ui:help': 'Identifier of the user, role, or group to assign this activity to'
      }
    },
    title: {
      'ui:placeholder': 'e.g. Approve Purchase Request'
    },
    description: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        rows: 4
      },
      'ui:help': 'Detailed description of what the user needs to do'
    },
    formSchema: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'json',
        rows: 8
      },
      'ui:help': 'JSON Schema definition for the user input form (used when activityType is "form")'
    },
    timeout: {
      'ui:widget': 'SliderWidget',
      'ui:options': {
        min: 1,
        max: 168,
        step: 1,
        marks: true
      },
      'ui:help': 'Hours before this activity automatically times out (1h–1 week / 168h)'
    },
    notifications: {
      email: {
        'ui:help': 'Send an email notification when this activity is assigned'
      },
      slack: {
        'ui:help': 'Send a Slack message when this activity is assigned (requires Slack integration to be configured)'
      }
    }
  },
  tags: ['interaction', 'user', 'approval', 'manual', 'activity'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'dipSwitch',
        labelPrefix: 'SW',
      }
    }
  }
};
