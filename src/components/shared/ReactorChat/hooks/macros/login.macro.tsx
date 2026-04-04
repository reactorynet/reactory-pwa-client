import { Macro, MacroComponentDefinition } from "../../types";

const LoginMacro: Macro<unknown> = async (params, chatState, reactory) => { 
  
  if (params && typeof params === 'object' && Object.keys(params).length > 0) { 
    const [username, password] = params;
    if (!username || !password) {
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: `Please provide both username and password to log in.`,
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: []
      };
    }
    // Attempt to log in with the provided credentials
    try {
      const result = await reactory.login(username, password);    
      if (result.user) {
        reactory.afterLogin(result);
        return {
          __typename: "ReactorChatMessage",
          id: reactory.utils.uuid(),
          role: "assistant",
          content: `Welcome ${result.user.firstName}, you have been logged in.`,
          rating: 0,
          timestamp: new Date(),
          tool_calls: []
        };
      } else {
        return {
          __typename: "ReactorChatMessage",
          role: "assistant",
          content: `Login failed. Please check your credentials.`,
          id: reactory.utils.uuid(),
          rating: 0,
          timestamp: new Date(),
          tool_calls: []
        };
      }
    } catch (error) {
      reactory.error("LoginMacro", error);
      return {
        __typename: "ReactorChatMessage",
        role: "assistant",
        content: `Error during authentication. Please try again later.`,
        id: reactory.utils.uuid(),
        rating: 0,
        timestamp: new Date(),
        tool_calls: []
      };
    }
  } 
  // return a message that specifies the login component to load.
  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: `Use the login component to authenticate.`,
    component: "core.Login",
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: []
  };    
};

const TOOL_DESCRIPTION = `Authenticate the current user. Two modes of operation:

1) CREDENTIALS PROVIDED — if "username" and "password" are supplied, attempts a direct login immediately and returns a success or failure message.
2) NO CREDENTIALS — if called with no arguments (or without valid credentials), mounts the interactive login UI component so the user can enter their details.

Use mode 2 when the user says they want to log in but hasn't provided credentials, or when a previous attempt failed and you want to offer a UI retry.
Use mode 1 only when the user has explicitly supplied both their username/email and password in the conversation.

NEVER store, log, or repeat passwords. Do not auto-fill credentials from memory.

EXAMPLES:

1) Show the login UI:
   {} (no parameters)

2) Attempt login with provided credentials:
   { "username": "alice@example.com", "password": "s3cr3t" }`;

const LoginMacroDefinition: MacroComponentDefinition<typeof LoginMacro> = { 
  name: "LoginMacro",
  description: "Authenticate the user — either via provided credentials or by mounting the login UI.",
  component: LoginMacro,
  version: "1.0.0",
  nameSpace: "core",
  roles: ['ANON'],
  alias: 'login',
  runat: 'client',
  tools: [
    {
      type: "function",
      function: {
        name: "login",
        icon: "login",
        description: TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The user's email address or username. Only provide if the user has explicitly given it.",
            },
            password: {
              type: "string",
              description: "The user's password. Only provide if the user has explicitly given it in this conversation.",
            },
          },
          required: [],
        },
      },
    },
  ],  
};

export default LoginMacroDefinition;