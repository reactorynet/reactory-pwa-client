/**
 * Status maps for the WorkflowDesigner instance-viewer mode.
 *
 * These mirror the numeric status conventions used by workflow-es and the
 * server-side WorkflowInstanceInspector so that the designer overlay, the log
 * panel, and the overview panel present execution state consistently with the
 * rest of the workflow tooling.
 */

export interface StatusDescriptor {
  label: string;
  /** MUI palette colour key. */
  color: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  /** Material icon name. */
  icon: string;
}

/** Overall workflow instance status. */
export const WORKFLOW_STATUS: Record<number, StatusDescriptor> = {
  0: { label: 'PENDING', color: 'default', icon: 'schedule' },
  1: { label: 'RUNNING', color: 'primary', icon: 'play_circle' },
  2: { label: 'COMPLETE', color: 'success', icon: 'check_circle' },
  3: { label: 'TERMINATED', color: 'error', icon: 'error' },
  4: { label: 'SUSPENDED', color: 'warning', icon: 'pause_circle' },
};

/** Per-step execution status. */
export const STEP_STATUS: Record<number, StatusDescriptor> = {
  0: { label: 'LEGACY', color: 'default', icon: 'history' },
  1: { label: 'PENDING', color: 'default', icon: 'schedule' },
  2: { label: 'RUNNING', color: 'primary', icon: 'autorenew' },
  3: { label: 'COMPLETE', color: 'success', icon: 'check_circle' },
  4: { label: 'SLEEPING', color: 'info', icon: 'bedtime' },
  5: { label: 'WAITING', color: 'info', icon: 'hourglass_top' },
  6: { label: 'FAILED', color: 'error', icon: 'cancel' },
  7: { label: 'COMPENSATED', color: 'warning', icon: 'undo' },
  8: { label: 'CANCELLED', color: 'warning', icon: 'block' },
};

/** Numeric step status that represents a failure. */
export const STEP_STATUS_FAILED = 6;

/** Numeric step status that represents an actively running step. */
export const STEP_STATUS_RUNNING = 2;

export const getWorkflowStatus = (status: number): StatusDescriptor =>
  WORKFLOW_STATUS[status] || WORKFLOW_STATUS[0];

export const getStepStatus = (status: number): StatusDescriptor =>
  STEP_STATUS[status] || STEP_STATUS[1];

/**
 * Resolve a MUI palette colour key to a concrete hex/string colour from the
 * active theme. Falls back to the theme text colour for `default`.
 */
export const resolveStatusColor = (theme: any, descriptor: StatusDescriptor): string => {
  const palette = theme?.palette || {};
  if (descriptor.color === 'default') {
    return palette.text?.secondary || palette.grey?.[600] || '#757575';
  }
  return palette[descriptor.color]?.main || palette.primary?.main || '#1976d2';
};

export const formatDate = (d: string | null | undefined): string => {
  if (!d) return 'N/A';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString();
};

export const formatDuration = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Convert a step id / name of any casing convention into upper-cased words,
 * matching the WorkflowInstanceInspector's presentation.
 */
export const formatStepName = (raw: string | null | undefined): string => {
  if (!raw) return '';
  if (/^\(.*\)$/.test(raw)) return raw;
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/);
  return words.map((word) => word.toUpperCase()).join(' ');
};
