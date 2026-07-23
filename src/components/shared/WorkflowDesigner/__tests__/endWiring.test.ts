import { convertYamlToDesignerDefinition } from '../utils';

/**
 * Regression tests for how the visual designer wires the synthetic `__end__`
 * node. End must be reached from the LAST child of each terminal branch (the
 * real exit points of the workflow), not from the decision/container node that
 * owns those branches.
 *
 * See utils.ts `resolveExitLeaves` and the terminal-wiring block in
 * `convertYamlToDesignerDefinition`.
 */

/**
 * A representative YAML definition in the shape the load pipeline hands the
 * designer: the server injects explicit `__start__` / `__end__` steps, and a
 * fresh load (no persisted designer sidecar) carries no `designer.connections`.
 *
 *   __start__ → setup → gather (parallel) → decide → { ifYes, ifNo } → __end__
 *
 * `ifYes` runs two children (doThing → logDone); `ifNo` runs one (logSkip).
 * The parallel `gather` fans out to a single branch child `leafA`.
 */
const makeYamlDef = (withConnections = false) => ({
  nameSpace: 'test',
  name: 'EndWiring',
  version: '1.0.0',
  steps: [
    { id: '__start__', name: 'Start', type: 'start' },
    { id: 'setup', type: 'cli_command', config: { command: 'echo setup' } },
    {
      id: 'gather',
      type: 'parallel',
      dependsOn: 'setup',
      config: {
        branches: [
          { name: 'b1', steps: [{ id: 'leafA', type: 'cli_command', config: { command: 'echo a' } }] },
        ],
      },
    },
    { id: 'decide', type: 'log', dependsOn: 'gather', config: { message: 'deciding' } },
    {
      id: 'ifYes',
      type: 'condition',
      dependsOn: 'decide',
      config: {
        condition: 'x === true',
        thenSteps: [
          { id: 'doThing', type: 'cli_command', config: { command: 'echo do' } },
          { id: 'logDone', type: 'log', config: { message: 'done' } },
        ],
      },
    },
    {
      id: 'ifNo',
      type: 'condition',
      dependsOn: 'decide',
      config: {
        condition: 'x === false',
        thenSteps: [{ id: 'logSkip', type: 'log', config: { message: 'skip' } }],
      },
    },
    { id: '__end__', name: 'End', type: 'end' },
  ],
  designer: withConnections
    ? {
        canvas: { zoom: 1, panX: 0, panY: 0, gridSize: 20, snapToGrid: true },
        // A persisted (authoritative) connection set — deliberately WITHOUT any
        // edge into __end__, to prove the auto-wiring does not run over it.
        connections: [
          {
            id: 'persisted_1',
            sourceStepId: 'setup',
            sourcePort: 'setup_ctrl_out',
            targetStepId: 'decide',
            targetPort: 'decide_ctrl_in',
          },
        ],
      }
    : undefined,
});

const endSources = (def: ReturnType<typeof convertYamlToDesignerDefinition>) =>
  def.connections
    .filter((c) => c.targetStepId === '__end__')
    .map((c) => c.sourceStepId)
    .sort();

describe('convertYamlToDesignerDefinition — __end__ wiring', () => {
  it('wires End from the last child of each decision branch, not the decision node', () => {
    const def = convertYamlToDesignerDefinition(makeYamlDef());
    expect(endSources(def)).toEqual(['logDone', 'logSkip']);
  });

  it('does not wire End directly from the condition/container nodes', () => {
    const def = convertYamlToDesignerDefinition(makeYamlDef());
    const sources = endSources(def);
    expect(sources).not.toContain('ifYes');
    expect(sources).not.toContain('ifNo');
    expect(sources).not.toContain('decide');
  });

  it('does not treat non-terminal parallel branches as workflow exits', () => {
    const def = convertYamlToDesignerDefinition(makeYamlDef());
    const sources = endSources(def);
    // `gather` continues to `decide`, so neither it nor its branch leaf exits.
    expect(sources).not.toContain('gather');
    expect(sources).not.toContain('leafA');
  });

  it('never draws more than one edge from any single leaf into End', () => {
    const def = convertYamlToDesignerDefinition(makeYamlDef());
    const sources = endSources(def);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('respects persisted designer connections and does not auto-add End edges', () => {
    const def = convertYamlToDesignerDefinition(makeYamlDef(true));
    // Authoritative persisted set had no __end__ edges, so none should appear.
    expect(endSources(def)).toEqual([]);
  });
});
