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

ALWAYS call this tool BEFORE using the 'component', 'form', or 'd3' tools with "update" or "remove" actions — you need the referenceId from this tool to target an existing item.

Use this tool to:
- Check what is currently visible before adding something new
- Retrieve a referenceId to update an existing visualization or form
- Confirm that an add/remove operation succeeded
- Avoid mounting duplicate items`;

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
