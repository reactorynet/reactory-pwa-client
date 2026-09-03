import { useState, useEffect, useCallback } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { gql } from '@apollo/client';
import { WorkflowTask } from '../types';

const GET_USER_WORKFLOW_TASKS = gql`
  query GetUserWorkflowTasks($workflowId: String, $instanceId: String, $status: String) {
    userWorkflowTasks(workflowId: $workflowId, instanceId: $instanceId, status: $status) {
      id
      title
      description
      category
      workflowStatus
      status
      percentComplete
      workflowId
      instanceId
      stepId
      stepNumber
      componentFqn
      componentProps
      formSchemaId
      resultData
      createdAt
      updatedAt
      dueDate
    }
  }
`;

const COMPLETE_WORKFLOW_TASK = gql`
  mutation CompleteWorkflowTask($taskId: String!, $resultData: Any) {
    completeWorkflowTask(taskId: $taskId, resultData: $resultData) {
      success
      message
      task {
        id
        status
        completionDate
      }
    }
  }
`;

export interface UseWorkflowTasksOptions {
  workflowId?: string;
  instanceId?: string;
  autoRefresh?: boolean;
}

export const useWorkflowTasks = (options: UseWorkflowTasksOptions = {}) => {
  const reactory = useReactory();
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!reactory?.graphqlQuery) return;
    try {
      setLoading(true);
      setError(null);
      const response: any = await reactory.graphqlQuery(GET_USER_WORKFLOW_TASKS, {
        workflowId: options.workflowId,
        instanceId: options.instanceId,
      });

      if (response?.data?.userWorkflowTasks) {
        setTasks(response.data.userWorkflowTasks);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load workflow tasks');
    } finally {
      setLoading(false);
    }
  }, [reactory, options.workflowId, options.instanceId]);

  const completeTask = useCallback(
    async (taskId: string, resultData: any = {}) => {
      if (!reactory?.graphqlMutation) {
        throw new Error('Reactory client not available');
      }

      const res: any = await reactory.graphqlMutation(COMPLETE_WORKFLOW_TASK, {
        taskId,
        resultData,
      });

      // Update local task state immediately
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return res?.data?.completeWorkflowTask;
    },
    [reactory]
  );

  // Subscribe to real-time events for task queue updates
  useEffect(() => {
    fetchTasks();

    if (!reactory) return;

    const handleEvent = () => {
      fetchTasks();
    };

    if (typeof reactory.on === 'function') {
      reactory.on('workflow.task.created', handleEvent);
      reactory.on('workflow.task.completed', handleEvent);
      reactory.on('workflow.status.changed', handleEvent);
    }

    return () => {
      if (typeof reactory.off === 'function') {
        reactory.off('workflow.task.created', handleEvent);
        reactory.off('workflow.task.completed', handleEvent);
        reactory.off('workflow.status.changed', handleEvent);
      }
    };
  }, [fetchTasks, reactory]);

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
    completeTask,
    pendingCount: tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
  };
};
