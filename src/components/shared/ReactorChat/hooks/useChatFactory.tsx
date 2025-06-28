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
  // loads a chat session by id
  loadChat: (chatSessionId: string) => Promise<void>
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
  deleteChat: (chatSessionId: string) => Promise<void>
  // sends an audio file to the chat session
  sendAudio: (audio: File | Blob, chatSessionId: string) => Promise<void>
  // uploads a file to the chat session
  uploadFile: (file: File, chatSessionId: string) => Promise<void>
  // sets the tool approval mode for the chat session
  setToolApprovalMode: (mode: ToolApprovalMode) => Promise<void>
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
      created
      toolApprovalMode
      tools {
        id
        type
        propsMap
        roles
        function {
          name
          icon
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
        icon
        description
        alias
        roles
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
const EXEC_CONVERSATION_QUERY = gql`
  query ReactorConversation($id: String!) {
    ReactorConversation(id: $id) {
      ... on ReactorChatState {
        id
        personaId
        created
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
        tools {
          id
          type
          propsMap
          roles
          function {
            name
            icon
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
          icon
          description
          alias
          roles
          params
          runat
        }
        toolApprovalMode
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
`

const EXEC_CONVERSATIONS_QUERY = gql`query ReactoryConversations($filter: ReactorConversationFilter) {
    ReactorConversations(filter: $filter) {
      id
      personaId
      created
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
        tool_results
        toolApproval
        refusal
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

  
  /**
   * 
   * @param message 
   * @param chatSessionId 
   * @returns 
   */
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
          const error = new Error(`Macro not found: ${message}`);
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
              message: message,
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

          const { toolApprovalMode } = chatState;
          let tool_results = [];
          // check if the message is a macro execution / tool call
          if (message.tool_calls && message.tool_calls.length > 0) {
            for (const toolCall of message.tool_calls) {
              let macro: MacroComponentDefinition<unknown> | null = null;
              if (toolCall.type === 'function' && toolCall.function) {
                const { id } = toolCall;
                const { name } = toolCall.function;
                macro = getMacroById(name);
                if (macro) {
                  try {
                    let args = JSON.parse(toolCall.function.arguments);
                    if (args.args) {
                      args = args.args;
                    }
                    let approved = true;
                    if (toolApprovalMode === ToolApprovalMode.PROMPT) {
                      approved = await new Promise<boolean>((resolve) => {
                        onToolCallPrompt(macro.name, args, chatState, (approved: boolean) => {
                          resolve(approved);
                        });
                      });
                    }
                    if (!approved) {
                      // User denied tool call, stop further invocations
                      break;
                    }
                    const toolCallResult = await executeMacro(macro, args);
                    tool_results.push({
                      id: reactory.utils.uuid(),
                      role: "assistant",
                      content: toolCallResult?.content || toolCallResult,
                      timestamp: new Date(),
                      tool_calls: [],
                      sessionId: chatState.id,
                    } as UXChatMessage);
                  } catch (error) {
                    reactory.error(`ChatFactory: Error executing macro ${macro.name}`, error);
                    onError(new Error(`Error executing macro ${macro.name}: ${error.message}`));
                  }
                } else {
                  onError(new Error(`Macro not found: ${name}`));
                }
              }
            }
          }
          if (message.sessionId) {          
            setChatState((prevState) => ({
                        ...prevState,
                        id: message.sessionId,
                        history: [...prevState.history, message as any, tool_results],
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


  /**
   * Initializes the chat session with a given persona.
   * This is important to call when the chat session is first created so that the 
   * backend is aware of the persona and which tools the client has available to 
   * call on the front end.
   * @param persona 
   */
  const initializeChat = async (persona) => { 
  
    // get the client macros from the macro registry
    const clientMacros = Object.values(macros).filter((macro) => macro.runat === "client");
    // get the client tools from the macro registry
    let clientTools = [];
    macros.forEach((macro) => { 
      if (macro.runat === "client" && macro.tools) {
        macro.tools.forEach((tool) => {
          if (tool.type === "function") {
            const toolDef = tool as MacroToolDefinition;
            clientTools.push({               
              type: toolDef.type,
              propsMap: toolDef.propsMap,
              roles: toolDef.roles,
              function: {
                icon: toolDef.function.icon,
                name: toolDef.function.name,
                roles: toolDef.roles,
                description: toolDef.function.description,
                parameters: toolDef.function.parameters,
              }            
            } as MacroToolDefinition);
          }
        });
      }
    });
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
            roles: macro.roles,        
          })) ?? [],
          tools: [...clientTools],
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

  /**
   * Use the onToolCallPrompt to handle tool calls that require user confirmation or additional input.
   * @param toolCall 
   * @param state 
   */
  const onToolCallPrompt = (toolCall: string, args: any, state: ChatState, callBack: (approved: boolean) => void) => {
    const { Material } = reactory.getComponents<{ Material: Reactory.Client.Web.IMaterialModule }>([
      "material-ui.Material",
    ]);
    const { MaterialCore, MaterialIcons } = Material;
    const { Card, CardContent, CardActions, Typography, IconButton, Tooltip } = MaterialCore;
    const { Check, Close } = MaterialIcons;

    // Create the prompt as a React element
    const ToolPromptElement: React.FC = () => (
      <Card sx={{ maxWidth: 400, margin: '16px auto', background: '#f9f9f9' }}>
        <CardContent>
          <Typography variant="subtitle2" color="textSecondary">Tool Call</Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>{toolCall}</Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', mb: 1 }}
          >
            {JSON.stringify(args, null, 2)}
          </Typography>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
          <Tooltip title="Approve">
            <IconButton size="small" color="success" onClick={() => callBack(true)}>
              <Check fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancel">
            <IconButton size="small" color="error" onClick={() => callBack(false)}>
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    );

    

    onMessage({
      id: reactory.utils.uuid(),
      timestamp: new Date(),
      role: "assistant",
      content: `Run ${toolCall}?`,
      component: ToolPromptElement,
      tool_calls: [],
      rating: 0,
      refusal: null,
      annotations: [],
      audio: null,
      sessionId: state.id,
    });
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
      const response = await reactory.graphqlQuery<{ ReactorConversations: any[] }, { filter: any }>(EXEC_CONVERSATIONS_QUERY, { filter });
      // Save chats to state
      setChats(response?.data?.ReactorConversations || []);
      return response?.data?.ReactorConversations || [];
    } catch (error) {
      onError(error);
      setChats([]);
      return [];
    }
  }

  const deleteChat = async (id: string | string[]) => {
    try {
      await reactory.graphqlMutation(DELETE_CHAT_MUTATION, { id });
      await fetchConversations({}); // Refresh the chat list after deletion
    } catch (error) {
      onError(error);
    }
  };

  const UPLOAD_FILE_MUTATION = gql`
    mutation ReactorAttachFile($file: Upload!, $chatSessionId: String!) {
      ReactorAttachFile(file: $file, chatSessionId: $chatSessionId) {
        ... on ReactorChatMessage {
          sessionId
          id
          role
          content
          rating
          timestamp
          tool_calls
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

  const SEND_AUDIO_MUTATION = gql`
    mutation ReactorAskQuestionAudio($audio: Upload!, $chatSessionId: String!) {
      ReactorAskQuestionAudio(audio: $audio, chatSessionId: $chatSessionId) {
        ... on ReactorChatMessage {
          sessionId
          id
          role
          content
          rating
          timestamp
          tool_calls
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

  // Upload file to chat session
  const uploadFile = async (file: File, chatSessionId: string) => {
    setBusy(true);
    try {
      const response = await reactory.graphqlMutation<any, { file: File, chatSessionId: string }>(
        UPLOAD_FILE_MUTATION,
        { file, chatSessionId }
      );
      const result = response?.data?.ReactorAttachFile;
      if (result) {
        if (result.__typename === 'ReactorErrorResponse') {
          onError(new Error(result.message));
        } else {
          onMessage(result);
        }
      }
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  // Send audio to chat session
  const sendAudio = async (audio: File | Blob, chatSessionId: string) => {
    setBusy(true);
    try {
      const response = await reactory.graphqlMutation<any, { audio: File | Blob, chatSessionId: string }>(
        SEND_AUDIO_MUTATION,
        { audio, chatSessionId }
      );
      const result = response?.data?.ReactorAskQuestionAudio;
      if (result) {
        if (result.__typename === 'ReactorErrorResponse') {
          onError(new Error(result.message));
        } else {
          onMessage(result);
        }
      }
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const setToolApprovalMode = async (mode: ToolApprovalMode) => { 
    setBusy(true);
    try {
      const response = await reactory.graphqlMutation<{ 
        ReactorSetChatToolApprovalMode: ChatState 
        }, 
        { mode: ToolApprovalMode, chatSessionId: string }>(
        gql`
          mutation ReactorSetChatToolApprovalMode($mode: ReactorToolApprovalMode!, $chatSessionId: String!) {
            ReactorSetChatToolApprovalMode(mode: $mode, chatSessionId: $chatSessionId) {
              id
              toolApprovalMode
            }
          }
        `,
        { mode, chatSessionId: chatState.id }
      );
      if (response?.data?.ReactorSetChatToolApprovalMode) {
        setChatState((prevState) => ({
          ...prevState,
          toolApprovalMode: response.data.ReactorSetChatToolApprovalMode.toolApprovalMode,
        }));

        onMessage({
          id: reactory.utils.uuid(),
          timestamp: new Date(),
          role: "assistant",
          content: `Tool approval mode set to ${mode}`,
          sessionId: chatState.id,
        });
      } else {
        throw new Error("No response from server");
      }
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }

  const loadChat = async (chatSessionId: string) => {
    setBusy(true);
    try {
      const response = await reactory.graphqlQuery<any, { id: string }>(EXEC_CONVERSATION_QUERY, { id: chatSessionId });
      const result = response?.data?.ReactorConversation;      
      if (result) {
        if (result.__typename === 'ReactorErrorResponse') {
          onError(new Error(result.message));
        } else {
          // Update chatState with the loaded chat session
          setChatState((prevState) => ({
            ...prevState,
            ...result,
            history: result.history ?? [],
            tools: result.tools ?? [],
            macros: result.macros ?? [],
            vars: result.vars ?? {},
            updated: new Date(),
          }));
        }
      }
    } catch (error) {
      reactory.error(`ChatFactory: Error loading chat session ${chatSessionId}`, error);
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    chatState,
    newChat,
    sendMessage,
    loadChat,
    listChats: fetchConversations,
    setToolApprovalMode,
    chats,
    setChats,
    deleteChat,
    uploadFile,
    sendAudio,
  }
};

export default useChatFactory;