import { 
  Point, 
  Size, 
  Bounds, 
  WorkflowDefinition, 
  WorkflowStepDefinition, 
  WorkflowConnection,
  CanvasViewport,
  ValidationError,
  ValidationErrorType,
  ValidationSeverity
} from './types';

// Geometry utilities
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointInBounds(point: Point, bounds: Bounds): boolean {
  return point.x >= bounds.x && 
         point.x <= bounds.x + bounds.width &&
         point.y >= bounds.y && 
         point.y <= bounds.y + bounds.height;
}

export function boundsIntersect(bounds1: Bounds, bounds2: Bounds): boolean {
  return !(bounds1.x + bounds1.width < bounds2.x || 
           bounds2.x + bounds2.width < bounds1.x ||
           bounds1.y + bounds1.height < bounds2.y ||
           bounds2.y + bounds2.height < bounds1.y);
}

export function getStepBounds(step: WorkflowStepDefinition): Bounds {
  const size = step.size || { width: 200, height: 100 };
  return {
    x: step.position.x,
    y: step.position.y,
    width: size.width,
    height: size.height
  };
}

export function getSelectionBounds(steps: WorkflowStepDefinition[]): Bounds | null {
  if (steps.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  steps.forEach(step => {
    const bounds = getStepBounds(step);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// Coordinate transformations
export function screenToCanvas(screenPoint: Point, viewport: CanvasViewport): Point {
  return {
    x: (screenPoint.x - viewport.panX) / viewport.zoom,
    y: (screenPoint.y - viewport.panY) / viewport.zoom
  };
}

export function canvasToScreen(canvasPoint: Point, viewport: CanvasViewport): Point {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.panX,
    y: canvasPoint.y * viewport.zoom + viewport.panY
  };
}

export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}

// Workflow utilities
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function generateStepId(prefix: string = 'step'): string {
  return `${prefix}_${generateId()}`;
}

export function generateConnectionId(): string {
  return `connection_${generateId()}`;
}

export function findStep(definition: WorkflowDefinition, stepId: string): WorkflowStepDefinition | undefined {
  return definition.steps.find(step => step.id === stepId);
}

export function findConnection(definition: WorkflowDefinition, connectionId: string): WorkflowConnection | undefined {
  return definition.connections.find(conn => conn.id === connectionId);
}

export function getStepConnections(definition: WorkflowDefinition, stepId: string): WorkflowConnection[] {
  return definition.connections.filter(
    conn => conn.sourceStepId === stepId || conn.targetStepId === stepId
  );
}

export function getIncomingConnections(definition: WorkflowDefinition, stepId: string): WorkflowConnection[] {
  return definition.connections.filter(conn => conn.targetStepId === stepId);
}

export function getOutgoingConnections(definition: WorkflowDefinition, stepId: string): WorkflowConnection[] {
  return definition.connections.filter(conn => conn.sourceStepId === stepId);
}

export function isConnected(definition: WorkflowDefinition, stepId: string): boolean {
  return getStepConnections(definition, stepId).length > 0;
}

export function hasCircularDependency(definition: WorkflowDefinition): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(stepId: string): boolean {
    if (recursionStack.has(stepId)) return true;
    if (visited.has(stepId)) return false;

    visited.add(stepId);
    recursionStack.add(stepId);

    const outgoing = getOutgoingConnections(definition, stepId);
    for (const connection of outgoing) {
      if (dfs(connection.targetStepId)) return true;
    }

    recursionStack.delete(stepId);
    return false;
  }

  for (const step of definition.steps) {
    if (!visited.has(step.id) && dfs(step.id)) {
      return true;
    }
  }

  return false;
}

export function findUnreachableSteps(definition: WorkflowDefinition): string[] {
  const startSteps = definition.steps.filter(step => 
    getIncomingConnections(definition, step.id).length === 0
  );

  if (startSteps.length === 0) {
    return definition.steps.map(step => step.id);
  }

  const reachable = new Set<string>();
  const queue = [...startSteps.map(step => step.id)];

  while (queue.length > 0) {
    const stepId = queue.shift()!;
    if (reachable.has(stepId)) continue;

    reachable.add(stepId);
    const outgoing = getOutgoingConnections(definition, stepId);
    queue.push(...outgoing.map(conn => conn.targetStepId));
  }

  return definition.steps
    .filter(step => !reachable.has(step.id))
    .map(step => step.id);
}

export function validateStepName(definition: WorkflowDefinition, stepId: string, name: string): boolean {
  return !definition.steps.some(step => step.id !== stepId && step.name === name);
}

// Validation utilities
export function validateWorkflow(definition: WorkflowDefinition): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for circular dependencies
  if (hasCircularDependency(definition)) {
    errors.push({
      id: generateId(),
      type: ValidationErrorType.CIRCULAR_DEPENDENCY,
      severity: ValidationSeverity.ERROR,
      message: 'Workflow contains circular dependencies'
    });
  }

  // Check for unreachable steps
  const unreachable = findUnreachableSteps(definition);
  unreachable.forEach(stepId => {
    const step = findStep(definition, stepId);
    errors.push({
      id: generateId(),
      type: ValidationErrorType.UNREACHABLE_STEP,
      severity: ValidationSeverity.WARNING,
      message: `Step "${step?.name || stepId}" is unreachable`,
      stepId
    });
  });

  // Check for duplicate names
  const nameMap = new Map<string, string[]>();
  definition.steps.forEach(step => {
    if (!nameMap.has(step.name)) {
      nameMap.set(step.name, []);
    }
    nameMap.get(step.name)!.push(step.id);
  });

  nameMap.forEach((stepIds, name) => {
    if (stepIds.length > 1) {
      stepIds.forEach(stepId => {
        errors.push({
          id: generateId(),
          type: ValidationErrorType.DUPLICATE_NAME,
          severity: ValidationSeverity.ERROR,
          message: `Step name "${name}" is not unique`,
          stepId
        });
      });
    }
  });

  // Check for missing required properties
  definition.steps.forEach(step => {
    // This would require step definition schema validation
    // For now, just check if name is present
    if (!step.name || step.name.trim() === '') {
      errors.push({
        id: generateId(),
        type: ValidationErrorType.MISSING_PROPERTY,
        severity: ValidationSeverity.ERROR,
        message: 'Step name is required',
        stepId: step.id,
        propertyPath: 'name'
      });
    }
  });

  return errors;
}

// Layout utilities
export function autoLayout(definition: WorkflowDefinition): WorkflowDefinition {
  // Simple left-to-right layout algorithm
  const STEP_WIDTH = 200;
  const STEP_HEIGHT = 100;
  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 150;

  // Find start steps (no incoming connections)
  const startSteps = definition.steps.filter(step => 
    getIncomingConnections(definition, step.id).length === 0
  );

  if (startSteps.length === 0) {
    // If no clear start, arrange in grid
    return arrangeInGrid(definition);
  }

  const positioned = new Set<string>();
  const levels = new Map<string, number>();

  // Calculate levels using BFS
  function calculateLevels() {
    const queue = startSteps.map(step => ({ id: step.id, level: 0 }));
    
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      
      if (positioned.has(id)) continue;
      
      levels.set(id, level);
      positioned.add(id);
      
      const outgoing = getOutgoingConnections(definition, id);
      outgoing.forEach(conn => {
        if (!positioned.has(conn.targetStepId)) {
          queue.push({ id: conn.targetStepId, level: level + 1 });
        }
      });
    }
  }

  calculateLevels();

  // Group steps by level
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, stepId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(stepId);
  });

  // Position steps
  const updatedSteps = [...definition.steps];
  levelGroups.forEach((stepIds, level) => {
    const x = level * HORIZONTAL_SPACING;
    const totalHeight = stepIds.length * STEP_HEIGHT + (stepIds.length - 1) * VERTICAL_SPACING;
    const startY = -totalHeight / 2;

    stepIds.forEach((stepId, index) => {
      const stepIndex = updatedSteps.findIndex(s => s.id === stepId);
      if (stepIndex !== -1) {
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          position: {
            x,
            y: startY + index * (STEP_HEIGHT + VERTICAL_SPACING)
          },
          size: { width: STEP_WIDTH, height: STEP_HEIGHT }
        };
      }
    });
  });

  return {
    ...definition,
    steps: updatedSteps
  };
}

function arrangeInGrid(definition: WorkflowDefinition): WorkflowDefinition {
  const STEP_WIDTH = 200;
  const STEP_HEIGHT = 100;
  const SPACING = 50;
  const COLUMNS = Math.ceil(Math.sqrt(definition.steps.length));

  const updatedSteps = definition.steps.map((step, index) => {
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;
    
    return {
      ...step,
      position: {
        x: col * (STEP_WIDTH + SPACING),
        y: row * (STEP_HEIGHT + SPACING)
      },
      size: { width: STEP_WIDTH, height: STEP_HEIGHT }
    };
  });

  return {
    ...definition,
    steps: updatedSteps
  };
}

// Export utilities
export function exportToJSON(definition: WorkflowDefinition): string {
  return JSON.stringify(definition, null, 2);
}

export function importFromJSON(json: string): WorkflowDefinition {
  try {
    const parsed = JSON.parse(json);
    // Basic validation
    if (!parsed.id || !parsed.name || !Array.isArray(parsed.steps)) {
      throw new Error('Invalid workflow definition format');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to import workflow: ${error.message}`);
  }
}

// Deep cloning utilities
export function cloneDefinition(definition: WorkflowDefinition): WorkflowDefinition {
  return JSON.parse(JSON.stringify(definition));
}

export function cloneStep(step: WorkflowStepDefinition): WorkflowStepDefinition {
  return JSON.parse(JSON.stringify(step));
}

// Comparison utilities
export function definitionsEqual(def1: WorkflowDefinition, def2: WorkflowDefinition): boolean {
  return JSON.stringify(def1) === JSON.stringify(def2);
}

// Viewport utilities
export function fitToViewport(bounds: Bounds, viewportBounds: Bounds, padding: number = 50): CanvasViewport {
  const contentWidth = bounds.width + 2 * padding;
  const contentHeight = bounds.height + 2 * padding;
  
  const scaleX = viewportBounds.width / contentWidth;
  const scaleY = viewportBounds.height / contentHeight;
  const zoom = Math.min(scaleX, scaleY, 1.0);
  
  const panX = viewportBounds.width / 2 - (bounds.x + bounds.width / 2) * zoom;
  const panY = viewportBounds.height / 2 - (bounds.y + bounds.height / 2) * zoom;
  
  return {
    zoom,
    panX,
    panY,
    bounds: viewportBounds
  };
}

export function zoomToSelection(selectedBounds: Bounds, viewportBounds: Bounds): CanvasViewport {
  return fitToViewport(selectedBounds, viewportBounds, 100);
}
