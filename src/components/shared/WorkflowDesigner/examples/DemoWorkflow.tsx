/**
 * Demo Workflow Example
 * 
 * This example creates a sample workflow with various step types
 * to demonstrate the WorkflowDesigner functionality.
 */

import React from 'react';
import WorkflowDesigner, { WorkflowDefinition, generateId, generateStepId, generateConnectionId, PortType } from '../index';

// Create a sample workflow definition
export const createDemoWorkflow = (): WorkflowDefinition => {
  const startStepId = generateStepId('start');
  const taskStepId = generateStepId('task'); 
  const conditionStepId = generateStepId('condition');
  const parallelStepId = generateStepId('parallel');
  const task2StepId = generateStepId('task2');
  const task3StepId = generateStepId('task3');
  const joinStepId = generateStepId('join');
  const endStepId = generateStepId('end');

  return {
    id: generateId(),
    name: 'Demo Workflow',
    version: '1.0.0',
    namespace: 'demo',
    description: 'A sample workflow demonstrating various step types and connections',
    tags: ['demo', 'sample', 'tutorial'],
    steps: [
      // Start Step
      {
        id: startStepId,
        name: 'Start Process',
        type: 'start',
        position: { x: 100, y: 200 },
        size: { width: 200, height: 100 },
        properties: {
          name: 'Start Process'
        },
        inputPorts: [],
        outputPorts: [
          {
            id: generateId(),
            name: 'next',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 300, y: 250 }
          }
        ]
      },
      
      // Task Step
      {
        id: taskStepId,
        name: 'Process Data',
        type: 'task',
        position: { x: 400, y: 200 },
        size: { width: 200, height: 100 },
        properties: {
          name: 'Process Data',
          taskType: 'data_transform',
          configuration: {
            inputField: 'rawData',
            outputField: 'processedData',
            transformation: 'normalize'
          }
        },
        inputPorts: [
          {
            id: generateId(),
            name: 'previous',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 400, y: 250 }
          }
        ],
        outputPorts: [
          {
            id: generateId(),
            name: 'next',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 600, y: 250 }
          }
        ]
      },

      // Condition Step
      {
        id: conditionStepId,
        name: 'Check Quality',
        type: 'condition',
        position: { x: 700, y: 200 },
        size: { width: 200, height: 120 },
        properties: {
          name: 'Check Quality',
          expression: 'processedData.quality > 0.8'
        },
        inputPorts: [
          {
            id: generateId(),
            name: 'previous',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 700, y: 260 }
          }
        ],
        outputPorts: [
          {
            id: generateId(),
            name: 'true',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 900, y: 240 }
          },
          {
            id: generateId(),
            name: 'false',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 900, y: 280 }
          }
        ]
      },

      // Parallel Step
      {
        id: parallelStepId,
        name: 'Parallel Processing',
        type: 'parallel',
        position: { x: 1000, y: 150 },
        size: { width: 200, height: 120 },
        properties: {
          name: 'Parallel Processing',
          maxConcurrency: 2
        },
        inputPorts: [
          {
            id: generateId(),
            name: 'previous',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 1000, y: 210 }
          }
        ],
        outputPorts: [
          {
            id: generateId(),
            name: 'branch1',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 1200, y: 180 }
          },
          {
            id: generateId(),
            name: 'branch2',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 1200, y: 240 }
          }
        ]
      },

      // Task 2 - Branch 1
      {
        id: task2StepId,
        name: 'Generate Report',
        type: 'task',
        position: { x: 1300, y: 120 },
        size: { width: 200, height: 100 },
        properties: {
          name: 'Generate Report',
          taskType: 'custom_script',
          configuration: {
            reportType: 'summary',
            format: 'pdf'
          }
        },
        inputPorts: [
          {
            id: generateId(),
            name: 'previous',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 1300, y: 170 }
          }
        ],
        outputPorts: [
          {
            id: generateId(),
            name: 'next',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 1500, y: 170 }
          }
        ]
      },

      // Task 3 - Branch 2
      {
        id: task3StepId,
        name: 'Send Notification',
        type: 'task',
        position: { x: 1300, y: 280 },
        size: { width: 200, height: 100 },
        properties: {
          name: 'Send Notification',
          taskType: 'http_request',
          configuration: {
            url: 'https://api.notifications.com/send',
            method: 'POST',
            payload: {
              message: 'Processing complete'
            }
          }
        },
        inputPorts: [
          {
            id: generateId(),
            name: 'previous',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 1300, y: 330 }
          }
        ],
        outputPorts: [
          {
            id: generateId(),
            name: 'next',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 1500, y: 330 }
          }
        ]
      },

      // Join Step
      {
        id: joinStepId,
        name: 'Merge Results',
        type: 'join',
        position: { x: 1600, y: 200 },
        size: { width: 200, height: 120 },
        properties: {
          name: 'Merge Results',
          waitForAll: true
        },
        inputPorts: [
          {
            id: generateId(),
            name: 'branch1',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 1600, y: 230 }
          },
          {
            id: generateId(),
            name: 'branch2',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 1600, y: 270 }
          }
        ],
        outputPorts: [
          {
            id: generateId(),
            name: 'next',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 1800, y: 250 }
          }
        ]
      },

      // End Step
      {
        id: endStepId,
        name: 'Complete',
        type: 'end',
        position: { x: 1900, y: 200 },
        size: { width: 200, height: 100 },
        properties: {
          name: 'Complete',
          returnValue: 'success'
        },
        inputPorts: [
          {
            id: generateId(),
            name: 'previous',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 1900, y: 250 }
          }
        ],
        outputPorts: []
      },

      // Error handling path
      {
        id: generateStepId('error'),
        name: 'Handle Error',
        type: 'task',
        position: { x: 1000, y: 350 },
        size: { width: 200, height: 100 },
        properties: {
          name: 'Handle Error',
          taskType: 'custom_script',
          configuration: {
            action: 'log_error',
            notify: true
          }
        },
        inputPorts: [
          {
            id: generateId(),
            name: 'previous',
            type: PortType.CONTROL_INPUT,
            dataType: 'any',
            position: { x: 1000, y: 400 }
          }
        ],
        outputPorts: [
          {
            id: generateId(),
            name: 'next',
            type: PortType.CONTROL_OUTPUT,
            dataType: 'any',
            position: { x: 1200, y: 400 }
          }
        ]
      }
    ],
    connections: [
      // Main flow
      {
        id: generateConnectionId(),
        sourceStepId: startStepId,
        sourcePortId: 'start-out',
        targetStepId: taskStepId,
        targetPortId: 'task-in'
      },
      {
        id: generateConnectionId(),
        sourceStepId: taskStepId,
        sourcePortId: 'task-out',
        targetStepId: conditionStepId,
        targetPortId: 'condition-in'
      },
      {
        id: generateConnectionId(),
        sourceStepId: conditionStepId,
        sourcePortId: 'condition-true',
        targetStepId: parallelStepId,
        targetPortId: 'parallel-in'
      },
      
      // Parallel branches
      {
        id: generateConnectionId(),
        sourceStepId: parallelStepId,
        sourcePortId: 'parallel-branch1',
        targetStepId: task2StepId,
        targetPortId: 'task2-in'
      },
      {
        id: generateConnectionId(),
        sourceStepId: parallelStepId,
        sourcePortId: 'parallel-branch2',
        targetStepId: task3StepId,
        targetPortId: 'task3-in'
      },
      
      // Join branches
      {
        id: generateConnectionId(),
        sourceStepId: task2StepId,
        sourcePortId: 'task2-out',
        targetStepId: joinStepId,
        targetPortId: 'join-branch1'
      },
      {
        id: generateConnectionId(),
        sourceStepId: task3StepId,
        sourcePortId: 'task3-out',
        targetStepId: joinStepId,
        targetPortId: 'join-branch2'
      },
      
      // Final step
      {
        id: generateConnectionId(),
        sourceStepId: joinStepId,
        sourcePortId: 'join-out',
        targetStepId: endStepId,
        targetPortId: 'end-in'
      },
      
      // Error handling
      {
        id: generateConnectionId(),
        sourceStepId: conditionStepId,
        sourcePortId: 'condition-false',
        targetStepId: 'error',
        targetPortId: 'error-in'
      }
    ],
    variables: [
      {
        id: generateId(),
        name: 'rawData',
        type: 'object',
        description: 'Input data to be processed'
      },
      {
        id: generateId(),
        name: 'processedData',
        type: 'object',
        description: 'Data after processing and validation'
      },
      {
        id: generateId(),
        name: 'qualityThreshold',
        type: 'number',
        defaultValue: 0.8,
        description: 'Minimum quality score required'
      }
    ],
    configuration: {
      timeout: 300000,
      maxRetries: 3,
      retryDelay: 5000,
      priority: 5,
      parallelism: 2,
      notifications: {
        onSuccess: true,
        onFailure: true,
        channels: ['email', 'slack']
      }
    },
    metadata: {
      canvas: {
        zoom: 0.6,
        panX: -50,
        panY: -50,
        gridSize: 20,
        snapToGrid: true
      },
      ui: {
        selectedItems: [],
        collapsedPanels: []
      }
    }
  };
};

// Demo Component with Sample Workflow
export function DemoWorkflowDesigner() {
  const [definition, setDefinition] = React.useState<WorkflowDefinition>(() => createDemoWorkflow());

  const handleSave = React.useCallback(async (updatedDefinition: WorkflowDefinition) => {
    console.log('Demo workflow saved:', updatedDefinition);
    setDefinition(updatedDefinition);
  }, []);

  const handleValidationChange = React.useCallback((result) => {
    console.log('Demo workflow validation:', result);
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <h2 style={{ margin: 0 }}>WorkflowDesigner Demo</h2>
        <p style={{ margin: '5px 0 0 0', color: '#666' }}>
          Interactive demo showing a complete workflow with start, tasks, conditions, parallel processing, and end steps.
        </p>
      </div>
      
      <div style={{ flexGrow: 1 }}>
        <WorkflowDesigner
          initialDefinition={definition}
          onSave={handleSave}
          onValidationChange={handleValidationChange}
          showGrid={true}
          snapToGrid={true}
          autoSave={false}
        />
      </div>
    </div>
  );
}

export default DemoWorkflowDesigner;
