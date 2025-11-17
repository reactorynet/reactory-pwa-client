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

const LoginMacroDefinition: MacroComponentDefinition<typeof LoginMacro> = { 
  name: "LoginMacro",
  description: "A macro that handles user login. It will trigger the login component if no username or password is provided, or attempt to log in with the provided credentials.",
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
        description: "Triggers the login process process.",
        parameters: null
      }
    }
  ],  
};

export default LoginMacroDefinition;