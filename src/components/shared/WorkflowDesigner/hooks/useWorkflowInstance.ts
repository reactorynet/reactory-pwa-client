import { useEffect, useMemo, useState, useCallback } from 'react';
import { useReactory } from '@reactory/client-core/api';
import type {
  InstanceStepStatus,
  WorkflowInstanceData,
  WorkflowStepDefinition,
} from '../types';
import { STEP_STATUS_FAILED } from '../components/Instance/constants';

const INSTANCE_QUERY = `
  query WorkflowInstanceInspector($instanceId: String!) {
    workflowExecutionHistoryById(instanceId: $instanceId) {
      id
      workflowDefinitionId
      version
      status
      statusLabel
      description
      createTime
      completeTime
      duration
      data
      stepCount
      completedStepCount
      failedStepCount
      executionPointers {
        id
        stepId
        stepName
        status
        statusLabel
        startTime
        endTime
        duration
        retryCount
        active
        persistenceData
        eventData
        eventName
        outcome
        errorMessage
        errorStack
        errorTime
        errors {
          message
          stack
          errorTime
          retryCount
        }
      }
    }
  }
`;

const LOG_URL_QUERY = `
  query WorkflowInstanceLogFileUrl($instanceId: String!) {
    workflowInstanceLogFileUrl(instanceId: $instanceId)
  }
`;

export interface UseWorkflowInstanceResult {
  loading: boolean;
  error: string | null;
  instance: WorkflowInstanceData | null;
  /** Per-step execution status keyed by designer step id. */
  stepStatusMap: Map<string, InstanceStepStatus>;
  logContent: string | null;
  logLoading: boolean;
  logError: string | null;
  refresh: () => void;
  refreshLog: () => void;
}

/**
 * Loads a single workflow execution instance (and its log file) for the
 * WorkflowDesigner's instance-viewer mode. Enabled only when `instanceId` is
 * provided and `enabled` is true.
 *
 * The returned `stepStatusMap` is keyed by designer step id. Because the YAML
 * → designer converter sets `step.id = yamlStep.id` and
 * `step.name = yamlStep.name || yamlStep.id`, and the engine records each
 * execution pointer's `stepName` as `def.name || def.id`, a pointer is mapped
 * to a designer step by matching its `stepName` against either the step's
 * `name` or `id`.
 */
export function useWorkflowInstance(
  instanceId: string | undefined,
  steps: WorkflowStepDefinition[],
  enabled: boolean,
): UseWorkflowInstanceResult {
  const reactory = useReactory();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WorkflowInstanceData | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [logContent, setLogContent] = useState<string | null>(null);
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logRefreshKey, setLogRefreshKey] = useState<number>(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const refreshLog = useCallback(() => {
    setLogContent(null);
    setLogError(null);
    setLogRefreshKey((k) => k + 1);
  }, []);

  // ---- Fetch instance ----
  useEffect(() => {
    if (!enabled || !instanceId) {
      setInstance(null);
      return;
    }
    let cancelled = false;

    const fetchInstance = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await reactory.graphqlQuery<{ workflowExecutionHistoryById: WorkflowInstanceData }, any>(
          INSTANCE_QUERY,
          { instanceId },
        );
        if (cancelled) return;
        const data = result?.data?.workflowExecutionHistoryById;
        if (data) {
          setInstance(data);
        } else {
          setError('Workflow instance not found');
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load workflow instance');
          reactory.log(`Error fetching workflow instance: ${err?.message}`, { err }, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInstance();
    return () => { cancelled = true; };
  }, [enabled, instanceId, refreshKey, reactory]);

  // ---- Fetch log ----
  useEffect(() => {
    if (!enabled || !instanceId) return;
    let cancelled = false;

    const fetchLog = async () => {
      setLogLoading(true);
      setLogError(null);
      try {
        const result = await reactory.graphqlQuery<{ workflowInstanceLogFileUrl: string | null }, any>(
          LOG_URL_QUERY,
          { instanceId },
        );
        const url = result?.data?.workflowInstanceLogFileUrl ?? null;
        if (!url) {
          if (!cancelled) setLogContent(null);
          return;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const text = await response.text();
        if (!cancelled) setLogContent(text);
      } catch (err: any) {
        if (!cancelled) {
          setLogError(err?.message || 'Failed to load log file');
          reactory.log(`Error fetching workflow log: ${err?.message}`, { err }, 'error');
        }
      } finally {
        if (!cancelled) setLogLoading(false);
      }
    };

    fetchLog();
    return () => { cancelled = true; };
  }, [enabled, instanceId, logRefreshKey, reactory]);

  // ---- Map execution pointers → designer steps ----
  const stepStatusMap = useMemo(() => {
    const map = new Map<string, InstanceStepStatus>();
    if (!instance) return map;

    const pointers: any[] = instance.executionPointers || [];
    const stepResults: Record<string, unknown> = instance.data?.stepResults || {};

    // Build lookup from pointer identity (stepName) → designer step id.
    const stepByKey = new Map<string, string>();
    for (const step of steps) {
      if (step.name) stepByKey.set(step.name, step.id);
      stepByKey.set(step.id, step.id);
    }

    for (const pointer of pointers) {
      const key = pointer.stepName ?? String(pointer.stepId);
      const designerStepId = stepByKey.get(key) ?? (steps.some(s => s.id === key) ? key : undefined);
      if (!designerStepId) continue;

      const stepResult =
        stepResults[pointer.stepName] ??
        stepResults[pointer.stepId] ??
        undefined;

      const status: InstanceStepStatus = {
        stepId: designerStepId,
        status: Number(pointer.status),
        statusLabel: pointer.statusLabel,
        failed: Number(pointer.status) === STEP_STATUS_FAILED,
        active: Boolean(pointer.active),
        retryCount: pointer.retryCount ?? 0,
        startTime: pointer.startTime,
        endTime: pointer.endTime,
        duration: pointer.duration,
        outcome: pointer.outcome,
        eventName: pointer.eventName,
        errorMessage: pointer.errorMessage,
        errorStack: pointer.errorStack,
        errorTime: pointer.errorTime,
        errors: pointer.errors || [],
        stepResult,
      };

      // If a step has multiple pointers (retries / loops), prefer the most
      // significant: a failure wins, otherwise the latest active/complete.
      const existing = map.get(designerStepId);
      if (!existing || status.failed || (!existing.failed && status.active)) {
        map.set(designerStepId, status);
      }
    }

    return map;
  }, [instance, steps]);

  return {
    loading,
    error,
    instance,
    stepStatusMap,
    logContent,
    logLoading,
    logError,
    refresh,
    refreshLog,
  };
}
