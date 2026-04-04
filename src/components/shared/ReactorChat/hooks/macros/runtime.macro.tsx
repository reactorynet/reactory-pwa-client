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
    const macros = chatState.macros || [];
    const tools = chatState.tools || [];

    const macrosText = macros.map(m => `- ${m?.alias ?? m.nameSpace + '.' + m.name}`).join("\n");
    const toolsText = tools.map(t => `- ${t?.function?.name ?? 'unknown'}`).join("\n");

    return {
      __typename: "ReactorChatMessage",
      role: "system",
      content: `Available Macros: ${macrosText} \nAvailable Tools: ${toolsText}`,
      component: null,
      props: {},
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: []
    };
  }

  if (action === 'details') {
    const macroDetails = chatState.macros?.[macro.name] || null;
    const toolDetails = chatState.tools?.[tool.name] || null;

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
    chatState.macros[macro.name] = macro;
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
    chatState.tools[tool.name] = tool;
    return {
      __typename: "ReactorChatMessage",
      role: "system",
      content: `Tool "${tool.name}" added.`,
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
