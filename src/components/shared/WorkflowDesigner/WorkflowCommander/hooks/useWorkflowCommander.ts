import { useState, useEffect, useCallback, useRef } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { gql } from '@apollo/client';
import {
  CommanderPosition,
  CommanderCoordinates,
  CommanderStorageState,
  WorkflowInstanceSummary,
  WorkflowScheduleItem,
} from '../types';

const DEFAULT_STORAGE_KEY = 'reactory_workflow_commander_pos';

const GET_ACTIVE_INSTANCES = gql`
  query GetActiveWorkflowInstances($limit: Int) {
    workflowInstances(pagination: { limit: $limit, page: 1 }) {
      instances {
        id
        name
        nameSpace
        version
        status
        startTime
        endTime
        duration
      }
      total
    }
  }
`;

const GET_SCHEDULES = gql`
  query GetWorkflowSchedules($limit: Int) {
    workflowSchedules(pagination: { limit: $limit, page: 1 }) {
      schedules {
        id
        name
        cronExpression
        enabled
        workflow {
          id
        }
        nextRun
        lastRun
      }
      total
    }
  }
`;

const DELETE_SCHEDULE = gql`
  mutation DeleteWorkflowSchedule($scheduleId: String!) {
    deleteWorkflowSchedule(scheduleId: $scheduleId) {
      success
      message
    }
  }
`;

const PAUSE_INSTANCE = gql`
  mutation PauseWorkflowInstance($instanceId: String!) {
    pauseWorkflowInstance(instanceId: $instanceId) {
      success
      message
    }
  }
`;

const RESUME_INSTANCE = gql`
  mutation ResumeWorkflowInstance($instanceId: String!) {
    resumeWorkflowInstance(instanceId: $instanceId) {
      success
      message
    }
  }
`;

const CANCEL_INSTANCE = gql`
  mutation CancelWorkflowInstance($instanceId: String!) {
    cancelWorkflowInstance(instanceId: $instanceId) {
      success
      message
    }
  }
`;

export interface UseWorkflowCommanderOptions {
  storageKey?: string;
  initialDock?: CommanderPosition;
}

export const useWorkflowCommander = ({
  storageKey = DEFAULT_STORAGE_KEY,
  initialDock = 'top-right',
}: UseWorkflowCommanderOptions = {}) => {
  const reactory = useReactory();

  // Position state (loaded from / persisted to localStorage)
  const [dock, setDock] = useState<CommanderPosition>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: CommanderStorageState = JSON.parse(saved);
        if (parsed?.dock) return parsed.dock;
      }
    } catch (e) {
      // Fallback on error
    }
    return initialDock;
  });

  const [customPosition, setCustomPosition] = useState<CommanderCoordinates | undefined>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: CommanderStorageState = JSON.parse(saved);
        if (parsed?.customPosition) return parsed.customPosition;
      }
    } catch (e) {
      // Fallback
    }
    return undefined;
  });

  const [activeInstances, setActiveInstances] = useState<WorkflowInstanceSummary[]>([]);
  const [schedules, setSchedules] = useState<WorkflowScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Active panel popup (e.g. 'tasks' | 'active_runs' | 'schedules' | 'quick_launch' | 'schedule_create' | null)
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // Save location to localStorage only
  const updatePosition = useCallback(
    (newDock: CommanderPosition, coords?: CommanderCoordinates) => {
      setDock(newDock);
      if (coords) setCustomPosition(coords);
      try {
        const payload: CommanderStorageState = {
          dock: newDock,
          customPosition: coords,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        // LocalStorage fallback
      }
    },
    [storageKey]
  );

  const fetchActiveInstances = useCallback(async () => {
    if (!reactory?.graphqlQuery) return;
    try {
      const res: any = await reactory.graphqlQuery(GET_ACTIVE_INSTANCES, { limit: 20 });
      if (res?.data?.workflowInstances?.instances) {
        setActiveInstances(res.data.workflowInstances.instances);
      }
    } catch (e) {
      // Non-critical
    }
  }, [reactory]);

  const fetchSchedules = useCallback(async () => {
    if (!reactory?.graphqlQuery) return;
    try {
      const res: any = await reactory.graphqlQuery(GET_SCHEDULES, { limit: 50 });
      if (res?.data?.workflowSchedules?.schedules) {
        const mapped = res.data.workflowSchedules.schedules.map((s: any) => ({
          id: s.id,
          name: s.name || s.workflow?.id || 'Unnamed Schedule',
          cronExpression: s.cronExpression,
          enabled: s.enabled,
          workflowId: s.workflow?.id || '',
          nextExecutionTime: s.nextRun,
          lastExecutionTime: s.lastRun,
        }));
        setSchedules(mapped);
      }
    } catch (e) {
      // Non-critical
    }
  }, [reactory]);

  const deleteSchedule = useCallback(
    async (scheduleId: string) => {
      if (!reactory?.graphqlMutation) return;
      const res: any = await reactory.graphqlMutation(DELETE_SCHEDULE, { scheduleId });
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      return res?.data?.deleteWorkflowSchedule;
    },
    [reactory]
  );

  const pauseInstance = useCallback(
    async (instanceId: string) => {
      if (!reactory?.graphqlMutation) return;
      const res: any = await reactory.graphqlMutation(PAUSE_INSTANCE, { instanceId });
      fetchActiveInstances();
      return res?.data?.pauseWorkflowInstance;
    },
    [reactory, fetchActiveInstances]
  );

  const resumeInstance = useCallback(
    async (instanceId: string) => {
      if (!reactory?.graphqlMutation) return;
      const res: any = await reactory.graphqlMutation(RESUME_INSTANCE, { instanceId });
      fetchActiveInstances();
      return res?.data?.resumeWorkflowInstance;
    },
    [reactory, fetchActiveInstances]
  );

  const cancelInstance = useCallback(
    async (instanceId: string) => {
      if (!reactory?.graphqlMutation) return;
      const res: any = await reactory.graphqlMutation(CANCEL_INSTANCE, { instanceId });
      fetchActiveInstances();
      return res?.data?.cancelWorkflowInstance;
    },
    [reactory, fetchActiveInstances]
  );

  useEffect(() => {
    fetchActiveInstances();
    fetchSchedules();

    if (!reactory) return;

    const handleEvent = () => {
      fetchActiveInstances();
      fetchSchedules();
    };

    if (typeof reactory.on === 'function') {
      reactory.on('workflow.status.changed', handleEvent);
      reactory.on('workflow.schedule.updated', handleEvent);
    }

    return () => {
      if (typeof reactory.off === 'function') {
        reactory.off('workflow.status.changed', handleEvent);
        reactory.off('workflow.schedule.updated', handleEvent);
      }
    };
  }, [fetchActiveInstances, fetchSchedules, reactory]);

  return {
    dock,
    customPosition,
    updatePosition,
    activeInstances,
    schedules,
    loading,
    activePanel,
    setActivePanel,
    deleteSchedule,
    pauseInstance,
    resumeInstance,
    cancelInstance,
    refreshInstances: fetchActiveInstances,
    refreshSchedules: fetchSchedules,
  };
};
