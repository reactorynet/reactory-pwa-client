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
  isCreatingConnection?: boolean;
  onMove: (position: Point) => void;
  onResize: (size: Size) => void;
  onSelect: (multi: boolean) => void;
  onDoubleClick: () => void;
  onPortDragStart?: (stepId: string, portId: string, portType: 'input' | 'output', position: Point) => void;
  onPortDragEnd?: (stepId: string, portId: string, position: Point) => void;
  onContextMenu?: (event: React.MouseEvent, target: { type: 'step' | 'connection' | 'canvas'; id?: string; }) => void;
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
    isCreatingConnection,
    onMove,
    onResize,
    onSelect,
    onDoubleClick,
    onPortDragStart,
    onPortDragEnd,
    onContextMenu
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
  const [isDraggingPort, setIsDraggingPort] = useStateReact(false);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  // Helper function to create hover effect by adjusting color brightness
  const adjustColorForHover = useCallbackReact((color: string) => {
    // Convert hex to RGB, increase brightness slightly
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Increase brightness by 15% but cap at 255
    const newR = Math.min(255, Math.floor(r + (255 - r) * 0.15));
    const newG = Math.min(255, Math.floor(g + (255 - g) * 0.15));
    const newB = Math.min(255, Math.floor(b + (255 - b) * 0.15));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  }, []);

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
      // Apply subtle brightening for selected state too
      backgroundColor = adjustColorForHover(backgroundColor);
      borderColor = '#1976d2';
    }

    // Apply hover effect by subtly lightening the background (if not already selected)
    if (isHovered && !hasErrors && !hasWarnings && !selected) {
      backgroundColor = adjustColorForHover(backgroundColor);
    }

    return { backgroundColor, borderColor };
  }, [stepDefinition, hasErrors, hasWarnings, selected, isHovered, adjustColorForHover]);

  // Handle mouse interactions
  const handleMouseDown = useCallbackReact((event: React.MouseEvent) => {
    if (readonly) return;

    // Prevent dragging when right-clicking (for context menu)
    if (event.button === 2) {
      event.stopPropagation();
      onSelect(event.ctrlKey || event.metaKey);
      return;
    }

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

  // Handle context menu
  const handleContextMenu = useCallbackReact((event: React.MouseEvent) => {
    if (onContextMenu) {
      event.stopPropagation();
      onContextMenu(event, { type: 'step', id: step.id });
    }
  }, [onContextMenu, step.id]);

  // Port interaction handlers
  const handlePortMouseDown = useCallbackReact((event: React.MouseEvent, portId: string, portType: 'input' | 'output') => {
    if (readonly || !onPortDragStart) return;

    // Don't start a new connection if we're already creating one globally (prevents double drag start)
    if (isCreatingConnection) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    event.stopPropagation();
    event.preventDefault(); // Also prevent default behavior
    setIsDraggingPort(true);

    // CORRECT APPROACH: Convert browser coordinates to canvas-relative coordinates
    // We need to find the canvas element to convert coordinates properly
    const canvasElement = stepRef.current?.closest('[data-workflow-canvas="true"]') as HTMLElement;
    if (!canvasElement) {
      console.error('Could not find workflow canvas element for coordinate conversion');
      return;
    }
    
    const canvasRect = canvasElement.getBoundingClientRect();
    const portPosition: Point = {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top
    };
    
    // DEBUG: Let's see the difference between mouse coords and calculated coords
    const rect = stepRef.current?.getBoundingClientRect();
    if (rect) {
      const portSize = Math.min(12 * viewport.zoom, 16);
      const ports = portType === 'input' ? step.inputPorts : step.outputPorts;
      const portIndex = ports.findIndex(p => p.id === portId);
      
      if (portIndex !== -1) {
        const totalPorts = ports.length;
        const spacing = size.height / (totalPorts + 1); 
        const yPosition = spacing * (portIndex + 1) - portSize / 2;
        
        const calculatedPosition = {
          x: portType === 'input' ? rect.left : rect.left + rect.width,
          y: rect.top + yPosition + portSize / 2
        };
        
        console.log('🔍 Port click debug:', {
          portType,
          portIndex,
          browserCoords: { x: event.clientX, y: event.clientY },
          canvasCoords: portPosition,
          stepRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          canvasRect: { left: canvasRect.left, top: canvasRect.top },
          coordinateConversion: {
            browserToCanvas: {
              x: event.clientX - canvasRect.left,
              y: event.clientY - canvasRect.top
            }
          }
        });
      }
    }
    
    onPortDragStart(step.id, portId, portType, portPosition);
  }, [readonly, onPortDragStart, step.id, viewport.zoom, size.height, step.inputPorts, step.outputPorts, isCreatingConnection]);

  const handlePortMouseUp = useCallbackReact((event: React.MouseEvent, portId: string) => {
    if (readonly || !onPortDragEnd || !isDraggingPort) return;

    event.stopPropagation();
    event.preventDefault(); // Also prevent default behavior
    setIsDraggingPort(false);

    // Calculate actual port position based on our rendering logic
    const rect = stepRef.current?.getBoundingClientRect();
    if (rect) {
      const portSize = Math.min(12 * viewport.zoom, 16);
      
      // Determine port type and find the port index
      let portType: 'input' | 'output' = 'input';
      let ports = step.inputPorts;
      let portIndex = ports.findIndex(p => p.id === portId);
      
      if (portIndex === -1) {
        portType = 'output';
        ports = step.outputPorts;
        portIndex = ports.findIndex(p => p.id === portId);
      }
      
      if (portIndex !== -1) {
        const totalPorts = ports.length;
        const spacing = size.height * viewport.zoom / (totalPorts + 1); // Account for zoom in spacing
        const relativeY = spacing * (portIndex + 1) - portSize / 2;
        
        const portPosition: Point = {
          x: portType === 'input' 
            ? rect.left // Input ports are at left edge
            : rect.left + rect.width, // Output ports are at right edge
          y: rect.top + relativeY + portSize / 2 // Center of port
        };
        
        onPortDragEnd(step.id, portId, portPosition);
      }
    }
  }, [readonly, onPortDragEnd, step.id, isDraggingPort, viewport.zoom, size.height, step.inputPorts, step.outputPorts]);

  // Handle port mouse move to prevent unwanted canvas interactions
  const handlePortMouseMove = useCallbackReact((event: React.MouseEvent) => {
    if (isDraggingPort) {
      event.stopPropagation();
      event.preventDefault();
    }
  }, [isDraggingPort]);

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
    const {
      PlayArrow,
      Stop,
      Assignment,
      AltRoute,
      CallSplit,
      CallMerge,
      Extension,
      AccountTree,
      Functions,
      Settings,
      Timer,
      DataObject,
      Http,
      Email,
      Storage
    } = Material.MaterialIcons;

    // Map icon names to components
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'play_arrow': PlayArrow,
      'stop': Stop,
      'assignment': Assignment,
      'alt_route': AltRoute,
      'call_split': CallSplit,
      'call_merge': CallMerge,
      'extension': Extension,
      'account_tree': AccountTree,
      'functions': Functions,
      'settings': Settings,
      'timer': Timer,
      'data_object': DataObject,
      'http': Http,
      'email': Email,
      'storage': Storage
    };

    let iconName: string;
    
    if (stepDefinition?.icon) {
      iconName = stepDefinition.icon;
    } else {
      // Default icons based on step type
      switch (step.type) {
        case 'start': iconName = 'play_arrow'; break;
        case 'end': iconName = 'stop'; break;
        case 'task': iconName = 'assignment'; break;
        case 'condition': iconName = 'alt_route'; break;
        case 'parallel': iconName = 'call_split'; break;
        case 'join': iconName = 'call_merge'; break;
        case 'workflow': iconName = 'account_tree'; break;
        case 'function': iconName = 'functions'; break;
        case 'config': iconName = 'settings'; break;
        case 'timer': iconName = 'timer'; break;
        case 'data': iconName = 'data_object'; break;
        case 'http': iconName = 'http'; break;
        case 'email': iconName = 'email'; break;
        case 'database': iconName = 'storage'; break;
        default: iconName = 'extension'; break;
      }
    }

    const IconComponent = iconMap[iconName] || Extension;
    
    return (
      <IconComponent 
        sx={{ 
          fontSize: 'inherit',
          color: 'inherit'
        }} 
      />
    );
  }, [step.type, stepDefinition, Material.MaterialIcons]);

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
      onContextMenu={handleContextMenu}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor,
          border: `${Math.max(1, (selected ? 4 : 2.5) / viewport.zoom)}px solid ${borderColor}`,
          borderRadius: DEFAULT_STEP_THEME.borderRadius,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: selected ? 'translateY(-2px)' : isHovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.15s ease-in-out, border-width 0.15s ease-in-out',
          boxShadow: selected 
            ? '0 8px 24px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.15)' 
            : isHovered 
              ? '0 6px 16px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1)'
              : '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Step Header */}
        <Box
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minHeight: Math.min(40 * viewport.zoom, 60),
            backgroundColor: `${borderColor}20`
          }}
        >
          {/* Step Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: Math.min(24 * viewport.zoom, 32),
              height: Math.min(24 * viewport.zoom, 32),
              borderRadius: '50%',
              backgroundColor: borderColor,
              color: 'white',
              fontSize: Math.min(16 * viewport.zoom, 24)
            }}
          >
            {getStepIcon()}
          </Box>

          {/* Step Name */}
          <Typography
            variant="subtitle2"
            sx={{
              flexGrow: 1,
              fontSize: Math.min(12 * viewport.zoom, 20),
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
                    fontSize: Math.min(16 * viewport.zoom, 24), 
                    color: '#d32f2f' 
                  }} 
                />
              </Tooltip>
            )}
            {hasWarnings && (
              <Tooltip title={`${warnings.length} warning(s)`}>
                <WarningIcon 
                  sx={{ 
                    fontSize: Math.min(16 * viewport.zoom, 24), 
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
            fontSize: Math.min(10 * viewport.zoom, 16)
          }}
        >
          {/* Step Type */}
          <Chip
            label={stepDefinition?.name || step.type}
            size="small"
            sx={{
              fontSize: Math.min(10 * viewport.zoom, 14),
              height: Math.min(20 * viewport.zoom, 28),
              '& .MuiChip-label': {
                px: 1
              }
            }}
          />

          {/* Properties Summary */}
          {Object.keys(step.properties).length > 0 && (
            <Box sx={{ fontSize: Math.min(9 * viewport.zoom, 12) }}>
              <Typography variant="caption" color="text.secondary">
                {Object.keys(step.properties).length} properties configured
              </Typography>
            </Box>
          )}

        </Box>
      </Paper>

      {/* Input Ports - Left Side */}
      {step.inputPorts.map((port, index) => {
        const portSize = Math.min(12 * viewport.zoom, 16);
        const totalInputPorts = step.inputPorts.length;
        const spacing = size.height / (totalInputPorts + 1);
        const yPosition = spacing * (index + 1) - portSize / 2;
        
        return (
          <Box
            key={`input-${port.id}`}
            sx={{
              position: 'absolute',
              left: -portSize / 2,
              top: yPosition,
              width: portSize,
              height: portSize,
              backgroundColor: port.type === 'control_input' ? '#2196f3' : '#4caf50',
              borderRadius: '50%',
              border: `${Math.max(1, 2.5 / viewport.zoom)}px solid white`,
              cursor: readonly ? 'default' : 'crosshair',
              transition: 'transform 0.2s ease-in-out',
              zIndex: 20,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              '&:hover': {
                transform: 'scale(1.3)',
                boxShadow: '0 0 8px rgba(33, 150, 243, 0.5), 0 2px 4px rgba(0, 0, 0, 0.2)'
              }
            }}
            title={port.name}
            onMouseDown={(e) => handlePortMouseDown(e, port.id, 'input')}
            onMouseMove={handlePortMouseMove}
            onMouseUp={(e) => handlePortMouseUp(e, port.id)}
          />
        );
      })}

      {/* Output Ports - Right Side */}
      {step.outputPorts.map((port, index) => {
        const portSize = Math.min(12 * viewport.zoom, 16);
        const totalOutputPorts = step.outputPorts.length;
        const spacing = size.height / (totalOutputPorts + 1);
        const yPosition = spacing * (index + 1) - portSize / 2;
        
        return (
          <Box
            key={`output-${port.id}`}
            sx={{
              position: 'absolute',
              right: -portSize / 2,
              top: yPosition,
              width: portSize,
              height: portSize,
              backgroundColor: port.type === 'control_output' ? '#2196f3' : '#4caf50',
              borderRadius: '50%',
              border: `${Math.max(1, 2.5 / viewport.zoom)}px solid white`,
              cursor: readonly ? 'default' : 'crosshair',
              transition: 'transform 0.2s ease-in-out',
              zIndex: 20,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              '&:hover': {
                transform: 'scale(1.3)',
                boxShadow: '0 0 8px rgba(76, 175, 80, 0.5), 0 2px 4px rgba(0, 0, 0, 0.2)'
              }
            }}
            title={port.name}
            onMouseDown={(e) => handlePortMouseDown(e, port.id, 'output')}
            onMouseMove={handlePortMouseMove}
            onMouseUp={(e) => handlePortMouseUp(e, port.id)}
          />
        );
      })}

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
    </Box>
  );
}
