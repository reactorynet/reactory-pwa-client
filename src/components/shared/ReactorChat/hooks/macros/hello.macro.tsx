import { Macro, MacroComponentDefinition } from "../../types";

const GreetingMacro: Macro<unknown> = async (params, chatState, reactory) => {

  const [greeting = 'Who are you and what is your purpose?'] = params;
  const { sendMessage } = chatState;
  
  sendMessage(greeting, chatState.id);
};

const GreetingMacroDefinition: MacroComponentDefinition<typeof GreetingMacro> = { 
  name: "Greeting",
  description: "A macro that provides a canned greeting from the user.",
  component: GreetingMacro,
  version: "1.0.0",
  nameSpace: "core",
  roles: ['ANON', 'USER'],
  alias: 'greet',
  icon: 'handshake',
  runat: 'client',
  tools: [
    {
      type: "function",
      function: {
        name: "greet",
        description: "Get the default greeting for the user",
        icon: "handshake",
        parameters: {
          type: "object",
          properties: {
            greeting: {
              type: "string",
              description: "A greeting from a user"
            },            
          },
          required: []
        }
      }
    }
  ],  
};

export default GreetingMacroDefinition;