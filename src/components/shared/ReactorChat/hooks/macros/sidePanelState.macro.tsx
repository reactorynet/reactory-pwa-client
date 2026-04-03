import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

// @ts-ignore
const SidePanelStateMacro: Macro<UXChatMessage> = (args, chatState, reactory) => {
  if (!chatState.sidePanel) {
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: 'Side panel is not available.',
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  const state = chatState.sidePanel.getState();
  const summary = state.items.map((item) => ({
    referenceId: item.id,
    componentFqn: item.componentFqn,
    title: item.title,
    type: item.type,
    addedAt: item.addedAt,
  }));

  const content = state.items.length === 0
    ? 'The side panel is empty — no components or forms are currently mounted.'
    : `Side panel contains **${state.items.length}** item(s) (panel ${state.isOpen ? 'open' : 'closed'}, active: \`${state.activeItemId ?? 'none'}\`):\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``;

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content,
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  };
};

const SidePanelStateMacroDefinition: MacroComponentDefinition<typeof SidePanelStateMacro> = {
  name: "SidePanelStateMacro",
  nameSpace: "reactor-macros",
  description: "Retrieve the current state of the side panel — lists all mounted components and forms with their reference IDs.",
  component: SidePanelStateMacro,
  version: "1.0.0",
  roles: ['USER'],
  alias: 'side_panel_state',
  runat: 'client',
  tools: [
    {
      type: "function",
      safeForAutoExecution: true,
      runat: "client",
      function: {
        name: "side_panel_state",
        description: "Get the current state of the side panel. Returns list of mounted components/forms with their referenceId, componentFqn, title, type, and addedAt. Use this before calling 'component' or 'form' with update/remove actions to discover existing reference IDs.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
  ],
};

export default SidePanelStateMacroDefinition;
