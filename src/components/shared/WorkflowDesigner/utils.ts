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
  ValidationSeverity,
  PortType,
  PortDefinition,
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

/**
 * Convert a YAML workflow definition (from the server) to the designer's
 * WorkflowDefinition format.
 * 
 * The YAML format uses flat steps with `dependsOn` for ordering and
 * stores visual layout in `step.designer` and `metadata.designer`.
 * The designer format uses explicit connections, ports, and positions.
 * 
 * Steps without designer.position metadata are auto-laid out in a
 * top-to-bottom arrangement with 250px vertical spacing.
 */
export function convertYamlToDesignerDefinition(yamlDef: any): WorkflowDefinition {
  const STEP_SPACING_X = 300;
  const STEP_SPACING_Y = 150;
  const DEFAULT_STEP_SIZE: Size = { width: 200, height: 100 };

  // Convert steps
  const steps: WorkflowStepDefinition[] = (yamlDef.steps || []).map(
    (step: any, index: number) => {
      const designer = step.designer || {};

      // Position: use designer metadata or auto-layout
      const position: Point = designer.position
        ? { x: designer.position.x, y: designer.position.y }
        : { x: 100, y: 100 + index * STEP_SPACING_Y };

      const size: Size = designer.size
        ? { width: designer.size.width, height: designer.size.height }
        : { ...DEFAULT_STEP_SIZE };

      // Derive input/output ports from step inputs/outputs keys
      const inputKeys = step.inputs ? Object.keys(step.inputs) : [];
      const outputKeys = step.outputs ? Object.keys(step.outputs) : [];

      // Also incorporate designer port metadata if available
      const designerInputPorts = designer.ports?.inputs || [];
      const designerOutputPorts = designer.ports?.outputs || [];

      const inputPorts: PortDefinition[] = buildPorts(
        inputKeys,
        designerInputPorts,
        PortType.INPUT,
        size
      );

      const outputPorts: PortDefinition[] = buildPorts(
        outputKeys,
        designerOutputPorts,
        PortType.OUTPUT,
        size
      );

      // Always ensure at least one control input and one control output port
      if (!inputPorts.some(p => p.type === PortType.CONTROL_INPUT)) {
        inputPorts.unshift({
          id: `${step.id}_ctrl_in`,
          name: 'control_in',
          type: PortType.CONTROL_INPUT,
          position: { x: size.width / 2, y: 0 },
        });
      }
      if (!outputPorts.some(p => p.type === PortType.CONTROL_OUTPUT)) {
        outputPorts.push({
          id: `${step.id}_ctrl_out`,
          name: 'control_out',
          type: PortType.CONTROL_OUTPUT,
          position: { x: size.width / 2, y: size.height },
        });
      }

      const metadata: Record<string, unknown> = {};
      if (designer.color) metadata.color = designer.color;
      if (designer.icon) metadata.icon = designer.icon;
      if (designer.collapsed !== undefined) metadata.collapsed = designer.collapsed;
      if (designer.helpText) metadata.helpText = designer.helpText;

      return {
        id: step.id,
        name: step.name || step.id,
        type: step.type,
        position,
        size,
        properties: {
          ...(step.config || {}),
          enabled: step.enabled ?? true,
          continueOnError: step.continueOnError ?? false,
          timeout: step.timeout,
          condition: step.condition,
          inputs: step.inputs,
          outputs: step.outputs,
        },
        inputPorts,
        outputPorts,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      } as WorkflowStepDefinition;
    }
  );

  // Build connections from designer.connections or from dependsOn relationships
  const connections: WorkflowConnection[] = [];
  const designerConnections = yamlDef.designer?.connections || [];

  if (designerConnections.length > 0) {
    // Use explicit designer connections
    designerConnections.forEach((conn: any, idx: number) => {
      connections.push({
        id: conn.id || generateConnectionId(),
        sourceStepId: conn.sourceStepId,
        sourcePortId: conn.sourcePort,
        targetStepId: conn.targetStepId,
        targetPortId: conn.targetPort,
        points: conn.points,
        metadata: {
          ...(conn.style ? { style: conn.style } : {}),
          ...(conn.color ? { color: conn.color } : {}),
          ...(conn.label ? { label: conn.label } : {}),
        },
      });
    });
  } else {
    // Infer connections from dependsOn declarations
    (yamlDef.steps || []).forEach((step: any) => {
      const deps = step.dependsOn
        ? Array.isArray(step.dependsOn)
          ? step.dependsOn
          : [step.dependsOn]
        : [];
      deps.forEach((depId: string) => {
        connections.push({
          id: generateConnectionId(),
          sourceStepId: depId,
          sourcePortId: `${depId}_ctrl_out`,
          targetStepId: step.id,
          targetPortId: `${step.id}_ctrl_in`,
        });
      });
    });

    // If no dependsOn at all, chain steps in order
    if (connections.length === 0 && steps.length > 1) {
      for (let i = 0; i < steps.length - 1; i++) {
        connections.push({
          id: generateConnectionId(),
          sourceStepId: steps[i].id,
          sourcePortId: `${steps[i].id}_ctrl_out`,
          targetStepId: steps[i + 1].id,
          targetPortId: `${steps[i + 1].id}_ctrl_in`,
        });
      }
    }
  }

  // Convert variables
  const variables = yamlDef.variables
    ? Object.entries(yamlDef.variables).map(([name, value]) => ({
        id: generateId(),
        name,
        type: typeof value as string,
        defaultValue: value,
      }))
    : [];

  // Build the designer WorkflowDefinition
  const designerCanvas = yamlDef.designer?.canvas;

  return {
    id: `${yamlDef.nameSpace}.${yamlDef.name}@${yamlDef.version}`,
    name: yamlDef.name,
    version: yamlDef.version,
    namespace: yamlDef.nameSpace,
    description: yamlDef.description || '',
    tags: yamlDef.tags || [],
    author: yamlDef.author,
    steps,
    connections,
    variables,
    configuration: {
      timeout: undefined,
      maxRetries: undefined,
    },
    metadata: {
      canvas: designerCanvas
        ? {
            zoom: designerCanvas.zoom ?? 1.0,
            panX: designerCanvas.panX ?? 0,
            panY: designerCanvas.panY ?? 0,
            gridSize: designerCanvas.gridSize ?? 20,
            snapToGrid: designerCanvas.snapToGrid ?? true,
          }
        : undefined,
      ui: {},
      yamlSource: yamlDef.yamlSource,
      sourceType: yamlDef.sourceType,
      location: yamlDef.location,
    },
  };
}

/**
 * Build port definitions from step input/output keys and designer port metadata.
 */
function buildPorts(
  keys: string[],
  designerPorts: any[],
  portType: PortType,
  stepSize: Size
): PortDefinition[] {
  const portMap = new Map<string, any>();

  // Index designer port metadata by name
  designerPorts.forEach((p: any) => {
    if (p.name) portMap.set(p.name, p);
  });

  // Merge keys + designer metadata
  const allNames = new Set([...keys, ...portMap.keys()]);
  const isInput = portType === PortType.INPUT || portType === PortType.CONTROL_INPUT;
  const ports: PortDefinition[] = [];
  let idx = 0;

  allNames.forEach((name) => {
    const meta = portMap.get(name);
    const defaultPosition: Point = isInput
      ? { x: 0, y: 30 + idx * 20 }
      : { x: stepSize.width, y: 30 + idx * 20 };

    ports.push({
      id: `${name}_${portType}`,
      name: meta?.label || name,
      type: portType,
      dataType: meta?.dataType,
      position: meta?.position || defaultPosition,
    });
    idx++;
  });

  return ports;
}
