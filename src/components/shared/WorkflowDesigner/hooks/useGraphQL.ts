import { useState, useCallback } from 'react';
import { parse as parseYaml } from 'yaml';
import { useReactory } from '@reactory/client-core/api';
import { 
  WorkflowDefinition,
  WorkflowsQueryResult,
  WorkflowStepDefinition,
  WorkflowConnection,
} from '../types';

/**
 * Response shape returned by the saveWorkflowDefinition mutation,
 * matching the server's YamlWorkflowDefinition GraphQL type.
 */
export interface SaveWorkflowResult {
  saveWorkflowDefinition: {
    nameSpace: string;
    name: string;
    version: string;
    description: string | null;
    author: string | null;
    tags: string[] | null;
    loadStatus: string;
    yamlSource: string | null;
    location: string | null;
    errors: Array<{ stage: string; message: string; code: string | null }> | null;
    steps: Array<{
      id: string;
      name: string | null;
      type: string;
      designer: {
        position: { x: number; y: number } | null;
        size: { width: number; height: number } | null;
      } | null;
    }> | null;
    designer: {
      canvas: {
        zoom: number | null;
        panX: number | null;
        panY: number | null;
        gridSize: number | null;
        snapToGrid: boolean | null;
      } | null;
      connections: Array<{
        id: string;
        sourceStepId: string;
        sourcePort: string;
        targetStepId: string;
        targetPort: string;
        points: Array<{ x: number; y: number }> | null;
      }> | null;
    } | null;
  };
}

export interface DeleteWorkflowResult {
  deleteWorkflowDefinition: {
    success: boolean;
    message: string | null;
  };
}

export interface ValidateWorkflowResult {
  validateWorkflowDefinition: {
    valid: boolean;
    errors: Array<{ field: string; message: string; code: string | null }>;
    warnings: Array<{ field: string; message: string; code: string | null }>;
  };
}

export interface UseGraphQLReturn {
  loading: boolean;
  error: string | null;
  getWorkflows: (filter?: any, pagination?: any) => Promise<WorkflowDefinition[]>;
  getWorkflow: (namespace: string, name: string) => Promise<WorkflowDefinition | null>;
  saveWorkflowDefinition: (definition: WorkflowDefinition) => Promise<SaveWorkflowResult['saveWorkflowDefinition']>;
  deleteWorkflowDefinition: (nameSpace: string, name: string, version?: string) => Promise<boolean>;
  validateWorkflowDefinition: (definition: WorkflowDefinition) => Promise<ValidateWorkflowResult['validateWorkflowDefinition']>;
}

/**
 * The keys on a parsed YAML step (or nested sub-step) that can contain arrays
 * of further steps. Walking these lets the overlay reach every nested step
 * regardless of container type (condition / for_each / parallel / generic).
 */
const NESTED_STEP_KEYS = ['thenSteps', 'elseSteps', 'steps'] as const;

/**
 * Recursively walk every step in a parsed YAML step tree (including nested
 * sub-steps inside `config.thenSteps` / `config.elseSteps` / `config.steps`
 * and `config.branches[].steps`), invoking `visit` for each step object.
 */
function walkYamlSteps(steps: any[], visit: (step: any) => void): void {
  if (!Array.isArray(steps)) return;
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    visit(step);
    const cfg = step.config;
    if (cfg && typeof cfg === 'object') {
      for (const key of NESTED_STEP_KEYS) {
        if (Array.isArray(cfg[key])) walkYamlSteps(cfg[key], visit);
      }
      if (Array.isArray(cfg.branches)) {
        for (const branch of cfg.branches) {
          if (branch && Array.isArray(branch.steps)) walkYamlSteps(branch.steps, visit);
        }
      }
    }
    // Some YAML step shapes nest directly under `steps` at the step level.
    if (Array.isArray(step.steps)) walkYamlSteps(step.steps, visit);
  }
}

/**
 * Recursively remove steps (by id) from a parsed YAML step tree, pruning from
 * nested containers as well. Returns the filtered array.
 */
function pruneYamlSteps(steps: any[], removeIds: Set<string>): any[] {
  if (!Array.isArray(steps)) return steps;
  const kept: any[] = [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') { kept.push(step); continue; }
    if (removeIds.has(step.id)) continue;
    const cfg = step.config;
    if (cfg && typeof cfg === 'object') {
      for (const key of NESTED_STEP_KEYS) {
        if (Array.isArray(cfg[key])) cfg[key] = pruneYamlSteps(cfg[key], removeIds);
      }
      if (Array.isArray(cfg.branches)) {
        cfg.branches = cfg.branches.map((b: any) =>
          b && Array.isArray(b.steps) ? { ...b, steps: pruneYamlSteps(b.steps, removeIds) } : b
        );
      }
    }
    if (Array.isArray(step.steps)) step.steps = pruneYamlSteps(step.steps, removeIds);
    kept.push(step);
  }
  return kept;
}

/**
 * LOSSLESS OVERLAY SAVE (Option 1)
 * --------------------------------
 * When a workflow was loaded from YAML, the designer keeps the authoritative
 * source in `definition.metadata.yamlSource`. The designer's in-memory model
 * flattens container steps (parallel / condition / for_each) into loose leaf
 * steps, which the flat exporter cannot faithfully reconstruct — dropping the
 * containers, their `dependsOn`, workflow `metadata`, and any graph-orphaned
 * steps.
 *
 * This function avoids that entirely: it parses the ORIGINAL YAML and overlays
 * ONLY the designer's visual/topology deltas onto it:
 *   - step positions & sizes (into each step's `designer` block)
 *   - canvas view + connections (into the top-level `designer` block)
 *   - genuine add / remove of steps (id diff against the flattened model)
 *
 * Everything else — nested containers, config, dependsOn, structured-output
 * schemas, metadata, inputs, outputs, variables — is preserved verbatim from
 * the source. This makes designer round-trips lossless for any YAML-authored
 * workflow, including rich steps like agent_conversation.
 *
 * Returns null if there is no usable yamlSource, signalling the caller to fall
 * back to the legacy flat mapping (used for designer-authored-from-scratch
 * workflows that have no source YAML).
 */
function overlayDesignerOntoYaml(definition: WorkflowDefinition): any | null {
  const yamlSource: string | undefined = (definition.metadata as any)?.yamlSource;
  if (!yamlSource || typeof yamlSource !== 'string' || yamlSource.trim() === '') {
    return null;
  }

  let baseDef: any;
  try {
    baseDef = parseYaml(yamlSource);
  } catch {
    // Malformed source — fall back to the flat exporter rather than corrupt.
    return null;
  }
  if (!baseDef || typeof baseDef !== 'object' || !Array.isArray(baseDef.steps)) {
    return null;
  }

  // Index designer steps by id (the flattened model includes every leaf +
  // container that survived load). Skip synthesized __start__/__end__ nodes.
  const designerStepsById = new Map<string, any>();
  for (const s of (definition.steps || [])) {
    if (!s || (s.metadata as any)?.synthesized) continue;
    designerStepsById.set(s.id, s);
  }

  // Collect ids present in the source YAML so we can diff for add/remove.
  const yamlStepIds = new Set<string>();
  walkYamlSteps(baseDef.steps, (step) => { if (step.id) yamlStepIds.add(step.id); });

  // 1. Overlay position/size onto every source step that still exists.
  walkYamlSteps(baseDef.steps, (step) => {
    const dStep = designerStepsById.get(step.id);
    if (!dStep) return;
    const designer = (step.designer && typeof step.designer === 'object') ? { ...step.designer } : {};
    if (dStep.position) {
      designer.position = { x: dStep.position.x, y: dStep.position.y };
    }
    if (dStep.size) {
      designer.size = { width: dStep.size.width, height: dStep.size.height };
    }
    if (Object.keys(designer).length > 0) step.designer = designer;
  });

  // 2. Prune steps the user deleted in the designer (present in YAML, gone in model).
  const removedIds = new Set<string>();
  yamlStepIds.forEach((id) => { if (!designerStepsById.has(id)) removedIds.add(id); });
  if (removedIds.size > 0) {
    baseDef.steps = pruneYamlSteps(baseDef.steps, removedIds);
  }

  // 3. Append steps the user added in the designer (present in model, new id).
  //    New steps have no source counterpart, so emit them at top level using
  //    the designer's own config/type — they legitimately originate here.
  for (const [id, dStep] of designerStepsById) {
    if (yamlStepIds.has(id)) continue;
    // @ts-ignore
    const { enabled, continueOnError, timeout, condition, ...restConfig } =
      (dStep.config && typeof dStep.config === 'object') ? dStep.config : {};
    const newStep: any = {
      id,
      type: (dStep.metadata as any)?.yamlType || dStep.type,
    };
    if (dStep.name && dStep.name !== id) newStep.name = dStep.name;
    if (condition != null) newStep.condition = condition;
    if (Object.keys(restConfig).length > 0) newStep.config = restConfig;
    const designer: any = {};
    if (dStep.position) designer.position = { x: dStep.position.x, y: dStep.position.y };
    if (dStep.size) designer.size = { width: dStep.size.width, height: dStep.size.height };
    if (Object.keys(designer).length > 0) newStep.designer = designer;
    baseDef.steps.push(newStep);
  }

  // 4. Overlay the top-level designer block (canvas + connections) so layout
  //    survives, WITHOUT touching functional structure.
  const canvas = (definition.metadata as any)?.canvas;
  baseDef.designer = {
    ...(baseDef.designer && typeof baseDef.designer === 'object' ? baseDef.designer : {}),
    canvas: canvas
      ? {
          zoom: canvas.zoom ?? null,
          panX: canvas.panX ?? null,
          panY: canvas.panY ?? null,
          gridSize: canvas.gridSize ?? null,
          snapToGrid: canvas.snapToGrid ?? null,
        }
      : (baseDef.designer?.canvas ?? null),
    connections: (definition.connections || []).map((conn: any) => ({
      id: conn.id,
      sourceStepId: conn.sourceStepId,
      sourcePort: conn.sourcePortId,
      targetStepId: conn.targetStepId,
      targetPort: conn.targetPortId,
      points: conn.points?.map((p: any) => ({ x: p.x, y: p.y })) ?? null,
      style: conn.metadata?.style ?? null,
      label: null,
    })),
  };

  // 5. Overlay top-level identity/description edits from the designer, keeping
  //    the source's structural fields (metadata, inputs, outputs, variables,
  //    steps) intact.
  baseDef.nameSpace = definition.namespace ?? baseDef.nameSpace;
  baseDef.name = definition.name ?? baseDef.name;
  baseDef.version = definition.version ?? baseDef.version;
  if (definition.description != null) baseDef.description = definition.description;
  if (definition.author != null) baseDef.author = definition.author;
  if (definition.tags != null) baseDef.tags = definition.tags;

  return baseDef;
}

/**
 * Transforms a client-side WorkflowDefinition into the GraphQL WorkflowDefinitionInput shape.
 *
 * Prefers the lossless YAML overlay (Option 1) when a source YAML is available;
 * otherwise falls back to the legacy flat mapping for designer-authored-from-
 * scratch workflows.
 */
function toWorkflowDefinitionInput(definition: WorkflowDefinition) {
  // OPTION 1 — lossless overlay path. Preserves container steps, dependsOn,
  // metadata, structured-output schemas, and inputs/outputs/variables.
  const overlaid = overlayDesignerOntoYaml(definition);
  if (overlaid) {
    return overlaid;
  }

  // 1. Helper to sort sequential steps in a branch by their connections
  function sortStepsByConnections(branchSteps: any[], connections: any[]): any[] {
    if (branchSteps.length <= 1) return branchSteps;

    const stepsMap = new Map(branchSteps.map(s => [s.id, s]));
    const stepsSet = new Set(branchSteps.map(s => s.id));

    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();

    branchSteps.forEach(s => {
      incoming.set(s.id, []);
      outgoing.set(s.id, []);
    });

    connections.forEach(conn => {
      if (stepsSet.has(conn.sourceStepId) && stepsSet.has(conn.targetStepId)) {
        outgoing.get(conn.sourceStepId)!.push(conn.targetStepId);
        incoming.get(conn.targetStepId)!.push(conn.sourceStepId);
      }
    });

    let firstStepId = branchSteps.find(s => incoming.get(s.id)!.length === 0)?.id;
    if (!firstStepId) {
      return [...branchSteps].sort((a, b) => a.position.x - b.position.x);
    }

    const sorted: any[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = firstStepId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      sorted.push(stepsMap.get(currentId));
      
      const nexts = outgoing.get(currentId) || [];
      currentId = nexts[0];
    }

    branchSteps.forEach(s => {
      if (!visited.has(s.id)) {
        sorted.push(s);
      }
    });

    return sorted;
  }

  // 2. Helper to map a step definition to the GraphQL WorkflowStepInput shape
  function mapStep(step: any): any {
    return {
      id: step.id,
      name: step.name,
      type: step.metadata?.yamlType || step.type,
      description: step.metadata?.description ?? null,
      enabled: step.config?.enabled ?? true,
      continueOnError: step.config?.continueOnError ?? false,
      timeout: step.config?.timeout ?? null,
      inputs: step.inputs ?? null,
      outputs: step.properties?.outputs ?? null,
      condition: step.config?.condition ?? null,
      dependsOn: step.properties?.dependsOn ?? null,
      config: (() => {
        if (!step.config) return null;
        const { enabled, continueOnError, timeout, condition, ...rest } = step.config;
        return Object.keys(rest).length > 0 ? rest : null;
      })(),
      steps: step.steps ? step.steps.map(mapStep) : null,
      designer: {
        position: step.position ? { x: step.position.x, y: step.position.y } : null,
        size: step.size ? { width: step.size.width, height: step.size.height } : null,
        ports: {
          inputs: step.inputPorts?.map((p: any) => ({
            name: p.name || p.id,
            label: p.name,
            position: p.position ? { x: p.position.x, y: p.position.y } : null,
            dataType: p.dataType ?? null,
          })),
          outputs: step.outputPorts?.map((p: any) => ({
            name: p.name || p.id,
            label: p.name,
            position: p.position ? { x: p.position.x, y: p.position.y } : null,
            dataType: p.dataType ?? null,
          })),
        },
      },
    };
  }

  // Clone the designer's flat steps list so we can mutate it
  const clonedSteps = definition.steps?.map(s => ({
    ...s,
    config: s.config ? { ...s.config } : {},
    metadata: s.metadata ? { ...s.metadata } : {}
  })) || [];

  // Sort flat steps array sequentially by connection order before mapping
  const sortedSteps = sortStepsByConnections(clonedSteps, definition.connections || []);

  // Map the flat steps list directly to GraphQL input shape (no nesting!)
  const gqlSteps = sortedSteps.map(mapStep);

  return {
    nameSpace: definition.namespace,
    name: definition.name,
    version: definition.version,
    description: definition.description,
    author: definition.author,
    tags: definition.tags,
    inputs: definition.inputs ?? null,
    outputs: definition.outputs ?? null,
    variables: definition.variables ?? null,
    metadata: (() => {
      if (!definition.metadata) return null;
      const { canvas, ui, yamlSource, sourceType, location, ...rest } = definition.metadata;
      return Object.keys(rest).length > 0 ? rest : null;
    })(),
    steps: gqlSteps,
    designer: {
      canvas: definition.metadata?.canvas ? {
        zoom: definition.metadata.canvas.zoom ?? null,
        panX: definition.metadata.canvas.panX ?? null,
        panY: definition.metadata.canvas.panY ?? null,
        gridSize: definition.metadata.canvas.gridSize ?? null,
        snapToGrid: definition.metadata.canvas.snapToGrid ?? null,
      } : null,
      connections: definition.connections?.map((conn) => ({
        id: conn.id,
        sourceStepId: conn.sourceStepId,
        sourcePort: conn.sourcePortId,
        targetStepId: conn.targetStepId,
        targetPort: conn.targetPortId,
        points: conn.points?.map((p) => ({ x: p.x, y: p.y })),
        style: conn.metadata?.style ?? null,
        label: null,
      })),
      notes: null,
      groups: null,
    },
  };
}

export function useGraphQL(): UseGraphQLReturn {
  const reactory = useReactory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkflows = useCallback(async (
    filter?: any, 
    pagination?: any
  ): Promise<WorkflowDefinition[]> => {
    return handleRequest(async () => {
      const query = `
        query GetWorkflows($filter: WorkflowFilterInput, $pagination: PaginationInput) {
          workflows(filter: $filter, pagination: $pagination) {
            workflows {
              id
              name
              version
              namespace
              description
              tags
              author
              createdAt
              updatedAt
              isActive
            }
          }
        }
      `;

      const response = await reactory.graphqlQuery<WorkflowsQueryResult, {
        filter?: any;
        pagination?: any;
      }>(query, { filter, pagination });

      if (response.data?.workflows) {
        return response.data.workflows;
      }

      throw new Error('Failed to fetch workflows');
    });
  }, [reactory, handleRequest]);

  const getWorkflow = useCallback(async (
    namespace: string, 
    name: string
  ): Promise<WorkflowDefinition | null> => {
    return handleRequest(async () => {
      const query = `
        query GetWorkflow($namespace: String!, $name: String!) {
          workflow(namespace: $namespace, name: $name) {
            id
            name
            version
            namespace
            description
            tags
            author
            createdAt
            updatedAt
            configuration {
              timeout
              maxRetries
              retryDelay
              priority
              parallelism
              environment
              resources {
                cpu
                memory
                storage
              }
              notifications {
                onSuccess
                onFailure
                channels
              }
            }
            dependencies {
              name
              type
              version
              optional
              description
            }
            statistics {
              totalExecutions
              successfulExecutions
              failedExecutions
              averageExecutionTime
            }
          }
        }
      `;

      const response = await reactory.graphqlQuery<{ workflow: WorkflowDefinition | null }, {
        namespace: string;
        name: string;
      }>(query, { namespace, name });

      return response.data?.workflow || null;
    });
  }, [reactory, handleRequest]);

  const saveWorkflowDefinition = useCallback(async (
    definition: WorkflowDefinition
  ): Promise<SaveWorkflowResult['saveWorkflowDefinition']> => {
    return handleRequest(async () => {
      const mutation = `
        mutation SaveWorkflowDefinition($definition: WorkflowDefinitionInput!) {
          saveWorkflowDefinition(definition: $definition) {
            nameSpace
            name
            version
            description
            author
            tags
            loadStatus
            yamlSource
            location
            errors {
              stage
              message
              code
            }
            steps {
              id
              name
              type
              designer {
                position { x y }
                size { width height }
              }
            }
            designer {
              canvas {
                zoom
                panX
                panY
                gridSize
                snapToGrid
              }
              connections {
                id
                sourceStepId
                sourcePort
                targetStepId
                targetPort
                points { x y }
              }
            }
          }
        }
      `;

      const input = toWorkflowDefinitionInput(definition);

      const response = await reactory.graphqlMutation<SaveWorkflowResult, {
        definition: any;
      }>(mutation, { definition: input });

      if (response.data?.saveWorkflowDefinition) {
        const result = response.data.saveWorkflowDefinition;
        if (result.loadStatus !== 'SUCCESS' && result.loadStatus !== 'PARTIAL') {
          const errorMessages = result.errors?.map(e => e.message).join('; ') || 'Unknown error';
          throw new Error(`Failed to save workflow: ${errorMessages}`);
        }
        return result;
      }

      throw new Error('Failed to save workflow definition');
    });
  }, [reactory, handleRequest]);

  const deleteWorkflowDefinition = useCallback(async (
    nameSpace: string,
    name: string,
    version?: string
  ): Promise<boolean> => {
    return handleRequest(async () => {
      const mutation = `
        mutation DeleteWorkflowDefinition($nameSpace: String!, $name: String!, $version: String) {
          deleteWorkflowDefinition(nameSpace: $nameSpace, name: $name, version: $version) {
            success
            message
          }
        }
      `;

      const response = await reactory.graphqlMutation<DeleteWorkflowResult, {
        nameSpace: string;
        name: string;
        version?: string;
      }>(mutation, { nameSpace, name, version });

      if (response.data?.deleteWorkflowDefinition?.success) {
        return true;
      }

      throw new Error(
        response.data?.deleteWorkflowDefinition?.message || 'Failed to delete workflow definition'
      );
    });
  }, [reactory, handleRequest]);

  const validateWorkflowDefinition = useCallback(async (
    definition: WorkflowDefinition
  ): Promise<ValidateWorkflowResult['validateWorkflowDefinition']> => {
    return handleRequest(async () => {
      const mutation = `
        mutation ValidateWorkflowDefinition($definition: WorkflowDefinitionInput!) {
          validateWorkflowDefinition(definition: $definition) {
            valid
            errors {
              field
              message
              code
            }
            warnings {
              field
              message
              code
            }
          }
        }
      `;

      const input = toWorkflowDefinitionInput(definition);

      const response = await reactory.graphqlMutation<ValidateWorkflowResult, {
        definition: any;
      }>(mutation, { definition: input });

      if (response.data?.validateWorkflowDefinition) {
        return response.data.validateWorkflowDefinition;
      }

      throw new Error('Failed to validate workflow definition');
    });
  }, [reactory, handleRequest]);

  return {
    loading,
    error,
    getWorkflows,
    getWorkflow,
    saveWorkflowDefinition,
    deleteWorkflowDefinition,
    validateWorkflowDefinition,
  };
}
