import { Macro, MacroComponentDefinition } from "../../types";

const LogoutMacro: Macro<unknown> = async (params, chatState, reactory) => {
  try {
    await reactory.logout(true);
    
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: "You have been successfully logged out.",
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: []
    };
  } catch (error) {
    reactory.error("LogoutMacro", error);
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: "Error occurred during logout. Please try again.",
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: []
    };
  }
};

const TOOL_DESCRIPTION = `Log out the currently authenticated user and end their session.

This immediately invalidates the user's session token and redirects to the unauthenticated state. Any unsaved work in open forms or components will be lost.

Invoke this when:
- The user explicitly asks to log out, sign out, or exit their session.
- A security-sensitive flow requires session termination.

Do NOT invoke this automatically or as a side effect of other operations. Always confirm intent before calling if there is any ambiguity.

No parameters required.`;

const LogoutMacroDefinition: MacroComponentDefinition<typeof LogoutMacro> = { 
  name: "LogoutMacro",
  description: "Log out the currently authenticated user and terminate their session.",
  component: LogoutMacro,
  version: "1.0.0",
  nameSpace: "core",
  roles: ['USER'],
  alias: 'logout',
  runat: 'client',
  tools: [
    {
      type: "function",
      function: {
        name: "logout",
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

export default LogoutMacroDefinition;

