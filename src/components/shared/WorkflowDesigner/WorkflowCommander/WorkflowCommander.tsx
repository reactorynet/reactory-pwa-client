import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  alpha,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AddAlarmIcon from '@mui/icons-material/AddAlarm';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScreenRotationIcon from '@mui/icons-material/ScreenRotation';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import SpeedIcon from '@mui/icons-material/Speed';

import { WorkflowCommanderProps, CommanderAction, CommanderPosition } from './types';
import { WorkflowCommanderFAB } from './WorkflowCommanderFAB';
import { WorkflowCommanderPopover } from './WorkflowCommanderPopover';
import { useWorkflowCommander } from './hooks/useWorkflowCommander';
import { useWorkflowTasks } from './hooks/useWorkflowTasks';
import { UserTaskQueuePanel } from './panels/UserTaskQueuePanel';
import { ActiveWorkflowsPanel } from './panels/ActiveWorkflowsPanel';
import { WorkflowScheduleManager } from './panels/WorkflowScheduleManager';
import { QuickLaunchDialog } from './panels/QuickLaunchDialog';

export const WorkflowCommander: React.FC<WorkflowCommanderProps> = ({
  variant = 'fab',
  initialPosition = 'top-right',
  storageKey = 'reactory_workflow_commander_pos',
  mode = 'dark',
  customActions = [],
  onTaskCompleted,
  onScheduleChanged,
  disabled = false,
  className,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isHoverDisabledRef = useRef(false);
  const toolbarContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    dock,
    customPosition,
    updatePosition,
    activeInstances,
    historyInstances,
    schedules,
    loading: commanderLoading,
    activePanel,
    setActivePanel,
    deleteSchedule,
    pauseInstance,
    resumeInstance,
    cancelInstance,
    refreshInstances,
    refreshSchedules,
  } = useWorkflowCommander({ storageKey, initialDock: initialPosition });

  const {
    tasks,
    loading: tasksLoading,
    refresh: refreshTasks,
    completeTask,
    pendingCount,
  } = useWorkflowTasks();

  const handleToggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (disabled || isHoverDisabledRef.current) return;
    setIsOpen(true);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    // Keep popover open on hover, dismiss on outside click or action
  }, []);

  // Dismiss on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!isOpen) return;
      const target = e.target as Element;
      const container = document.querySelector(
        variant === 'toolbar'
          ? '[data-workflow-commander-toolbar]'
          : '[data-workflow-commander-fab]'
      );
      if (container && !container.contains(target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, variant]);

  const handleCompleteTask = async (taskId: string, resultData: any) => {
    const res = await completeTask(taskId, resultData);
    if (onTaskCompleted) {
      const matched = tasks.find((t) => t.id === taskId);
      if (matched) onTaskCompleted(matched, resultData);
    }
    refreshInstances();
    return res;
  };

  const handleCycleDock = () => {
    const order: CommanderPosition[] = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
    const idx = order.indexOf(dock);
    const nextDock = order[(idx + 1) % order.length];
    updatePosition(nextDock, undefined);
  };

  const activeRunsCount = activeInstances.filter(
    (i) => i.status === 'RUNNING' || i.status === 'PENDING'
  ).length;

  const totalBadge = pendingCount + activeRunsCount;

  // Built-in actions (4x2 pages)
  const defaultActions: CommanderAction[] = useMemo(
    () => [
      {
        id: 'tasks',
        label: 'Task Queue',
        icon: <AssignmentIcon fontSize="small" />,
        badge: pendingCount,
        badgeColor: 'warning',
        tooltip: `${pendingCount} user tasks awaiting input`,
        onClick: () => {
          setActivePanel('tasks');
          setIsOpen(false);
          isHoverDisabledRef.current = true;
          setTimeout(() => { isHoverDisabledRef.current = false; }, 600);
        },
      },
      {
        id: 'active_runs',
        label: 'Active Runs',
        icon: <AccountTreeIcon fontSize="small" />,
        badge: activeRunsCount,
        badgeColor: 'info',
        tooltip: `${activeRunsCount} active workflow executions`,
        onClick: () => {
          setActivePanel('active_runs');
          setIsOpen(false);
          isHoverDisabledRef.current = true;
          setTimeout(() => { isHoverDisabledRef.current = false; }, 600);
        },
      },
      {
        id: 'schedules',
        label: 'Schedules',
        icon: <ScheduleIcon fontSize="small" />,
        badge: schedules.length,
        badgeColor: 'default',
        tooltip: 'Manage workflow trigger schedules',
        onClick: () => {
          setActivePanel('schedules');
          setIsOpen(false);
          isHoverDisabledRef.current = true;
          setTimeout(() => { isHoverDisabledRef.current = false; }, 600);
        },
      },
      {
        id: 'quick_launch',
        label: 'Quick Launch',
        icon: <RocketLaunchIcon fontSize="small" />,
        tooltip: 'Start a workflow with inputs',
        onClick: () => {
          setActivePanel('quick_launch');
          setIsOpen(false);
          isHoverDisabledRef.current = true;
          setTimeout(() => { isHoverDisabledRef.current = false; }, 600);
        },
      },
      {
        id: 'refresh',
        label: 'Refresh All',
        icon: <RefreshIcon fontSize="small" />,
        tooltip: 'Refresh tasks, instances and schedules',
        onClick: () => {
          refreshTasks();
          refreshInstances();
          refreshSchedules();
        },
      },
      {
        id: 'new_schedule',
        label: 'Add Schedule',
        icon: <AddAlarmIcon fontSize="small" />,
        tooltip: 'Create a new workflow schedule',
        onClick: () => {
          setActivePanel('schedules');
          setIsOpen(false);
          isHoverDisabledRef.current = true;
          setTimeout(() => { isHoverDisabledRef.current = false; }, 600);
        },
      },
      ...(variant === 'fab'
        ? [
            {
              id: 'cycle_dock',
              label: 'Dock Corner',
              icon: <ScreenRotationIcon fontSize="small" />,
              tooltip: `Current dock: ${dock}. Click to move corner.`,
              onClick: handleCycleDock,
            },
          ]
        : []),
      {
        id: 'history',
        label: 'Exec History',
        icon: <HistoryIcon fontSize="small" />,
        badge: historyInstances.length > 0 ? historyInstances.length : undefined,
        badgeColor: 'default',
        tooltip: 'Open workflow execution history',
        onClick: () => {
          setActivePanel('history');
          setIsOpen(false);
          isHoverDisabledRef.current = true;
          setTimeout(() => { isHoverDisabledRef.current = false; }, 600);
        },
      },
      ...customActions,
    ],
    [
      pendingCount,
      activeRunsCount,
      historyInstances.length,
      schedules.length,
      dock,
      variant,
      customActions,
      refreshTasks,
      refreshInstances,
      refreshSchedules,
    ]
  );

  return (
    <>
      {variant === 'toolbar' ? (
        <Box
          ref={toolbarContainerRef}
          className={className}
          data-workflow-commander-toolbar="true"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
        >
          <Tooltip title="Workflow Commander (Click or hover to open)" placement="bottom">
            <IconButton
              size="large"
              color="inherit"
              onClick={handleToggleOpen}
              disabled={disabled}
              aria-label="Workflow Commander"
              sx={{
                transition: 'all 0.2s ease',
                ...(activeRunsCount > 0 && {
                  color: mode === 'dark' ? '#00e5ff' : '#0288d1',
                  animation: 'activeToolbarPulse 1.6s infinite ease-in-out',
                  '@keyframes activeToolbarPulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                  },
                }),
              }}
            >
              <Badge
                badgeContent={totalBadge}
                color={pendingCount > 0 ? 'warning' : 'primary'}
                invisible={!totalBadge || totalBadge === 0}
              >
                <SpeedIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {isOpen && (
            <Box sx={{ position: 'absolute', top: '100%', right: 0, mt: 0.5, zIndex: 1450 }}>
              <WorkflowCommanderPopover
                actions={defaultActions}
                mode={mode}
                dock="top-right"
                onActionClick={(action, e) => action.onClick(e)}
              />
            </Box>
          )}
        </Box>
      ) : (
        /* Floating Draggable FAB */
        <WorkflowCommanderFAB
          dock={dock}
          customPosition={customPosition}
          onPositionChange={updatePosition}
          badgeCount={totalBadge}
          badgeColor={pendingCount > 0 ? 'warning' : 'primary'}
          isBusy={activeRunsCount > 0}
          isOpen={isOpen}
          onToggleOpen={handleToggleOpen}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={disabled}
          mode={mode}
          className={className}
          style={style}
        >
          <WorkflowCommanderPopover
            actions={defaultActions}
            mode={mode}
            dock={dock}
            onActionClick={(action, e) => action.onClick(e)}
          />
        </WorkflowCommanderFAB>
      )}

      {/* Dialog: Pending Task Queue */}
      <Dialog
        open={activePanel === 'tasks'}
        onClose={() => setActivePanel(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: mode === 'dark' ? '#121826' : '#ffffff',
            color: mode === 'dark' ? '#ffffff' : 'inherit',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Workflow Task Queue</DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <UserTaskQueuePanel
            tasks={tasks}
            loading={tasksLoading}
            onRefresh={refreshTasks}
            onCompleteTask={handleCompleteTask}
            mode={mode}
          />
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setActivePanel(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Active Workflows & Execution History */}
      <Dialog
        open={activePanel === 'active_runs' || activePanel === 'history'}
        onClose={() => setActivePanel(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: mode === 'dark' ? '#121826' : '#ffffff',
            color: mode === 'dark' ? '#ffffff' : 'inherit',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Workflow Executions</DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <ActiveWorkflowsPanel
            instances={activeInstances}
            historyInstances={historyInstances}
            initialTab={activePanel === 'history' ? 1 : 0}
            loading={commanderLoading}
            onRefresh={refreshInstances}
            onPause={pauseInstance}
            onResume={resumeInstance}
            onCancel={cancelInstance}
            mode={mode}
          />
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setActivePanel(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Workflow Schedules */}
      <Dialog
        open={activePanel === 'schedules'}
        onClose={() => setActivePanel(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: mode === 'dark' ? '#121826' : '#ffffff',
            color: mode === 'dark' ? '#ffffff' : 'inherit',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Workflow Schedule Manager</DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <WorkflowScheduleManager
            schedules={schedules}
            loading={commanderLoading}
            onRefresh={() => {
              refreshSchedules();
              if (onScheduleChanged) onScheduleChanged();
            }}
            onDeleteSchedule={async (id) => {
              const res = await deleteSchedule(id);
              if (onScheduleChanged) onScheduleChanged();
              return res;
            }}
            mode={mode}
          />
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setActivePanel(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Quick Launch */}
      <QuickLaunchDialog
        open={activePanel === 'quick_launch'}
        onClose={() => setActivePanel(null)}
        onLaunched={() => {
          refreshInstances();
          refreshTasks();
        }}
        mode={mode}
      />
    </>
  );
};

export default WorkflowCommander;
