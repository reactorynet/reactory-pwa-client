import { extractAgentGraphFromMessages } from '../components/NeuralBrainBackground';

// ──────────────────────────────────────────────
// extractAgentGraphFromMessages — synthesizes the agent's graph perspective
// from graph tool results embedded in chat history messages.
// ──────────────────────────────────────────────
describe('extractAgentGraphFromMessages', () => {
  const msg = (toolResults: any[]) => ({ role: 'assistant', tool_results: toolResults });

  it('returns an empty graph for empty or undefined history', () => {
    expect(extractAgentGraphFromMessages(undefined as any)).toEqual({ nodes: [], edges: [] });
    expect(extractAgentGraphFromMessages([])).toEqual({ nodes: [], edges: [] });
  });

  it('extracts nodes from searchGraph results', () => {
    const graph = extractAgentGraphFromMessages([
      msg([{
        id: 'tc1',
        name: 'searchGraph',
        content: {
          success: true,
          tool: 'searchGraph',
          data: { nodes: [{ id: 1, name: 'UserService.ts', type: 'FILE' }], count: 1 },
        },
      }]),
    ]);
    expect(graph.nodes).toEqual([{ id: 1, name: 'UserService.ts', type: 'FILE', origin: 'agent' }]);
    expect(graph.edges).toEqual([]);
  });

  it('extracts nodes and links from exploreGraph results, handling source/target keys', () => {
    const graph = extractAgentGraphFromMessages([
      msg([{
        id: 'tc2',
        name: 'exploreGraph',
        content: {
          success: true,
          tool: 'exploreGraph',
          data: {
            nodes: [
              { id: 1, name: 'a', type: 'FILE' },
              { id: 2, name: 'b', type: 'FILE' },
            ],
            links: [{ id: 9, source: 1, target: 2, types: ['DEPENDENCY'] }],
          },
        },
      }]),
    ]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([{ sourceId: 1, targetId: 2, origin: 'agent' }]);
  });

  it('synthesizes containment edges from graphChildren parent + children', () => {
    const graph = extractAgentGraphFromMessages([
      msg([{
        id: 'tc3',
        name: 'graphChildren',
        content: {
          success: true,
          tool: 'graphChildren',
          data: {
            parent: { id: 10, name: 'src', type: 'FOLDER' },
            nodes: [{ id: 11, name: 'index.ts', type: 'FILE', parentId: 10 }],
          },
        },
      }]),
    ]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([{ sourceId: 10, targetId: 11, origin: 'agent' }]);
  });

  it('parses JSON string content and skips unparseable content', () => {
    const graph = extractAgentGraphFromMessages([
      msg([
        {
          id: 'tc4',
          name: 'getGraphNode',
          content: JSON.stringify({
            success: true,
            tool: 'getGraphNode',
            data: { node: { id: 5, name: 'App.tsx', type: 'FILE' } },
          }),
        },
        { id: 'tc5', name: 'searchGraph', content: 'not json at all' },
      ]),
    ]);
    expect(graph.nodes).toEqual([{ id: 5, name: 'App.tsx', type: 'FILE', origin: 'agent' }]);
  });

  it('ignores failed results and non-graph tools', () => {
    const graph = extractAgentGraphFromMessages([
      msg([
        {
          id: 'tc6',
          name: 'searchGraph',
          content: { success: false, tool: 'searchGraph', error: 'boom' },
        },
        {
          id: 'tc7',
          name: 'readFile',
          content: { success: true, tool: 'readFile', data: { nodes: [{ id: 99, name: 'x' }] } },
        },
      ]),
    ]);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it('extracts endpoint nodes and the created edge from createNodeEdge results', () => {
    const graph = extractAgentGraphFromMessages([
      msg([{
        id: 'tc8',
        name: 'createNodeEdge',
        content: {
          success: true,
          tool: 'createNodeEdge',
          data: {
            link: { id: 77, source: 1, target: 2, types: ['REFERENCES'] },
            source: { id: 1, name: 'a', type: 'FILE' },
            target: { id: 2, name: 'b', type: 'FILE' },
          },
        },
      }]),
    ]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([{ sourceId: 1, targetId: 2, origin: 'agent' }]);
  });

  it('deduplicates nodes and edges across multiple tool results', () => {
    const searchResult = {
      id: 'tc9',
      name: 'searchGraph',
      content: {
        success: true,
        tool: 'searchGraph',
        data: { nodes: [{ id: 1, name: 'a', type: 'FILE' }] },
      },
    };
    const graph = extractAgentGraphFromMessages([msg([searchResult]), msg([searchResult])]);
    expect(graph.nodes).toHaveLength(1);
  });
});
