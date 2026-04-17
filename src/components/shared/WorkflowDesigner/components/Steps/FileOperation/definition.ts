import { StepDefinition, PortType } from '../../../types';

export const FileOperationStepDefinition: StepDefinition = {
  id: 'file_operation',
  name: 'File Operation',
  category: 'action',
  description: 'Perform file system operations (read, write, copy, move, delete)',
  icon: 'folder',
  color: '#8d6e63',
  inputPorts: [
    {
      name: 'previous',
      type: PortType.CONTROL_INPUT,
      dataType: 'any',
      description: 'Previous step in workflow'
    },
    {
      name: 'source',
      type: PortType.INPUT,
      dataType: 'string',
      description: 'Source file path'
    }
  ],
  outputPorts: [
    {
      name: 'next',
      type: PortType.CONTROL_OUTPUT,
      dataType: 'any',
      description: 'Next step in workflow'
    },
    {
      name: 'result',
      type: PortType.OUTPUT,
      dataType: 'any',
      description: 'Operation result (file content, status, etc.)'
    }
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Step Name',
        description: 'Name of the workflow step',
        default: 'File Operation'
      },
      operation: {
        type: 'string',
        title: 'Operation',
        description: 'File operation to perform',
        enum: ['read', 'write', 'copy', 'move', 'delete', 'exists', 'mkdir'],
        default: 'read'
      },
      source: {
        type: 'string',
        title: 'Source Path',
        description: 'Source file or directory path'
      },
      destination: {
        type: 'string',
        title: 'Destination Path',
        description: 'Destination path (for copy/move operations)'
      },
      content: {
        type: 'string',
        title: 'Content',
        description: 'Content to write (for write operation)'
      },
      encoding: {
        type: 'string',
        title: 'Encoding',
        description: 'File encoding',
        default: 'utf-8'
      },
      overwrite: {
        type: 'boolean',
        title: 'Overwrite',
        description: 'Overwrite existing files',
        default: false
      }
    },
    required: ['name', 'operation', 'source']
  },
  defaultProperties: {
    name: 'File Operation',
    operation: 'read',
    encoding: 'utf-8',
    overwrite: false
  },
  uiSchema: {
    'ui:order': ['name', 'operation', 'source', 'destination', 'content', 'encoding', 'overwrite'],
    operation: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'read', value: 'read', label: 'Read', icon: 'description' },
          { key: 'write', value: 'write', label: 'Write', icon: 'edit' },
          { key: 'copy', value: 'copy', label: 'Copy', icon: 'content_copy' },
          { key: 'move', value: 'move', label: 'Move', icon: 'drive_file_move' },
          { key: 'delete', value: 'delete', label: 'Delete', icon: 'delete' },
          { key: 'exists', value: 'exists', label: 'Exists', icon: 'search' },
          { key: 'mkdir', value: 'mkdir', label: 'Make Directory', icon: 'create_new_folder' }
        ]
      }
    },
    content: {
      'ui:widget': 'RichEditorWidget',
      'ui:options': {
        format: 'text',
        rows: 6
      }
    }
  },
  tags: ['action', 'file', 'io', 'filesystem'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'IO',
        colors: {
          body: 0x1a1a1a,
          bodyHover: 0x2a2a2a,
          bodySelected: 0x8d6e63,
          pins: 0x808080,
          pinsConnected: 0xb87333
        },
        features: {
          pinCount: 4
        },
        dimensions: {
          width: 100,
          height: 60
        }
      }
    }
  }
};
