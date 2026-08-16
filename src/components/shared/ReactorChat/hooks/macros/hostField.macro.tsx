import { HostEditableField, Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

/**
 * Client macros that let the agent read and write the fields of the
 * application the chat is embedded in.
 *
 * The field list is resolved from the host at call time rather than baked into
 * the tool schema. A host can change which fields are editable — or point the
 * chat at a different record — without the tool definition going stale, and
 * the agent always sees what is actually on screen.
 *
 * Discovery and mutation are separate tools because the agent needs the keys
 * and their meaning before it can sensibly write anything, and because a
 * read-only inspection is safe to auto-execute while a write should be
 * governed by the session's tool approval mode.
 */

const message = (content: string, reactory: Reactory.Client.ReactorySDK): UXChatMessage =>
  ({
    __typename: "ReactorChatMessage",
    role: "assistant",
    content,
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  } as unknown as UXChatMessage);

const NO_HOST =
  'This conversation is not embedded in an editing surface, so there are no host fields to read or write.';

/**
 * Renders a field for the agent, trimming long values so a large document body
 * does not crowd out the rest of the context.
 */
const describeField = (field: HostEditableField) => {
  const summary: Record<string, unknown> = {
    key: field.key,
    description: field.description,
    type: field.type || 'string',
  };

  if (field.readOnly) summary.readOnly = true;

  if (field.value !== undefined && field.value !== null) {
    const asText = typeof field.value === 'string' ? field.value : JSON.stringify(field.value);
    summary.currentValue = asText.length > 2000 ? `${asText.slice(0, 2000)}… (truncated)` : asText;
    summary.currentLength = asText.length;
  }

  return summary;
};

/**
 * Lists the fields the host has opened for editing.
 */
// @ts-ignore - macro signature is loosely typed by the registry
const HostFieldsMacro: Macro<UXChatMessage> = (args, chatState, reactory) => {
  if (!chatState?.hostBindings) return message(NO_HOST, reactory);

  const fields = chatState.hostBindings.getFields() || [];
  if (fields.length === 0) {
    return message('The host has not opened any fields for editing.', reactory);
  }

  const payload = fields.map(describeField);
  return message(
    `The host has ${fields.length} editable field(s):\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``,
    reactory
  );
};

/**
 * Writes a value back to one of the host's fields.
 */
// @ts-ignore - macro signature is loosely typed by the registry
const HostFieldUpdateMacro: Macro<UXChatMessage> = (args, chatState, reactory) => {
  if (!chatState?.hostBindings) return message(NO_HOST, reactory);

  // Arguments arrive either as a positional array or as a single object,
  // depending on how the tool call was serialised.
  const input: any = Array.isArray(args) ? args[0] : args;
  const key = input?.key;
  const value = input?.value;

  if (!key || typeof key !== 'string') {
    return message(
      'No field key was supplied. Call `host_fields` to see which keys are available.',
      reactory
    );
  }

  const fields = chatState.hostBindings.getFields() || [];
  const field = fields.find((f) => f.key === key);

  if (!field) {
    // Listing the valid keys turns a wrong guess into a correctable mistake
    // rather than a dead end.
    const available = fields.map((f) => f.key).join(', ') || 'none';
    return message(
      `There is no editable field called "${key}". Available keys: ${available}.`,
      reactory
    );
  }

  if (field.readOnly) {
    return message(`The field "${key}" is read-only and cannot be updated.`, reactory);
  }

  if (value === undefined) {
    return message(`No value was supplied for "${key}".`, reactory);
  }

  try {
    const result = chatState.hostBindings.applyChange(key, value);
    if (result && result.accepted === false) {
      return message(
        `The host rejected the update to "${key}"${result.message ? `: ${result.message}` : '.'}`,
        reactory
      );
    }

    const applied = typeof value === 'string' ? value : JSON.stringify(value);
    return message(
      `Updated **${field.description || key}** (\`${key}\`) — ${applied.length} character(s) written. ` +
        'The change is applied in the editor but not saved; the author decides whether to keep it.',
      reactory
    );
  } catch (error: any) {
    return message(
      `Could not update "${key}": ${error?.message || 'the host raised an error.'}`,
      reactory
    );
  }
};

const FIELDS_TOOL_DESCRIPTION = `List the fields of the host application that you are allowed to edit.

Returns, for each field:
- key: the identifier to pass to 'host_field_update'
- description: what the field is for
- type: the expected value shape
- currentValue: the value as it stands now, truncated if long
- readOnly: present when the field cannot be written

ALWAYS call this before 'host_field_update'. The available fields depend on
what the user currently has open, so a key that worked earlier in the
conversation may no longer exist.

Use this to understand what you are editing before you propose changes, and to
read the current content so you can revise it rather than replace it blindly.`;

const UPDATE_TOOL_DESCRIPTION = `Write a value into one of the host application's editable fields.

Call 'host_fields' first to discover valid keys and read current values.

Parameters:
- key: the field identifier from 'host_fields'
- value: the new content for that field

The change is applied to the user's editor immediately but is NOT saved — the
user reviews it and decides whether to keep it. Say what you changed after
calling this so they know what to look at.

Write the whole field value, not a fragment: the value you supply replaces the
field's current content. When revising existing content, read currentValue from
'host_fields' and return the complete revised version.

Match the format the field is already in. If the current value is markdown,
return markdown; if it is HTML, return HTML. Preserve any <reactory ... /> tags
exactly as they appear — they mount live components and are not decorative.`;

export const HostFieldsMacroDefinition: MacroComponentDefinition<typeof HostFieldsMacro> = {
  name: "HostFieldsMacro",
  nameSpace: "reactor-macros",
  description: "List the host application fields that the agent may edit, with their descriptions and current values.",
  component: HostFieldsMacro,
  version: "1.0.0",
  roles: ['USER'],
  alias: 'host_fields',
  runat: 'client',
  tools: [
    {
      type: "function",
      // Read-only inspection of what is already on the user's screen.
      safeForAutoExecution: true,
      runat: "client",
      function: {
        name: "host_fields",
        description: FIELDS_TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
  ],
};

export const HostFieldUpdateMacroDefinition: MacroComponentDefinition<typeof HostFieldUpdateMacro> = {
  name: "HostFieldUpdateMacro",
  nameSpace: "reactor-macros",
  description: "Write a value into one of the host application's editable fields.",
  component: HostFieldUpdateMacro,
  version: "1.0.0",
  roles: ['USER'],
  alias: 'host_field_update',
  runat: 'client',
  tools: [
    {
      type: "function",
      // Not auto-executed: this rewrites what the user is working on, so it
      // should pass through the session's tool approval mode.
      safeForAutoExecution: false,
      runat: "client",
      function: {
        name: "host_field_update",
        description: UPDATE_TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description: "The field identifier, as returned by 'host_fields'.",
            },
            value: {
              type: "string",
              description:
                "The complete new value for the field. Replaces the current content in full.",
            },
          },
          required: ["key", "value"],
        },
      },
    },
  ],
};

export default HostFieldsMacroDefinition;
