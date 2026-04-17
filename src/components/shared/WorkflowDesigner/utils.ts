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
  StepDefinition,
} from './types';
import { getStepDefinition } from './components/Steps';

/**
 * Maps YAML workflow step types to designer step definition IDs.
 * Used when importing YAML workflows into the visual designer.
 */
export const YAML_TO_DESIGNER_TYPE_MAP: Record<string, string> = {
  conditional: 'condition',
  custom: 'service_invoke',
  forEach: 'for_each',
  cliCommand: 'cli_command',
  fileOperation: 'file_operation',
};

/**
 * Maps designer step definition IDs back to YAML step types.
 * Used when exporting from the visual designer to YAML format.
 */
export const DESIGNER_TO_YAML_TYPE_MAP: Record<string, string> = {
  condition: 'conditional',
  service_invoke: 'custom',
  for_each: 'forEach',
  cli_command: 'cliCommand',
  file_operation: 'fileOperation',
};

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
 * 
 * This function also:
 * - Maps YAML step types to designer step IDs (e.g. `conditional` → `condition`)
 * - Synthesizes Start and End steps that the YAML format doesn't have
 * - Flattens nested sub-steps from conditional/forEach/parallel into top-level steps
 * - Looks up canonical port definitions from the step library
 */
export function convertYamlToDesignerDefinition(yamlDef: any): WorkflowDefinition {
  const STEP_SPACING_Y = 150;
  const DEFAULT_STEP_SIZE: Size = { width: 200, height: 100 };

  const allSteps: WorkflowStepDefinition[] = [];
  const allConnections: WorkflowConnection[] = [];

  /**
   * Resolve the designer type for a YAML step type.
   */
  function resolveDesignerType(yamlType: string): string {
    return YAML_TO_DESIGNER_TYPE_MAP[yamlType] || yamlType;
  }

  /**
   * Build ports for a step. If a StepDefinition exists in the library, use its
   * canonical ports. Otherwise fall back to the generic derivation from
   * input/output keys.
   */
  function buildPortsForStep(
    step: any,
    designerType: string,
    size: Size
  ): { inputPorts: PortDefinition[]; outputPorts: PortDefinition[] } {
    const stepDef = getStepDefinition(designerType);

    // Build lookup maps of saved port positions from YAML designer metadata, keyed by port name
    const savedInPos: Record<string, Point> = {};
    const savedOutPos: Record<string, Point> = {};
    for (const p of (step.designer?.ports?.inputs ?? [])) {
      if (p.name && p.position) savedInPos[p.name] = { x: p.position.x, y: p.position.y };
    }
    for (const p of (step.designer?.ports?.outputs ?? [])) {
      if (p.name && p.position) savedOutPos[p.name] = { x: p.position.x, y: p.position.y };
    }

    if (stepDef) {
      // Use canonical ports from step definition, but honour saved positions from YAML
      const inputPorts: PortDefinition[] = stepDef.inputPorts.map((pt, idx) => ({
        id: `${step.id}_${pt.name}_${pt.type}`,
        name: pt.name,
        type: pt.type,
        dataType: pt.dataType,
        position: savedInPos[pt.name] ?? (
          pt.type === PortType.CONTROL_INPUT
            ? { x: size.width / 2, y: 0 }
            : { x: 0, y: 30 + idx * 20 }
        ),
      }));

      const outputPorts: PortDefinition[] = stepDef.outputPorts.map((pt, idx) => ({
        id: `${step.id}_${pt.name}_${pt.type}`,
        name: pt.name,
        type: pt.type,
        dataType: pt.dataType,
        position: savedOutPos[pt.name] ?? (
          pt.type === PortType.CONTROL_OUTPUT
            ? { x: size.width / 2, y: size.height }
            : { x: size.width, y: 30 + idx * 20 }
        ),
      }));

      return { inputPorts, outputPorts };
    }

    // Fallback: derive from step inputs/outputs keys
    const inputKeys = step.inputs ? Object.keys(step.inputs) : [];
    const outputKeys = step.outputs ? Object.keys(step.outputs) : [];
    const designerInputPorts = step.designer?.ports?.inputs || [];
    const designerOutputPorts = step.designer?.ports?.outputs || [];

    const inputPorts = buildPorts(inputKeys, designerInputPorts, PortType.INPUT, size);
    const outputPorts = buildPorts(outputKeys, designerOutputPorts, PortType.OUTPUT, size);

    // Ensure control ports
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

    return { inputPorts, outputPorts };
  }

  /**
   * Find the first control input port id for a step.
   */
  function ctrlIn(step: WorkflowStepDefinition): string {
    const port = step.inputPorts.find(
      p => p.type === PortType.CONTROL_INPUT
    );
    return port?.id || `${step.id}_ctrl_in`;
  }

  /**
   * Find a control output port id for a step, optionally by name.
   */
  function ctrlOut(step: WorkflowStepDefinition, portName?: string): string {
    if (portName) {
      const port = step.outputPorts.find(
        p => p.name === portName &&
          (p.type === PortType.CONTROL_OUTPUT || p.type === PortType.OUTPUT)
      );
      if (port) return port.id;
    }
    const port = step.outputPorts.find(
      p => p.type === PortType.CONTROL_OUTPUT
    );
    return port?.id || `${step.id}_ctrl_out`;
  }

  /**
   * Convert a single YAML step (excluding nested sub-steps) into a
   * WorkflowStepDefinition, positioned at the given Y offset.
   */
  function convertStep(
    step: any,
    yOffset: number,
    parentStepId?: string,
    branchName?: string
  ): WorkflowStepDefinition {
    const designer = step.designer || {};
    const designerType = resolveDesignerType(step.type);

    const position: Point = designer.position
      ? { x: designer.position.x, y: designer.position.y }
      : { x: 100, y: yOffset };

    const size: Size = designer.size
      ? { width: designer.size.width, height: designer.size.height }
      : { ...DEFAULT_STEP_SIZE };

    const { inputPorts, outputPorts } = buildPortsForStep(step, designerType, size);

    const metadata: Record<string, unknown> = {};
    if (designer.color) metadata.color = designer.color;
    if (designer.icon) metadata.icon = designer.icon;
    if (designer.collapsed !== undefined) metadata.collapsed = designer.collapsed;
    if (designer.helpText) metadata.helpText = designer.helpText;
    if (parentStepId) metadata.parentStepId = parentStepId;
    if (branchName) metadata.branchName = branchName;
    // Preserve the original YAML type so round-tripping is lossless
    if (step.type !== designerType) metadata.yamlType = step.type;

    return {
      id: step.id,
      name: step.name || step.id,
      type: designerType,
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
    };
  }

  /**
   * Recursively flatten YAML steps (including nested sub-steps from
   * conditional/forEach/parallel types) into the flat allSteps and
   * allConnections arrays.
   *
   * Returns the first and last steps in the flattened chain, so
   * the caller can wire them to surrounding steps.
   */
  function flattenSteps(
    yamlSteps: any[],
    baseY: number,
    parentStepId?: string,
    branchName?: string
  ): { first: WorkflowStepDefinition | null; last: WorkflowStepDefinition | null } {
    if (!yamlSteps || yamlSteps.length === 0) {
      return { first: null, last: null };
    }

    let currentY = baseY;
    let previousStep: WorkflowStepDefinition | null = null;
    let firstStep: WorkflowStepDefinition | null = null;

    for (const yamlStep of yamlSteps) {
      const designerType = resolveDesignerType(yamlStep.type);
      const step = convertStep(yamlStep, currentY, parentStepId, branchName);
      allSteps.push(step);
      currentY += STEP_SPACING_Y;

      if (!firstStep) firstStep = step;

      // Connect to previous step in the chain (unless dependsOn is explicit)
      if (previousStep && !yamlStep.dependsOn) {
        allConnections.push({
          id: generateConnectionId(),
          sourceStepId: previousStep.id,
          sourcePortId: ctrlOut(previousStep),
          targetStepId: step.id,
          targetPortId: ctrlIn(step),
        });
      }

      // Handle nested sub-steps
      if (designerType === 'condition' && yamlStep.config) {
        const thenSteps = yamlStep.config.thenSteps || [];
        const elseSteps = yamlStep.config.elseSteps || [];

        // Flatten then-branch
        if (thenSteps.length > 0) {
          const thenChain = flattenSteps(
            thenSteps, currentY, yamlStep.id, 'then'
          );
          currentY += thenSteps.length * STEP_SPACING_Y;

          if (thenChain.first) {
            allConnections.push({
              id: generateConnectionId(),
              sourceStepId: step.id,
              sourcePortId: ctrlOut(step, 'true'),
              targetStepId: thenChain.first.id,
              targetPortId: ctrlIn(thenChain.first),
            });
          }
        }

        // Flatten else-branch
        if (elseSteps.length > 0) {
          const elseChain = flattenSteps(
            elseSteps, currentY, yamlStep.id, 'else'
          );
          currentY += elseSteps.length * STEP_SPACING_Y;

          if (elseChain.first) {
            allConnections.push({
              id: generateConnectionId(),
              sourceStepId: step.id,
              sourcePortId: ctrlOut(step, 'false'),
              targetStepId: elseChain.first.id,
              targetPortId: ctrlIn(elseChain.first),
            });
          }
        }
      } else if (designerType === 'for_each' && yamlStep.config?.steps) {
        const bodySteps = yamlStep.config.steps;
        if (bodySteps.length > 0) {
          const bodyChain = flattenSteps(
            bodySteps, currentY, yamlStep.id, 'loop_body'
          );
          currentY += bodySteps.length * STEP_SPACING_Y;

          if (bodyChain.first) {
            allConnections.push({
              id: generateConnectionId(),
              sourceStepId: step.id,
              sourcePortId: ctrlOut(step, 'loop_body'),
              targetStepId: bodyChain.first.id,
              targetPortId: ctrlIn(bodyChain.first),
            });
          }
        }
      } else if (designerType === 'parallel' && yamlStep.config?.branches) {
        const branches: any[] = yamlStep.config.branches;
        for (const branch of branches) {
          if (branch.steps && branch.steps.length > 0) {
            const branchChain = flattenSteps(
              branch.steps, currentY, yamlStep.id, branch.name || 'branch'
            );
            currentY += branch.steps.length * STEP_SPACING_Y;

            if (branchChain.first) {
              // Connect parallel step to the first step in this branch
              allConnections.push({
                id: generateConnectionId(),
                sourceStepId: step.id,
                sourcePortId: ctrlOut(step, branch.name || 'branch1'),
                targetStepId: branchChain.first.id,
                targetPortId: ctrlIn(branchChain.first),
              });
            }
          }
        }
      }

      previousStep = step;
    }

    return { first: firstStep, last: previousStep };
  }

  // --- Main conversion ---

  // Flatten all top-level YAML steps (and their nested children)
  const { first: firstRealStep, last: lastRealStep } = flattenSteps(
    yamlDef.steps || [], 100
  );

  // Also process any explicit dependsOn connections from YAML
  const designerConnections = yamlDef.designer?.connections || [];
  if (designerConnections.length > 0) {
    // Use explicit designer connections (override inferred ones)
    // Clear auto-generated connections and use explicit ones
    allConnections.length = 0;
    designerConnections.forEach((conn: any) => {
      allConnections.push({
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
    // Add dependsOn-based connections (supplement auto-generated ones)
    (yamlDef.steps || []).forEach((step: any) => {
      const deps = step.dependsOn
        ? Array.isArray(step.dependsOn)
          ? step.dependsOn
          : [step.dependsOn]
        : [];
      deps.forEach((depId: string) => {
        const sourceStep = allSteps.find(s => s.id === depId);
        const targetStep = allSteps.find(s => s.id === step.id);
        if (sourceStep && targetStep) {
          // Avoid duplicate connections
          const exists = allConnections.some(
            c => c.sourceStepId === depId && c.targetStepId === step.id
          );
          if (!exists) {
            allConnections.push({
              id: generateConnectionId(),
              sourceStepId: depId,
              sourcePortId: ctrlOut(sourceStep),
              targetStepId: step.id,
              targetPortId: ctrlIn(targetStep),
            });
          }
        }
      });
    });
  }

  // Synthesize Start step only when the YAML doesn't already define one.
  // YAMLs that include an explicit `type: start` step (id __start__) should
  // not receive a second synthesized copy — duplicate ids break rendering.
  const hasExplicitStartStep = allSteps.some(s => s.type === 'start');
  if (!hasExplicitStartStep) {
    const startStepSize: Size = { width: 120, height: 60 };
    const startStep: WorkflowStepDefinition = {
      id: '__start__',
      name: 'Start',
      type: 'start',
      position: firstRealStep
        ? { x: firstRealStep.position.x, y: firstRealStep.position.y - STEP_SPACING_Y }
        : { x: 100, y: 0 },
      size: startStepSize,
      properties: { name: 'Start' },
      inputPorts: [],
      outputPorts: [
        {
          id: '__start___next_control_output',
          name: 'next',
          type: PortType.CONTROL_OUTPUT,
          position: { x: startStepSize.width / 2, y: startStepSize.height },
        },
      ],
      metadata: { synthesized: true },
    };
    allSteps.unshift(startStep);

    if (firstRealStep) {
      allConnections.push({
        id: generateConnectionId(),
        sourceStepId: '__start__',
        sourcePortId: '__start___next_control_output',
        targetStepId: firstRealStep.id,
        targetPortId: ctrlIn(firstRealStep),
      });
    }
  }

  // Synthesize End step only when the YAML doesn't already define one.
  const hasExplicitEndStep = allSteps.some(s => s.type === 'end');
  if (!hasExplicitEndStep) {
    const topLevelStepIds = new Set(
      (yamlDef.steps || []).map((s: any) => s.id)
    );
    const stepsWithOutgoing = new Set(
      allConnections
        .filter(c => topLevelStepIds.has(c.sourceStepId) && topLevelStepIds.has(c.targetStepId))
        .map(c => c.sourceStepId)
    );
    const terminalSteps = allSteps.filter(
      s => topLevelStepIds.has(s.id) && !stepsWithOutgoing.has(s.id)
    );

    const endStepSize: Size = { width: 120, height: 60 };
    const lastY = allSteps.reduce((max, s) => Math.max(max, s.position.y), 0);
    const endStep: WorkflowStepDefinition = {
      id: '__end__',
      name: 'End',
      type: 'end',
      position: { x: 100, y: lastY + STEP_SPACING_Y },
      size: endStepSize,
      properties: { name: 'End', returnValue: 'success' },
      inputPorts: [
        {
          id: '__end___previous_control_input',
          name: 'previous',
          type: PortType.CONTROL_INPUT,
          position: { x: endStepSize.width / 2, y: 0 },
        },
      ],
      outputPorts: [],
      metadata: { synthesized: true },
    };
    allSteps.push(endStep);

    // Connect terminal steps to End
    if (terminalSteps.length > 0) {
      for (const term of terminalSteps) {
        allConnections.push({
          id: generateConnectionId(),
          sourceStepId: term.id,
          sourcePortId: ctrlOut(term),
          targetStepId: '__end__',
          targetPortId: '__end___previous_control_input',
        });
      }
    } else if (lastRealStep) {
      // Fallback: connect last step to end
      allConnections.push({
        id: generateConnectionId(),
        sourceStepId: lastRealStep.id,
        sourcePortId: ctrlOut(lastRealStep),
        targetStepId: '__end__',
        targetPortId: '__end___previous_control_input',
      });
    }
  }

  // Convert variables — the YAML stores them as a stringified JSON array,
  // e.g. '[{"id":"x","name":"myVar","type":"string","defaultValue":""}]',
  // but they could also arrive as a plain object or already-parsed array.
  const variables = (() => {
    let raw = yamlDef.variables;
    if (!raw) return [];

    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return [];
      }
    }

    if (Array.isArray(raw)) {
      return raw.map((v: any) => ({
        id: v.id || generateId(),
        name: v.name,
        type: v.type || typeof v.defaultValue,
        defaultValue: v.defaultValue,
      }));
    }

    if (typeof raw === 'object') {
      return Object.entries(raw).map(([name, value]) => ({
        id: generateId(),
        name,
        type: typeof value as string,
        defaultValue: value,
      }));
    }

    return [];
  })();

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
    steps: allSteps,
    connections: allConnections,
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
