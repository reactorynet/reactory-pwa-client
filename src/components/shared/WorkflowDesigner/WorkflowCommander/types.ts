import React from 'react';
import { TooltipProps } from '@mui/material';

export type CommanderPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'custom';

export interface CommanderCoordinates {
  x: number;
  y: number;
}

export interface CommanderStorageState {
  dock: CommanderPosition;
  customPosition?: CommanderCoordinates;
}

export interface CommanderAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  tooltip?: string;
  tooltipProps?: Partial<TooltipProps>;
}

export interface WorkflowTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | string;
  workflowStatus?: string;
  percentComplete?: number;
  workflowId?: string;
  instanceId?: string;
  stepId?: string;
  stepNumber?: number;
  componentFqn?: string;
  componentProps?: any;
  formSchemaId?: string;
  resultData?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
  dueDate?: string | Date;
}

export interface WorkflowInstanceSummary {
  id: string;
  name: string;
  nameSpace: string;
  version: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELLED';
  startTime?: string | Date;
  endTime?: string | Date;
  duration?: number;
}

export interface WorkflowHistoryItem {
  id: string;
  workflowDefinitionId: string;
  version: string;
  status: number;
  statusLabel: string;
  description?: string;
  createTime: string | Date;
  completeTime?: string | Date;
  duration?: number;
  stepCount: number;
  completedStepCount: number;
  failedStepCount: number;
  logFileUrl?: string;
}

export interface WorkflowScheduleItem {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  workflowId: string;
  nextExecutionTime?: string;
  lastExecutionTime?: string;
}

export interface WorkflowCommanderProps {
  /** Rendering variant: 'fab' (floating draggable) or 'toolbar' (in app bar/header) */
  variant?: 'fab' | 'toolbar';
  /** Initial or controlled position docking (used in 'fab' mode) */
  initialPosition?: CommanderPosition;
  /** Storage key for persisting FAB coordinates */
  storageKey?: string;
  /** Primary mode: 'dark' | 'light' */
  mode?: 'dark' | 'light' | string;
  /** Optional extra custom actions added to grid */
  customActions?: CommanderAction[];
  /** Callback on task resolution */
  onTaskCompleted?: (task: WorkflowTask, result: any) => void;
  /** Callback on schedule created/deleted */
  onScheduleChanged?: () => void;
  /** Whether the commander is disabled */
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
