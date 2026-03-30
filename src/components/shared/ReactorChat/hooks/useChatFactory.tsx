import React, { useEffect } from "react"
import { IAIPersona, ChatMessage, ChatState, ChatCompletionResponseMessageStore, ToolApprovalMode, UXChatMessage, MacroComponentDefinition, MacroToolDefinition, NetworkStatus } from "../types"
import useMacros from "./useMacros"
import { exec } from "child_process"
import ToolPrompt from './ToolPrompt';
import useGraph, { ReactorInitSessionInput, ReactorSendMessageInput } from './graphql/useGraph';
import useSSE, { CompletionStreamingEvent, ReasoningStreamingEvent, RetryStreamingEvent, StreamingEventType, TokenStreamingEvent, ToolCallStreamingEvent, ToolIterationLimitStreamingEvent } from './useSSE';

interface ChatFactoryHookResult {
  // represents the chat state
  chatState: ChatState
  // indicates if the chat is busy loading or waiting 
  // for a response.
  busy: boolean
  // function used to send a message to the active chat.
  sendMessage: (message: string, sessionId?: string, images?: string[]) => Promise<void>
  // function used to rate a message in the chat history
  rateMessage: (messageId: string, rating: number) => Promise<void>
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
  /** Pin an existing user file to the session (no upload). */
  pinUserFileForChat: (
    fileId: string,
    path: string,
    options?: { referenceOnly?: boolean }
  ) => Promise<void>
  /** Unpin a file from the session. */
  unpinUserFileForChat: (fileId: string, path: string) => Promise<void>
  /** Pin a folder path for the agent. */
  pinFolderForChat: (path: string, name: string) => Promise<void>
  /** Unpin a folder from the session. */
  unpinFolderForChat: (path: string, name: string) => Promise<void>
  // sets the tool approval mode for the chat session
  setToolApprovalMode: (mode: ToolApprovalMode) => Promise<void>
  // indicates if the chat session has been initialized
  isInitialized: boolean
  // streaming state (when protocol is 'sse')
  isStreaming?: boolean
  currentStreamingMessage?: string
  // sets the chat state
  setChatState: React.Dispatch<React.SetStateAction<ChatState>>
  // model override: allows changing the model/provider mid-conversation
  modelOverride: { modelId?: string; providerId?: string } | null
  setModelOverride: React.Dispatch<React.SetStateAction<{ modelId?: string; providerId?: string } | null>>
  // sets the maximum number of auto tool iterations for the chat session
  setMaxToolIterations: (maxIterations: number) => Promise<void>
  // continues tool execution after a tool iteration limit was reached
  continueToolExecution: (newMaxIterations?: number) => Promise<void>
  // info about a tool iteration limit event, null when not paused
  toolIterationLimitInfo: { iterationsCompleted: number; maxIterations: number; partialContent?: string } | null
  // clears the tool iteration limit info ("stop" action)
  clearToolIterationLimitInfo: () => void
  // network connection status
  networkStatus: NetworkStatus
  networkError: string | null
  reconnectAttempt: number
  retryConnection: () => void
  dismissNetworkError: () => void
}

interface ChatFactorHookOptions {
  reactory: Reactory.Client.ReactorySDK
  persona: IAIPersona
  protocol: 'graphql' | 'sse' | 'websocket' | 'stdio' | 'rest'
  existingSession?: {
    chatState?: ChatState;
    isInitialized?: boolean;
  };
  /** Optional session ID to share context from when initializing a new session */
  contextFromSessionId?: string;
  onStreamToken?: (token: string) => void;
  onStreamMessage?: (message: UXChatMessage) => void;
  onStreamError?: (error: any) => void;
  /** Optional session logger for client-side debug logging to the server */
  sessionLogger?: import('../types').SessionLogger;
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
  tool_calls: import('../types').ReactorToolCall[]
  tool_results: import('../types').ReactorToolResult[]
  tool_errors: import('../types').ReactorToolError[]
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
      tool_calls { id type function { name arguments } status }
      tool_results { id name content timestamp }
      tool_errors { id name error timestamp }
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
      tool_calls { id type function { name arguments } status }
      tool_results { id name content timestamp }
      tool_errors { id name error timestamp }
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
  tool_calls: import('../types').ReactorToolCall[]
  tool_results: import('../types').ReactorToolResult[]
  tool_errors: import('../types').ReactorToolError[]
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
    sessionLogger,
  } = props;

  const persona = React.useMemo(() => rawPersona, [rawPersona?.id]);

  // Debug persona changes
  useEffect(() => {
    console.log('🔧 [useChatFactory] Persona changed:', {
      personaId: persona?.id,
      personaName: persona?.name,
      personaToolsCount: persona?.tools?.length || 0,
      personaMacrosCount: persona?.macros?.length || 0,
      timestamp: new Date().toISOString()
    });
  }, [persona]);  

  // Accumulate tool_calls as they stream in; they will be processed
  // as a batch once the completion event arrives.
  const pendingToolCallsRef = React.useRef<any[]>([]);

  const onSSEMessageReceived = async (message: CompletionStreamingEvent) => {
    if (message.type === StreamingEventType.COMPLETE) {
      sessionLogger?.info('SSE stream complete', { contentLength: message.data?.content?.length || 0, finishReason: message.data?.finishReason }, 'useSSE');
      console.log('📩 [useChatFactory] onSSEMessageReceived COMPLETE', {
        contentLength: message.data?.content?.length || 0,
        contentPreview: message.data?.content?.substring(0, 100) || '(empty)',
        finishReason: message.data?.finishReason,
      });

      // ── Drain the reasoning buffer synchronously ──────────────────────
      // The reasoning callback uses a 50ms debounce timer. If the COMPLETE
      // event arrives before the timer fires, the buffer still holds
      // un-flushed reasoning text. Drain it now and merge it into the
      // final thinking text. Also set the completion guard so any stale
      // timer callbacks become no-ops.
      streamingCompleteRef.current = true;
      if (reasoningFlushTimerRef.current) {
        clearTimeout(reasoningFlushTimerRef.current);
        reasoningFlushTimerRef.current = null;
      }
      const trailingReasoning = reasoningBufferRef.current;
      reasoningBufferRef.current = "";

      // Update the last assistant message with the final content from the complete event.
      setChatState((prevState) => {
        const history = [...prevState.history];
        const lastIndex = history.length - 1;
        const lastMsg = lastIndex >= 0 ? history[lastIndex] : null;

        const incomingContent = message.data.content;

        console.log('📩 [useChatFactory] COMPLETE setChatState', {
          lastIndex,
          lastMsgRole: lastMsg?.role,
          lastMsgContentLength: (typeof lastMsg?.content === 'string' ? lastMsg.content.length : 0),
          lastMsgHasToolCalls: !!(lastMsg?.tool_calls && (lastMsg.tool_calls as any[]).length > 0),
          incomingContentLength: incomingContent?.length || 0,
        });

        // Build the authoritative thinking text:
        // 1. The completion event's `thinking` field is the full server-
        //    accumulated reasoning — prefer it when available.
        // 2. Fall back to whatever was streamed incrementally into the
        //    message's `thinking` field + any trailing buffer content.
        const streamedThinking = (lastMsg?.thinking || '') + trailingReasoning;
        const finalThinking = message.data.thinking || streamedThinking || undefined;

        if (lastIndex >= 0 && lastMsg?.role === "assistant") {
          // If the last message has tool_calls (e.g. from AUTO mode tool loop)
          // AND the completion carries new text content, append a NEW assistant
          // message. The ChatList component renders tool-call messages and text
          // messages differently — combining both on the same message hides
          // the text behind the tool chip UI.
          const hasToolCalls = Array.isArray(lastMsg.tool_calls) && (lastMsg.tool_calls as any[]).length > 0;

          if (hasToolCalls && incomingContent) {
            console.log('📩 [useChatFactory] COMPLETE: appending new message (existing has tool_calls)');
            history.push({
              id: reactory.utils.uuid(),
              role: 'assistant',
              content: incomingContent,
              thinking: finalThinking,
              timestamp: new Date(),
              sessionId: prevState.id,
            } as any);
          } else {
            // No tool_calls on the message — update in place as before
            const existingContent = history[lastIndex].content;
            const shouldUpdateContent = incomingContent
              || existingContent === 'Processing...'
              || !existingContent;

            console.log('📩 [useChatFactory] COMPLETE update decision', {
              shouldUpdateContent,
              incomingContent: incomingContent?.substring?.(0, 80) || '(empty)',
              existingContent: typeof existingContent === 'string' ? existingContent.substring(0, 80) : '(non-string)',
            });

            history[lastIndex] = {
              ...history[lastIndex],
              ...(shouldUpdateContent ? { content: incomingContent } : {}),
              thinking: finalThinking,
              timestamp: new Date(),
            };
          }
        }

        return { ...prevState, history };
      });
      setIsStreaming(false);
      setWaitingForResponse(false);

      // Now process any tool_calls that were accumulated during streaming.
      const accumulated = pendingToolCallsRef.current;
      pendingToolCallsRef.current = [];

      // In AUTO mode with SSE, the server already executed all tools in its
      // internal loop and sent tool_call start/complete events for UI progress.
      // The accumulated entries here are purely informational -- do NOT
      // re-execute them on the client (that would be a double-execution).
      const isAutoSSE = chatState.toolApprovalMode === ToolApprovalMode.AUTO && protocol === 'sse';

      if (accumulated.length > 0 && processToolCallsRef.current && !isAutoSSE) {
        // Yield so React flushes the setChatState calls above (content update,
        // streaming flags). Without this, onToolCallPrompt cannot find the
        // assistant message with tool_calls that onToolCallReceived added.
        await new Promise(resolve => setTimeout(resolve, 50));

        // Read the latest history from state via the updater function so we
        // get the flushed state (the closure `chatState` may be stale).
        let existingToolMessage: UXChatMessage | null = null;
        setChatState((currentState) => {
          const history = currentState.history || [];
          for (let i = history.length - 1; i >= 0; i--) {
            const msg = history[i];
            if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
              existingToolMessage = msg as UXChatMessage;
              break;
            }
          }
          return currentState; // no-op update, just reading
        });

        // Another yield so the no-op setChatState callback runs and
        // populates existingToolMessage before we use it.
        await new Promise(resolve => setTimeout(resolve, 0));

        const toolMessage = existingToolMessage || {
          id: reactory.utils.uuid(),
          role: "assistant",
          content: "",
          timestamp: new Date(),
          sessionId: chatState.id,
          tool_calls: accumulated,
        } as UXChatMessage;

        try {
          await processToolCallsRef.current(accumulated, toolMessage);
        } catch (error) {
          console.error('[useChatFactory] Error processing accumulated tool calls:', error);
          onError(error as Error);
        }
      }
    }
  }

  const sendMessage = async (message: string, chatSessionId: string, images?: string[]) => {
    setBusy(true);
    sessionLogger?.info(`Sending message (${message.length} chars)`, { hasImages: !!images?.length }, 'useChatFactory');
    // Clear any lingering network error when the user tries sending again
    if (networkStatus === 'error') {
      setNetworkStatus('idle');
      setNetworkError(null);
    }
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
          const newSessionId = await initializeChat(persona, props.contextFromSessionId);
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
          content: images && images.length > 0
            ? [{ type: 'text', text: message }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))] as any
            : message,
          sessionId: chatState.id,
        });
      }


      try {
        reactory.info(`ChatFactory: Sending message with sessionId: ${sessionId}, personaId: ${persona.id}`);

        // if the streaming is sse, we add a blank message to the history
        // so that the user sees as a message is being sent.
        if (protocol === 'sse') {        
          // if the protocol is sse, we add a blank message to the history
          // Use a more descriptive placeholder that won't interfere with tool call processing
          setChatState((prevState) => ({
            ...prevState,
            history: [...prevState.history, {
              id: reactory.utils.uuid(),
              timestamp: new Date(),
              role: "assistant",
              content: "Processing...", // Changed from "Thinking..." to avoid conflicts
              sessionId: chatState.id,
            } as UXChatMessage],
          }));

          // Reset the completion guard so reasoning events are accepted
          // for this new streaming response.
          streamingCompleteRef.current = false;
          setIsStreaming(true);
          setWaitingForResponse(true);
        }

        const resp = await graph.sendMessage({
          personaId: persona.id,
          chatSessionId: sessionId,
          message,
          streamingMode: protocol === 'sse' ? 'SSE' : 'NONE',
          ...(modelOverride?.modelId ? { modelId: modelOverride.modelId } : {}),
          ...(modelOverride?.providerId ? { providerId: modelOverride.providerId } : {}),
          ...(images && images.length > 0 ? { images } : {}),
        } as ReactorSendMessageInput);

        if (!resp) throw new Error('No response from server');

        if (resp.__typename === 'ReactorErrorResponse') {
          // Replace the "Processing..." placeholder with the error message
          setChatState((prevState) => {
            const history = [...prevState.history];
            const lastIndex = history.length - 1;
            if (lastIndex >= 0 && history[lastIndex].role === 'assistant' && history[lastIndex].content === 'Processing...') {
              history[lastIndex] = {
                ...history[lastIndex],
                content: `Error: ${resp.message}`,
                timestamp: new Date(),
              };
            }
            return { ...prevState, history };
          });
          setIsStreaming(false);
          setWaitingForResponse(false);
          onError(new Error(resp.message));
          setBusy(false);
          return;
        }

        if (resp.__typename === 'ReactorInitiateSSE') {
          // Server told us to (re)establish SSE — disconnect any stale session first
          sessionLogger?.info('SSE connect requested by server', { endpoint: resp.endpoint, sessionId: resp.sessionId }, 'useSSE');
          sse.disconnect();
          sse.connect({ 
            endpoint: resp.endpoint, 
            sessionId: resp.sessionId,
            onConnectionOpened: async () => {
              const sseResp = await graph.sendMessage({
                personaId: persona.id,
                chatSessionId: sessionId,
                message,
                streamingMode: 'SSE',
                ...(modelOverride?.modelId ? { modelId: modelOverride.modelId } : {}),
                ...(modelOverride?.providerId ? { providerId: modelOverride.providerId } : {}),
              });

              // The mutation response carries the same final content as the
              // SSE COMPLETE event. Apply it as a fallback so the UI always
              // shows the AI response even if the SSE event was lost.
              // IMPORTANT: only touch state if the SSE completion hasn't
              // already delivered the content — unnecessary setChatState calls
              // trigger memo recomputes that can interfere with streaming.
              if (sseResp?.__typename === 'ReactorChatMessage') {
                const msg = sseResp as unknown as UXChatMessage;
                if ((msg as any).content) {
                  setChatState((prevState) => {
                    const history = prevState.history || [];
                    const lastIndex = history.length - 1;
                    if (lastIndex >= 0 && history[lastIndex].role === 'assistant') {
                      const existingContent = history[lastIndex].content || '';
                      const needsFallback = !existingContent
                        || existingContent === 'Processing...'
                        || existingContent.startsWith('Calling tool:');
                      if (needsFallback) {
                        console.log('📩 [useChatFactory] SSE onConnectionOpened fallback: applying mutation response content', {
                          existingContent: typeof existingContent === 'string' ? existingContent.substring(0, 60) : '(non-string)',
                          incomingContentLength: (msg as any).content?.length,
                        });
                        const updatedHistory = [...history];
                        updatedHistory[lastIndex] = {
                          ...updatedHistory[lastIndex],
                          content: (msg as any).content,
                          thinking: (msg as any).thinking || updatedHistory[lastIndex].thinking || undefined,
                          timestamp: new Date(),
                        };
                        return { ...prevState, history: updatedHistory };
                      }
                    }
                    // No change needed — return prevState as-is to avoid
                    // triggering a re-render that could disrupt streaming.
                    return prevState;
                  });
                }
              }
            }
          });
          
          return;
        }

        if (resp.__typename === 'ReactorChatMessage') {
          const msg = resp as unknown as UXChatMessage;
          if (msg.sessionId && protocol === 'graphql') {
            setChatState((prevState) => ({
              ...prevState,
              id: msg.sessionId || chatState.id,
              history: [...prevState.history, msg as any],
              updated: new Date(),
            }));
          }

          if (protocol === 'graphql' && msg.tool_calls && (msg.tool_calls as any[]).length > 0) {
            await processToolCallsMemoized(msg.tool_calls as any[], msg);
          }

          // SSE fallback: the GraphQL mutation response carries the same content
          // as the SSE COMPLETE event. If the COMPLETE event was lost (transport
          // disconnected, race condition, etc.), this ensures the UI still shows
          // the final AI response without requiring a manual reload.
          if (protocol === 'sse' && (msg as any).content) {
            setChatState((prevState) => {
              const history = [...prevState.history];
              const lastIndex = history.length - 1;
              if (lastIndex >= 0 && history[lastIndex].role === 'assistant') {
                const existingContent = history[lastIndex].content || '';
                // Only apply fallback if the SSE COMPLETE hasn't already delivered content
                const needsFallback = !existingContent
                  || existingContent === 'Processing...'
                  || existingContent.startsWith('Calling tool:');
                if (needsFallback) {
                  console.log('📩 [useChatFactory] SSE fallback: applying mutation response content', {
                    existingContent: existingContent?.substring?.(0, 60),
                    incomingContentLength: (msg as any).content?.length,
                  });
                  history[lastIndex] = {
                    ...history[lastIndex],
                    content: (msg as any).content,
                    thinking: (msg as any).thinking || history[lastIndex].thinking || undefined,
                    timestamp: new Date(),
                  };
                  return { ...prevState, history };
                }
              }
              return prevState;
            });
            setIsStreaming(false);
            setWaitingForResponse(false);
          }
        }
      } catch (error) {
        // Clean up streaming state and replace placeholder on error
        reactory.error('[useChatFactory] Error sending message:', error);
        setChatState((prevState) => {
          const history = [...prevState.history];
          const lastIndex = history.length - 1;
          if (lastIndex >= 0 && history[lastIndex].role === 'assistant' && history[lastIndex].content === 'Processing...') {
            history[lastIndex] = {
              ...history[lastIndex],
              content: `Error: ${(error as Error).message || 'An unexpected error occurred'}`,
              timestamp: new Date(),
            };
          }
          return { ...prevState, history };
        });
        setIsStreaming(false);
        setWaitingForResponse(false);
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

    // Include persona macros
    const personaMacros = persona?.macros || [];

    return {
      id: null,
      botId: persona?.id || 'reactor',
      host: 'web',
      persona,
      history,
      vars: {},
      started: new Date(),
      updated: new Date(),
      modelId: persona?.modelId || 'gpt-4o-mini',      
      user: reactory.getUser(),
      mcpClients: [],
      toolApprovalMode: ToolApprovalMode.PROMPT,
      macros: personaMacros,  // Include persona macros
      tools: uniquePersonaTools,  // Include persona tools
      tokenCount: 0,
      maxTokens: persona?.maxTokens || 8000,
      tokenPressure: 0,
      sendMessage
    }
  };

  /**
   * Helper function to protect critical chat state properties only when needed
   * This prevents accidental loss of tools and macros without blocking legitimate updates
   */
  const protectCriticalState = (updates: Partial<ChatState>) => {
    return (prevState: ChatState): ChatState => {
      const newState = {
        ...prevState,
        ...updates,
      };

      // Only protect tools and macros if they're being explicitly set to empty/undefined
      // and we have existing ones to protect
      if (updates.tools !== undefined && (!updates.tools || updates.tools.length === 0) && 
          prevState.tools && prevState.tools.length > 0) {
        console.warn('⚠️ [useChatFactory] Attempted to clear tools, preserving existing ones');
        newState.tools = prevState.tools;
      }

      if (updates.macros !== undefined && (!updates.macros || updates.macros.length === 0) && 
          prevState.macros && prevState.macros.length > 0) {
        console.warn('⚠️ [useChatFactory] Attempted to clear macros, preserving existing ones');
        newState.macros = prevState.macros;
      }

      // Only protect ID if it's being explicitly cleared and we have an existing one
      if (updates.id !== undefined && !updates.id && prevState.id) {
        console.warn('⚠️ [useChatFactory] Attempted to clear chat ID, preserving existing one');
        newState.id = prevState.id;
      }

      return newState;
    };
  };

  /**
   * State validation helper to ensure critical properties are never lost
   */
  const validateChatState = (state: ChatState): ChatState => {
    const validated = { ...state };
  
    // Ensure critical properties are never undefined
    if (!validated.tools || validated.tools.length === 0) {
      console.warn('⚠️ [useChatFactory] Tools were lost, restoring from persona');
      validated.tools = persona?.tools || [];
    }
  
    if (!validated.macros || validated.macros.length === 0) {
      console.warn('⚠️ [useChatFactory] Macros were lost, restoring from persona');
      validated.macros = persona?.macros || [];
    }
  
    return validated;
  };

  /**
   * Enhanced setChatState that automatically validates and preserves state
   */
  const setChatStateWithValidation = (updater: React.SetStateAction<ChatState>) => {
    setChatState((prevState) => {
      const newState = typeof updater === 'function' ? updater(prevState) : updater;
      return validateChatState(newState);
    });
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
  const [modelOverride, setModelOverride] = React.useState<{ modelId?: string; providerId?: string } | null>(null);
  const [toolIterationLimitInfo, setToolIterationLimitInfo] = React.useState<{ iterationsCompleted: number; maxIterations: number; partialContent?: string } | null>(null);

  // Network connectivity state
  const [networkStatus, setNetworkStatus] = React.useState<NetworkStatus>('idle');
  const [networkError, setNetworkError] = React.useState<string | null>(null);
  const [networkReconnectAttempt, setNetworkReconnectAttempt] = React.useState(0);

  // New: chats state for historical chats
  const [chats, setChats] = React.useState<any[]>([]);

  const { getMacroById, executeMacro, parseMacro, macros, findMacroByAlias, findMacroByName } = useMacros({
    reactory,
    chatState,
    sessionLogger,
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

  // Ref to always access the latest processToolCallsMemoized — assigned after it's defined.
  // This avoids stale closures in onToolCallReceived, which is bound via SSE event listeners.
  const processToolCallsRef = React.useRef<(toolCalls: any[], message: UXChatMessage, depth?: number) => Promise<{ toolResults: any[], toolErrors: any[] }>>(null);

  const onToolCallReceived = React.useCallback(async (toolCall: ToolCallStreamingEvent) => {
    const validSessionId = chatState.id || toolCall.conversationId || toolCall.sessionId;
    if (!validSessionId) {
      console.error('❌ [useChatFactory] Tool call missing sessionId:', toolCall);
      return;
    }
    
    // Validate tool call data
    if (!toolCall.data) {
      console.error('❌ [useChatFactory] Tool call missing data field:', toolCall);
      return;
    }
    
    // The server sends 'name', not 'toolName'
    if (!toolCall.data.name) {
      console.error('❌ [useChatFactory] Tool call missing name:', toolCall.data);
      return;
    }
    
    // The server sends 'id' in the data, not 'callId'
    if (!toolCall.data.id) {
      console.error('❌ [useChatFactory] Tool call missing id:', toolCall.data);
      return;
    }
    
    const isComplete = !!toolCall.data.isComplete;
    const toolCallId = toolCall.data.id;

    // When isComplete is true, this is a completion event for an already-tracked
    // tool call (e.g. from the AUTO server-side loop). Update the existing entry
    // instead of appending a duplicate.
    if (isComplete) {
      setChatState((prevState) => {
        const history = [...prevState.history];

        // Search backwards through ALL assistant messages to find the one
        // containing this tool call — tool calls may now span multiple
        // messages (one per AI turn) instead of being on a single message.
        let targetIndex = -1;
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].role === 'assistant' && Array.isArray(history[i].tool_calls)) {
            if ((history[i].tool_calls as any[]).some((tc: any) => tc.id === toolCallId)) {
              targetIndex = i;
              break;
            }
          }
        }

        // Extract tool result from the SSE event (sent by server when isComplete=true)
        const toolResult = toolCall.data.result;

        if (targetIndex >= 0) {
          const existingToolCalls = (history[targetIndex].tool_calls || []) as any[];
          const updatedToolCalls = existingToolCalls.map((tc: any) =>
            tc.id === toolCallId ? { ...tc, status: 'success' as const } : tc
          );

          // Append to the message's tool_results array to match DB format
          const existingResults = (history[targetIndex] as any).tool_results || [];
          const updatedResults = toolResult != null
            ? [...existingResults, { id: toolCallId, name: toolCall.data.name, content: toolResult, timestamp: new Date() }]
            : existingResults;

          history[targetIndex] = {
            ...history[targetIndex],
            tool_calls: updatedToolCalls,
            tool_results: updatedResults,
            timestamp: new Date(),
          };
        } else {
          // Tool wasn't tracked — append to the last assistant message
          const lastIndex = history.length - 1;
          if (lastIndex >= 0 && history[lastIndex].role === 'assistant') {
            const existingToolCalls = (history[lastIndex].tool_calls || []) as any[];
            existingToolCalls.push({
              id: toolCallId,
              type: "function",
              function: {
                name: toolCall.data.name,
                arguments: typeof toolCall.data.arguments === 'string'
                  ? JSON.parse(toolCall.data.arguments) : toolCall.data.arguments,
              },
              status: 'success' as const,
            });

            const existingResults = (history[lastIndex] as any).tool_results || [];
            const updatedResults = toolResult != null
              ? [...existingResults, { id: toolCallId, name: toolCall.data.name, content: toolResult, timestamp: new Date() }]
              : existingResults;

            history[lastIndex] = {
              ...history[lastIndex],
              tool_calls: existingToolCalls,
              tool_results: updatedResults,
              timestamp: new Date(),
            };
          }
        }

        return { ...prevState, id: prevState.id || validSessionId, history, updated: new Date() };
      });
      return;
    }

    // --- Start event (isComplete === false): add a new tool call entry ---

    const toolCallEntry = {
      id: toolCallId,
      type: "function",
      function: {
        name: toolCall.data.name,
        arguments: typeof toolCall.data.arguments === 'string'
          ? JSON.parse(toolCall.data.arguments) : toolCall.data.arguments,
      },
      status: 'running' as const,
    };

    const toolCallMessage = {
      id: reactory.utils.uuid(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      sessionId: validSessionId,
      tool_calls: [toolCallEntry],
    } as UXChatMessage;

    setChatState((prevState) => {
      const history = [...prevState.history];
      const lastIndex = history.length - 1;

      if (lastIndex >= 0 && history[lastIndex].role === 'assistant') {
        const existingToolCalls: any[] = history[lastIndex].tool_calls || [];

        // If the existing message already has tool_calls and ALL of them
        // are completed (status==='success'), this is a NEW AI turn (e.g.
        // next iteration in AUTO mode). Start a new assistant message to
        // match the DB structure where each turn is a separate entry.
        const allCompleted = existingToolCalls.length > 0
          && existingToolCalls.every((tc: any) => tc.status === 'success');

        if (allCompleted) {
          history.push(toolCallMessage);
        } else {
          history[lastIndex] = {
            ...history[lastIndex],
            content: history[lastIndex].content === "Processing..."
              ? `Calling tool: ${toolCall.data.name}`
              : history[lastIndex].content,
            // @ts-ignore
            tool_calls: [...existingToolCalls, toolCallEntry],
            timestamp: new Date(),
          };
        }
      } else {
        history.push(toolCallMessage);
      }

      return {
        ...prevState,
        id: prevState.id || validSessionId,
        history,
        updated: new Date(),
      };
    });

    // Accumulate the tool_call; actual processing is deferred until the
    // completion event arrives so that ALL tool_calls are processed as a batch.
    pendingToolCallsRef.current = [...pendingToolCallsRef.current, toolCallEntry];
  }, [chatState?.id]);



  const onTokenReceived = React.useCallback((token: TokenStreamingEvent) => {
    setChatState((prevState) => {
      const validSessionId = prevState.id || token.sessionId;
      if (!validSessionId) {
        console.error('❌ [useChatFactory] Token received with no sessionId:', token);
        return prevState;
      }
      
      const history = [...prevState.history];
      const lastIndex = history.length - 1;
      
      if (lastIndex >= 0 && history[lastIndex].role === "assistant") {
        const lastMessage = history[lastIndex];
        
        // Handle different types of streaming messages
        if (lastMessage.content === "Processing...") {
          // Start building content from the first token
          history[lastIndex] = {
            ...lastMessage,
            content: token.data.delta || token.data.content || "",
            timestamp: new Date(),
          };
        } else if (lastMessage.content.startsWith("Calling tool:")) {
          // Keep the tool call message as is, don't update with tokens
          // The final content will come from the completion event
        } else {
          // Regular token accumulation — always append the delta.
          // The server sends incremental deltas (not accumulated text),
          // so we always concatenate.
          history[lastIndex] = {
            ...lastMessage,
            content: lastMessage.content + (token.data.delta || token.data.content || ""),
            timestamp: new Date(),
          };
        }
      }

      const newState = { 
        ...prevState,
        id: validSessionId,
        history: history,        
      };
                
      return newState;
    });
    setIsStreaming(true);
    setWaitingForResponse(false);
  }, [chatState?.id]);

  const reasoningBufferRef = React.useRef<string>("");
  const reasoningFlushTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  // Guard: once the COMPLETE event has been processed, ignore any stale
  // reasoning buffer flushes that fire after the authoritative thinking
  // text has been set.
  const streamingCompleteRef = React.useRef<boolean>(false);

  const onReasoningReceived = React.useCallback((reasoning: ReasoningStreamingEvent) => {
    // Skip if streaming already completed (stale event from reconnect, etc.)
    if (streamingCompleteRef.current) return;

    reactory.debug('[useChatFactory] Received reasoning delta:', reasoning);
    reasoningBufferRef.current += reasoning.data.delta;

    if (!reasoningFlushTimerRef.current) {
      reasoningFlushTimerRef.current = setTimeout(() => {
        // Re-check guard inside the timer callback — the COMPLETE event
        // may have arrived and drained the buffer while we were waiting.
        if (streamingCompleteRef.current) return;

        const flushContent = reasoningBufferRef.current;
        reasoningBufferRef.current = "";
        reasoningFlushTimerRef.current = null;

        setChatState((prevState) => {
          const history = [...prevState.history];
          const lastIndex = history.length - 1;

          if (lastIndex >= 0 && history[lastIndex].role === "assistant") {
            const lastMessage = history[lastIndex];
            history[lastIndex] = {
              ...lastMessage,
              thinking: (lastMessage.thinking || '') + flushContent,
              timestamp: new Date(),
            };
          }

          return { ...prevState, history };
        });
      }, 50); // Flush every 50ms to prevent React state lockup
    } else {
      sessionLogger.debug('[useChatFactory] Reasoning buffer updated, waiting for flush timer', { bufferLength: reasoningBufferRef.current.length });
    }
    
    setIsStreaming(true);
  }, []);



    /**
   * 
   * @param message 
   * @param chatSessionId 
   * @returns 
   */
    const onToolIterationLimitReceived = React.useCallback((event: ToolIterationLimitStreamingEvent) => {
      reactory.log('[useChatFactory] Tool iteration limit reached', event.data, 'warning');

      // Update the last assistant message with partial content if available
      if (event.data.partialContent) {
        setChatState((prevState) => {
          const history = [...prevState.history];
          const lastIndex = history.length - 1;
          if (lastIndex >= 0 && history[lastIndex].role === 'assistant') {
            history[lastIndex] = {
              ...history[lastIndex],
              content: event.data.partialContent,
              timestamp: new Date(),
            };
          }
          return { ...prevState, history };
        });
      }

      setToolIterationLimitInfo({
        iterationsCompleted: event.data.iterationsCompleted,
        maxIterations: event.data.maxIterations,
        partialContent: event.data.partialContent,
      });
      setWaitingForResponse(false);
      setBusy(false);
    }, [reactory]);

    /**
     * Handle retry events from the server when a provider hits rate limiting
     * or other transient errors and is retrying with exponential backoff.
     */
    const onRetryReceived = React.useCallback((event: RetryStreamingEvent) => {
      const { attempt, maxAttempts, retryAfterMs, reason } = event.data;
      const delaySec = Math.round(retryAfterMs / 1000);
      reactory.log(
        `[useChatFactory] Provider retry: ${reason} — attempt ${attempt}/${maxAttempts}, retrying in ${delaySec}s`,
        event.data,
        'warning'
      );

      // Update the streaming placeholder message to show retry status
      setChatState((prevState) => {
        const history = [...prevState.history];
        const lastIndex = history.length - 1;
        if (lastIndex >= 0 && history[lastIndex].role === 'assistant') {
          history[lastIndex] = {
            ...history[lastIndex],
            content: `${reason}. Retrying in ${delaySec}s (attempt ${attempt}/${maxAttempts})…`,
            timestamp: new Date(),
          };
        }
        return { ...prevState, history };
      });
    }, [reactory]);

    const graph = useGraph({ reactory });
    const sse = useSSE({
      reactory,
      sessionLogger,
      onToken: onTokenReceived,
      onReasoning: onReasoningReceived,
      onToolCall: onToolCallReceived,
      onMessage: onSSEMessageReceived,
      onError: (e) => { onError(e); props.onStreamError?.(e); },
      onToolIterationLimit: onToolIterationLimitReceived,
      onRetry: onRetryReceived,
      onReconnecting: (attempt, maxAttempts) => {
        setNetworkStatus('reconnecting');
        setNetworkReconnectAttempt(attempt);
        setNetworkError(null);
      },
      onReconnected: () => {
        setNetworkStatus('connected');
        setNetworkError(null);
        setNetworkReconnectAttempt(0);
      },
      onReconnectFailed: () => {
        setNetworkStatus('error');
        setNetworkError('Connection lost. Please check your network and try again.');
      },
    });

  // Re-establish SSE connection on page reload when an existing session is loaded.
  // The SSE transport is lost on navigation/refresh, so we need to reconnect.
  const sseReestablishedRef = React.useRef(false);
  React.useEffect(() => {
    if (
      existingSession?.chatState?.id &&
      existingSession?.isInitialized &&
      protocol === 'sse' &&
      !sse.connected &&
      !sseReestablishedRef.current
    ) {
      sseReestablishedRef.current = true;
      const sessionId = existingSession.chatState.id;
      reactory.log(`ChatFactory: Re-establishing SSE for existing session ${sessionId}`);

      // Send a lightweight SSE-mode message to trigger the server to return
      // ReactorInitiateSSE (since the SSE transport no longer exists server-side).
      graph.sendMessage({
        message: '',
        personaId: persona.id,
        chatSessionId: sessionId,
        streamingMode: 'SSE',
        continueAfterTools: true,
      }).then((resp: any) => {
        if (resp?.__typename === 'ReactorInitiateSSE') {
          sse.disconnect(); // clean up any stale state
          sse.connect({
            endpoint: resp.endpoint,
            sessionId: resp.sessionId,
            headers: resp.headers,
          });
          reactory.log(`ChatFactory: SSE re-established for session ${sessionId}`);
        } else {
          reactory.log(`ChatFactory: SSE re-init returned ${resp?.__typename}, not ReactorInitiateSSE`, {}, 'warning');
          sseReestablishedRef.current = false; // allow retry
        }
      }).catch((err: any) => {
        reactory.log(`ChatFactory: Failed to re-establish SSE: ${err?.message}`, {}, 'warning');
        sseReestablishedRef.current = false; // allow retry
      });
    }
  }, [existingSession?.chatState?.id, existingSession?.isInitialized, protocol, sse.connected]);

  /**
   * Wraps setModelOverride to also persist the selection to the server
   * when an active conversation exists.
   */
  const handleModelChange = React.useCallback((override: { modelId?: string; providerId?: string } | null) => {
    setModelOverride(override);
    if (chatState?.id && override && typeof graph?.setChatModelProvider === 'function') {
      graph.setChatModelProvider(chatState.id, override.modelId, override.providerId)
        .then((result: any) => {
          // Update chatState with the new maxTokens returned by the server
          if (result?.maxTokens != null) {
            setChatState(prev => ({
              ...prev,
              maxTokens: result.maxTokens,
              tokenCount: result.tokenCount ?? prev.tokenCount,
              tokenPressure: result.tokenPressure ?? prev.tokenPressure,
            }));
          }
        })
        .catch((err: any) => {
          reactory.log(`ChatFactory: Failed to persist model/provider override: ${err?.message}`, {}, 'warning');
        });
    }
  }, [chatState?.id, graph, reactory, setChatState]);

  /**
   * Initializes the chat session with a given persona.
   * This is important to call when the chat session is first created so that the 
   * backend is aware of the persona and which tools the client has available to 
   * call on the front end.
   * @param persona 
   */
  const initializeChat = async (persona, contextFromSessionId?: string) => {
    sessionLogger?.info(`Initializing chat session`, { personaId: persona?.id, contextFromSessionId }, 'useChatFactory');

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
      contextFromSessionId,
      ...(modelOverride?.modelId ? { modelId: modelOverride.modelId } : {}),
      ...(modelOverride?.providerId ? { providerId: modelOverride.providerId } : {}),
    };

    try {
      const result = await graph.startChatSession(initSession);
      if (result?.__typename === 'ReactorChatState') {
        const chat = result as unknown as Partial<ChatState>;
        if (chat.id) {
          reactory.info(`ChatFactory: Initialized chat session with ID: ${chat.id}`);
          console.log('🔧 [useChatFactory] ReactorChatState response details:', {
            chatId: chat.id,
            chatMacrosCount: (chat as any).macros?.length || 0,
            chatToolsCount: (chat as any).tools?.length || 0,
            prevStateMacrosCount: chatState.macros?.length || 0,
            prevStateToolsCount: chatState.tools?.length || 0
          });
          
          setChatState((prevState) => ({
            ...prevState,
            id: chat.id as string || chatState.id,
            updated: new Date(),
            // Only update macros and tools if the server actually returned non-empty arrays,
            // otherwise preserve existing ones. Note: [] is truthy in JS, so we must check .length.
            macros: ((chat as any).macros?.length > 0) ? (chat as any).macros : (prevState.macros || []),
            tools: ((chat as any).tools?.length > 0) ? (chat as any).tools : (prevState.tools || []),
          }));
          return chat.id as string;
        }
        throw new Error('No session ID in initialization response');
      }

      if (result?.__typename === 'ReactorInitiateSSE') {
        const sseResult = result as any;
        const sseSessionId = sseResult.sessionId as string;

        console.log('🔧 [useChatFactory] ReactorInitiateSSE response details:', {
          sessionId: sseSessionId,
          chatStateMacrosCount: sseResult.chatState?.macros?.length || 0,
          chatStateToolsCount: sseResult.chatState?.tools?.length || 0,
          prevStateMacrosCount: chatState.macros?.length || 0,
          prevStateToolsCount: chatState.tools?.length || 0
        });

        // Update chatState.id so subsequent sendMessage calls have the session ID
        setChatState((prevState) => ({
          ...prevState,
          id: sseSessionId,
          // Note: [] is truthy in JS, so we must check .length to avoid overwriting with empty arrays
          macros: (sseResult.chatState?.macros?.length > 0) ? sseResult.chatState.macros : (prevState.macros || []),
          tools: (sseResult.chatState?.tools?.length > 0) ? sseResult.chatState.tools : (prevState.tools || []),
        }));

        sse.connect({
          endpoint: sseResult.endpoint,
          sessionId: sseSessionId,
          headers: sseResult.headers,
          token: sseResult.token,
          expiry: sseResult.expiry,
        });
        return sseSessionId;
      }

      throw new Error('No response from server');
    } catch (error) {
      onError(error as Error);
      throw error;
    }
  }

  useEffect(() => {
    if (!persona?.id) return;

    // Check if the persona in chatState actually matches the new persona.
    // When switching FROM persona A (which has an active session) TO persona B,
    // chatState still holds persona A's data — we must detect this mismatch.
    const currentPersonaId = chatState.persona?.id || chatState.botId;
    if (currentPersonaId === persona.id) return; // Same persona, no action needed

    // Persona changed — check for a cached session injected from the parent
    if (existingSession?.chatState?.persona?.id === persona.id) {
      // Restore the cached session for this persona, validating critical state is preserved
      setChatState(validateChatState(existingSession.chatState));
      setIsInitialized(existingSession.isInitialized || false);
      reactory.info(`ChatFactory: Restored cached session for persona ${persona.id}`);
    } else {
      // No cached session — fresh start with new persona's greeting, tools, macros
      const initialState = getInitialChatState();
      setChatState(initialState);
      setIsInitialized(false);
      reactory.info(`ChatFactory: Fresh start for persona ${persona.id}`);
    }

    return () => {};
  }, [persona?.id]); // Only depend on persona ID, not tools/macros

  // Update session state when existingSession changes (when switching between factories)
  useEffect(() => {
    if (existingSession?.chatState) {
      // Validate to ensure tools/macros are preserved when restoring session state
      setChatState(validateChatState(existingSession.chatState));
      setIsInitialized(existingSession.isInitialized || false);
      reactory.info(`ChatFactory: Inherited existing session ${existingSession.chatState.id}`);
    }
  }, [existingSession, reactory]);

  // Monitor changes to tools and macros to help debug state issues
  useEffect(() => {
    // Only log if we have tools or macros, or if we're going from having them to not having them
    const currentToolsCount = chatState.tools?.length || 0;
    const currentMacrosCount = chatState.macros?.length || 0;
    
    console.log('🔧 [useChatFactory] Tools and macros state changed:', {
      toolsCount: currentToolsCount,
      macrosCount: currentMacrosCount,
      tools: currentToolsCount > 0 ? chatState.tools?.map(t => ({ name: t.function?.name, type: t.type })) : [],
      macros: currentMacrosCount > 0 ? chatState.macros?.map(m => ({ name: m.name, alias: m.alias })) : [],
      chatStateId: chatState.id,
      isInitialized,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced state validation
    if (currentToolsCount === 0 || currentMacrosCount === 0) {
      console.warn('⚠️ [useChatFactory] Tools or macros were cleared!', {
        toolsCount: currentToolsCount,
        macrosCount: currentMacrosCount,
        chatStateId: chatState.id,
        isInitialized,
        timestamp: new Date().toISOString()
      });
      
      // Log the current state structure for debugging
      console.log('🔧 [useChatFactory] Current state structure:', {
        stateKeys: Object.keys(chatState),
        hasPersona: !!chatState.persona,
        personaToolsCount: chatState.persona?.tools?.length || 0,
        personaMacrosCount: chatState.persona?.macros?.length || 0,
        historyLength: chatState.history?.length || 0
      });
    }
    
    // Validate state integrity
    if (!chatState.id && isInitialized) {
      console.warn('⚠️ [useChatFactory] Chat is initialized but has no ID!');
    }
    
    if (chatState.id && (!chatState.tools || chatState.tools.length === 0)) {
      console.warn('⚠️ [useChatFactory] Chat has ID but no tools!');
    }
    
    if (chatState.id && (!chatState.macros || chatState.macros.length === 0)) {
      console.warn('⚠️ [useChatFactory] Chat has ID but no macros!');
    }
  }, [chatState.tools, chatState.macros, chatState.id, isInitialized]);

  const onMessage = (message: UXChatMessage) => {
    sessionLogger?.debug(`Message received (role=${message.role})`, { messageId: message.id, role: message.role, toolCalls: message.tool_calls?.length || 0 }, 'useChatFactory');
    console.log('🔧 [useChatFactory] onMessage called:', {
      messageId: message.id,
      messageRole: message.role,
      messageContent: typeof message.content === 'string'
        ? message.content?.substring(0, 100)
        : Array.isArray(message.content)
          ? `[content-parts: ${(message.content as any[]).length}]`
          : String(message.content ?? '').substring(0, 100),
      currentHistoryLength: chatState.history?.length || 0,
      currentChatStateId: chatState.id
    });

    setChatState((prevState) => {
      const newState = {
        ...prevState,
        history: [...prevState.history, message as any],
        updated: new Date(),
      };

      console.log('🔧 [useChatFactory] onMessage state update:', {
        oldHistoryLength: prevState.history?.length || 0,
        newHistoryLength: newState.history?.length || 0,
        newMessageAdded: message,
        toolsCount: newState.tools?.length || 0,
        macrosCount: newState.macros?.length || 0
      });

      return newState;
    });
  }

  const onError = (error: any) => {
    reactory.error('useChatFactory onError:', error);
    const message = (error as Error)?.message || String(error) || 'An unexpected error occurred';
    const type = (error as any)?.type;
    sessionLogger?.error(`Error: ${message}`, { type }, 'useChatFactory');

    // SSE/streaming errors replace the chat message with a non-obtrusive network indicator
    // visible to all users, rather than polluting the chat history with error messages.
    if (type === 'SSE_ERROR' || type === 'PARSE_ERROR' || type === 'SESSION_EXPIRED') {
      setNetworkStatus('error');
      setNetworkError(message);
      return;
    }

    // Other errors (application/logic errors): show as a chat message for ADMIN/DEVELOPER only
    if (reactory.hasRole(['ADMIN', 'DEVELOPER'])) {
      onMessage({
        id: reactory.utils.uuid(),
        timestamp: new Date(),
        role: "assistant",
        content: 'Error: ' + message,
        tool_calls: [],
        rating: 0,
        refusal: null,
        annotations: [],
        audio: null,
        sessionId: chatState.id,
      });
    }
  }

  /** Clear the network error indicator and allow the user to continue */
  const dismissNetworkError = React.useCallback(() => {
    setNetworkStatus('idle');
    setNetworkError(null);
    setNetworkReconnectAttempt(0);
  }, []);

  /**
   * Reset network status so the user can retry sending a message after a network error.
   * The next sendMessage call will attempt to reconnect automatically.
   */
  const retryConnection = React.useCallback(() => {
    setNetworkStatus('idle');
    setNetworkError(null);
    setNetworkReconnectAttempt(0);
  }, []);

  /**
   * Attach a ToolPrompt component to the message that owns the tool_calls.
   * When `targetMessageId` is provided the search is deterministic; otherwise
   * falls back to the last assistant message with tool_calls.
   */
  const onToolCallPrompt = React.useCallback((toolCall: string, args: any, state: ChatState, callBack: (approved: boolean) => void, targetMessageId?: string) => {
    setChatState((prevState) => {
      const history = [...prevState.history];

      let lastMessageIndex = -1;
      if (targetMessageId) {
        lastMessageIndex = history.findIndex((msg) => (msg as any).id === targetMessageId);
      }
      if (lastMessageIndex < 0) {
        for (let i = history.length - 1; i >= 0; i--) {
          const msg = history[i];
          if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
            lastMessageIndex = i;
            break;
          }
        }
      }

      if (lastMessageIndex >= 0) {
        history[lastMessageIndex] = {
          ...history[lastMessageIndex],
          component: () => <ToolPrompt toolName={toolCall} args={args} onDecision={callBack} />,
        };
      } else {
        console.warn('⚠️ [useChatFactory] No message with tool_calls found for prompt');
      }

      return {
        ...prevState,
        history,
        updated: new Date(),
      };
    });
  }, [chatState.history, chatState.tools, chatState.macros]);

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
    const deleteId = Array.isArray(id) ? id[0] : id;
    sessionLogger?.info(`Deleting chat session`, { chatSessionId: deleteId }, 'useChatFactory');
    try {
      // Only single id supported by schema
      await graph.deleteChatSession(deleteId);
      await fetchConversations({}); // Refresh the chat list after deletion
    } catch (error) {
      onError(error);
    }
  };

  const newChat = async () => {
    sessionLogger?.info('Starting new chat', { personaId: persona?.id }, 'useChatFactory');
    setBusy(true);
    try {
      // Full reset for a true "New Chat" - addresses the bug where history was not cleared
      const initialState = getInitialChatState();
      setChatState(initialState);
      setIsInitialized(false);
      setToolIterationLimitInfo(null);
      setIsStreaming(false);
      setWaitingForResponse(false);
      setModelOverride(null);
      
      // Disconnect any existing SSE connection to ensure clean state
      sse.disconnect();
      
      // Initialize a brand new session
      const newSessionId = await initializeChat(persona);
      if (newSessionId) {
        setIsInitialized(true);
        reactory.info(`ChatFactory: Started completely new chat session ${newSessionId}`);
      } else {
        throw new Error('Failed to initialize new chat');
      }
    } catch (error) {
      onError(error as Error);
    } finally {
      setBusy(false);
    }
  }


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
            id: newSessionId || prev.id
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

  const refreshSessionAttachments = React.useCallback(async () => {
    const id = chatState.id;
    if (!id) return;
    try {
      const conv = await graph.getConversation(id);
      if (conv && (conv as any).__typename !== "ReactorErrorResponse") {
        setChatState((prev) => ({
          ...prev,
          files: (conv as any).files ?? prev.files,
          folders: (conv as any).folders ?? prev.folders,
        }));
      }
    } catch (e) {
      reactory.error("ChatFactory: refreshSessionAttachments failed", e);
    }
  }, [chatState.id, graph, reactory, setChatState]);

  const ensureSessionForAttachments = React.useCallback(async (): Promise<string | null> => {
    let sessionId = chatState.id;
    if (!isInitialized && persona?.id) {
      reactory.info(`ChatFactory: Initializing chat session for file/folder pin with persona ${persona.id}`);
      try {
        const newSessionId = await initializeChat(persona);
        setIsInitialized(true);
        sessionId = newSessionId;
        setChatState((prev) => ({ ...prev, id: newSessionId || prev.id }));
      } catch (error) {
        onError(error);
        return null;
      }
    }
    return sessionId || null;
  }, [chatState.id, isInitialized, persona, initializeChat, reactory, setChatState]);

  const pinUserFileForChat = async (
    fileId: string,
    path: string,
    options?: { referenceOnly?: boolean }
  ) => {
    sessionLogger?.info(`Pinning user file to chat`, { fileId, path, referenceOnly: options?.referenceOnly }, 'useChatFactory');
    setBusy(true);
    try {
      const sessionId = await ensureSessionForAttachments();
      if (!sessionId) throw new Error("No chat session");
      const result = await graph.attachUserFileToSession({
        sessionId,
        fileId,
        path,
        referenceOnly: options?.referenceOnly,
      });
      if (result?.__typename === "ReactorErrorResponse") {
        onError(new Error((result as any).message));
        return;
      }
      await refreshSessionAttachments();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const unpinUserFileForChat = async (fileId: string, path: string) => {
    sessionLogger?.info(`Unpinning user file from chat`, { fileId, path }, 'useChatFactory');
    setBusy(true);
    try {
      const sessionId = chatState.id;
      if (!sessionId) throw new Error("No chat session");
      const result = await graph.detachUserFileFromSession({
        sessionId,
        fileId,
        path,
        delete: false,
      });
      if (result?.__typename === "ReactorErrorResponse") {
        onError(new Error((result as any).message));
        return;
      }
      await refreshSessionAttachments();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const pinFolderForChat = async (folderPath: string, folderName: string) => {
    sessionLogger?.info(`Pinning folder to chat`, { folderPath, folderName }, 'useChatFactory');
    setBusy(true);
    try {
      const sessionId = await ensureSessionForAttachments();
      if (!sessionId) throw new Error("No chat session");
      const result = await graph.pinFolderToSession({
        sessionId,
        path: folderPath,
        name: folderName,
      });
      if (result?.__typename === "ReactorErrorResponse") {
        onError(new Error((result as any).message));
        return;
      }
      await refreshSessionAttachments();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const unpinFolderForChat = async (folderPath: string, folderName: string) => {
    sessionLogger?.info(`Unpinning folder from chat`, { folderPath, folderName }, 'useChatFactory');
    setBusy(true);
    try {
      const sessionId = chatState.id;
      if (!sessionId) throw new Error("No chat session");
      const result = await graph.unpinFolderFromSession({
        sessionId,
        path: folderPath,
        name: folderName,
      });
      if (result?.__typename === "ReactorErrorResponse") {
        onError(new Error((result as any).message));
        return;
      }
      await refreshSessionAttachments();
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
    sessionLogger?.info(`Tool approval mode changing to ${mode}`, { mode, chatSessionId: chatState.id }, 'useChatFactory');
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
          role: "user",
          content: `Tool approval mode set to ${mode}`,
          sessionId: chatState.id,
          isActivity: true,
        } as any);
      } else {
        throw new Error("No response from server");
      }
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }

  const setMaxToolIterations = async (maxIterations: number) => {
    sessionLogger?.info(`Max tool iterations changing to ${maxIterations}`, { maxIterations, chatSessionId: chatState.id }, 'useChatFactory');
    setBusy(true);
    try {
      let sessionId = chatState.id;

      if (!isInitialized && persona?.id) {
        reactory.info(`ChatFactory: Initializing chat session on max tool iterations change with persona ${persona.id}`);
        try {
          const newSessionId = await initializeChat(persona);
          setIsInitialized(true);
          sessionId = newSessionId;
        } catch (error) {
          onError(error);
          setBusy(false);
          return;
        }
      }

      if (!sessionId) {
        throw new Error('No active chat session available');
      }

      const response = await graph.setChatMaxToolIterations(sessionId, maxIterations);
      if (response) {
        setChatState((prevState) => ({
          ...prevState,
          maxToolIterations: response.maxToolIterations,
        }));
      } else {
        throw new Error('No response from server');
      }
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const continueToolExecution = async (newMaxIterations?: number) => {
    setBusy(true);
    setToolIterationLimitInfo(null);
    try {
      const sessionId = chatState.id;
      if (!sessionId) {
        throw new Error('No active chat session available');
      }

      if (protocol === 'sse') {
        setIsStreaming(true);
        setWaitingForResponse(true);
      }

      const resp = await graph.continueToolExecution(
        sessionId,
        chatState.botId || persona?.id,
        newMaxIterations,
        protocol === 'sse' ? 'SSE' : 'NONE',
      );

      if (!resp) throw new Error('No response from server');

      if ((resp as any).__typename === 'ReactorErrorResponse') {
        setIsStreaming(false);
        setWaitingForResponse(false);
        onError(new Error((resp as any).message));
        return;
      }

      if ((resp as any).__typename === 'ReactorInitiateSSE') {
        const sseResp = resp as any;
        sse.disconnect();
        sse.connect({
          endpoint: sseResp.endpoint,
          sessionId: sseResp.sessionId,
          onConnectionOpened: async () => {
            await graph.continueToolExecution(
              sessionId,
              chatState.botId || persona?.id,
              newMaxIterations,
              'SSE',
            );
          },
        });
        return;
      }

      if ((resp as any).__typename === 'ReactorChatMessage') {
        const msg = resp as unknown as UXChatMessage;
        setChatState((prevState) => ({
          ...prevState,
          history: [...prevState.history, msg as any],
          updated: new Date(),
        }));

        if (protocol === 'graphql' && msg.tool_calls && (msg.tool_calls as any[]).length > 0) {
          await processToolCallsMemoized(msg.tool_calls as any[], msg);
        }
      }
    } catch (error) {
      setIsStreaming(false);
      setWaitingForResponse(false);
      onError(error as Error);
    } finally {
      setBusy(false);
    }
  };

  const loadChat = async (chatSessionId: string) => {
    sessionLogger?.info(`Loading chat session`, { chatSessionId }, 'useChatFactory');
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
            // Only update specific properties, don't spread the entire result
            id: (result as any).id,
            started: (result as any).started,
            history: (result as any).history ?? [],
            tools: uniqueTools,
            macros: (result as any).macros ?? [],
            vars: (result as any).vars ?? {},
            tokenCount: (result as any).tokenCount,
            maxTokens: (result as any).maxTokens,
            toolApprovalMode: (result as any).toolApprovalMode,
            maxToolIterations: (result as any).maxToolIterations,
            files: (result as any).files ?? prevState.files,
            folders: (result as any).folders ?? prevState.folders,
            updated: new Date(),
          }));

          // Restore model/provider override from the conversation if it differs from persona defaults
          const loadedModelId = (result as any).modelId;
          const loadedProviderId = (result as any).providerId;
          if (loadedModelId || loadedProviderId) {
            const personaModelId = persona?.modelId;
            const personaProviderId = persona?.providerId;
            const isDifferent = (loadedModelId && loadedModelId !== personaModelId) ||
              (loadedProviderId && loadedProviderId !== personaProviderId);
            setModelOverride(isDifferent ? { modelId: loadedModelId, providerId: loadedProviderId } : null);
          } else {
            setModelOverride(null);
          }

          // Mark as initialized since we're loading an existing session
          setIsInitialized(true);

          // Re-establish the SSE transport for streaming sessions.
          // The EventSource from the previous page visit is gone, so
          // the server has no active transport for this conversation.
          // Sending a lightweight SSE-mode call triggers the server to
          // return ReactorInitiateSSE without processing a real message.
          if (protocol === 'sse' && !sse.connected) {
            graph.sendMessage({
              message: '',
              personaId: (result as any)?.personaId || persona.id,
              chatSessionId,
              streamingMode: 'SSE',
              continueAfterTools: true,
            }).then((resp: any) => {
              if (resp?.__typename === 'ReactorInitiateSSE') {
                sse.disconnect();
                sse.connect({
                  endpoint: resp.endpoint,
                  sessionId: resp.sessionId,
                  headers: resp.headers,
                });
              }
            }).catch((err: any) => {
              reactory.log(`ChatFactory: Failed to re-establish SSE for loaded session: ${err?.message}`, {}, 'warning');
            });
          }
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
   * Consolidate tool results into a single message for the AI provider
   */
  const consolidateToolResults = React.useCallback((toolResults: any[], toolErrors: any[]): string => {
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
  }, []);

  /**
   * Send tool results back to the AI provider and get the response
   */
  const sendToolResultsToAI = React.useCallback(async (consolidatedResults: string, toolResults: any[], toolErrors: any[], thinkingPlaceholderId?: string): Promise<UXChatMessage | null> => {
    try {
      // Tool results are already persisted in MongoDB by executeMacro.
      // Use continueAfterTools to avoid adding a duplicate tool message.
      // Always use NONE for tool result follow-ups so we get the full response
      // (including any follow-up tool_calls) in the GraphQL response. Using SSE
      // would require the client to re-negotiate the SSE transport.
      const resp = await graph.sendMessage({
        message: consolidatedResults || 'Continue after tool execution',
        personaId: persona.id,
        chatSessionId: chatState.id,
        streamingMode: 'NONE',
        role: 'tool',
        continueAfterTools: true,
        ...(modelOverride?.modelId ? { modelId: modelOverride.modelId } : {}),
        ...(modelOverride?.providerId ? { providerId: modelOverride.providerId } : {}),
      });

      if (resp) {
        if (resp.__typename === "ReactorErrorResponse") {
          throw new Error((resp as any).message);
        }

        const aiMessage = resp as unknown as UXChatMessage;

        // Replace the Processing... placeholder if one was injected, otherwise append
        if (aiMessage.sessionId) {
          setChatState((prevState) => {
            const history = [...prevState.history];
            if (thinkingPlaceholderId) {
              let phIdx = -1;
              for (let i = history.length - 1; i >= 0; i--) {
                if ((history[i] as any).id === thinkingPlaceholderId) { phIdx = i; break; }
              }
              if (phIdx >= 0) {
                history[phIdx] = aiMessage as any;
                return { ...prevState, history, updated: new Date() };
              }
            }
            // Fallback — just append
            return {
              ...prevState,
              history: [...history, aiMessage as any],
              updated: new Date(),
            };
          });
        }

        return aiMessage;
      }

      return null;
    } catch (error) {
      reactory.error('Error sending tool results to AI', error);
      throw error;
    }
  }, [graph, persona?.id, chatState?.id, modelOverride]);

  /**
   * Remove the approval component from a message.
   * When `targetMessageId` is provided the removal is deterministic;
   * otherwise falls back to the last assistant message with tool_calls.
   */
  const cleanupApprovalComponent = React.useCallback((targetMessageId?: string) => {
    setChatState((prevState) => {
      const history = [...prevState.history];

      let lastMessageIndex = -1;
      if (targetMessageId) {
        lastMessageIndex = history.findIndex((msg) => (msg as any).id === targetMessageId);
      }
      if (lastMessageIndex < 0) {
        for (let i = history.length - 1; i >= 0; i--) {
          const msg = history[i];
          if (msg.role === 'assistant' && 
              msg.tool_calls && 
              msg.tool_calls.length > 0 && 
              msg.content !== "Processing..." && 
              !msg.content.startsWith("Calling tool:")) {
            lastMessageIndex = i;
            break;
          }
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
  }, [chatState?.history, chatState?.tools, chatState?.macros]);

  /**
   * Process tools that require user approval.
   * @param targetMessageId - The ID of the chat message that holds the tool_calls.
   *   Passed through to onToolCallPrompt / cleanupApprovalComponent for
   *   deterministic message targeting.
   */
  const processToolsWithApproval = React.useCallback(async (toolCalls: any[], toolResults: any[], toolErrors: any[], targetMessageId?: string) => {
    for (const toolCall of toolCalls) {
      if (toolCall.type === 'function' && toolCall.function) {
        const { id, function: func } = toolCall;
        const { name, arguments: args } = func;

        let macro = findMacroByAlias(name);
        if (!macro) {
          macro = findMacroByName(name);
        }
        // Fallback: search chatState.macros directly by name or alias
        // (covers cases where the AI uses the tool function name which
        // may differ from the registered macro FQN)
        if (!macro && chatState.macros) {
          const found = chatState.macros.find(
            (m: any) => m.name === name || m.alias === name
              || m.name?.endsWith(`.${name}`) || m.alias?.endsWith(`.${name}`)
          );
          if (found) macro = found as any;
        }

        // Final fallback: if no macro found but a matching server-side tool exists
        // on the conversation, create a synthetic macro entry for server-side execution.
        // This handles YAML-defined agents whose tools are registered on the conversation
        // but whose macros may not be in the client-side registry.
        if (!macro && chatState.tools) {
          const serverTool = chatState.tools.find(
            (t: any) => t.function?.name === name && t.runat === 'server'
          );
          if (serverTool) {
            macro = {
              name: name,
              nameSpace: 'reactor-macros',
              version: '1.0.0',
              description: serverTool.function?.description || name,
              runat: 'server',
              roles: serverTool.roles || [],
              alias: name,
              enabled: true,
            } as any;
          }
        }

        if (!macro) {
          console.warn(`⚠️ [useChatFactory] Macro not found for tool: ${name}`, {
            availableMacros: chatState.macros?.map((m: any) => ({ name: m.name, alias: m.alias })),
            availableTools: chatState.tools?.map((t: any) => ({ name: t.function?.name, runat: t.runat })),
          });
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
              cleanupApprovalComponent(targetMessageId);

              if (approved) {
                try {
                  const result = await executeMacro(macro, args, 'user', id);
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
            }, targetMessageId);
          });

          // Yield so React can flush state between sequential approval prompts.
          // Without this, the cleanup of tool N and the prompt for tool N+1 are
          // batched, and the ToolPrompt for tool N+1 may not render.
          await new Promise(r => setTimeout(r, 0));
        } catch (error) {
          reactory.error(`Error processing approved tool: ${name}`, error);
        }
      }
    }
  }, [
    chatState.macros?.length,
    chatState.id,
    findMacroByAlias,
    findMacroByName,
    onToolCallPrompt,
    cleanupApprovalComponent,
    executeMacro
  ]);

  /**
   * Process tools automatically without user approval
   */
  const processToolsAutomatically = React.useCallback(async (toolCalls: any[], toolResults: any[], toolErrors: any[]) => {
    console.log('🔧 [useChatFactory] processToolsAutomatically called with:', {
      toolCallsCount: toolCalls.length,
      toolCalls: toolCalls.map(tc => ({
        id: tc.id,
        type: tc.type,
        hasFunction: !!tc.function,
        functionName: tc.function?.name,
        functionArgs: tc.function?.arguments
      }))
    });
    
    // Execute tools in parallel for better performance
    const toolPromises = toolCalls.map(async (toolCall) => {
      console.log('🔧 [useChatFactory] Processing tool call:', toolCall);
      
      if (toolCall.type === 'function' && toolCall.function) {
        const { id, function: func } = toolCall;
        const { name, arguments: args } = func;
        
        console.log('🔧 [useChatFactory] Tool call details:', { id, name, args });

        // Try to find the macro by alias first, then by name, then by partial match
        let macro = findMacroByAlias(name);
        if (!macro) {
          macro = chatState.macros?.find(
            (m: any) => m.name === name || m.alias === name
              || m.name?.endsWith(`.${name}`) || m.alias?.endsWith(`.${name}`)
          ) ?? null;
        }
        
        console.log('🔧 [useChatFactory] Macro found:', {
          hasMacro: !!macro,
          macroName: macro?.name,
          macroAlias: macro?.alias,
          availableMacros: chatState.macros?.map(m => ({ name: m.name, alias: m.alias }))
        });

        // Final fallback: if no macro found but a matching server-side tool exists
        // on the conversation, create a synthetic macro entry for server-side execution.
        if (!macro && chatState.tools) {
          const serverTool = chatState.tools.find(
            (t: any) => t.function?.name === name && t.runat === 'server'
          );
          if (serverTool) {
            macro = {
              name: name,
              nameSpace: 'reactor-macros',
              version: '1.0.0',
              description: serverTool.function?.description || name,
              runat: 'server',
              roles: serverTool.roles || [],
              alias: name,
              enabled: true,
            } as any;
          }
        }

        if (!macro) {
          console.error('❌ [useChatFactory] Macro not found for tool call:', { name, availableMacros: chatState.macros?.map(m => m.name) });
          return {
            id,
            name,
            error: `Macro not found: ${name}`,
            timestamp: new Date()
          };
        }

        try {
          console.log('🔧 [useChatFactory] Executing macro:', macro.name);
          console.log('🔧 [useChatFactory] Macro execution details:', {
            macroName: macro.name,
            macroAlias: macro.alias,
            macroRunat: macro.runat,
            args: args,
            argsType: typeof args
          });
          
          const result = await executeMacro(macro, args, 'auto', id);
          console.log('✅ [useChatFactory] Macro executed successfully:', { name: macro.name, result });
          return {
            id,
            name,
            role: "tool",
            content: result?.content || result,
            timestamp: new Date(),
            sessionId: chatState.id,
          };
        } catch (error) {
          console.error('❌ [useChatFactory] Error executing macro:', { name: macro.name, error });
          console.error('❌ [useChatFactory] Error details:', {
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name
          });
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
    
    console.log('🔧 [useChatFactory] processToolsAutomatically completed:', {
      toolResultsCount: toolResults.length,
      toolErrorsCount: toolErrors.length
    });
  }, [
    // Use specific primitive dependencies instead of entire chatState object
    chatState.macros?.length,
    chatState.id,
    findMacroByAlias,
    executeMacro
  ]);

  /**
   * Update chat state with tool execution results
   */
  const updateChatStateWithToolResults = React.useCallback((message: UXChatMessage, toolResults: any[], toolErrors: any[]) => {
    setChatState((prevState) => {
      const history = [...prevState.history];
      
      // Find the last message with tool_calls (role: 'assistant', tool_calls present)
      // Skip "thinking" messages and look for actual tool call messages
      let lastMessageIndex = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role === 'assistant' && 
            msg.tool_calls && 
            msg.tool_calls.length > 0 && 
            msg.content !== "Processing..." && 
            !msg.content.startsWith("Calling tool:")) { // Skip processing and calling messages
          lastMessageIndex = i;
          break;
        }
      }

      console.log('🔧 [useChatFactory] updateChatStateWithToolResults - message search:', {
        historyLength: history.length,
        lastMessageIndex,
        foundMessage: lastMessageIndex >= 0 ? history[lastMessageIndex] : null,
        toolResultsCount: toolResults.length,
        toolErrorsCount: toolErrors.length,
        // Debug the history to see what messages we have
        historyMessages: history.map((msg, idx) => ({
          index: idx,
          role: msg.role,
          content: msg.content,
          hasToolCalls: !!(msg.tool_calls && msg.tool_calls.length > 0),
          toolCallsCount: msg.tool_calls?.length || 0
        }))
      });

      if (lastMessageIndex >= 0) {
        // Update the message with tool_calls with tool results and update each tool call's status
        const updatedToolCalls = (history[lastMessageIndex].tool_calls || []).map((tc: any) => {
          const hasResult = toolResults.some((r: any) => r.id === tc.id);
          const hasError = toolErrors.some((e: any) => e.id === tc.id);
          return {
            ...tc,
            status: hasError ? 'error' : hasResult ? 'success' : tc.status || 'pending',
          };
        });
        history[lastMessageIndex] = {
          ...history[lastMessageIndex],
          tool_calls: updatedToolCalls,
          tool_results: toolResults,
          tool_errors: toolErrors,
        };
      } else if (history.length > 0) {
        // Fallback: update the last message
        console.warn('⚠️ [useChatFactory] No message with tool_calls found, updating last message');
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
  }, [
    // Use specific primitive dependencies instead of entire chatState object
    chatState.history?.length,
    chatState.id,
    consolidateToolResults
  ]);

  /**
   * Enhanced tool call processing with recursive handling for multiple tool calls
   * Memoized version to prevent stale closures and improve performance
   */
  const processToolCallsMemoized = React.useCallback(async (toolCalls: any[], message: UXChatMessage, depth: number = 0): Promise<{ toolResults: any[], toolErrors: any[] }> => {
    // Access toolApprovalMode from the current state to avoid stale closures
    const toolApprovalMode = chatState.toolApprovalMode;
    const toolResults = [];
    const toolErrors = [];

    // Filter out null/undefined entries that can occur when the GraphQL
    // schema nullifies tool_calls with missing required fields (e.g. status).
    const validToolCalls = toolCalls.filter((tc): tc is NonNullable<typeof tc> => tc != null);

    console.log('🔧 [useChatFactory] processToolCallsMemoized called:', {
      toolCallsCount: validToolCalls.length,
      toolCallsFiltered: toolCalls.length - validToolCalls.length,
      toolApprovalMode,
      depth,
      messageId: message.id,
      messageRole: message.role,
      currentChatStateId: chatState.id
    });

    if (validToolCalls.length === 0) {
      return { toolResults, toolErrors };
    }

    // Prevent infinite recursion (max 10 levels deep)
    const MAX_RECURSION_DEPTH = 10;
    if (depth >= MAX_RECURSION_DEPTH) {
      toolErrors.push({
        error: `Maximum tool call recursion depth (${MAX_RECURSION_DEPTH}) exceeded`,
        timestamp: new Date()
      });
      return { toolResults, toolErrors };
    }

    // Build a lookup from tool name -> MacroToolDefinition for per-tool metadata.
    const toolMetaByName = new Map<string, MacroToolDefinition>();
    for (const t of (chatState.tools || [])) {
      if (t?.function?.name) toolMetaByName.set(t.function.name, t);
    }

    /**
     * Determine if a tool is safe for auto-execution based on its
     * `safeForAutoExecution` metadata. Falls back to a hardcoded
     * allowlist for tools that haven't been annotated yet.
     */
    const isToolSafe = (name: string): boolean => {
      const meta = toolMetaByName.get(name);
      if (meta?.safeForAutoExecution != null) return meta.safeForAutoExecution;
      // Legacy fallback for unannotated tools
      const legacySafe = new Set([
        'readChatFile', 'readFile', 'listFiles', 'listDirectory', 'searchFiles', 'getFileContents',
        'readDirectory', 'stat', 'state', 'getState', 'getChatState',
      ]);
      return legacySafe.has(name);
    };

    let toolsRequiringApproval: any[] = [];
    let toolsForAutoExecution: any[] = [];

    if (toolApprovalMode === ToolApprovalMode.AUTO) {
      toolsForAutoExecution = validToolCalls;
    } else if (toolApprovalMode === ToolApprovalMode.PROMPT) {
      toolsRequiringApproval = validToolCalls;
    } else if (toolApprovalMode === ToolApprovalMode.SAFE_AUTO || toolApprovalMode === ToolApprovalMode.PLAN) {
      for (const tc of validToolCalls) {
        const name = tc.function?.name || tc.name || '';
        if (isToolSafe(name)) {
          toolsForAutoExecution.push(tc);
        } else {
          toolsRequiringApproval.push(tc);
        }
      }
    } else {
      toolsRequiringApproval = validToolCalls;
    }

    console.log('🔧 [useChatFactory] Tool grouping:', {
      toolsRequiringApproval: toolsRequiringApproval.length,
      toolsForAutoExecution: toolsForAutoExecution.length,
      toolApprovalMode,
    });

    // Handle tools requiring approval, passing the owning message ID
    // so the ToolPrompt is attached to the correct message deterministically.
    if (toolsRequiringApproval.length > 0) {
      await processToolsWithApproval(toolsRequiringApproval, toolResults, toolErrors, message.id);
    }

    // Handle auto-execution tools
    if (toolsForAutoExecution.length > 0) {
      console.log('🔧 [useChatFactory] Processing tools for auto-execution');
      await processToolsAutomatically(toolsForAutoExecution, toolResults, toolErrors);
    }

    // Update chat state with tool results
    if (toolResults.length > 0 || toolErrors.length > 0) {
      updateChatStateWithToolResults(message, toolResults, toolErrors);
    }

    // Send tool results (and/or errors) back to the AI provider so it can
    // continue the conversation. This must fire even when ALL tools failed
    // (toolResults empty, toolErrors non-empty) — otherwise the AI never
    // learns about the failure and the conversation hangs silently.
    if (toolResults.length > 0 || toolErrors.length > 0) {
      try {
        const consolidatedResults = consolidateToolResults(toolResults, toolErrors);

        // Insert a Processing... placeholder so the UI shows the "thinking" indicator
        // while we wait for the AI's follow-up response.
        const thinkingPlaceholderId = reactory.utils.uuid();
        setChatState((prevState) => ({
          ...prevState,
          history: [
            ...prevState.history,
            {
              id: thinkingPlaceholderId,
              role: 'assistant',
              content: 'Processing...',
              timestamp: new Date(),
              sessionId: prevState.id,
            } as any,
          ],
          updated: new Date(),
        }));

        const aiResponse = await sendToolResultsToAI(consolidatedResults, toolResults, toolErrors, thinkingPlaceholderId);

        // Check if the AI response contains new tool calls and recursively process them.
        // Since sendToolResultsToAI uses streamingMode: NONE, tool_calls come back
        // in the GraphQL response (not via SSE).
        const responseToolCalls = (aiResponse as any)?.tool_calls || [];
        if (responseToolCalls.length > 0) {
          // sendToolResultsToAI already added the aiResponse (with tool_calls) to the
          // chat history by replacing the Processing... placeholder. But React batches
          // state updates, so onToolCallPrompt may not see it yet. Yield to let React
          // flush before the recursive call searches history for the approval target.
          await new Promise(resolve => setTimeout(resolve, 50));

          const followUpMessage = {
            id: (aiResponse as any)?.id || reactory.utils.uuid(),
            role: 'assistant' as const,
            content: (aiResponse as any)?.content || '',
            thinking: (aiResponse as any)?.thinking,
            timestamp: new Date(),
            sessionId: chatState.id,
            tool_calls: responseToolCalls,
          } as UXChatMessage;

          const recursiveResults = await processToolCallsMemoized(responseToolCalls, followUpMessage, depth + 1);
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
  }, [
    // Use specific primitive dependencies instead of entire chatState object
    chatState.toolApprovalMode,
    chatState.id,
    processToolsWithApproval,
    processToolsAutomatically,
    updateChatStateWithToolResults,
    consolidateToolResults,
    sendToolResultsToAI
  ]);

  // Keep the ref in sync so onToolCallReceived always calls the latest version
  processToolCallsRef.current = processToolCallsMemoized;

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
    pinUserFileForChat,
    unpinUserFileForChat,
    pinFolderForChat,
    unpinFolderForChat,
    sendAudio,
    isInitialized,
    isStreaming: (sse as any).isStreaming,
    currentStreamingMessage: (sse as any).currentStreamingMessage,
    setChatState,
    modelOverride,
    setModelOverride: handleModelChange,
    setMaxToolIterations,
    continueToolExecution,
    toolIterationLimitInfo,
    clearToolIterationLimitInfo: () => setToolIterationLimitInfo(null),
    // Network status
    networkStatus,
    networkError,
    reconnectAttempt: networkReconnectAttempt,
    retryConnection,
    dismissNetworkError,
    // Debug helpers
    protectCriticalState,
    validateChatState,
    setChatStateWithValidation,
    // SSE session controls (for DebugPanel)
    sseConnected: sse.connected,
    sseIsReconnecting: sse.isReconnecting,
    sseDisconnect: sse.disconnect,
    sseReconnect: () => {
      if (!chatState?.id) return;
      sse.disconnect();
      graph.sendMessage({
        message: '',
        personaId: persona.id,
        chatSessionId: chatState.id,
        streamingMode: 'SSE',
        continueAfterTools: true,
      }).then((resp: any) => {
        if (resp?.__typename === 'ReactorInitiateSSE') {
          sse.connect({
            endpoint: resp.endpoint,
            sessionId: resp.sessionId,
            headers: resp.headers,
          });
          reactory.log(`DebugPanel: SSE re-established for session ${chatState.id}`);
        }
      }).catch((err: any) => {
        reactory.log(`DebugPanel: Failed to re-establish SSE: ${err?.message}`, {}, 'warning');
      });
    },
    rateMessage: async (messageId: string, rating: number) => {
      // graph.rateMessage(messageId, rating).catch((err) => {
      //   reactory.error(`Error rating message ${messageId} with rating ${rating}`, err);
      // });
    }
  }
};

export default useChatFactory;