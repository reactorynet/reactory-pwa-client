/**
 * Basic Usage Examples for WorkflowDesigner Component
 * 
 * This file demonstrates various ways to use the WorkflowDesigner component
 * in your Reactory applications.
 */

import React from 'react';
import WorkflowDesigner, { 
  WorkflowDefinition, 
  ValidationResult,
  CanvasViewport,
  PortType
} from '../index';
import { DemoWorkflowDesigner } from './DemoWorkflow';

// Example 1: Basic Workflow Designer
export function BasicWorkflowDesigner() {
  const [workflowId, setWorkflowId] = React.useState<string>('');
  
  const handleSave = async (definition: WorkflowDefinition) => {
    console.log('Saving workflow:', definition);
    // Implement your save logic here
  };

  const handleLoad = async (id: string): Promise<WorkflowDefinition> => {
    console.log('Loading workflow:', id);
    // Implement your load logic here
    throw new Error('Load not implemented');
  };

  return (
    <WorkflowDesigner
      onSave={handleSave}
      onLoad={handleLoad}
      autoSave={true}
      autoSaveInterval={30000}
    />
  );
}

// Example 2: Read-only Workflow Viewer
export function WorkflowViewer({ workflowId }: { workflowId: string }) {
  const [definition, setDefinition] = React.useState<WorkflowDefinition | null>(null);

  React.useEffect(() => {
    // Load workflow definition
    // setDefinition(loadedDefinition);
  }, [workflowId]);

  return (
    <WorkflowDesigner
      workflowId={workflowId}
      initialDefinition={definition}
      readonly={true}
      showGrid={true}
      snapToGrid={false}
    />
  );
}

// Example 3: Workflow Designer with Custom Step Library
export function CustomWorkflowDesigner() {
  const customSteps = [
    {
      id: 'custom-task',
      name: 'Custom Task',
      category: 'custom',
      description: 'A custom task step',
      icon: 'extension',
      color: '#ff5722',
      inputPorts: [
        {
          name: 'input',
          type: PortType.INPUT,
          dataType: 'object',
          description: 'Custom input data'
        }
      ],
      outputPorts: [
        {
          name: 'output',
          type: PortType.OUTPUT,
          dataType: 'object',
          description: 'Custom output data'
        }
      ],
      propertySchema: {
        type: 'object' as const,
        properties: {
          customProperty: {
            type: 'string' as const,
            title: 'Custom Property',
            description: 'A custom configuration property',
            default: 'default value'
          }
        }
      },
      defaultProperties: {
        customProperty: 'default value'
      },
      tags: ['custom', 'extension']
    }
  ];

  return (
    <WorkflowDesigner
      stepLibrary={customSteps}
      onValidationChange={(result: ValidationResult) => {
        console.log('Validation result:', result);
      }}
    />
  );
}

// Example 4: Workflow Designer with Event Handlers
export function EventHandledWorkflowDesigner() {
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [viewport, setViewport] = React.useState<CanvasViewport | null>(null);
  
  const handleSelectionChange = (items: string[]) => {
    setSelectedItems(items);
    console.log('Selected items:', items);
  };

  const handleCanvasChange = (newViewport: CanvasViewport) => {
    setViewport(newViewport);
    console.log('Canvas viewport changed:', newViewport);
  };

  const handleValidationChange = (result: ValidationResult) => {
    if (result.errors.length > 0) {
      console.warn('Workflow validation errors:', result.errors);
    }
  };

  return (
    <div style={{ height: '100vh' }}>
      <WorkflowDesigner
        onSelectionChange={handleSelectionChange}
        onCanvasChange={handleCanvasChange}
        onValidationChange={handleValidationChange}
        enableCollaboration={false}
        showGrid={true}
        snapToGrid={true}
      />
      
      {/* Status Display */}
      <div style={{ position: 'absolute', top: 10, right: 10, background: 'white', padding: 10 }}>
        <p>Selected: {selectedItems.length} items</p>
        {viewport && (
          <p>Zoom: {Math.round(viewport.zoom * 100)}%</p>
        )}
      </div>
    </div>
  );
}

// Example 5: Workflow Designer with Templates
export function TemplateWorkflowDesigner() {
  const templates = [
    {
      id: 'basic-template',
      name: 'Basic Workflow',
      description: 'A simple start-to-end workflow template',
      category: 'basic',
      tags: ['starter', 'simple'],
      definition: {
        name: 'Basic Workflow Template',
        description: 'A simple workflow with start and end steps',
        steps: [
          {
            id: 'start-1',
            name: 'Start',
            type: 'start',
            position: { x: 100, y: 100 },
            properties: {},
            inputPorts: [],
            outputPorts: [
              {
                id: 'start-out',
                name: 'next',
                type: PortType.CONTROL_OUTPUT,
                dataType: 'any',
                position: { x: 200, y: 120 }
              }
            ]
          },
          {
            id: 'end-1',
            name: 'End',
            type: 'end',
            position: { x: 400, y: 100 },
            properties: {},
            inputPorts: [
              {
                id: 'end-in',
                name: 'previous',
                type: PortType.CONTROL_INPUT,
                dataType: 'any',
                position: { x: 400, y: 120 }
              }
            ],
            outputPorts: []
          }
        ],
        connections: [
          {
            id: 'conn-1',
            sourceStepId: 'start-1',
            sourcePortId: 'start-out',
            targetStepId: 'end-1',
            targetPortId: 'end-in'
          }
        ]
      }
    }
  ];

  return (
    <WorkflowDesigner
      templates={templates}
      showGrid={true}
      snapToGrid={true}
    />
  );
}

// Example 6: Collaborative Workflow Designer
export function CollaborativeWorkflowDesigner({ workflowId }: { workflowId: string }) {
  return (
    <WorkflowDesigner
      workflowId={workflowId}
      enableCollaboration={true}
      autoSave={true}
      autoSaveInterval={10000} // Save every 10 seconds in collaborative mode
      onSave={async (definition) => {
        // Implement collaborative save with conflict resolution
        console.log('Collaborative save:', definition);
      }}
      onLoad={async (id) => {
        // Load with real-time updates
        console.log('Collaborative load:', id);
        throw new Error('Load not implemented');
      }}
    />
  );
}

// Example 7: Custom Themed Workflow Designer
export function ThemedWorkflowDesigner() {
  const customTheme = {
    canvas: {
      backgroundColor: '#f8f9fa',
      gridColor: '#dee2e6',
      gridSize: 25,
      selectionColor: '#007bff',
      selectionOpacity: 0.2
    },
    steps: {
      defaultColor: '#ffffff',
      selectedColor: '#e7f3ff',
      errorColor: '#ffe6e6',
      warningColor: '#fff3e0',
      borderWidth: 2,
      borderRadius: 12,
      fontSize: 14,
      padding: 16
    },
    connections: {
      defaultColor: '#6c757d',
      selectedColor: '#007bff',
      errorColor: '#dc3545',
      strokeWidth: 3,
      arrowSize: 10
    }
  };

  return (
    <WorkflowDesigner
      theme={customTheme}
      showGrid={true}
      snapToGrid={true}
    />
  );
}

// Example 8: Workflow Designer with External State Management
export function ExternalStateWorkflowDesigner() {
  const [definition, setDefinition] = React.useState<WorkflowDefinition | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);

  const handleSave = async (def: WorkflowDefinition) => {
    // Save to external store (Redux, Zustand, etc.)
    setDefinition(def);
    setIsDirty(false);
    console.log('Saved to external store:', def);
  };

  React.useEffect(() => {
    // Load from external store
    // const loaded = getFromExternalStore();
    // setDefinition(loaded);
  }, []);

  return (
    <div>
      <div style={{ padding: 10, background: '#f5f5f5' }}>
        <button onClick={() => console.log('Current definition:', definition)}>
          Log Current Definition
        </button>
        <span style={{ marginLeft: 20 }}>
          {isDirty ? 'Unsaved changes' : 'Saved'}
        </span>
      </div>
      
      <WorkflowDesigner
        initialDefinition={definition}
        onSave={handleSave}
        onValidationChange={(result) => {
          setIsDirty(result.errors.length === 0);
        }}
      />
    </div>
  );
}
