import React, { useEffect } from "react"
import { gql } from "@apollo/client"
import { IAIPersona, ChatMessage, ChatState, ChatCompletionResponseMessageStore, ToolApprovalMode, UXChatMessage, MacroComponentDefinition, MacroToolDefinition } from "../types"
import useMacros from "./useMacros"
import { exec } from "child_process"

interface ChatFactoryHookResult { 
  // represents the chat state
  chatState: ChatState
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
  // expose chats state
  chats: any[]
  // expose setChats function
  setChats: React.Dispatch<React.SetStateAction<any[]>>
  // function to delete a chat by id
  deleteChat: (chatId: string) => Promise<void>
}

interface ChatFactorHookOptions {
  reactory: Reactory.Client.ReactorySDK
  persona: IAIPersona
  protocol: 'graphql' | 'sse' | 'websocket' | 'stdio' | 'rest'
}

type ChatFactoryHook = (props: ChatFactorHookOptions) => ChatFactoryHookResult

const INITIALIZE_CHAT_MUTATION = gql`
  mutation ReactorStartChatSession($initSession: ReactorInitSession!) {
    ReactorStartChatSession(initSession: $initSession) {
      id
      tools {
        id
        type
        propsMap
        function {
          name
          description
          parameters
        }
        runat
      }
      macros {
        id
        nameSpace
        name
        version
        description
        alias
        params
        runat
      }
    }
  }
`

const SEND_MESSAGE_MUTATION = gql`
  mutation ReactorSendMessage($message: ReactorSendMessageInput!) {
    ReactorSendMessage(message: $message) {
      ... on ReactorChatMessage {
        sessionId
        id
        role
        content
        rating
        timestamp
        tool_calls
      }
      ... on ReactorInitiateSSE {
        sessionId
        endpoint
        token
        status
        expiry
        headers
      }
      ... on ReactorErrorResponse {
        code
        message
        details
        timestamp
        recoverable
        suggestion
      }
    }
  }
`;

const DELETE_CHAT_MUTATION = gql`
  mutation ReactorDeleteChatSession($id: String!) {
    ReactorDeleteChatSession(id: $id) 
  }
`;

// define a type for each of the possible responses
type ReactorChatMessage = { 
  __typename: "ReactorChatMessage"
  sessionId: string
  id: string
  role: string
  content: string
  rating: number
  timestamp: Date
  tool_calls: string[]
}

type ReactorInitiateSSE = {
  __typename: "ReactorInitiateSSE"
  sessionId: string
  endpoint: string
  token: string
  status: string
  expiry: Date
  headers: any
}

type ReactorErrorResponse = {
  __typename: "ReactorErrorResponse"
  code: string
  message: string
  details: string
  timestamp: Date
  recoverable: boolean
  suggestion: string
}

type ReactorSendMessageResponse = ReactorChatMessage | ReactorInitiateSSE | ReactorErrorResponse;



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
  query ReactoryConversations($filter: ReactorConversationFilter) {
    ReactorConversations(filter: $filter) {
      id
      personaId
      started
      user {
        id
        firstName
        lastName
      }      
      history {
        id
        role
        content
        timestamp
        tool_calls
      }
      vars
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

interface ReactorInitSession {
  personaId: string
  message: string
  macros: Partial<MacroComponentDefinition<unknown>>
  tools: Partial<MacroToolDefinition>[]
}

const useChatFactory: ChatFactoryHook = (props: ChatFactorHookOptions) => {

  const {
    reactory,
    persona: rawPersona,
    protocol = 'graphql',    
  } = props;

  const persona = React.useMemo(() => rawPersona, [rawPersona?.id]);

  

  const sendMessage = async (message: string, chatSessionId: string) => { 
    setBusy(true);
    try {
      // check if the message is empty
      if (!message || message.trim() === "") {
        const error = new Error("Message cannot be empty");
        onError(error);
        setBusy(false);
        return;
      }

      // check if the message is a macro execution by the user:
      if (message.startsWith("/@")) {
        // strip the contol switch from the message
        const macro = parseMacro(message.substring(1));
        if (!macro) {
          const error = new Error("Invalid macro");
          onError(error);
          setBusy(false);
          return;
        }
        
        try {
          await executeMacro(macro.macro, macro.args); 
          setBusy(false);
          return;     
        } catch (error) { 
          onError(error);
          setBusy(false);
          return;
        }
        
      } else {
        onMessage({
          id: reactory.utils.uuid(),
          timestamp: new Date(),
          role: "user",
          content: message,
          sessionId: chatState.id,
        });
      }


      try {      
        const response = await reactory.graphqlMutation<{ ReactorSendMessage: ReactorSendMessageResponse }, { message: SendMesageInput }>(SEND_MESSAGE_MUTATION,
          {
            message: {
              message,
              personaId: persona.id,
              chatSessionId
            }
          });

        if (response?.data?.ReactorSendMessage) {
          // check the response type
          if (response.data.ReactorSendMessage.__typename === "ReactorErrorResponse") {
            // handle error response
            const error = new Error(response.data.ReactorSendMessage.message);
            onError(error);
            setBusy(false);
            return;
          }

          if (response.data.ReactorSendMessage.__typename === "ReactorInitiateSSE") { 
            // handle SSE response
            const { sessionId, endpoint, token, status, expiry, headers } = response.data.ReactorSendMessage;
            
            initSSE({ sessionId, endpoint, token, headers, status, expiry });
          }

          const message = response.data.ReactorSendMessage as UXChatMessage;
          
          // check if the message is a macro execution / tool call
          if (message.tool_calls && message.tool_calls.length > 0) {
            // execute the tool call
            message.tool_calls.forEach(async (toolCall) => { 
              let macro: MacroComponentDefinition<unknown> | null = null;
              if (toolCall.type === 'function' && toolCall.function) { 
                const { id } = toolCall;
                const { name } = toolCall.function;
                macro = getMacroById(name);
                if (macro) {
                  try {
                    await executeMacro(macro, toolCall.function.arguments);
                  } catch (error) {
                    onError(error);
                  }
                } else {
                  onError(new Error(`Macro not found: ${name}`));
                }
              }
            })
              
          }
          if (message.sessionId) {          
            setChatState((prevState) => ({
                        ...prevState,
                        id: message.sessionId,
                        history: [...prevState.history, message as any],
                        updated: new Date(),
                      }));
          }
        } else {
          throw new Error("No response from server");
        }
      } catch (error) {
        onError(error);
      }
    } finally {
      setBusy(false);
    }
  }


  const getInitialChatState = (): ChatState => { 
    let history: UXChatMessage[] = [];
    if (persona && persona.defaultGreeting) {
      history = [
        {
          id: reactory.utils.uuid(),
          role: "assistant",
          content: persona.defaultGreeting,
          timestamp: new Date(),
          sessionId: null,
        }
      ]
    }
    return {
      id: null,
      botId: persona?.id || 'reactor',
      host: 'web',
      persona,
      history,
      vars: {},
      started: new Date(),
      updated: new Date(),
      modelId: persona?.modelId || 'grok-2-latest',
      user: reactory.getUser(),
      mcpClients: [],
      toolApprovalMode: ToolApprovalMode.PROMPT,
      macros: persona?.macros || [],
      tools: persona?.tools || [],
      sendMessage
    }
  };

  const [chatState, setChatState] = React.useState<ChatState>(getInitialChatState());
  const [busy, setBusy] = React.useState<boolean>(false);

  // New: chats state for historical chats
  const [chats, setChats] = React.useState<any[]>([]);

  const { getMacroById, executeMacro, parseMacro, macros } = useMacros({ 
    reactory,
    chatState,
    onMacroCallResult: (result: any, state: ChatState) => {  
      // use onMessage to update the chat state with the result
      const message = { 
        id: result?.id ?? reactory.utils.uuid(),
        role: result?.role ?? "assistant",
        content: result?.content,
        component: result?.component,
        props: result?.props,
        timestamp: result?.timestamp ?? new Date(),
        sessionId: state.id,  
      } as UXChatMessage;
      onMessage(message);
    },
    onMacroCallError: (error, macro, state: ChatState) => { 
      reactory.error(`ChatFactory: Error executing macro ${error}`);
      onError(error);
    }
  });

  const initializeChat = async (persona) => { 
  
    // get the client macros from the macro registry
    const clientMacros = Object.values(macros).filter((macro) => macro.runat === "client");

    reactory.graphqlMutation<{ ReactorStartChatSession : Partial<ChatState> }, { initSession: ReactorInitSession }>(INITIALIZE_CHAT_MUTATION,
      {
        initSession: {
          personaId: persona.id,
          message: "",
          macros: clientMacros?.map((macro) => ({
            nameSpace: macro.nameSpace,
            name: macro.name,
            version: macro.version,
            description: macro.description,
            alias: macro.alias,          
          })) ?? [],
          tools: [],
        }
      }).then((response) => {
        if (response?.data?.ReactorStartChatSession) {
          const chatState = response.data.ReactorStartChatSession;
          if (chatState.id) {
            setChatState((prevState) => ({
              ...prevState,
              id: chatState.id, 
              updated: new Date(),
              macros: chatState.macros,
              tools: chatState.tools,
            }));
          }
        } else {
          throw new Error("No response from server");
        }
      }).catch((error) => { 
        onError(error);
      });
  }

  useEffect(() => { 
    let isMounted = true;

    // initialize the chat state with the persona
    if (persona?.id) {
      reactory.info(`ChatFactory: Initializing chat state with persona ${persona.id}`);
      const initialState = getInitialChatState();
      setChatState(initialState);
      void initializeChat(initialState.persona).catch((error) => {
        if (isMounted) onError(error);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [persona])

  // placeholder for SSE session initialization
  const initSSE = async (sseProps: {sessionId: string, endpoint: string, token: string, status: string, headers: any, expiry: Date}) => { 

  }

  const onMessage = (message: UXChatMessage) => { 
    setChatState((prevState) => ({
      ...prevState,
      history: [...prevState.history, message as any],
      updated: new Date(),
    }));
  }

  const onError = (error: Error) => {
    if (reactory.hasRole(['ADMIN', 'DEVELOPER'])) {
      onMessage({ 
        id: reactory.utils.uuid(),
        timestamp: new Date(),
        role: "assistant",
        content: error.message,
        tool_calls: [],
        rating: 0,
        refusal: null,
        annotations: [],
        audio: null,
        sessionId: chatState.id,
      });
    }
  }


  const newChat = async () => { 
    setBusy(true);
    try {
      const response = await reactory.graphqlMutation<{ ReactorNewChat: UXChatMessage }, { message: SendMesageInput }>(SEND_MESSAGE_MUTATION,
         {
          message: {
            message: "",
            personaId: persona.id,
            chatSessionId: ""
          }
        });

      if (response?.data?.ReactorNewChat) {
        const message = response.data.ReactorNewChat;
        if (message.sessionId) {
          setChatState((prevState) => ({
            ...prevState,
            id: message.sessionId,
            history: [...prevState.history, message as any],
            updated: new Date(),
          }));
        }
      } else {
        throw new Error("No response from server");
      }
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }

  const fetchConversations = async (filter: any) => { 
    try {
      const response = await reactory.graphqlQuery<{ ReactorConversations: any[] }, { filter: any }>(EXEC_CONVERSATION_QUERY, { filter });
      // Save chats to state
      setChats(response?.data?.ReactorConversations || []);
      return response?.data?.ReactorConversations || [];
    } catch (error) {
      onError(error);
      setChats([]);
      return [];
    }
  }

  const deleteChat = async (id: string) => {
    try {
      await reactory.graphqlMutation(DELETE_CHAT_MUTATION, { id });
      await fetchConversations({}); // Refresh the chat list after deletion
    } catch (error) {
      onError(error);
    }
  };

  return {
    busy,
    chatState,
    newChat,
    sendMessage,
    listChats: fetchConversations,
    chats,
    setChats,
    deleteChat,
  }
};

export default useChatFactory;