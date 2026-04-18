import { useState, useCallback } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { 
  WorkflowDefinition,
  WorkflowsQueryResult,
} from '../types';

/**
 * Response shape returned by the saveWorkflowDefinition mutation,
 * matching the server's YamlWorkflowDefinition GraphQL type.
 */
export interface SaveWorkflowResult {
  saveWorkflowDefinition: {
    nameSpace: string;
    name: string;
    version: string;
    description: string | null;
    author: string | null;
    tags: string[] | null;
    loadStatus: string;
    yamlSource: string | null;
    location: string | null;
    errors: Array<{ stage: string; message: string; code: string | null }> | null;
    steps: Array<{
      id: string;
      name: string | null;
      type: string;
      designer: {
        position: { x: number; y: number } | null;
        size: { width: number; height: number } | null;
      } | null;
    }> | null;
    designer: {
      canvas: {
        zoom: number | null;
        panX: number | null;
        panY: number | null;
        gridSize: number | null;
        snapToGrid: boolean | null;
      } | null;
      connections: Array<{
        id: string;
        sourceStepId: string;
        sourcePort: string;
        targetStepId: string;
        targetPort: string;
        points: Array<{ x: number; y: number }> | null;
      }> | null;
    } | null;
  };
}

export interface DeleteWorkflowResult {
  deleteWorkflowDefinition: {
    success: boolean;
    message: string | null;
  };
}

export interface ValidateWorkflowResult {
  validateWorkflowDefinition: {
    valid: boolean;
    errors: Array<{ field: string; message: string; code: string | null }>;
    warnings: Array<{ field: string; message: string; code: string | null }>;
  };
}

export interface UseGraphQLReturn {
  loading: boolean;
  error: string | null;
  getWorkflows: (filter?: any, pagination?: any) => Promise<WorkflowDefinition[]>;
  getWorkflow: (namespace: string, name: string) => Promise<WorkflowDefinition | null>;
  saveWorkflowDefinition: (definition: WorkflowDefinition) => Promise<SaveWorkflowResult['saveWorkflowDefinition']>;
  deleteWorkflowDefinition: (nameSpace: string, name: string, version?: string) => Promise<boolean>;
  validateWorkflowDefinition: (definition: WorkflowDefinition) => Promise<ValidateWorkflowResult['validateWorkflowDefinition']>;
}

/**
 * Transforms a client-side WorkflowDefinition into the GraphQL WorkflowDefinitionInput shape.
 */
function toWorkflowDefinitionInput(definition: WorkflowDefinition) {
  return {
    nameSpace: definition.namespace,
    name: definition.name,
    version: definition.version,
    description: definition.description,
    author: definition.author,
    tags: definition.tags,
    inputs: null,
    outputs: null,
    variables: definition.variables ? JSON.stringify(definition.variables) : null,
    steps: definition.steps?.map((step) => ({
      id: step.id,
      name: step.name,
      type: step.type,
      description: step.metadata?.description ?? null,
      enabled: true,
      continueOnError: false,
      timeout: null,
      inputs: step.inputs ? JSON.stringify(step.inputs) : null,
      outputs: null,
      condition: null,
      dependsOn: null,
      config: step.config ? JSON.stringify(step.config) : null,
      designer: {
        position: step.position ? { x: step.position.x, y: step.position.y } : null,
        size: step.size ? { width: step.size.width, height: step.size.height } : null,
        ports: {
          inputs: step.inputPorts?.map((p) => ({
            name: p.name || p.id,
            label: p.name,
            position: p.position ? { x: p.position.x, y: p.position.y } : null,
            dataType: p.dataType ?? null,
          })),
          outputs: step.outputPorts?.map((p) => ({
            name: p.name || p.id,
            label: p.name,
            position: p.position ? { x: p.position.x, y: p.position.y } : null,
            dataType: p.dataType ?? null,
          })),
        },
      },
    })),
    designer: {
      canvas: definition.metadata?.canvas ? {
        zoom: definition.metadata.canvas.zoom ?? null,
        panX: definition.metadata.canvas.panX ?? null,
        panY: definition.metadata.canvas.panY ?? null,
        gridSize: definition.metadata.canvas.gridSize ?? null,
        snapToGrid: definition.metadata.canvas.snapToGrid ?? null,
      } : null,
      connections: definition.connections?.map((conn) => ({
        id: conn.id,
        sourceStepId: conn.sourceStepId,
        sourcePort: conn.sourcePortId,
        targetStepId: conn.targetStepId,
        targetPort: conn.targetPortId,
        points: conn.points?.map((p) => ({ x: p.x, y: p.y })),
        style: conn.metadata?.style ?? null,
        label: null,
      })),
      notes: null,
      groups: null,
    },
  };
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

      const response = await reactory.graphqlQuery<{ workflow: WorkflowDefinition | null }, {
        namespace: string;
        name: string;
      }>(query, { namespace, name });

      return response.data?.workflow || null;
    });
  }, [reactory, handleRequest]);

  const saveWorkflowDefinition = useCallback(async (
    definition: WorkflowDefinition
  ): Promise<SaveWorkflowResult['saveWorkflowDefinition']> => {
    return handleRequest(async () => {
      const mutation = `
        mutation SaveWorkflowDefinition($definition: WorkflowDefinitionInput!) {
          saveWorkflowDefinition(definition: $definition) {
            nameSpace
            name
            version
            description
            author
            tags
            loadStatus
            yamlSource
            location
            errors {
              stage
              message
              code
            }
            steps {
              id
              name
              type
              designer {
                position { x y }
                size { width height }
              }
            }
            designer {
              canvas {
                zoom
                panX
                panY
                gridSize
                snapToGrid
              }
              connections {
                id
                sourceStepId
                sourcePort
                targetStepId
                targetPort
                points { x y }
              }
            }
          }
        }
      `;

      const input = toWorkflowDefinitionInput(definition);

      const response = await reactory.graphqlMutation<SaveWorkflowResult, {
        definition: any;
      }>(mutation, { definition: input });

      if (response.data?.saveWorkflowDefinition) {
        const result = response.data.saveWorkflowDefinition;
        if (result.loadStatus !== 'SUCCESS' && result.loadStatus !== 'PARTIAL') {
          const errorMessages = result.errors?.map(e => e.message).join('; ') || 'Unknown error';
          throw new Error(`Failed to save workflow: ${errorMessages}`);
        }
        return result;
      }

      throw new Error('Failed to save workflow definition');
    });
  }, [reactory, handleRequest]);

  const deleteWorkflowDefinition = useCallback(async (
    nameSpace: string,
    name: string,
    version?: string
  ): Promise<boolean> => {
    return handleRequest(async () => {
      const mutation = `
        mutation DeleteWorkflowDefinition($nameSpace: String!, $name: String!, $version: String) {
          deleteWorkflowDefinition(nameSpace: $nameSpace, name: $name, version: $version) {
            success
            message
          }
        }
      `;

      const response = await reactory.graphqlMutation<DeleteWorkflowResult, {
        nameSpace: string;
        name: string;
        version?: string;
      }>(mutation, { nameSpace, name, version });

      if (response.data?.deleteWorkflowDefinition?.success) {
        return true;
      }

      throw new Error(
        response.data?.deleteWorkflowDefinition?.message || 'Failed to delete workflow definition'
      );
    });
  }, [reactory, handleRequest]);

  const validateWorkflowDefinition = useCallback(async (
    definition: WorkflowDefinition
  ): Promise<ValidateWorkflowResult['validateWorkflowDefinition']> => {
    return handleRequest(async () => {
      const mutation = `
        mutation ValidateWorkflowDefinition($definition: WorkflowDefinitionInput!) {
          validateWorkflowDefinition(definition: $definition) {
            valid
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

      const input = toWorkflowDefinitionInput(definition);

      const response = await reactory.graphqlMutation<ValidateWorkflowResult, {
        definition: any;
      }>(mutation, { definition: input });

      if (response.data?.validateWorkflowDefinition) {
        return response.data.validateWorkflowDefinition;
      }

      throw new Error('Failed to validate workflow definition');
    });
  }, [reactory, handleRequest]);

  return {
    loading,
    error,
    getWorkflows,
    getWorkflow,
    saveWorkflowDefinition,
    deleteWorkflowDefinition,
    validateWorkflowDefinition,
  };
}
