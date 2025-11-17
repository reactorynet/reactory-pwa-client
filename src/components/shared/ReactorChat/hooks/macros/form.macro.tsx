import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

//@ts-ignore
const FormMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  // Accept formDefinition from args (object or array)
  let formDefinition: Partial<Reactory.Forms.IReactoryForm> = (args && typeof args === 'object' && !Array.isArray(args) && (args as any).formDefinition)
    ?? {      
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

  if (!formDefinition.id) { 
    formDefinition.id = `${formDefinition.nameSpace || 'reactor-forms'}.${formDefinition.name || 'greeting'}.${formDefinition.version || '1.0.0'}`;
  }

  if (reactory.formSchemas[formDefinition.id]) {
    // If the formDefinition already exists in the reactory.formSchemas, use it    
    const storedDefinition = reactory.formSchemas[formDefinition.id];
    formDefinition = {
      ...storedDefinition,
      ...formDefinition,
      id: storedDefinition.id, // Ensure the ID remains the same
    };    
  }
  
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
  description: "A macro that dynamically creates and mounts a user input form using the Reactory Forms component. Accepts a custom form definition via arguments, or falls back to a sensible default greeting form. Integrates with the Reactory form schema registry for reuse and consistency.",
  component: FormMacro,
  version: "1.0.0",
  nameSpace: "reactor-macros",
  roles: ['USER'],
  alias: 'form',
  icon: "dynamic_form",
  runat: 'client',
  tools: [
    {
      type: "function",
      function: {
        name: "form",
        icon: "dynamic_form",
        description: "Create and mount a user input form in the chat. Optionally provide a custom form definition; otherwise, a default greeting form will be used. Returns a chat message with a form component for user interaction.",
        parameters: {
          type: "object",
          properties: {
            formDefinition: {
              type: "object",
              description: "(Optional) A Reactory form definition object to render. If omitted, a default greeting form is used."
            },
            greeting: {
              type: "string",
              description: "A greeting from a user (used in the default form only)"
            },            
          },
          required: []
        }
      }
    }
  ],  
};

export default FormMacroDefintion;