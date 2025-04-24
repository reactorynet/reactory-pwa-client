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

const LogoutMacroDefinition: MacroComponentDefinition<typeof LogoutMacro> = { 
  name: "LogoutMacro",
  description: "A macro that handles user logout.",
  component: LogoutMacro,
  version: "1.0.0",
  nameSpace: "core",
  roles: ['USER'], // Only logged-in users can logout
  alias: 'logout',
  tools: [
    {
      type: "function",
      function: {
        name: "logout",
        description: "Logout from the system",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    }
  ],  
};

export default LogoutMacroDefinition;

