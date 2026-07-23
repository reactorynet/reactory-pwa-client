import { Macro, MacroComponentDefinition, UXChatMessage } from "../../types";

// @ts-ignore
const AmqMacro: Macro<UXChatMessage> = (args, chatState, reactory) => {
  // @ts-ignore
  const { channel = 'workflow', eventId, data } = args;

  if (!eventId) {
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: "Error: 'eventId' is required.",
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  let parsedData: any = {};
  if (data) {
    try {
      parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      parsedData = { raw: data };
    }
  }

  // Publish the event via reactory.amq
  try {
    reactory.amq.$pub.def(eventId, parsedData, channel);
  } catch (err) {
    return {
      __typename: "ReactorChatMessage",
      role: "assistant",
      content: `Error publishing AMQ event: ${err instanceof Error ? err.message : String(err)}`,
      id: reactory.utils.uuid(),
      rating: 0,
      timestamp: new Date(),
      tool_calls: [],
    };
  }

  return {
    __typename: "ReactorChatMessage",
    role: "assistant",
    content: `Published AMQ event **${eventId}** on channel **${channel}** with data:\n\`\`\`json\n${JSON.stringify(parsedData, null, 2)}\n\`\`\``,
    id: reactory.utils.uuid(),
    rating: 0,
    timestamp: new Date(),
    tool_calls: [],
  };
};

const TOOL_DESCRIPTION = `Publish an asynchronous message (event) via the Reactory client-side event bus (AMQ).

This is a powerful utility for sending commands and events directly to UI components (like the Workflow Designer) on the client side.

Example: To move a step in the Workflow Designer, you can raise a 'step.move' event on the 'workflow' channel:
{
  "channel": "workflow",
  "eventId": "step.move",
  "data": "{\\"stepId\\":\\"resolveWorkdir\\",\\"position\\":{\\"x\\":100,\\"y\\":200}}"
}`;

const AmqMacroDefinition: MacroComponentDefinition<typeof AmqMacro> = {
  name: "AmqMacro",
  nameSpace: "reactor-macros",
  description: "Publish an asynchronous message (event) via the Reactory client-side event bus (AMQ).",
  component: AmqMacro,
  version: "1.0.0",
  roles: ['USER'],
  alias: 'amq',
  runat: 'client',
  tools: [
    {
      type: "function",
      safeForAutoExecution: true,
      runat: "client",
      function: {
        name: "amq",
        description: TOOL_DESCRIPTION,
        parameters: {
          type: "object",
          properties: {
            channel: {
              type: "string",
              description: "The AMQ channel name (e.g., 'workflow', 'form.command', 'data'). Defaults to 'workflow'.",            
            },
            eventId: {
              type: "string",
              description: "The custom event ID/name to publish (e.g., 'step.move', 'step.layout')."
            },
            data: {
              type: "string",
              description: "The JSON stringified data payload to send with the event."
            }
          },
          required: ["eventId"],
        },
      },
    },
  ],
};

export default AmqMacroDefinition;
