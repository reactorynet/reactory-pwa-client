import { useState, useCallback, useMemo } from 'react';

/**
 * Represents a single loading stage in the form lifecycle.
 */
export interface FormLoadingStage {
  /** Unique key for the stage */
  key: string;
  /** Human-readable label */
  label: string;
  /** Current status */
  status: 'pending' | 'active' | 'complete' | 'error';
  /** Optional error message if status is 'error' */
  errorMessage?: string;
}

/**
 * The loading stage keys in order of execution.
 */
export const LOADING_STAGE_KEYS = [
  'form-definition',
  'ui-schema',
  'widgets',
  'resources',
  'data',
] as const;

export type LoadingStageKey = typeof LOADING_STAGE_KEYS[number];

/**
 * Default stage definitions with labels.
 */
const DEFAULT_STAGES: FormLoadingStage[] = [
  { key: 'form-definition', label: 'Loading form definition', status: 'pending' },
  { key: 'ui-schema', label: 'Resolving UI schema', status: 'pending' },
  { key: 'widgets', label: 'Mapping widgets & fields', status: 'pending' },
  { key: 'resources', label: 'Loading resources', status: 'pending' },
  { key: 'data', label: 'Fetching data', status: 'pending' },
];

export interface FormLoadingState {
  /** All loading stages */
  stages: FormLoadingStage[];
  /** Whether the form is still loading (not all stages complete) */
  isLoading: boolean;
  /** Whether any stage has errored */
  hasError: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** The currently active stage label */
  activeStageLabel: string;
  /** Mark a stage as active */
  setStageActive: (key: LoadingStageKey) => void;
  /** Mark a stage as complete */
  setStageComplete: (key: LoadingStageKey) => void;
  /** Mark a stage as errored */
  setStageError: (key: LoadingStageKey, message?: string) => void;
  /** Skip a stage (mark complete without it being active) */
  skipStage: (key: LoadingStageKey) => void;
  /** Reset all stages to pending */
  reset: () => void;
}

/**
 * Hook that tracks granular loading stages for ReactoryForm.
 * 
 * Provides progress tracking across the form loading lifecycle:
 * 1. Form definition resolution
 * 2. UI schema resolution
 * 3. Widget & field mapping
 * 4. Resource injection
 * 5. Data fetching
 */
export const useFormLoadingState = (): FormLoadingState => {
  const [stages, setStages] = useState<FormLoadingStage[]>(
    () => DEFAULT_STAGES.map(s => ({ ...s }))
  );

  const updateStage = useCallback(
    (key: LoadingStageKey, update: Partial<FormLoadingStage>) => {
      setStages(prev =>
        prev.map(stage =>
          stage.key === key ? { ...stage, ...update } : stage
        )
      );
    },
    []
  );

  const setStageActive = useCallback(
    (key: LoadingStageKey) => updateStage(key, { status: 'active' }),
    [updateStage]
  );

  const setStageComplete = useCallback(
    (key: LoadingStageKey) => updateStage(key, { status: 'complete' }),
    [updateStage]
  );

  const setStageError = useCallback(
    (key: LoadingStageKey, message?: string) =>
      updateStage(key, { status: 'error', errorMessage: message }),
    [updateStage]
  );

  const skipStage = useCallback(
    (key: LoadingStageKey) => updateStage(key, { status: 'complete' }),
    [updateStage]
  );

  const reset = useCallback(() => {
    setStages(DEFAULT_STAGES.map(s => ({ ...s })));
  }, []);

  const { isLoading, hasError, progress, activeStageLabel } = useMemo(() => {
    const total = stages.length;
    const completed = stages.filter(
      s => s.status === 'complete'
    ).length;
    const activeStage = stages.find(s => s.status === 'active');
    const errorStage = stages.find(s => s.status === 'error');

    return {
      isLoading: completed < total && !errorStage,
      hasError: !!errorStage,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      activeStageLabel: errorStage?.label || activeStage?.label || 'Preparing...',
    };
  }, [stages]);

  return {
    stages,
    isLoading,
    hasError,
    progress,
    activeStageLabel,
    setStageActive,
    setStageComplete,
    setStageError,
    skipStage,
    reset,
  };
};
