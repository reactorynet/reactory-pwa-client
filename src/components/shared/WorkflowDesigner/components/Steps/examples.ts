/**
 * Example: Using the new workflow steps
 */

import { 
  GraphQLStepDefinition,
  RESTStepDefinition,
  GRPCStepDefinition,
  ServiceInvokeStepDefinition,
  UserActivityStepDefinition,
  TelemetryStepDefinition,
  ALL_STEP_DEFINITIONS,
  getStepDefinition,
  getStepsByCategory
} from './index';

// Example 1: Get all integration steps
const integrationSteps = getStepsByCategory('integration');
console.log('Integration steps:', integrationSteps.map(s => s.name));
// Output: ['GraphQL', 'REST API', 'gRPC', 'Service Invoke']

// Example 2: Get a specific step
const graphqlStep = getStepDefinition('graphql');
console.log('GraphQL step:', graphqlStep?.name);

// Example 3: Create a workflow with GraphQL step
const workflowWithGraphQL = {
  steps: [
    {
      id: 'step-1',
      type: 'start',
      name: 'Start',
      position: { x: 100, y: 100 },
      properties: {}
    },
    {
      id: 'step-2',
      type: 'graphql',
      name: 'Fetch Users',
      position: { x: 400, y: 100 },
      properties: {
        endpoint: 'https://api.example.com/graphql',
        operation: 'query',
        query: `
          query GetUsers($limit: Int) {
            users(limit: $limit) {
              id
              name
              email
            }
          }
        `,
        headers: {
          'Authorization': 'Bearer ${context.token}'
        }
      }
    },
    {
      id: 'step-3',
      type: 'rest',
      name: 'Post to Webhook',
      position: { x: 700, y: 100 },
      properties: {
        method: 'POST',
        url: 'https://webhook.example.com/notify',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    },
    {
      id: 'step-4',
      type: 'telemetry',
      name: 'Record Metrics',
      position: { x: 1000, y: 100 },
      properties: {
        telemetryType: 'metric',
        metricConfig: {
          name: 'workflow.users.fetched',
          type: 'counter',
          value: 1,
          tags: {
            source: 'workflow',
            operation: 'fetch_users'
          }
        }
      }
    },
    {
      id: 'step-5',
      type: 'end',
      name: 'End',
      position: { x: 1300, y: 100 },
      properties: {
        returnValue: 'success'
      }
    }
  ],
  connections: [
    { id: 'conn-1', sourceStepId: 'step-1', sourcePortId: 'next', targetStepId: 'step-2', targetPortId: 'previous' },
    { id: 'conn-2', sourceStepId: 'step-2', sourcePortId: 'next', targetStepId: 'step-3', targetPortId: 'previous' },
    { id: 'conn-3', sourceStepId: 'step-2', sourcePortId: 'data', targetStepId: 'step-3', targetPortId: 'body' },
    { id: 'conn-4', sourceStepId: 'step-3', sourcePortId: 'next', targetStepId: 'step-4', targetPortId: 'previous' },
    { id: 'conn-5', sourceStepId: 'step-4', sourcePortId: 'next', targetStepId: 'step-5', targetPortId: 'previous' }
  ]
};

// Example 4: User approval workflow
const approvalWorkflow = {
  steps: [
    {
      id: 'step-1',
      type: 'start',
      name: 'Start',
      position: { x: 100, y: 100 }
    },
    {
      id: 'step-2',
      type: 'user_activity',
      name: 'Manager Approval',
      position: { x: 400, y: 100 },
      properties: {
        activityType: 'approval',
        assignTo: {
          type: 'role',
          id: 'manager'
        },
        title: 'Approve Purchase Request',
        description: 'Please review and approve this purchase request',
        timeout: 48,
        notifications: {
          email: true,
          slack: true
        }
      }
    },
    {
      id: 'step-3',
      type: 'service_invoke',
      name: 'Process Order',
      position: { x: 700, y: 100 },
      properties: {
        serviceName: 'OrderService',
        serviceMethod: 'processOrder',
        errorHandling: 'retry',
        retryConfig: {
          maxAttempts: 3,
          delay: 1000,
          backoff: 'exponential'
        }
      }
    },
    {
      id: 'step-4',
      type: 'end',
      name: 'End',
      position: { x: 1000, y: 100 }
    }
  ]
};

// Example 5: List all available steps
console.log('All available steps:');
ALL_STEP_DEFINITIONS.forEach(step => {
  console.log(`  - ${step.name} (${step.id}) - ${step.description}`);
});
