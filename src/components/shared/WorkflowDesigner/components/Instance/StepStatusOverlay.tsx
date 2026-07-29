import React, { useEffect, useState } from 'react';
import type {
  InstanceStepStatus,
  WorkflowStepDefinition,
  CanvasViewport,
  WorkflowCanvasViewportApi,
} from '../../types';
import StepDetailPopover from './StepDetailPopover';
import { getStepStatus, resolveStatusColor, STEP_STATUS_RUNNING } from './constants';

export interface StepStatusOverlayProps {
  reactory: Reactory.Client.IReactoryApi | Reactory.Client.ReactorySDK;
  steps: WorkflowStepDefinition[];
  stepStatusMap: Map<string, InstanceStepStatus>;
  /** Current viewport — a dependency used to recompute overlay geometry. */
  viewport: CanvasViewport;
  /** Imperative projection API from the canvas; null until the canvas is ready. */
  viewportApi: WorkflowCanvasViewportApi | null;
  /** The canvas area element, observed for size changes. */
  containerRef: React.RefObject<HTMLElement>;
  /** Publish the awaited event for a waiting step, continuing execution. */
  onSignalEvent?: (stepId: string, eventData: any) => Promise<void> | void;
}

interface OverlayRect {
  stepId: string;
  stepLabel: string;
  left: number;
  top: number;
  width: number;
  height: number;
  status: InstanceStepStatus;
}

/**
 * Renders per-step execution status on top of the (read-only) WebGL canvas in
 * instance-viewer mode: a status badge on every executed step, a prominent ring
 * on failed steps, and a click target that opens a detail popover. Because
 * `readonly` disables the canvas's own click→select, this overlay owns step
 * interaction in instance mode.
 */
const StepStatusOverlay: React.FC<StepStatusOverlayProps> = ({
  reactory,
  steps,
  stepStatusMap,
  viewport,
  viewportApi,
  containerRef,
  onSignalEvent,
}) => {
  const { Material } = reactory.getComponents<{ Material: Reactory.Client.Web.IMaterialModule }>([
    'material-ui.Material',
  ]);
  const { Box, Icon, Popover, Tooltip } = Material.MaterialCore;
  const theme = reactory.muiTheme;

  const [rects, setRects] = useState<OverlayRect[]>([]);
  const [sizeTick, setSizeTick] = useState(0);
  const [selected, setSelected] = useState<{ stepId: string; anchorEl: HTMLElement } | null>(null);

  // Recompute overlay geometry as a passive effect. Passive effects flush
  // child → parent, so the canvas's own updateViewport effect has already run
  // by the time this fires, meaning worldToScreen reads the up-to-date camera
  // (correct for both panning and programmatic zoom).
  useEffect(() => {
    if (!viewportApi) {
      setRects([]);
      return;
    }
    const next: OverlayRect[] = [];
    for (const step of steps) {
      const status = stepStatusMap.get(step.id);
      if (!status) continue;
      const size = step.size || { width: 200, height: 100 };
      const tl = viewportApi.worldToScreen({ x: step.position.x, y: step.position.y });
      const br = viewportApi.worldToScreen({ x: step.position.x + size.width, y: step.position.y + size.height });
      const left = Math.min(tl.x, br.x);
      const top = Math.min(tl.y, br.y);
      const width = Math.abs(br.x - tl.x);
      const height = Math.abs(br.y - tl.y);
      next.push({
        stepId: step.id,
        stepLabel: step.name || step.id,
        left,
        top,
        width,
        height,
        status,
      });
    }
    setRects(next);
  }, [viewport, stepStatusMap, steps, viewportApi, sizeTick]);

  // Recompute when the canvas element resizes (worldToScreen depends on the
  // canvas bounding rect, which can change without a viewport change).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setSizeTick((t) => t + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const selectedRect = selected ? rects.find((r) => r.stepId === selected.stepId) : null;

  return (
    <>
      {/* Overlay layer — transparent, only badges/rings capture pointer events */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 12,
        }}
      >
        {rects.map((rect) => {
          const descriptor = getStepStatus(rect.status.status);
          const color = resolveStatusColor(theme, descriptor);
          const isFailed = rect.status.failed;
          const isRunning = rect.status.status === STEP_STATUS_RUNNING && !isFailed;
          const isWaiting = Boolean(rect.status.waitingForEvent) && !isFailed;
          const isActive = (rect.status.active || isWaiting) && !isFailed;
          return (
            <React.Fragment key={rect.stepId}>
              {/* Status ring on the step body */}
              <Box
                onClick={(e: React.MouseEvent<HTMLElement>) => setSelected({ stepId: rect.stepId, anchorEl: e.currentTarget })}
                sx={{
                  position: 'absolute',
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  boxSizing: 'border-box',
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  border: isFailed ? `2px solid ${color}` : `1.5px solid ${color}`,
                  boxShadow: isFailed
                    ? `0 0 0 3px ${color}33, 0 0 12px ${color}66`
                    : isActive
                      ? `0 0 0 3px ${color}33`
                      : 'none',
                  animation: isActive ? 'wfInstancePulse 1.6s ease-in-out infinite' : 'none',
                  '@keyframes wfInstancePulse': {
                    '0%, 100%': { boxShadow: `0 0 0 2px ${color}22` },
                    '50%': { boxShadow: `0 0 0 5px ${color}44` },
                  },
                  transition: 'left 0.05s linear, top 0.05s linear, width 0.05s linear, height 0.05s linear',
                }}
              />
              {/* Status badge at the step's top-right corner */}
              <Tooltip title={`${rect.stepLabel} — ${rect.status.statusLabel || descriptor.label}`}>
                <Box
                  onClick={(e: React.MouseEvent<HTMLElement>) => setSelected({ stepId: rect.stepId, anchorEl: e.currentTarget })}
                  sx={{
                    position: 'absolute',
                    left: rect.left + rect.width - 12,
                    top: rect.top - 12,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    border: `2px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    zIndex: 1,
                  }}
                >
                  <Icon
                    sx={{
                      fontSize: 16,
                      color,
                      // Spin the circular-arrows icon to signal an actively
                      // executing step.
                      animation: isRunning ? 'wfInstanceSpin 1s linear infinite' : 'none',
                      '@keyframes wfInstanceSpin': {
                        from: { transform: 'rotate(0deg)' },
                        to: { transform: 'rotate(360deg)' },
                      },
                    }}
                  >
                    {descriptor.icon}
                  </Icon>
                </Box>
              </Tooltip>
            </React.Fragment>
          );
        })}
      </Box>

      {/* Step detail popover */}
      <Popover
        open={Boolean(selected && selectedRect)}
        anchorEl={selected?.anchorEl}
        onClose={() => setSelected(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {selectedRect && (
          <StepDetailPopover
            reactory={reactory}
            stepLabel={selectedRect.stepLabel}
            status={selectedRect.status}
            onSignalEvent={onSignalEvent}
            onSignalled={() => setSelected(null)}
          />
        )}
      </Popover>
    </>
  );
};

export default StepStatusOverlay;
