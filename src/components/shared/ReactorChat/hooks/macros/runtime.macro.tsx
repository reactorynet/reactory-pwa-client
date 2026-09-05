import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

//@ts-ignore
const RuntimeMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  console.log('🔧 [RuntimeMacro] Called with args:', args, 'type:', typeof args);
  
  // Handle both array and object argument formats
  let action, macro, tool;
  
  if (Array.isArray(args)) {
    [action, macro, tool] = args || [];
  } else if (typeof args === 'object' && args !== null) {
    // Handle object format: {"action": "list"}
    //@ts-ignore
    action = args.action;
    //@ts-ignore
    macro = args.macro;
    //@ts-ignore
    tool = args.tool;
  } else {
    action = args;
  }
  
  console.log('🔧 [RuntimeMacro] Parsed arguments:', { action, macro, tool });

  if (action === "list") {
    const activeToolNames = new Set(
      (chatState.tools || []).map((t) => t.function?.name || (t as any).name).filter(Boolean)
    );
    const user = reactory.getUser ? reactory.getUser() : null;
    const userRoles: string[] = user?.roles as string[] || ['USER'];

    // Filter macros to only those active and available for the user in this session
    const activeMacros = (chatState.macros || []).filter((macro) => {
      // 1. Role-based access check
      if (macro.roles && macro.roles.length > 0) {
        const hasRole = macro.roles.some((r: string) => userRoles.includes(r));
        if (!hasRole) return false;
      }

      // 2. Tool selection check: if the macro declares tools, at least one must be active
      if (Array.isArray(macro.tools) && macro.tools.length > 0) {
        return macro.tools.some((t: any) => {
          const name = t.function?.name || t.name;
          return name && activeToolNames.has(name);
        });
      }

      // 3. For macros without explicit tools: check if active by name or if client utility
      const identifier = macro.alias || macro.name;
      if (activeToolNames.size > 0 && !activeToolNames.has(identifier)) {
        // Keep runtime utility macros like 'macros', 'state'
        if (macro.name === 'macros' || macro.alias === 'macros') {
          return true;
        }
        return false;
      }

      return true;
    });

    const macrosText = activeMacros.length > 0
      ? activeMacros.map(m => `- ${m?.alias ?? (m.nameSpace ? `${m.nameSpace}.${m.name}` : m.name)}`).join("\n")
      : "None";

    const toolsText = (chatState.tools || []).length > 0
      ? (chatState.tools || []).map(t => `- ${t?.function?.name ?? 'unknown'}`).join("\n")
      : "None";

    return {
      __typename: "ReactorChatMessage",
      role: "system",
      content: `Available Macros:\n${macrosText}\n\nAvailable Tools:\n${toolsText}`,
      component: null,
      props: {},
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: []
    };
  }

  if (action === 'details') {
    const macroName = macro?.name || (typeof macro === 'string' ? macro : null);
    const toolName = tool?.name || (typeof tool === 'string' ? tool : null);

    const macroDetails = macroName
      ? (chatState.macros || []).find((m: any) => m.name === macroName || m.alias === macroName)
      : null;
    const toolDetails = toolName
      ? (chatState.tools || []).find((t: any) => t.function?.name === toolName || (t as any).name === toolName)
      : null;

    if (macroDetails) {
      return {
        __typename: "ReactorChatMessage",
        role: "system",
        content: `Macro Details: ${JSON.stringify(macroDetails, null, 2)}`,
        component: null,
        props: {},
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: []
      };
    }

    if (toolDetails) {
      return {
        __typename: "ReactorChatMessage",
        role: "system",
        content: `Tool Details: ${JSON.stringify(toolDetails, null, 2)}`,
        component: null,
        props: {},
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: []
      };
    }
  }

  if (action === "add" && macro) {
    if (!chatState.macros) chatState.macros = [];
    const existingIndex = chatState.macros.findIndex((m: any) => m.name === macro.name || m.alias === macro.name);
    if (existingIndex >= 0) {
      chatState.macros[existingIndex] = macro;
    } else {
      chatState.macros.push(macro);
    }
    return {
      __typename: "ReactorChatMessage",
      role: "system",
      content: `Macro "${macro.name}" added.`,
      component: null,
      props: {},
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: []
    };
  }

  if (action === "add" && tool) {
    if (!chatState.tools) chatState.tools = [];
    const toolName = tool.function?.name || tool.name;
    const existingIndex = chatState.tools.findIndex((t: any) => (t.function?.name || t.name) === toolName);
    if (existingIndex >= 0) {
      chatState.tools[existingIndex] = tool;
    } else {
      chatState.tools.push(tool);
    }
    return {
      __typename: "ReactorChatMessage",
      role: "system",
      content: `Tool "${toolName || 'custom'}" added.`,
      component: null,
      props: {},
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: []
    };
  }

  return {
    __typename: "ReactorChatMessage",
    role: "system",
    content: "Invalid runtime macro action.",
    component: null,
    props: {},
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: []
  };
};

const TOOL_DESCRIPTION = `Inspect or manage macros and tools available to the current chat session at runtime.

ACTIONS:
- "list": Return a summary of all macros and server-side tools registered in the current session. Use this to discover what capabilities are available before deciding which tool to call.
- "details": Return the full definition of a specific macro or tool by name. Useful for understanding a tool's parameters before calling it.
- "add": Register a new macro or tool definition into the current session at runtime. Provide either a "macro" object or a "tool" object (not both).

WHEN TO USE:
- Use "list" when the user asks "what can you do?", "what tools do you have?", or "what macros are available?"
- Use "details" to inspect a specific macro or tool the user is curious about.
- Use "add" only when a macro or tool definition has been explicitly provided and needs to be registered for the session.

EXAMPLES:

1) List everything available:
   { "action": "list" }

2) Get details of a specific macro:
   { "action": "details", "macro": { "name": "form" } }

3) Get details of a specific tool:
   { "action": "details", "tool": { "name": "search" } }

4) Register a new macro at runtime:
   { "action": "add", "macro": { "name": "myMacro", "nameSpace": "custom", "version": "1.0.0", ... } }`;

const RuntimeMacroDefinition: MacroComponentDefinition<typeof RuntimeMacro> = {
  name: "macros",
  description: "Inspect or manage macros and tools registered in the current chat session at runtime.",
  component: RuntimeMacro,
  version: "1.0.0",
  nameSpace: "core",
  roles: ['USER'],
  alias: 'macros',
  runat: 'client',
  tools: [
    {
      type: "function",
      safeForAutoExecution: true,
      runat: "client",
      function: {
        name: "macros",
        description: TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["list", "details", "add"],
              description: "Action to perform.",
            },
            macro: {
              type: "object",
              description: "Macro definition or identifier. For 'add': full definition object. For 'details': object with a 'name' key.",
            },
            tool: {
              type: "object",
              description: "Tool definition or identifier. For 'add': full definition object. For 'details': object with a 'name' key.",
            },
          },
          required: ["action"],
        },
      },
    },
  ],
};

export default RuntimeMacroDefinition;
