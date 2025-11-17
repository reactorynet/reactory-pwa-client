import { useState, useCallback } from 'react';
import { Point, CanvasViewport } from '../../types';
import { canvasToScreen } from '../../utils';
import { DEFAULT_CONNECTION_THEME } from '../../constants';
import React from 'react';

interface ConnectionProps {
  id: string;
  sourcePoint: Point;
  targetPoint: Point;
  viewport: CanvasViewport;
  selected: boolean;
  hasError: boolean;
  readonly: boolean;
  onSelect: (id: string) => void;
}

export default function Connection(props: ConnectionProps) {
  const {
    id,
    sourcePoint,
    targetPoint,
    viewport,
    selected,
    hasError,
    readonly,
    onSelect
  } = props;

  const [isHovered, setIsHovered] = useState(false);

  // Convert canvas coordinates to screen coordinates
  const screenSource = canvasToScreen(sourcePoint, viewport);
  const screenTarget = canvasToScreen(targetPoint, viewport);

  // Calculate control points for curved connection
  const calculateControlPoints = useCallback(() => {
    const deltaX = screenTarget.x - screenSource.x;
    const deltaY = screenTarget.y - screenSource.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Control point offset based on distance
    const controlOffset = Math.min(distance * 0.5, 100);
    
    return {
      cp1: {
        x: screenSource.x + controlOffset,
        y: screenSource.y
      },
      cp2: {
        x: screenTarget.x - controlOffset,
        y: screenTarget.y
      }
    };
  }, [screenSource, screenTarget]);

  const { cp1, cp2 } = calculateControlPoints();

  // Generate SVG path for curved connection
  const pathData = `M ${screenSource.x} ${screenSource.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${screenTarget.x} ${screenTarget.y}`;

  // Calculate arrow head points
  const calculateArrowHead = useCallback(() => {
    const angle = Math.atan2(screenTarget.y - cp2.y, screenTarget.x - cp2.x);
    const arrowLength = DEFAULT_CONNECTION_THEME.arrowSize || 8;
    const arrowAngle = Math.PI / 6; // 30 degrees

    return [
      // Arrow tip (target point)
      `${screenTarget.x},${screenTarget.y}`,
      // Left arrow point
      `${screenTarget.x - arrowLength * Math.cos(angle - arrowAngle)},${screenTarget.y - arrowLength * Math.sin(angle - arrowAngle)}`,
      // Right arrow point  
      `${screenTarget.x - arrowLength * Math.cos(angle + arrowAngle)},${screenTarget.y - arrowLength * Math.sin(angle + arrowAngle)}`
    ].join(' ');
  }, [screenTarget, cp2]);

  // Get connection colors based on state
  const getConnectionColors = useCallback(() => {
    const theme = DEFAULT_CONNECTION_THEME;
    let strokeColor = theme.defaultColor || '#757575';
    let fillColor = strokeColor;

    if (hasError) {
      strokeColor = theme.errorColor || '#d32f2f';
      fillColor = strokeColor;
    } else if (selected) {
      strokeColor = theme.selectedColor || '#1976d2';
      fillColor = strokeColor;
    } else if (isHovered) {
      strokeColor = theme.selectedColor || '#1976d2';
      fillColor = strokeColor;
    }

    return { strokeColor, fillColor };
  }, [hasError, selected, isHovered]);

  const { strokeColor, fillColor } = getConnectionColors();

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (readonly) return;
    event.stopPropagation();
    onSelect(id);
  }, [readonly, onSelect, id]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const strokeWidth = (DEFAULT_CONNECTION_THEME.strokeWidth || 2) * (selected ? 1.5 : 1);

  return (
    <g>
      {/* Invisible thick path for easier selection */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth * 3, 10)}
        style={{ cursor: readonly ? 'default' : 'pointer' }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Visible connection path */}
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={hasError ? '5,5' : 'none'}
        markerEnd="url(#arrowhead)"
        style={{ 
          cursor: readonly ? 'default' : 'pointer',
          transition: 'stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out'
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Arrow head */}
      <polygon
        points={calculateArrowHead()}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1}
        style={{ cursor: readonly ? 'default' : 'pointer' }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Selection indicator */}
      {selected && (
        <>
          <path
            d={pathData}
            fill="none"
            stroke="#1976d2"
            strokeWidth={strokeWidth + 4}
            opacity={0.3}
            pointerEvents="none"
          />
          
          {/* Selection dots along the path */}
          <circle
            cx={(screenSource.x + cp1.x) / 2}
            cy={(screenSource.y + cp1.y) / 2}
            r={3}
            fill="#1976d2"
            pointerEvents="none"
          />
          <circle
            cx={(cp1.x + cp2.x) / 2}
            cy={(cp1.y + cp2.y) / 2}
            r={3}
            fill="#1976d2"
            pointerEvents="none"
          />
          <circle
            cx={(cp2.x + screenTarget.x) / 2}
            cy={(cp2.y + screenTarget.y) / 2}
            r={3}
            fill="#1976d2"
            pointerEvents="none"
          />
        </>
      )}

      {/* Error indicator */}
      {hasError && (
        <circle
          cx={(screenSource.x + screenTarget.x) / 2}
          cy={(screenSource.y + screenTarget.y) / 2}
          r={8}
          fill="#d32f2f"
          stroke="white"
          strokeWidth={2}
          pointerEvents="none"
        >
          {/* Error icon - simplified exclamation mark */}
          <text
            x={(screenSource.x + screenTarget.x) / 2}
            y={(screenSource.y + screenTarget.y) / 2 + 3}
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
          >
            !
          </text>
        </circle>
      )}

      {/* Hover glow effect */}
      {isHovered && !selected && (
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 2}
          opacity={0.5}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
