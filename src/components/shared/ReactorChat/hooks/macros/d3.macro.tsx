import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

/**
 * D3 Macro for ReactorChat
 * Renders D3 visualizations using the ReactoryD3Widget
 */
//@ts-ignore
const D3Macro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  // Default D3 configuration
  const defaultConfig = {
    title: "D3 Visualization",
    data: [
      { id: "node1", label: "Node 1", group: 1 },
      { id: "node2", label: "Node 2", group: 1 },
      { id: "node3", label: "Node 3", group: 2 },
    ],
    links: [
      { source: "node1", target: "node2", value: 1 },
      { source: "node2", target: "node3", value: 2 },
    ],
    type: "force-directed",
    options: {
      width: 600,
      height: 400,
      nodeRadius: 10,
      linkDistance: 100,
    }
  };

  // Merge provided args with defaults
  const d3Config = (args && typeof args === 'object' && !Array.isArray(args))
    ? { ...defaultConfig, ...(args as any) }
    : defaultConfig;

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: d3Config.title || 'Rendering D3 visualization...',
    component: 'widgets.ReactoryD3Widget',
    props: {
      title: d3Config.title,
      data: d3Config.data,
      links: d3Config.links,
      type: d3Config.type,
      ...d3Config.options,
    },
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: []
  };
};

const D3MacroDefinition: MacroComponentDefinition<typeof D3Macro> = {
  name: "D3Macro",
  description: "A macro that renders D3 data visualizations using the ReactoryD3Widget component.",
  component: D3Macro,
  version: "1.0.0",
  nameSpace: "reactor-macros",
  roles: ['USER'],
  alias: 'd3',
  icon: "bubble_chart",
  runat: 'client',
  tools: [
    {
      type: "function",
      function: {
        name: "d3",
        icon: "bubble_chart",
        description: "Create and mount a D3 visualization in the chat. Supports various D3 visualization types.",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "The type of D3 visualization to render (e.g., 'force-directed', 'tree', 'sankey', etc.)"
            },
            title: {
              type: "string",
              description: "The title to display for the visualization"
            },
            data: {
              type: "array",
              description: "Array of node objects for the visualization",
              items: {
                type: "object"
              }
            },
            links: {
              type: "array",
              description: "Array of link objects connecting nodes (for network graphs)",
              items: {
                type: "object"
              }
            },
            options: {
              type: "object",
              description: "Additional configuration options for the visualization"
            }
          },
          required: ["data"]
        }
      }
    }
  ],
};

export default D3MacroDefinition;
