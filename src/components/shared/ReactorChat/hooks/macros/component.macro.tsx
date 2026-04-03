import { Macro, MacroComponentDefinition, SidePanelAction, UXChatMessage } from "../../types";

// @ts-ignore
const ComponentMacro: Macro<UXChatMessage> = (args, chatState, reactory) => {
  const parsed = (args && typeof args === 'object' && !Array.isArray(args)) ? args as Record<string, any> : {};

  const action: SidePanelAction = parsed.action || 'add';
  const fqn: string | undefined = parsed.fqn || (Array.isArray(args) ? args[0] : undefined);
  const props: Record<string, any> = parsed.props || (Array.isArray(args) ? args[1] : {}) || {};
  const referenceId: string | undefined = parsed.referenceId;
  const title: string | undefined = parsed.title;

  if (!chatState.sidePanel) {
    reactory.error('ComponentMacro: Side panel actions not available on chatState');
    return null;
  }

  // ── REMOVE ──
  if (action === 'remove') {
    if (!referenceId) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot remove component: `referenceId` is required for the remove action.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }
    chatState.sidePanel.removeItem(referenceId);
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Removed component "${referenceId}" from the side panel.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // ── UPDATE ──
  if (action === 'update') {
    if (!referenceId) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot update component: `referenceId` is required for the update action.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }
    const updates: Record<string, any> = {};
    if (fqn) updates.componentFqn = fqn;
    if (props && Object.keys(props).length > 0) updates.props = props;
    if (title) updates.title = title;
    chatState.sidePanel.updateItem(referenceId, updates);
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Updated component "${referenceId}" in the side panel.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // ── ADD (default) ──
  if (!fqn) {
    reactory.error('ComponentMacro: No component fqn provided', args);
    return null;
  }

  if (typeof fqn !== 'string') {
    reactory.error('ComponentMacro: Component fqn must be a string', args);
    return null;
  }

  const component = reactory.getComponent(fqn);
  if (!component) {
    reactory.error('ComponentMacro: Component not found', args);
    return null;
  }

  if (typeof component !== 'function') {
    reactory.error('ComponentMacro: Component is not a valid React component', args);
    return null;
  }

  const itemId = referenceId || reactory.utils.uuid();
  chatState.sidePanel.addItem({
    id: itemId,
    componentFqn: fqn,
    props: { ...props, reactory },
    title: title || fqn.split('.').pop()?.split('@')[0] || fqn,
    addedAt: new Date(),
    type: 'component',
  });

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: `Mounted component **${title || fqn}** in the side panel (ref: \`${itemId}\`).`,
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  };
};

const TOOL_DESCRIPTION = `Mount, update, or remove a React component in the persistent side panel. Components remain visible as the conversation continues, unlike inline chat content that scrolls away.

ACTIONS:
- "add" (default): Mount a new component. Requires "fqn" (component fully-qualified name). Optionally set "props", "title", and "referenceId".
- "update": Update an existing component's props or swap its FQN. Requires "referenceId".
- "remove": Remove a component from the side panel. Requires "referenceId".

Use the "side_panel_state" tool first to see what is currently mounted and get reference IDs.

EXAMPLES:
1) Mount a user profile: { "fqn": "core.UserProfile@1.0.0", "props": { "userId": "123" }, "title": "User Profile" }
2) Update props: { "action": "update", "referenceId": "abc-123", "props": { "userId": "456" } }
3) Remove: { "action": "remove", "referenceId": "abc-123" }`;

const ComponentMacroDefinition: MacroComponentDefinition<typeof ComponentMacro> = {
  name: "ComponentMacro",
  nameSpace: "reactor-macros",
  description: "Mount, update, or remove a component in the persistent side panel.",
  component: ComponentMacro,
  version: "1.0.0",
  roles: ['USER'],
  alias: 'component',
  runat: 'client',
  tools: [
    {
      type: "function",
      runat: "client",
      safeForAutoExecution: false,
      function: {
        name: "component",
        description: TOOL_DESCRIPTION,      
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "The operation to perform: 'add' (default), 'update', or 'remove'.",
              enum: ["add", "update", "remove"],
            },
            fqn: {
              type: "string",
              description: "Fully-qualified component name (e.g. 'core.UserProfile@1.0.0'). Required for 'add'.",
            },
            props: {
              type: "object",
              description: "Props to pass to the component.",
            },
            title: {
              type: "string",
              description: "Display title for the side panel tab.",
            },
            referenceId: {
              type: "string",
              description: "Unique reference ID. Required for 'update' and 'remove'. Optional for 'add' (auto-generated if omitted).",
            },
          },
          required: [],
        },
      },
    },
  ],
};

export default ComponentMacroDefinition;
