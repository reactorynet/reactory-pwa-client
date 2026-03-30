import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

const DEFAULT_FORM: Partial<Reactory.Forms.IReactoryForm> = {
  name: "UserFeedback",
  nameSpace: "reactor-forms",
  version: "1.0.0",
  title: "Your Feedback",
  description: "Please provide your response below.",
  schema: {
    type: "object",
    properties: {
      response: {
        type: "string",
        title: "Response",
      },
    },
    required: ["response"],
  },
  uiSchema: {
    response: { "ui:widget": "textarea", "ui:options": { rows: 4 } },
  },
};

//@ts-ignore
const FormMacro: Macro<UXChatMessage> = async (args, chatState, reactory) => {
  const parsed = (args && typeof args === 'object' && !Array.isArray(args)) ? args as Record<string, any> : {};

  let formDefinition: Partial<Reactory.Forms.IReactoryForm> = parsed.formDefinition ?? { ...DEFAULT_FORM };

  if (parsed.title) formDefinition.title = parsed.title;
  if (parsed.description) formDefinition.description = parsed.description;
  if (parsed.schema) formDefinition.schema = parsed.schema;
  if (parsed.uiSchema) formDefinition.uiSchema = parsed.uiSchema;

  if (!formDefinition.nameSpace) formDefinition.nameSpace = "reactor-forms";
  if (!formDefinition.name) formDefinition.name = "DynamicForm";
  if (!formDefinition.version) formDefinition.version = "1.0.0";

  if (!formDefinition.id) {
    formDefinition.id = `${formDefinition.nameSpace}.${formDefinition.name}.${formDefinition.version}`;
  }

  if (reactory.formSchemas[formDefinition.id]) {
    const storedDefinition = reactory.formSchemas[formDefinition.id];
    formDefinition = {
      ...storedDefinition,
      ...formDefinition,
      id: storedDefinition.id,
    };
  }

  const messageId = reactory.utils.uuid();

  const onSubmit = (formData: unknown) => {
    const payload = typeof formData === 'string' ? formData : JSON.stringify(formData, null, 2);
    chatState.sendMessage(
      `Form response for "${formDefinition.title || formDefinition.name}":\n\`\`\`json\n${payload}\n\`\`\``,
      chatState.id,
    );
  };

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: parsed.message || formDefinition.title || 'Please complete the form below.',
    component: 'core.ReactoryForm',
    props: {
      formDef: formDefinition,
      formData: parsed.formData ?? formDefinition.defaultFormValue ?? undefined,
      onSubmit,
    },
    id: messageId,
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  };
};

const TOOL_DESCRIPTION = `Present a structured form to the user to collect specific information. The user fills out the form fields and submits; their responses are returned to you as a JSON message in the conversation.

USE THIS TOOL WHEN YOU NEED:
- Structured data from the user (not free-text chat)
- Multiple related pieces of information at once
- Input constrained to specific types, enums, or formats
- Confirmation or selection from predefined options

HOW TO BUILD A FORM:
Provide a "formDefinition" object with a JSON Schema "schema" and an optional "uiSchema".

The "schema" follows JSON Schema (draft-07):
- type: "object" with "properties" defining each field
- Each property has: type ("string"|"number"|"integer"|"boolean"|"array"|"object"), title, description
- Use "enum" for dropdowns/select: { type: "string", enum: ["optionA","optionB"], title: "Pick one" }
- Use "required": ["fieldName"] at the object level for mandatory fields
- Use "default" on a property for a pre-filled value

The "uiSchema" controls how fields render:
- "ui:widget": "textarea" (multiline text), "radio" (radio buttons for enums), "checkboxes" (multi-select array of enums), "select" (dropdown, default for enums), "password", "hidden", "date", "color"
- "ui:options": { rows: N } for textarea height
- "ui:placeholder": hint text inside the input
- "ui:order": ["field1","field2",...] at root level to reorder fields
- "ui:help": helper text shown below a field

EXAMPLES:

1) Yes/No confirmation:
   schema: { type:"object", properties:{ confirm:{ type:"boolean", title:"Do you approve?" } }, required:["confirm"] }

2) Multiple-choice with radio buttons:
   schema: { type:"object", properties:{ choice:{ type:"string", enum:["A","B","C"], title:"Select option" } }, required:["choice"] }
   uiSchema: { choice:{ "ui:widget":"radio" } }

3) Multi-field feedback form:
   schema: { type:"object", properties:{ rating:{ type:"integer", title:"Rating", minimum:1, maximum:5 }, comments:{ type:"string", title:"Comments" } }, required:["rating"] }
   uiSchema: { comments:{ "ui:widget":"textarea", "ui:options":{ rows:3 } } }

4) Checklist (select multiple):
   schema: { type:"object", properties:{ items:{ type:"array", title:"Select all that apply", items:{ type:"string", enum:["Item A","Item B","Item C"] }, uniqueItems:true } } }
   uiSchema: { items:{ "ui:widget":"checkboxes" } }

You can also set "formData" to pre-populate fields with default values.`;

const FormMacroDefinition: MacroComponentDefinition<typeof FormMacro> = {
  name: "FormMacro",
  description: "Present a structured form to the user to collect specific, typed information. The form renders inline in the chat and submitted data is returned as a JSON message.",
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
        description: TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {
            formDefinition: {
              type: "object",
              description: "A Reactory form definition. Must include at minimum a 'schema' (JSON Schema object with type:'object' and properties). Optionally include 'uiSchema', 'title', 'description', 'name', 'nameSpace', 'version'. If only 'schema' and/or 'uiSchema' are needed, you can pass them as top-level parameters instead.",
            },
            schema: {
              type: "object",
              description: "JSON Schema (draft-07) for the form. Shorthand: set this instead of nesting inside formDefinition. Must have type:'object' and 'properties'.",
            },
            uiSchema: {
              type: "object",
              description: "UI Schema controlling widget types and layout. Keys match property names in the schema. Example: { fieldName: { 'ui:widget': 'textarea' } }.",
            },
            title: {
              type: "string",
              description: "Title displayed above the form.",
            },
            description: {
              type: "string",
              description: "Explanatory text shown below the title.",
            },
            message: {
              type: "string",
              description: "Chat message content displayed alongside the form (e.g. 'Please fill out the details below.').",
            },
            formData: {
              type: "object",
              description: "Pre-populated default values for form fields. Keys must match property names in the schema.",
            },
          },
          required: [],
        },
      },
    },
  ],
};

export default FormMacroDefinition;