import { useCallback } from 'react';
import { Point, CanvasViewport } from '../../types';
import { canvasToScreen } from '../../utils';
import { DEFAULT_CONNECTION_THEME } from '../../constants';
import React from 'react';

interface ConnectionPreviewProps {
  startPoint: Point;
  currentPoint: Point;
  viewport: CanvasViewport;
  sourcePortType: 'input' | 'output';
}

export default function ConnectionPreview(props: ConnectionPreviewProps) {
  const {
    startPoint,
    currentPoint,
    viewport,
    sourcePortType
  } = props;

  // Convert canvas coordinates to screen coordinates
  const screenStart = canvasToScreen(startPoint, viewport);
  const screenCurrent = canvasToScreen(currentPoint, viewport);

  // Calculate control points for curved preview
  const calculateControlPoints = useCallback(() => {
    const deltaX = screenCurrent.x - screenStart.x;
    const deltaY = screenCurrent.y - screenStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Control point offset based on distance
    const controlOffset = Math.min(distance * 0.5, 100);
    
    return {
      cp1: {
        x: screenStart.x + controlOffset,
        y: screenStart.y
      },
      cp2: {
        x: screenCurrent.x - controlOffset,
        y: screenCurrent.y
      }
    };
  }, [screenStart, screenCurrent]);

  const { cp1, cp2 } = calculateControlPoints();

  // Generate SVG path for preview connection
  const pathData = `M ${screenStart.x} ${screenStart.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${screenCurrent.x} ${screenCurrent.y}`;

  const theme = DEFAULT_CONNECTION_THEME;
  const strokeColor = sourcePortType === 'input' ? '#2196f3' : '#4caf50';
  const strokeWidth = (theme.strokeWidth || 2) * 1.2;

  return (
    <g>
      {/* Preview connection path */}
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray="5,5"
        opacity={0.7}
        pointerEvents="none"
        style={{ 
          animation: 'dash 1s linear infinite'
        }}
      />

      {/* Start point indicator */}
      <circle
        cx={screenStart.x}
        cy={screenStart.y}
        r={6}
        fill={strokeColor}
        stroke="white"
        strokeWidth={2}
        opacity={0.9}
        pointerEvents="none"
      />

      {/* Current point indicator */}
      <circle
        cx={screenCurrent.x}
        cy={screenCurrent.y}
        r={4}
        fill={strokeColor}
        stroke="white"
        strokeWidth={2}
        opacity={0.7}
        pointerEvents="none"
      />

      {/* Define dash animation */}
      <defs>
        <style>
          {`
            @keyframes dash {
              to {
                stroke-dashoffset: -20;
              }
            }
          `}
        </style>
      </defs>
    </g>
  );
}
