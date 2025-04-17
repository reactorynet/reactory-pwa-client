import { IAIPersona, ChatMessage } from "../types"

interface ChatFactoryHookResult { 
  // represents the chat state
  chatState: any
  // indicates if the chat is busy loading or waiting 
  // for a response.
  busy: boolean
  // function used to send a message to the active chat.
  sendMessage: (message: string, sessionId?: string) => Promise<void>
  // starts a new chat session
  newChat: () => Promise<void>
  // function use to return all the available chats for the
  // current user.
  listChats(filter?: any): Promise<any[]>
}

interface ChatFactorHookOptions {
  reactory: Reactory.Client.ReactorySDK
  persona: IAIPersona
  protocol: 'graphql' | 'sse' | 'websocket' | 'stdio' | 'rest'
  onMessage: (message: ChatMessage) => void
  onError: (error: Error) => void
  onToolCall: (message: string) => void
  onMacroCall: (message: string) => void
}

type ChatFactoryHook = (props: ChatFactorHookOptions) => ChatFactoryHookResult

const SEND_MESSAGE_MUTATION = `
  mutation ReactorSendMessage($message: ReactorSendMessageInput!) {
    ReactorSendMessage(message: $message) {
      id
      role
      content
      timestamp
      tool_calls
    }
  }
`;


const EXEC_MACRO_MUTATION = `
  mutation ReactorExecuteMacro($macro: String!, $botId: String!, $chatSessionId: String!) {
    ReactorExecuteMacro(macro: $macro, botId: $botId, chatSessionId: $chatSessionId) {
      id
      role
      content
      timestamp
      tool_calls
    }
  }
`;

const EXEC_TOOL_CALL_MUTATION = `
  mutation ReactorExecuteToolCall($toolCall: String!, $botId: String!, $chatSessionId: String!) {
    ReactorExecuteToolCall(toolCall: $toolCall, botId: $botId, chatSessionId: $chatSessionId) {
      id
      role
      content
      timestamp
      tool_calls
    }
  }
`;
const EXEC_CONVERSATION_QUERY = `
  query ReactoryConversations(filter: ReactorConversationFilter) {
    ReactorConversations(filter: $filter) {
      id
      botId
      started
      modelId
      user {
        id
        firstName
        lastName
      }
      meta {
        createdBy {
          id
          firstName
          lastName
        }
        createdAt
        updatedAt
      }
      history {
        id
        role
        content
        timestamp
        tool_calls
      }
      vars {
        key: string,
        value: string,
      }
    }
  }
`

interface SendMesageInput {
  message: string
  personaId: string
  chatSessionId: string
}

interface ReactorChatHistory {
  id: string
  role: string
  content: string
  timestamp: Date
  tool_calls: string[]
  rating: number 
}

const useChatFactory: ChatFactoryHook = (props: ChatFactorHookOptions) => {

  const {
    reactory,
    persona,
    protocol,
    onMessage,
    onError,
    onToolCall,
    onMacroCall
  } = props;

  const sendMessage = async (message: string, chatSessionId: string) => { 
    try {
      const response = await reactory.graphqlMutation<{ ReactorSendMessage: ChatMessage }, { message: SendMesageInput }>(SEND_MESSAGE_MUTATION,
         {
          message: {
            message,
            personaId: persona.id,
            chatSessionId
          }
        });

      if (response?.data?.ReactorSendMessage) {
        const message = response.data.ReactorSendMessage;
        onMessage(message);
      } else {
        throw new Error("No response from server");
      }
    } catch (error) {
      onError(error);
    }
  }

  const newChat = async () => { 
    try {
      const response = await reactory.graphqlMutation<{ ReactorNewChat: ChatMessage }, { message: SendMesageInput }>(SEND_MESSAGE_MUTATION,
         {
          message: {
            message: "",
            personaId: persona.id,
            chatSessionId: ""
          }
        });

      if (response?.data?.ReactorNewChat) {
        const message = response.data.ReactorNewChat;
        onMessage(message);
      } else {
        throw new Error("No response from server");
      }
    } catch (error) {
      onError(error);
    }
  }

  // TODO: Implement the client macro execution
  // This is a placeholder function and should be implemented
  const executeClientMacro = async (macro: string, chatSessionId: string) => { 
    try {
      // Placeholder for client-side macro execution
      onMacroCall(macro);
    } catch (error) {
      onError(error);
    }
  }

  // Execute Server Macro will run a server side defined macro.
  const executeServerMacro = async (macro: string, chatSessionId: string) => { 
    try {
      const response = await reactory.graphqlMutation<{ ReactorExecuteMacro: ChatMessage }, { macro: string, botId: string, chatSessionId: string }>(EXEC_MACRO_MUTATION,
         {
          macro,
          botId: persona.id,
          chatSessionId
        });

      if (response?.data?.ReactorExecuteMacro) {
        const message = response.data.ReactorExecuteMacro;
        onMessage(message);
      } else {
        throw new Error("No response from server");
      }
    } catch (error) {
      onError(error);
    }
  }

  const executeClientToolCall = async (toolCall: string, chatSessionId: string) => { }

  const executeToolCall = async (toolCall: string, chatSessionId: string) => {
    try {

    }
    catch (error) { }
  }

  const fetchConversations = async (filter: any) => { 
    try {
      const response = await reactory.graphqlQuery<{ ReactorConversations: any[] }, { filter: any }>(EXEC_CONVERSATION_QUERY, { filter });
      return response?.data?.ReactorConversations || [];
    } catch (error) {
      onError(error);
      return [];
    }
  }

  return {
    busy: false,
    chatState: null,    
    newChat,
    sendMessage,
    listChats: fetchConversations
  }
};

export default useChatFactory;