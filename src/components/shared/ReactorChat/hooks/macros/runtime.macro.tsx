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

const RuntimeMacroDefinition: MacroComponentDefinition<typeof RuntimeMacro> = {
  name: "macros",
  description: `A macro for runtime management of macros and tools (list/add).
  - list: Lists all available macros and tools.
  - add: Adds a new macro or tool to the runtime environment.`,
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
        description: "List or add macros/tools at runtime.",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["list", "add"],
              description: "Action to perform: list or add."
            },
            macro: {
              type: "object",
              description: "Macro definition to add (if action is add)."
            },
            tool: {
              type: "object",
              description: "Tool definition to add (if action is add)."
            }
          },
          required: ["action"]
        }
      }
    }
  ]
};

export default RuntimeMacroDefinition;
