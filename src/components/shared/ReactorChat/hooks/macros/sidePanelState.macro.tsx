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
    ? 'The side panel is empty — no components or forms are currently mounted. Proceed with your planned action.'
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

const TOOL_DESCRIPTION = `Inspect the current state of the persistent side panel.

Returns a JSON summary of every item currently mounted in the side panel, including:
- referenceId: the ID used to update or remove the item
- componentFqn: the fully-qualified component name that is mounted
- title: the display title shown in the side panel tab
- type: "component" or "form"
- addedAt: when the item was mounted

Also reports:
- Total item count
- Whether the panel is currently open or closed
- Which item is currently active/focused

WHEN TO USE:
- Call this tool when you need to update or remove an existing item and require its referenceId.
- Call this tool if you need to check what tabs/components are currently open in the side panel.
- Do NOT call this tool prior to adding a new component or form if you don't need to check existing items (referenceId is auto-generated on add).

IMPORTANT OPERATIONAL INSTRUCTION:
- This is a read-only inspection tool.
- After calling this tool, DO NOT stop or wait. Immediately proceed to execute the remaining steps of your task in the conversation turn.`;

const SidePanelStateMacroDefinition: MacroComponentDefinition<typeof SidePanelStateMacro> = {
  name: "SidePanelStateMacro",
  nameSpace: "reactor-macros",
  description: "Inspect the current state of the persistent side panel — lists all mounted items with their reference IDs, types, and titles.",
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
        description: TOOL_DESCRIPTION,
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
