import { Macro, MacroComponentDefinition } from "../../types";

const LoginMacro: Macro<unknown> = async (params, chatState, reactory) => {
  debugger;
  const [username, password] = params;

  if (!username || !password) {
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Please provide both username and password.`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: []
    };
  }

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
};

const LoginMacroDefinition: MacroComponentDefinition<typeof LoginMacro> = { 
  name: "LoginMacro",
  description: "A macro that handles user login.",
  component: LoginMacro,
  version: "1.0.0",
  nameSpace: "core",
  roles: ['ANON'],
  alias: 'login',
  tools: [
    {
      type: "function",
      function: {
        name: "login",
        description: "Login to the system",
        parameters: {
          type: "object",
          properties: {
            args: {
              type: "array",
              description: "The arguments for the login function, which should be username and password",
              items: {
                type: "string",                
              }              
            },
            password: {
              type: "string",
              description: "The password of the user"
            }
          },
          required: ["username", "password"]
        }
      }
    }
  ],  
};

export default LoginMacroDefinition;