import { useReactory } from "@reactory/client-core/api";
import { useRef, useState, useCallback } from 'react';
import {
  WorkflowStepDefinition,
  StepDefinition,
  ValidationError,
  Point,
  Size,
  CanvasViewport
} from '../../types';
import { DEFAULT_STEP_THEME } from '../../constants';

interface WorkflowStepProps {
  step: WorkflowStepDefinition;
  stepDefinition?: StepDefinition;
  position: Point;
  size: Size;
  selected: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  readonly: boolean;
  viewport: CanvasViewport;
  onMove: (position: Point) => void;
  onResize: (size: Size) => void;
  onSelect: (multi: boolean) => void;
  onDoubleClick: () => void;
}

export default function WorkflowStep(props: WorkflowStepProps) {
  const {
    step,
    stepDefinition,
    position,
    size,
    selected,
    errors,
    warnings,
    readonly,
    viewport,
    onMove,
    onResize,
    onSelect,
    onDoubleClick
  } = props;

  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useState: useStateReact, useRef: useRefReact, useCallback: useCallbackReact } = React;

  const stepRef = useRefReact<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useStateReact(false);
  const [dragStart, setDragStart] = useStateReact<Point>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useStateReact(false);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  // Get step colors based on type and state
  const getStepColors = useCallbackReact(() => {
    const theme = DEFAULT_STEP_THEME;
    let backgroundColor = stepDefinition?.color || theme.defaultColor;
    let borderColor = stepDefinition?.color || '#bdbdbd';

    if (hasErrors) {
      backgroundColor = theme.errorColor;
      borderColor = '#d32f2f';
    } else if (hasWarnings) {
      backgroundColor = theme.warningColor;
      borderColor = '#f57c00';
    } else if (selected) {
      backgroundColor = theme.selectedColor;
      borderColor = '#1976d2';
    } else if (isHovered) {
      backgroundColor = '#f5f5f5';
    }

    return { backgroundColor, borderColor };
  }, [stepDefinition, hasErrors, hasWarnings, selected, isHovered]);

  // Handle mouse interactions
  const handleMouseDown = useCallbackReact((event: React.MouseEvent) => {
    if (readonly) return;

    event.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    onSelect(event.ctrlKey || event.metaKey);
  }, [readonly, onSelect]);

  const handleMouseMove = useCallbackReact((event: React.MouseEvent) => {
    if (!isDragging || readonly) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    const newPosition = {
      x: position.x + deltaX,
      y: position.y + deltaY
    };

    onMove(newPosition);
    setDragStart({ x: event.clientX, y: event.clientY });
  }, [isDragging, dragStart, position, onMove, readonly]);

  const handleMouseUp = useCallbackReact(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallbackReact((event: React.MouseEvent) => {
    event.stopPropagation();
    onDoubleClick();
  }, [onDoubleClick]);

  const handleMouseEnter = useCallbackReact(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallbackReact(() => {
    setIsHovered(false);
  }, []);

  const { backgroundColor, borderColor } = getStepColors();

  const {
    Box,
    Paper,
    Typography,
    Chip,
    Tooltip,
    IconButton
  } = Material.MaterialCore;

  const {
    Error: ErrorIcon,
    Warning: WarningIcon,
    PlayArrow,
    Stop,
    Assignment,
    AltRoute,
    CallSplit
  } = Material.MaterialIcons;

  // Get step icon based on type
  const getStepIcon = useCallbackReact(() => {
    if (stepDefinition?.icon) {
      // Return the icon name - in a real implementation, you'd map these to actual icons
      return stepDefinition.icon;
    }

    switch (step.type) {
      case 'start': return <PlayArrow />;
      case 'end': return <Stop />;
      case 'task': return <Assignment />;
      case 'condition': return <AltRoute />;
      case 'parallel': return <CallSplit />;
      default: return <Assignment />;
    }
  }, [step.type, stepDefinition]);

  return (
    <Box
      ref={stepRef}
      sx={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        pointerEvents: 'auto',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: selected ? 10 : 5,
        transition: isDragging ? 'none' : 'all 0.2s ease-in-out'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Paper
        elevation={selected ? 8 : (isHovered ? 4 : 2)}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor,
          border: `2px solid ${borderColor}`,
          borderRadius: DEFAULT_STEP_THEME.borderRadius / viewport.zoom,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: selected ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out'
        }}
      >
        {/* Step Header */}
        <Box
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minHeight: 40 / viewport.zoom,
            backgroundColor: `${borderColor}20`
          }}
        >
          {/* Step Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24 / viewport.zoom,
              height: 24 / viewport.zoom,
              borderRadius: '50%',
              backgroundColor: borderColor,
              color: 'white',
              fontSize: 16 / viewport.zoom
            }}
          >
            {getStepIcon()}
          </Box>

          {/* Step Name */}
          <Typography
            variant="subtitle2"
            sx={{
              flexGrow: 1,
              fontSize: Math.max(12 / viewport.zoom, 8),
              fontWeight: 'bold',
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {step.name}
          </Typography>

          {/* Status Icons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {hasErrors && (
              <Tooltip title={`${errors.length} error(s)`}>
                <ErrorIcon 
                  sx={{ 
                    fontSize: 16 / viewport.zoom, 
                    color: '#d32f2f' 
                  }} 
                />
              </Tooltip>
            )}
            {hasWarnings && (
              <Tooltip title={`${warnings.length} warning(s)`}>
                <WarningIcon 
                  sx={{ 
                    fontSize: 16 / viewport.zoom, 
                    color: '#f57c00' 
                  }} 
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Step Body */}
        <Box
          sx={{
            flexGrow: 1,
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            fontSize: Math.max(10 / viewport.zoom, 6)
          }}
        >
          {/* Step Type */}
          <Chip
            label={stepDefinition?.name || step.type}
            size="small"
            sx={{
              fontSize: Math.max(10 / viewport.zoom, 6),
              height: 20 / viewport.zoom,
              '& .MuiChip-label': {
                px: 1
              }
            }}
          />

          {/* Properties Summary */}
          {Object.keys(step.properties).length > 0 && (
            <Box sx={{ fontSize: Math.max(9 / viewport.zoom, 6) }}>
              <Typography variant="caption" color="text.secondary">
                {Object.keys(step.properties).length} properties configured
              </Typography>
            </Box>
          )}

          {/* Ports Indicators */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              mt: 'auto'
            }}
          >
            {/* Input Ports */}
            {step.inputPorts.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {step.inputPorts.map((port, index) => (
                  <Box
                    key={port.id}
                    sx={{
                      width: 8 / viewport.zoom,
                      height: 8 / viewport.zoom,
                      backgroundColor: port.type === 'control_input' ? '#2196f3' : '#4caf50',
                      borderRadius: '50%',
                      border: '1px solid white'
                    }}
                    title={port.name}
                  />
                ))}
              </Box>
            )}

            {/* Output Ports */}
            {step.outputPorts.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {step.outputPorts.map((port, index) => (
                  <Box
                    key={port.id}
                    sx={{
                      width: 8 / viewport.zoom,
                      height: 8 / viewport.zoom,
                      backgroundColor: port.type === 'control_output' ? '#2196f3' : '#4caf50',
                      borderRadius: '50%',
                      border: '1px solid white'
                    }}
                    title={port.name}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* Selection Indicator */}
        {selected && (
          <Box
            sx={{
              position: 'absolute',
              inset: -2 / viewport.zoom,
              border: `2px solid #1976d2`,
              borderRadius: (DEFAULT_STEP_THEME.borderRadius + 2) / viewport.zoom,
              pointerEvents: 'none',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
        )}

        {/* Drag Indicator */}
        {isDragging && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              pointerEvents: 'none'
            }}
          />
        )}
      </Paper>
    </Box>
  );
}
