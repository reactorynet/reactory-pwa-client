import React, { useEffect } from "react"
import { IAIPersona, ChatMessage, ChatState, ChatCompletionResponseMessageStore, ToolApprovalMode, UXChatMessage, MacroComponentDefinition, MacroToolDefinition } from "../types"
import useMacros from "./useMacros"
import { exec } from "child_process"
import ToolPrompt from './ToolPrompt';
import useGraph, { ReactorInitSessionInput, ReactorSendMessageInput } from './graphql/useGraph';
import useSSE, { CompletionStreamingEvent, StreamingEventType, TokenStreamingEvent, ToolCallStreamingEvent } from './useSSE';

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
  // indicates if the chat session has been initialized
  isInitialized: boolean
  // streaming state (when protocol is 'sse')
  isStreaming?: boolean
  currentStreamingMessage?: string
  // sets the chat state
  setChatState: React.Dispatch<React.SetStateAction<ChatState>>
}

interface ChatFactorHookOptions {
  reactory: Reactory.Client.ReactorySDK
  persona: IAIPersona
  protocol: 'graphql' | 'sse' | 'websocket' | 'stdio' | 'rest'
  existingSession?: {
    chatState?: ChatState;
    isInitialized?: boolean;
  };
  onStreamToken?: (token: string) => void;
  onStreamMessage?: (message: UXChatMessage) => void;
  onStreamError?: (error: any) => void;
}

type ChatFactoryHook = (props: ChatFactorHookOptions) => ChatFactoryHookResult

// Graph operations are centralized in useGraph

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
// Queries are handled by useGraph

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
    existingSession,
  } = props;

  const persona = React.useMemo(() => rawPersona, [rawPersona?.id]);

  const onTokenReceived = (token: TokenStreamingEvent) => {
    setChatState((prevState) => {
      const lastMessage = prevState.history[prevState.history.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        if (waitingForResponse) {
          lastMessage.content = token.data.content;
        } else {
          lastMessage.content += token.data.content;
        }
      }

      const newHistory = [...prevState.history];
      newHistory[newHistory.length - 1] = lastMessage;

      return { ...prevState,
        history: newHistory,        
      }
    });
    setIsStreaming(true);
    setWaitingForResponse(false);
  };

  const onSSEMessageReceived = (message: CompletionStreamingEvent) => {
    if (message.type === StreamingEventType.COMPLETE) {
      // update the chat state with the new message
      
      setChatState((prevState) => {
        const lastMessage = prevState.history[prevState.history.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content = message.data.content;
        }
  
        const newHistory = [...prevState.history];
        newHistory[newHistory.length - 1] = lastMessage;
  
        return { ...prevState,
          history: newHistory,        
        }
      });
      setIsStreaming(false);
      setWaitingForResponse(false);
    }
  }

  const onToolCallReceived = async (toolCall: ToolCallStreamingEvent) => {
    console.log('onToolCallReceived', toolCall);
    // create tool call construct
    const toolCallMessage = {
      id: toolCall.data.callId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      sessionId: chatState.id,
      tool_calls: [{
        id: toolCall.data.callId,
        type: "function",
        function: {
          name: toolCall.data.toolName,          
          arguments: typeof toolCall.data.arguments === 'string' ? JSON.parse(toolCall.data.arguments) : toolCall.data.arguments,
        },
      }],
    } as UXChatMessage;
    await processToolCalls([toolCallMessage], chatState.history[chatState.history.length - 1] as UXChatMessage);
  }


  /**
   * 
   * @param message 
   * @param chatSessionId 
   * @returns 
   */
  const graph = useGraph({ reactory });
  const sse = useSSE({
    reactory,
    onToken: onTokenReceived,
    onToolCall: onToolCallReceived,
    onMessage: onSSEMessageReceived,
    onError: (e) => { onError(e); props.onStreamError?.(e); },
  });

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

      // Initialize chat session on first message if not already initialized
      let sessionId = chatState.id || chatSessionId;

      if (!isInitialized && persona?.id) {
        reactory.info(`ChatFactory: Initializing chat session on first message with persona ${persona.id}`);
        try {
          const newSessionId = await initializeChat(persona);
          setIsInitialized(true);
          sessionId = newSessionId; // Use the session ID from initialization
        } catch (error) {
          onError(error);
          setBusy(false);
          return;
        }
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
        reactory.info(`ChatFactory: Sending message with sessionId: ${sessionId}, personaId: ${persona.id}`);

        // if the streaming is sse, we add a blank message to the history
        // so that the user sees as a message is being sent.
        if (protocol === 'sse') {        
          // if the protocol is sse, we add a blank message to the history
          setChatState((prevState) => ({
            ...prevState,
            history: [...prevState.history, {
              id: reactory.utils.uuid(),
              timestamp: new Date(),
              role: "assistant",
              content: "Thinking...",
            } as UXChatMessage],
          }));

          setIsStreaming(true);
          setWaitingForResponse(true);

        }

        const resp = await graph.sendMessage({
          personaId: persona.id,
          chatSessionId: sessionId,
          message,
          streamingMode: protocol === 'sse' ? 'SSE' : 'NONE',
        } as ReactorSendMessageInput);

        if (!resp) throw new Error('No response from server');

        if (resp.__typename === 'ReactorErrorResponse') {
          onError(new Error(resp.message));
          setBusy(false);
          return;
        }

        if (resp.__typename === 'ReactorInitiateSSE') {
          if (!sse.connected) {
            sse.connect({ 
              endpoint: resp.endpoint, 
              sessionId: resp.sessionId,
              onConnectionOpened: async () => {
                await graph.sendMessage({
                  personaId: persona.id,
                  chatSessionId: sessionId,
                  message,
                  streamingMode: 'SSE'
                });
              }
            });
            
            return; 
          }
        }

        if (resp.__typename === 'ReactorChatMessage') {
          const msg = resp as unknown as UXChatMessage;
          if (msg.sessionId && protocol === 'graphql') {
            setChatState((prevState) => ({
              ...prevState,
              id: msg.sessionId,
              history: [...prevState.history, msg as any],
              updated: new Date(),
            }));
          }

          if (protocol === 'graphql' && msg.tool_calls && (msg.tool_calls as any[]).length > 0) {
            await processToolCalls(msg.tool_calls as any[], msg);
          }
        }
      } catch (error) {
        onError(error as Error);
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

    // Deduplicate persona tools by name
    const uniquePersonaTools = persona?.tools ? persona.tools.filter((tool, index, self) =>
      index === self.findIndex(t => t.function?.name === tool.function?.name)
    ) : [];

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
      tools: uniquePersonaTools,
      tokenCount: 0,
      maxTokens: persona?.maxTokens || 8000,
      tokenPressure: 0,
      sendMessage
    }
  };

  const [chatState, setChatState] = React.useState<ChatState>(
    existingSession?.chatState || getInitialChatState()
  );
  const [busy, setBusy] = React.useState<boolean>(false);
  const [isInitialized, setIsInitialized] = React.useState<boolean>(
    existingSession?.isInitialized || false
  );

  const [isStreaming, setIsStreaming] = React.useState<boolean>(false);
  const [waitingForResponse, setWaitingForResponse] = React.useState<boolean>(false);

  // New: chats state for historical chats
  const [chats, setChats] = React.useState<any[]>([]);

  const { getMacroById, executeMacro, parseMacro, macros, findMacroByAlias } = useMacros({
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
    const toolNames = new Set(); // Track tool names to prevent duplicates

    macros.forEach((macro) => {
      if (macro.runat === "client" && macro.tools) {
        macro.tools.forEach((tool) => {
          if (tool.type === "function") {
            const toolDef = tool as MacroToolDefinition;
            const toolName = toolDef.function?.name;

            // Only add the tool if we haven't seen this name before
            if (toolName && !toolNames.has(toolName)) {
              toolNames.add(toolName);
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
          }
        });
      }
    });

    const initSession: ReactorInitSessionInput = {
      personaId: persona.id,
      message: '',
      macros: clientMacros?.map((macro) => ({
        nameSpace: macro.nameSpace,
        name: macro.name,
        version: macro.version,
        description: macro.description,
        alias: macro.alias,
        roles: macro.roles,
      })) ?? [],
      tools: [...clientTools],
      streamingMode: protocol === 'sse' ? 'SSE' : 'NONE',
    };

    try {
      const result = await graph.startChatSession(initSession);
      if (result?.__typename === 'ReactorChatState') {
        const chat = result as unknown as Partial<ChatState>;
        if (chat.id) {
          reactory.info(`ChatFactory: Initialized chat session with ID: ${chat.id}`);
          setChatState((prevState) => ({
            ...prevState,
            id: chat.id as string,
            updated: new Date(),
            macros: (chat as any).macros,
            tools: (chat as any).tools,
          }));
          return chat.id as string;
        }
        throw new Error('No session ID in initialization response');
      }

      if (result?.__typename === 'ReactorInitiateSSE') {
        // Some providers may require immediate SSE after init; connect now
        sse.connect({
          endpoint: (result as any).endpoint,
          sessionId: (result as any).sessionId,
          headers: (result as any).headers,
          token: (result as any).token,
          expiry: (result as any).expiry,
        });
        setChatState((prevState) => ({
          ...prevState,
          id: (result as any).sessionId as string,
          updated: new Date(),
          macros: (result as any).chatState.macros,
          tools: (result as any).chatState.tools,
        }));
        return (result as any).sessionId as string;
      }

      throw new Error('No response from server');
    } catch (error) {
      onError(error as Error);
      throw error;
    }
  }

  useEffect(() => {
    let isMounted = true;

    // Only set up initial chat state, don't initialize session until first message
    if (persona?.id) {
      reactory.info(`ChatFactory: Setting up initial chat state with persona ${persona.id}`);
      const initialState = getInitialChatState();
      setChatState(initialState);
      setIsInitialized(false); // Reset initialization flag when persona changes
    }

    return () => {
      isMounted = false;
    };
  }, [persona])

  // Update session state when existingSession changes (when switching between factories)
  useEffect(() => {
    if (existingSession?.chatState) {
      setChatState(existingSession.chatState);
      setIsInitialized(existingSession.isInitialized || false);

      reactory.info(`ChatFactory: Inherited existing session ${existingSession.chatState.id}`);
    }
  }, [existingSession, reactory]);

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
        content: 'Error: ' + error.message,
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
   * Instead of creating a new message, we'll update the existing message with tool_calls to include the prompt component
   * @param toolCall 
   * @param state 
   */
  const onToolCallPrompt = (toolCall: string, args: any, state: ChatState, callBack: (approved: boolean) => void) => {
    // Find the most recent message with tool_calls and update it with the approval component
    setChatState((prevState) => {
      const history = [...prevState.history];

      // Find the last message with tool_calls (manual reverse search for compatibility)
      let lastMessageIndex = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
          lastMessageIndex = i;
          break;
        }
      }

      if (lastMessageIndex >= 0) {
        history[lastMessageIndex] = {
          ...history[lastMessageIndex],
          component: () => <ToolPrompt toolName={toolCall} args={args} onDecision={callBack} />,
        };
      }

      return {
        ...prevState,
        history,
        updated: new Date(),
      };
    });
  }


  const newChat = async () => {
    setBusy(true);
    try {
      // Initialize a brand new session
      const newSessionId = await initializeChat(persona);
      if (newSessionId) {
        setIsInitialized(true);
      } else {
        throw new Error('Failed to initialize new chat');
      }
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }

  const fetchConversations = async (filter: any) => {
    try {
      const list = await graph.listConversations(filter);
      setChats(list || []);
      return list || [];
    } catch (error) {
      onError(error);
      setChats([]);
      return [];
    }
  }

  const deleteChat = async (id: string | string[]) => {
    try {
      // Only single id supported by schema
      const deleteId = Array.isArray(id) ? id[0] : id;
      await graph.deleteChatSession(deleteId);
      await fetchConversations({}); // Refresh the chat list after deletion
    } catch (error) {
      onError(error);
    }
  };

  // Upload file to chat session
  const uploadFile = async (file: File, chatSessionId: string) => {
    setBusy(true);
    try {
      // Initialize chat session on first file upload if not already initialized
      let sessionId = chatState.id || chatSessionId;

      if (!isInitialized && persona?.id) {
        reactory.info(`ChatFactory: Initializing chat session on first file upload with persona ${persona.id}`);
        try {
          const newSessionId = await initializeChat(persona);
          setIsInitialized(true);
          sessionId = newSessionId; // Use the session ID from initialization
          
          // Wait a moment for the chat session to be fully established
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update the chat state with the new session ID
          setChatState(prev => ({
            ...prev,
            id: newSessionId
          }));
        } catch (error) {
          onError(error);
          setBusy(false);
          return;
        }
      }

      // Ensure we have a valid session ID
      if (!sessionId) {
        throw new Error('No valid chat session ID available for file upload');
      }

      reactory.info(`ChatFactory: Attaching file ${file.name} to session ${sessionId}`);
      
      const result = await graph.attachFile(file, sessionId);
      if (result) {
        if ((result as any).__typename === 'ReactorErrorResponse') {
          onError(new Error((result as any).message));
        } else {
          onMessage(result as unknown as UXChatMessage);
          
          // Wait a moment for the file to be properly attached
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh the chat state to include the new file
          if (chatState?.id) {
            try {
              const response = await reactory.graphqlQuery<{
                ReactorConversation: {
                  id: string;
                  files?: Reactory.Models.IReactoryFile[];
                } | {
                  code: string;
                  message: string;
                }
              }, { id: string }>(`
                query ReactorConversation($id: String!) {
                  ReactorConversation(id: $id) {
                    ... on ReactorChatState {
                      id
                      files {
                        id
                        filename
                        mimetype
                        size
                        path
                        created
                        link
                        alias
                      }
                    }
                    ... on ReactorErrorResponse {
                      code
                      message
                    }
                  }
                }
              `, { id: chatState.id });

              if (response?.data?.ReactorConversation && !('code' in response.data.ReactorConversation)) {
                const conversation = response.data.ReactorConversation;
                // Update the chat state with the new file information
                setChatState(prev => ({
                  ...prev,
                  files: conversation.files || []
                }));
                reactory.info(`ChatFactory: File ${file.name} successfully attached and chat state updated`);
              }
            } catch (error) {
              reactory.error('Failed to refresh chat state after file upload', error);
            }
          }
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
      // Initialize chat session on first audio message if not already initialized
      let sessionId = chatState.id || chatSessionId;

      if (!isInitialized && persona?.id) {
        reactory.info(`ChatFactory: Initializing chat session on first audio message with persona ${persona.id}`);
        try {
          const newSessionId = await initializeChat(persona);
          setIsInitialized(true);
          sessionId = newSessionId; // Use the session ID from initialization
        } catch (error) {
          onError(error);
          setBusy(false);
          return;
        }
      }

      const result = await graph.askQuestionAudio(audio as Blob, sessionId);
      if (result) {
        if ((result as any).__typename === 'ReactorErrorResponse') {
          onError(new Error((result as any).message));
        } else {
          onMessage(result as unknown as UXChatMessage);
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
      // Initialize chat session on first tool approval mode change if not already initialized
      let sessionId = chatState.id;

      if (!isInitialized && persona?.id) {
        reactory.info(`ChatFactory: Initializing chat session on tool approval mode change with persona ${persona.id}`);
        try {
          const newSessionId = await initializeChat(persona);
          setIsInitialized(true);
          sessionId = newSessionId; // Use the session ID from initialization
        } catch (error) {
          onError(error);
          setBusy(false);
          return;
        }
      }

      if (!sessionId) {
        throw new Error('No active chat session available');
      }

      const response = await graph.setChatToolApprovalMode(sessionId, mode);
      if (response) {
        setChatState((prevState) => ({
          ...prevState,
          toolApprovalMode: response.toolApprovalMode,
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
      const result = await graph.getConversation(chatSessionId);
      if (result) {
        if ((result as any).__typename === 'ReactorErrorResponse') {
          onError(new Error((result as any).message));
        } else {
          // Deduplicate tools by name to prevent duplicates
          const uniqueTools = (result as any).tools ? (result as any).tools.filter((tool, index, self) =>
            index === self.findIndex((t: any) => t.function?.name === tool.function?.name)
          ) : [];

          // Update chatState with the loaded chat session
          setChatState((prevState) => ({
            ...prevState,
            ...result,
            history: (result as any).history ?? [],
            tools: uniqueTools,
            macros: (result as any).macros ?? [],
            vars: (result as any).vars ?? {},
            updated: new Date(),
          }));

          // Mark as initialized since we're loading an existing session
          setIsInitialized(true);
        }
      }
    } catch (error) {
      reactory.error(`ChatFactory: Error loading chat session ${chatSessionId}`, error);
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Enhanced tool call processing with recursive handling for multiple tool calls
   */
  const processToolCalls = async (toolCalls: any[], message: UXChatMessage, depth: number = 0): Promise<{ toolResults: any[], toolErrors: any[] }> => {
    const { toolApprovalMode } = chatState;
    const toolResults = [];
    const toolErrors = [];

    // Prevent infinite recursion (max 10 levels deep)
    const MAX_RECURSION_DEPTH = 10;
    if (depth >= MAX_RECURSION_DEPTH) {
      toolErrors.push({
        error: `Maximum tool call recursion depth (${MAX_RECURSION_DEPTH}) exceeded`,
        timestamp: new Date()
      });
      return { toolResults, toolErrors };
    }

    // The message with tool_calls is already added to the chat history by sendMessage
    // We don't need to add another "Calling tool..." message here
    // The UI will show "Calling tool..." based on the tool_calls array in the message

    // Group tools by approval requirements
    const toolsRequiringApproval = toolApprovalMode === ToolApprovalMode.PROMPT ? toolCalls : [];
    const toolsForAutoExecution = toolApprovalMode === ToolApprovalMode.AUTO ? toolCalls : [];

    // Handle tools requiring approval
    if (toolsRequiringApproval.length > 0) {
      await processToolsWithApproval(toolsRequiringApproval, toolResults, toolErrors);
    }

    // Handle auto-execution tools
    if (toolsForAutoExecution.length > 0) {
      await processToolsAutomatically(toolsForAutoExecution, toolResults, toolErrors);
    }

    // Update chat state with tool results
    if (toolResults.length > 0 || toolErrors.length > 0) {
      updateChatStateWithToolResults(message, toolResults, toolErrors);
    }

    // Send tool results back to AI provider and check for recursive tool calls
    if (toolResults.length > 0) {
      try {
        const consolidatedResults = consolidateToolResults(toolResults, toolErrors);
        const aiResponse = await sendToolResultsToAI(consolidatedResults, toolResults, toolErrors);

        // Check if the AI response contains new tool calls
        if (aiResponse && aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
          // Recursively process the new tool calls
          const recursiveResults = await processToolCalls(aiResponse.tool_calls, aiResponse, depth + 1);

          // Merge results from recursive calls
          toolResults.push(...recursiveResults.toolResults);
          toolErrors.push(...recursiveResults.toolErrors);
        }
      } catch (error) {
        toolErrors.push({
          error: `Error sending tool results to AI: ${error.message}`,
          timestamp: new Date()
        });
      }
    }

    return { toolResults, toolErrors };
  };

  /**
   * Consolidate tool results into a single message for the AI provider
   */
  const consolidateToolResults = (toolResults: any[], toolErrors: any[]): string => {
    const results = toolResults.map((result, index) => {
      const content = result.content || JSON.stringify(result);
      return `Tool ${index + 1} (${result.name}): ${content}`;
    }).join('\n\n');

    const errors = toolErrors.map((error, index) => {
      return `Error ${index + 1}: ${error.error || error.name}`;
    }).join('\n');

    let consolidated = '';
    if (results) {
      consolidated += `Tool execution results:\n\n${results}`;
    }
    if (errors) {
      consolidated += `\n\nTool execution errors:\n${errors}`;
    }

    return consolidated || 'No tool results available';
  };

  /**
   * Send tool results back to the AI provider and get the response
   */
  const sendToolResultsToAI = async (consolidatedResults: string, toolResults: any[], toolErrors: any[]): Promise<UXChatMessage | null> => {
    try {
      const resp = await graph.sendMessage({
        message: consolidatedResults,
        personaId: persona.id,
        chatSessionId: chatState.id,
        streamingMode: 'NONE',
      });

      if (resp) {
        if (resp.__typename === "ReactorErrorResponse") {
          throw new Error((resp as any).message);
        }

        const aiMessage = resp as unknown as UXChatMessage;

        // Add the AI response to chat history
        if (aiMessage.sessionId) {
          setChatState((prevState) => ({
            ...prevState,
            history: [...prevState.history, aiMessage as any],
            updated: new Date(),
          }));
        }

        return aiMessage;
      }

      return null;
    } catch (error) {
      reactory.error('Error sending tool results to AI', error);
      throw error;
    }
  };

  /**
   * Helper function to clean up approval component from the message with tool_calls
   */
  const cleanupApprovalComponent = () => {
    setChatState((prevState) => {
      const history = [...prevState.history];

      // Find the last message with tool_calls and remove the component
      let lastMessageIndex = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
          lastMessageIndex = i;
          break;
        }
      }

      if (lastMessageIndex >= 0) {
        const { component, ...messageWithoutComponent } = history[lastMessageIndex];
        history[lastMessageIndex] = messageWithoutComponent;
      }

      return {
        ...prevState,
        history,
        updated: new Date(),
      };
    });
  };

  /**
   * Process tools that require user approval
   */
  const processToolsWithApproval = async (toolCalls: any[], toolResults: any[], toolErrors: any[]) => {
    for (const toolCall of toolCalls) {
      if (toolCall.type === 'function' && toolCall.function) {
        const { id, function: func } = toolCall;
        const { name, arguments: args } = func;

        // Try to find the macro by alias first, then by name
        let macro = findMacroByAlias(name);
        if (!macro) {
          // If not found by alias, try to find by name in the macros array
          macro = chatState.macros?.find(m => m.name === name || m.alias === name);
        }

        if (!macro) {
          toolErrors.push({
            id,
            name,
            error: `Macro not found: ${name}`,
            timestamp: new Date()
          });
          continue;
        }

        try {
          await new Promise<void>((resolve, reject) => {
            onToolCallPrompt(macro.name, args, chatState, async (approved: boolean) => {
              // Clean up the approval component
              cleanupApprovalComponent();

              if (approved) {
                try {
                  const result = await executeMacro(macro, args);
                  toolResults.push({
                    id,
                    name,
                    role: "tool",
                    content: result?.content || result,
                    timestamp: new Date(),
                    sessionId: chatState.id,
                  });
                  resolve();
                } catch (error) {
                  toolErrors.push({
                    id,
                    name,
                    error: error.message,
                    timestamp: new Date()
                  });
                  reject(error);
                }
              } else {
                toolErrors.push({
                  id,
                  name,
                  error: `Tool call declined: ${name}`,
                  timestamp: new Date()
                });
                resolve();
              }
            });
          });
        } catch (error) {
          reactory.error(`Error processing approved tool: ${name}`, error);
        }
      }
    }
  };

  /**
   * Process tools automatically without user approval
   */
  const processToolsAutomatically = async (toolCalls: any[], toolResults: any[], toolErrors: any[]) => {
    // Execute tools in parallel for better performance
    const toolPromises = toolCalls.map(async (toolCall) => {
      if (toolCall.type === 'function' && toolCall.function) {
        const { id, function: func } = toolCall;
        const { name, arguments: args } = func;

        // Try to find the macro by alias first, then by name
        let macro = findMacroByAlias(name);
        if (!macro) {
          // If not found by alias, try to find by name in the macros array
          macro = chatState.macros?.find(m => m.name === name || m.alias === name);
        }

        if (!macro) {
          return {
            id,
            name,
            error: `Macro not found: ${name}`,
            timestamp: new Date()
          };
        }

        try {
          const result = await executeMacro(macro, args);
          return {
            id,
            name,
            role: "tool",
            content: result?.content || result,
            timestamp: new Date(),
            sessionId: chatState.id,
          };
        } catch (error) {
          reactory.error(`Error executing tool: ${name}`, error);
          return {
            id,
            name,
            error: error.message,
            timestamp: new Date()
          };
        }
      }
      return null;
    });

    const results = await Promise.allSettled(toolPromises);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.error) {
          toolErrors.push(result.value);
        } else {
          toolResults.push(result.value);
        }
      } else if (result.status === 'rejected') {
        toolErrors.push({
          error: result.reason?.message || 'Unknown error',
          timestamp: new Date()
        });
      }
    });
  };

  /**
   * Update chat state with tool execution results
   */
  const updateChatStateWithToolResults = (message: UXChatMessage, toolResults: any[], toolErrors: any[]) => {
    setChatState((prevState) => {
      const history = [...prevState.history];
      // Find the last 'Calling' message (role: 'assistant', tool_calls present, content: '')
      const callingIndex = history
        .slice()
        .reverse()
        .findIndex(msg => msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0 && !msg.content);
      const actualIndex = callingIndex >= 0 ? history.length - 1 - callingIndex : -1;

      if (actualIndex >= 0) {
        // Update the 'Calling' message with tool results
        history[actualIndex] = {
          ...history[actualIndex],
          tool_results: toolResults,
          tool_errors: toolErrors,
        };
      } else if (history.length > 0) {
        // Fallback: update the last message
        history[history.length - 1] = {
          ...history[history.length - 1],
          tool_results: toolResults,
          tool_errors: toolErrors,
        };
      }

      return {
        ...prevState,
        history,
        updated: new Date(),
      };
    });

    // Show error messages if any tools failed
    if (toolErrors.length > 0) {
      const errorMessage = `Some tools failed to execute: ${toolErrors.map(e => e.name || e.error).join(', ')}`;
      onMessage({
        id: reactory.utils.uuid(),
        role: "system",
        content: errorMessage,
        timestamp: new Date(),
        sessionId: chatState.id,
      } as UXChatMessage);
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
    isInitialized,
    isStreaming: (sse as any).isStreaming,
    currentStreamingMessage: (sse as any).currentStreamingMessage,
    setChatState,
  }
};

export default useChatFactory;