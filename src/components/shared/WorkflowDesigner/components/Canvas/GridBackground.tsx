import { CanvasViewport } from '../../types';

interface GridBackgroundProps {
  viewport: CanvasViewport;
  gridSize: number;
  color: string;
  opacity?: number;
}

export default function GridBackground({ viewport, gridSize, color, opacity = 0.3 }: GridBackgroundProps) {
  // Calculate grid lines that are visible in the current viewport
  const { zoom, panX, panY, bounds } = viewport;
  
  // Calculate the actual grid size on screen
  const screenGridSize = gridSize * zoom;
  
  // Don't render grid if it's too small or too large
  if (screenGridSize < 5 || screenGridSize > 200) {
    return null;
  }

  // Calculate visible area in canvas coordinates
  const visibleLeft = (-panX) / zoom;
  const visibleTop = (-panY) / zoom;
  const visibleRight = (bounds.width - panX) / zoom;
  const visibleBottom = (bounds.height - panY) / zoom;

  // Calculate grid line positions
  const startX = Math.floor(visibleLeft / gridSize) * gridSize;
  const endX = Math.ceil(visibleRight / gridSize) * gridSize;
  const startY = Math.floor(visibleTop / gridSize) * gridSize;
  const endY = Math.ceil(visibleBottom / gridSize) * gridSize;

  const verticalLines = [];
  const horizontalLines = [];

  // Generate vertical lines
  for (let x = startX; x <= endX; x += gridSize) {
    const screenX = x * zoom + panX;
    verticalLines.push(
      <line
        key={`v-${x}`}
        x1={screenX}
        y1={0}
        x2={screenX}
        y2="100%"
        stroke={color}
        strokeWidth={0.5}
        opacity={opacity}
      />
    );
  }

  // Generate horizontal lines
  for (let y = startY; y <= endY; y += gridSize) {
    const screenY = y * zoom + panY;
    horizontalLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={screenY}
        x2="100%"
        y2={screenY}
        stroke={color}
        strokeWidth={0.5}
        opacity={opacity}
      />
    );
  }

  // Add major grid lines (every 5th line is thicker)
  const majorLines = [];
  const majorGridSize = gridSize * 5;

  // Major vertical lines
  const majorStartX = Math.floor(visibleLeft / majorGridSize) * majorGridSize;
  const majorEndX = Math.ceil(visibleRight / majorGridSize) * majorGridSize;
  
  for (let x = majorStartX; x <= majorEndX; x += majorGridSize) {
    const screenX = x * zoom + panX;
    majorLines.push(
      <line
        key={`mv-${x}`}
        x1={screenX}
        y1={0}
        x2={screenX}
        y2="100%"
        stroke={color}
        strokeWidth={1}
        opacity={opacity * 1.5}
      />
    );
  }

  // Major horizontal lines
  const majorStartY = Math.floor(visibleTop / majorGridSize) * majorGridSize;
  const majorEndY = Math.ceil(visibleBottom / majorGridSize) * majorGridSize;
  
  for (let y = majorStartY; y <= majorEndY; y += majorGridSize) {
    const screenY = y * zoom + panY;
    majorLines.push(
      <line
        key={`mh-${y}`}
        x1={0}
        y1={screenY}
        x2="100%"
        y2={screenY}
        stroke={color}
        strokeWidth={1}
        opacity={opacity * 1.5}
      />
    );
  }

  return (
    <g>
      {/* Fine grid */}
      {verticalLines}
      {horizontalLines}
      
      {/* Major grid lines */}
      {majorLines}
      
      {/* Origin axes (if origin is visible) */}
      {visibleLeft <= 0 && visibleRight >= 0 && (
        <line
          x1={panX}
          y1={0}
          x2={panX}
          y2="100%"
          stroke={color}
          strokeWidth={2}
          opacity={opacity * 2}
        />
      )}
      {visibleTop <= 0 && visibleBottom >= 0 && (
        <line
          x1={0}
          y1={panY}
          x2="100%"
          y2={panY}
          stroke={color}
          strokeWidth={2}
          opacity={opacity * 2}
        />
      )}
    </g>
  );
}
