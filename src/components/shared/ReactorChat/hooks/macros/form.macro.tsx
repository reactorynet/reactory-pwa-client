import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

//@ts-ignore
const FormMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  let formDefinition: Reactory.Forms.IReactoryForm = { 
    id: reactory.utils.uuid(),    
    name: "Greeting",
    description: "A form that provides a canned greeting from the user.",
    version: "1.0.0",
    nameSpace: "reactor-forms",
    schema: {
      type: "object",
      properties: {
        greeting: {
          type: "string",
          description: "A greeting from a user"
        },
      },      
    },
    uiSchema: {},
  };

  return {
    __typename: "ReactorChatMessage",
    role: "user",
    content: 'Mounting form...',
    component: 'core.ReactoryForm',
    props: {
      formDef: formDefinition,
    },
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: []
  };
};

const FormMacroDefintion: MacroComponentDefinition<typeof FormMacro> = { 
  name: "FormMacro",
  description: "A macro that creates a form for user input using the Reactory Forms component.",
  component: FormMacro,
  version: "1.0.0",
  nameSpace: "core",
  roles: ['ANON', 'USER'],
  alias: 'form',
  runat: 'client',
  tools: [
    {
      type: "function",
      function: {
        name: "form",
        description: "Get the default greeting for the user",
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

export default FormMacroDefintion;