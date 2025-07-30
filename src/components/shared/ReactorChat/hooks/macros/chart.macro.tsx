import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

/**
 * Chart Macro for ReactorChat
 * Renders different types of charts using the Reactory Chart widgets
 */
//@ts-ignore
const ChartMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  // Default chart configuration
  const defaultConfig = {
    type: "pie",
    title: "Sample Chart",
    data: [
      { name: "Group A", value: 400 },
      { name: "Group B", value: 300 },
      { name: "Group C", value: 300 },
      { name: "Group D", value: 200 },
    ],
    options: {
      width: 400,
      height: 300,
    }
  };

  // Merge provided args with defaults
  const chartConfig = (args && typeof args === 'object' && !Array.isArray(args))
    ? { ...defaultConfig, ...(args as any) }
    : defaultConfig;

  // Determine the component name based on the chart type
  const chartTypes = {
    'pie': 'widgets.PieChartWidget',
    'bar': 'widgets.BarChartWidget',
    'line': 'widgets.LineChartWidget',
    'funnel': 'widgets.FunnelChartWidget',
    'composed': 'widgets.ComposedChartWidget',
  };
  
  const componentName = chartTypes[chartConfig.type.toLowerCase()] || chartTypes.pie;

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: chartConfig.title || 'Rendering chart...',
    component: componentName,
    props: {
      chartTitle: chartConfig.title,
      data: chartConfig.data,
      ...chartConfig.options,
    },
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: []
  };
};

const ChartMacroDefinition: MacroComponentDefinition<typeof ChartMacro> = {
  name: "ChartMacro",
  description: "A macro that renders various chart types (pie, bar, line, funnel, composed) using Reactory Chart widgets.",
  component: ChartMacro,
  version: "1.0.0",
  nameSpace: "reactor-macros",
  roles: ['USER'],
  alias: 'chart',
  icon: "bar_chart",
  runat: 'client',
  tools: [
    {
      type: "function",
      function: {
        name: "chart",
        icon: "bar_chart",
        description: "Create and mount a chart in the chat. Specify chart type, data, and display options.",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "The type of chart to render: 'pie', 'bar', 'line', 'funnel', or 'composed'.",
              enum: ["pie", "bar", "line", "funnel", "composed"]
            },
            title: {
              type: "string",
              description: "The title to display for the chart."
            },
            data: {
              type: "array",
              description: "Array of data objects for the chart. Format depends on chart type.",
              items: {
                type: "object"
              }
            },
            options: {
              type: "object",
              description: "Additional configuration options for the chart"
            }
          },
          required: ["data"]
        }
      }
    }
  ],
};

export default ChartMacroDefinition;
