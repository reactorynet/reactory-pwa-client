import { useState, useCallback } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { 
  WorkflowDefinition, 
  WorkflowQueryResult, 
  WorkflowMutationResult, 
  WorkflowsQueryResult 
} from '../types';

export interface UseGraphQLReturn {
  loading: boolean;
  error: string | null;
  getWorkflows: (filter?: any, pagination?: any) => Promise<WorkflowDefinition[]>;
  getWorkflow: (namespace: string, name: string) => Promise<WorkflowDefinition | null>;
  createWorkflow: (definition: WorkflowDefinition) => Promise<WorkflowDefinition>;
  updateWorkflow: (definition: WorkflowDefinition) => Promise<WorkflowDefinition>;
  deleteWorkflow: (workflowId: string) => Promise<boolean>;
  validateWorkflow: (definition: WorkflowDefinition) => Promise<any>;
}

export function useGraphQL(): UseGraphQLReturn {
  const reactory = useReactory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkflows = useCallback(async (
    filter?: any, 
    pagination?: any
  ): Promise<WorkflowDefinition[]> => {
    return handleRequest(async () => {
      const query = `
        query GetWorkflows($filter: WorkflowFilterInput, $pagination: PaginationInput) {
          workflows(filter: $filter, pagination: $pagination) {
            workflows {
              id
              name
              version
              namespace
              description
              tags
              author
              createdAt
              updatedAt
              isActive
            }
          }
        }
      `;

      const response = await reactory.graphqlQuery<WorkflowsQueryResult, {
        filter?: any;
        pagination?: any;
      }>(query, { filter, pagination });

      if (response.data?.workflows) {
        return response.data.workflows;
      }

      throw new Error('Failed to fetch workflows');
    });
  }, [reactory, handleRequest]);

  const getWorkflow = useCallback(async (
    namespace: string, 
    name: string
  ): Promise<WorkflowDefinition | null> => {
    return handleRequest(async () => {
      const query = `
        query GetWorkflow($namespace: String!, $name: String!) {
          workflow(namespace: $namespace, name: $name) {
            id
            name
            version
            namespace
            description
            tags
            author
            createdAt
            updatedAt
            configuration {
              timeout
              maxRetries
              retryDelay
              priority
              parallelism
              environment
              resources {
                cpu
                memory
                storage
              }
              notifications {
                onSuccess
                onFailure
                channels
              }
            }
            dependencies {
              name
              type
              version
              optional
              description
            }
            statistics {
              totalExecutions
              successfulExecutions
              failedExecutions
              averageExecutionTime
            }
          }
        }
      `;

      const response = await reactory.graphqlQuery<WorkflowQueryResult, {
        namespace: string;
        name: string;
      }>(query, { namespace, name });

      return response.data?.workflow || null;
    });
  }, [reactory, handleRequest]);

  const createWorkflow = useCallback(async (
    definition: WorkflowDefinition
  ): Promise<WorkflowDefinition> => {
    return handleRequest(async () => {
      const mutation = `
        mutation CreateWorkflow($definition: WorkflowDefinitionInput!) {
          createWorkflow(definition: $definition) {
            success
            workflow {
              id
              name
              version
              namespace
              description
              tags
              author
              createdAt
              updatedAt
            }
            error
          }
        }
      `;

      // Transform definition to GraphQL input format
      const input = {
        name: definition.name,
        version: definition.version,
        namespace: definition.namespace,
        description: definition.description,
        tags: definition.tags,
        configuration: definition.configuration,
        // Note: In a real implementation, you'd need to transform
        // the visual definition to the backend workflow format
        steps: definition.steps,
        connections: definition.connections,
        variables: definition.variables
      };

      const response = await reactory.graphqlMutation<WorkflowMutationResult, {
        definition: any;
      }>(mutation, { definition: input });

      if (response.data?.success && response.data.workflow) {
        return response.data.workflow;
      }

      throw new Error(response.data?.error || 'Failed to create workflow');
    });
  }, [reactory, handleRequest]);

  const updateWorkflow = useCallback(async (
    definition: WorkflowDefinition
  ): Promise<WorkflowDefinition> => {
    return handleRequest(async () => {
      const mutation = `
        mutation UpdateWorkflow($workflowId: String!, $definition: WorkflowDefinitionInput!) {
          updateWorkflow(workflowId: $workflowId, definition: $definition) {
            success
            workflow {
              id
              name
              version
              namespace
              description
              tags
              author
              createdAt
              updatedAt
            }
            error
          }
        }
      `;

      // Transform definition to GraphQL input format
      const input = {
        name: definition.name,
        version: definition.version,
        namespace: definition.namespace,
        description: definition.description,
        tags: definition.tags,
        configuration: definition.configuration,
        steps: definition.steps,
        connections: definition.connections,
        variables: definition.variables
      };

      const response = await reactory.graphqlMutation<WorkflowMutationResult, {
        workflowId: string;
        definition: any;
      }>(mutation, { 
        workflowId: definition.id,
        definition: input 
      });

      if (response.data?.success && response.data.workflow) {
        return response.data.workflow;
      }

      throw new Error(response.data?.error || 'Failed to update workflow');
    });
  }, [reactory, handleRequest]);

  const deleteWorkflow = useCallback(async (
    workflowId: string
  ): Promise<boolean> => {
    return handleRequest(async () => {
      const mutation = `
        mutation DeleteWorkflow($workflowId: String!) {
          deleteWorkflow(workflowId: $workflowId) {
            success
            message
            error
          }
        }
      `;

      const response = await reactory.graphqlMutation<{
        success: boolean;
        message?: string;
        error?: string;
      }, {
        workflowId: string;
      }>(mutation, { workflowId });

      if (response.data?.success) {
        return true;
      }

      throw new Error(response.data?.error || 'Failed to delete workflow');
    });
  }, [reactory, handleRequest]);

  const validateWorkflow = useCallback(async (
    definition: WorkflowDefinition
  ): Promise<any> => {
    return handleRequest(async () => {
      const mutation = `
        mutation ValidateWorkflow($definition: WorkflowDefinitionInput!) {
          validateWorkflow(definition: $definition) {
            isValid
            errors {
              field
              message
              code
            }
            warnings {
              field
              message
              code
            }
          }
        }
      `;

      // Transform definition to GraphQL input format
      const input = {
        name: definition.name,
        version: definition.version,
        namespace: definition.namespace,
        description: definition.description,
        tags: definition.tags,
        configuration: definition.configuration,
        steps: definition.steps,
        connections: definition.connections,
        variables: definition.variables
      };

      const response = await reactory.graphqlMutation<{
        isValid: boolean;
        errors: Array<{
          field: string;
          message: string;
          code: string;
        }>;
        warnings: Array<{
          field: string;
          message: string;
          code: string;
        }>;
      }, {
        definition: any;
      }>(mutation, { definition: input });

      return response.data;
    });
  }, [reactory, handleRequest]);

  return {
    loading,
    error,
    getWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    validateWorkflow
  };
}
