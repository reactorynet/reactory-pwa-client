import { Macro, MacroComponentDefinition, SidePanelAction, UXChatMessage } from "../../types";

// @ts-ignore
const ComponentMacro: Macro<UXChatMessage> = (args, chatState, reactory) => {
  const parsed = (args && typeof args === 'object' && !Array.isArray(args)) ? args as Record<string, any> : {};

  const action: SidePanelAction = parsed.action || 'add';
  const fqn: string | undefined = parsed.fqn || (Array.isArray(args) ? args[0] : undefined);
  const props: Record<string, any> = parsed.props || (Array.isArray(args) ? args[1] : {}) || {};
  const referenceId: string | undefined = parsed.referenceId;
  const title: string | undefined = parsed.title;

  // ── LIST ──
  if (action === 'list') {
    const componentType: string = parsed.componentType || undefined;
    const register = componentType
      ? reactory.getComponentsByType(componentType)
      : reactory.componentRegister;

    const entries = Object.keys(register);
    if (entries.length === 0) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: componentType
          ? `No components registered with type "${componentType}".`
          : 'No components are currently registered.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }

    const rows = entries.map((key) => {
      const entry = register[key];
      const tags = Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags.join(', ') : '—';
      const type = entry.componentType || 'component';
      return `| \`${key}\` | ${type} | ${tags} |`;
    });

    const content = [
      `**Registered components** (${entries.length} total${componentType ? `, type: ${componentType}` : ''}):`,
      '',
      '| FQN | Type | Tags |',
      '|-----|------|------|',
      ...rows,
    ].join('\n');

    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // ── SEARCH ──
  if (action === 'search') {
    const query: string = (parsed.query || '').toLowerCase().trim();
    if (!query) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot search components: `query` is required for the search action.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }

    const register = reactory.componentRegister;
    const matches = Object.keys(register).filter((key) => {
      const entry = register[key];
      const tagsMatch = Array.isArray(entry.tags) && entry.tags.some((t: string) => t.toLowerCase().includes(query));
      return (
        key.toLowerCase().includes(query) ||
        (entry.nameSpace || '').toLowerCase().includes(query) ||
        (entry.name || '').toLowerCase().includes(query) ||
        (entry.componentType || '').toLowerCase().includes(query) ||
        tagsMatch
      );
    });

    if (matches.length === 0) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: `No components found matching \`${query}\`.`,
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }

    const rows = matches.map((key) => {
      const entry = register[key];
      const tags = Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags.join(', ') : '—';
      const type = entry.componentType || 'component';
      return `| \`${key}\` | ${type} | ${tags} |`;
    });

    const content = [
      `**Search results for "${query}"** (${matches.length} match${matches.length !== 1 ? 'es' : ''}):`,
      '',
      '| FQN | Type | Tags |',
      '|-----|------|------|',
      ...rows,
    ].join('\n');

    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  // ── REGISTER ──
  if (action === 'register') {
    if (!fqn) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot register component: `fqn` (nameSpace.Name@version) is required for the register action.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }

    const sourceFqn: string | undefined = parsed.sourceFqn;
    if (!sourceFqn) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: 'Cannot register component: `sourceFqn` is required. Provide the FQN of an existing registered component to alias.',
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }

    const sourceComponent = reactory.getComponent(sourceFqn);
    if (!sourceComponent) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: `Cannot register component: source component \`${sourceFqn}\` is not registered.`,
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: [],
      };
    }

    const parts = fqn.split('@');
    const nameAndNs = parts[0].split('.');
    const version = parts[1] || '1.0.0';
    const nameSpace = nameAndNs.slice(0, -1).join('.');
    const name = nameAndNs[nameAndNs.length - 1];
    const tags: string[] = parsed.tags || [];
    const componentType: string = parsed.componentType || 'component';

    reactory.registerComponent(nameSpace, name, version, sourceComponent, tags, ['*'], false, [], componentType);

    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Registered component \`${fqn}\` as an alias of \`${sourceFqn}\`.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

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

const TOOL_DESCRIPTION = `Mount, update, remove, list, search, or register a React component via the Reactory SDK.

ACTIONS:
- "add" (default): Mount a new component in the persistent side panel. Requires "fqn". Optionally set "props", "title", and "referenceId".
- "update": Update an existing component's props or swap its FQN. Requires "referenceId".
- "remove": Remove a component from the side panel. Requires "referenceId".
- "list": List all registered components. Optionally filter by "componentType" (e.g. "component", "widget", "page").
- "search": Search registered components by name, namespace, type, or tags. Requires "query".
- "register": Register a new FQN alias for an existing component. Requires "fqn" (new alias) and "sourceFqn" (existing component). Optionally set "tags" and "componentType".

Use the "side_panel_state" tool first to see what is currently mounted and get reference IDs.

EXAMPLES:
1) Mount a user profile: { "fqn": "core.UserProfile@1.0.0", "props": { "userId": "123" }, "title": "User Profile" }
2) Update props: { "action": "update", "referenceId": "abc-123", "props": { "userId": "456" } }
3) Remove: { "action": "remove", "referenceId": "abc-123" }
4) List all components: { "action": "list" }
5) List by type: { "action": "list", "componentType": "widget" }
6) Search: { "action": "search", "query": "profile" }
7) Register alias: { "action": "register", "fqn": "my.MyProfile@1.0.0", "sourceFqn": "core.UserProfile@1.0.0", "tags": ["profile"] }`;

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
              description: "The operation to perform: 'add' (default), 'update', 'remove', 'list', 'search', or 'register'.",
              enum: ["add", "update", "remove", "list", "search", "register"],
            },
            fqn: {
              type: "string",
              description: "Fully-qualified component name (e.g. 'core.UserProfile@1.0.0'). Required for 'add' and 'register'.",
            },
            props: {
              type: "object",
              description: "Props to pass to the component. Used by 'add' and 'update'.",
            },
            title: {
              type: "string",
              description: "Display title for the side panel tab. Used by 'add' and 'update'.",
            },
            referenceId: {
              type: "string",
              description: "Unique reference ID. Required for 'update' and 'remove'. Optional for 'add' (auto-generated if omitted).",
            },
            query: {
              type: "string",
              description: "Search query string. Required for 'search'. Matched against FQN, name, namespace, type, and tags.",
            },
            componentType: {
              type: "string",
              description: "Filter by component type (e.g. 'component', 'widget', 'page'). Used by 'list' and 'register'.",
            },
            sourceFqn: {
              type: "string",
              description: "FQN of an existing registered component to alias. Required for 'register'.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags to attach to the registered component. Used by 'register'.",
            },
          },
          required: [],
        },
      },
    },
  ],
};

export default ComponentMacroDefinition;
