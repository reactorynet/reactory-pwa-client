import React, { useState, useCallback, useRef, useEffect } from 'react';
import { IAIPersona, ReactorConversationHistory, ChatState, ToolApprovalMode } from '@reactory/client-core/components/shared/ReactorChat/types';
import Reactory from '@reactory/reactory-core';
import { gql } from '@apollo/client';

export interface StreamingChatFactoryHookOptions {
  reactory: Reactory.Client.ReactorySDK;
  persona?: IAIPersona | null;
  protocol?: 'sse' | 'websocket';
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
}

export interface StreamingChatFactoryHookResult {
  chatState: ChatState;
  initializeChat: (persona: IAIPersona) => Promise<string>;
  sendMessage: (message: string, options?: any) => Promise<void>;
  sendAudio: (audio: Blob, options?: any) => Promise<void>;
  uploadFile: (file: File, options?: any) => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  newChat: () => Promise<void>;
  closeChat: () => Promise<void>;
  listChats: () => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  setChats: (chats: ChatState[]) => Promise<void>;
  setToolApprovalMode: (toolApprovalMode: ToolApprovalMode) => Promise<void>;
  chats: ChatState[];
  isStreaming: boolean;
  currentStreamingMessage: string;
  isInitialized: boolean;
  busy: boolean;
}

export type StreamingChatFactoryHook = (options: StreamingChatFactoryHookOptions) => StreamingChatFactoryHookResult;

// GraphQL mutations for streaming chat
const INITIALIZE_CHAT_MUTATION = gql`
  mutation ReactorStartChatSession($initSession: ReactorStartChatInput!) {
    ReactorStartChatSession(initSession: $initSession) {
      ... on ReactorChatSession {
        id
        botId
        persona {
          id
          name
          description
          avatar
          provider
        }
        started
        history {
          id
          message
          sender
          timestamp
          messageType
          metadata
        }
        vars
        tools
        macros
      }
      ... on ReactorError {
        message
        type
        code
        details
      }
    }
  }
`;

const SEND_MESSAGE_MUTATION = gql`
  mutation ReactorSendMessage($message: ReactorSendMessageInput!) {
    ReactorSendMessage(message: $message) {
      ... on ReactorChatMessage {
        id
        message
        sender
        timestamp
        messageType
        metadata
      }
      ... on ReactorChatSession {
        id
        botId
        persona {
          id
          name
          description
          avatar
          provider
        }
        started
        history {
          id
          message
          sender
          timestamp
          messageType
          metadata
        }
        vars
        tools
        macros
      }
      ... on ReactorStreamingResponse {
        sessionId
        messageId
        streamingUrl
        protocol
      }
      ... on ReactorError {
        message
        type
        code
        details
      }
    }
  }
`;

const CLOSE_CHAT_MUTATION = gql`
  mutation ReactorCloseChat($sessionId: String!) {
    ReactorCloseChat(sessionId: $sessionId) {
      ... on ReactorSuccess {
        message
        data
      }
      ... on ReactorError {
        message
        type
        code
        details
      }
    }
  }
`;

const useStreamingChatFactory: StreamingChatFactoryHook = ({
  reactory,
  persona,
  protocol = 'sse',
  onMessage,
  onError
}) => {
  const [chatState, setChatState] = useState<ChatState>({
    id: undefined,
    botId: persona?.id || '',
    persona: persona || {} as IAIPersona,
    started: new Date(),
    history: [] as ReactorConversationHistory,
    vars: {},
    tools: [],
    macros: [],
    sendMessage: async () => {}
  });
  
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [chats, _setChats] = useState<ChatState[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  // SSE connection ref
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamingSessionRef = useRef<string | null>(null);
  const connectionAttempts = useRef<number>(0);

  // Handle SSE message events
  const handleSSEMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      // Only log on significant events, not every token to prevent log spam
      if (data.type !== 'token') {
        reactory.debug('StreamingChatFactory: Received SSE event', data);
      }
      
      switch (data.type) {
        case 'token':
          // Append token to current streaming message
          setCurrentStreamingMessage(prev => prev + data.data.token);
          break;
          
        case 'tool_call':
          // Handle tool call events
          reactory.debug('StreamingChatFactory: Tool call', data.data);
          break;
          
        case 'complete': {
          // Message streaming complete
          setIsStreaming(false);
          
          // Add completed message to chat history
          const completedMessage = {
            id: data.data.messageId || `msg_${Date.now()}`,
            message: currentStreamingMessage,
            sender: 'assistant',
            timestamp: new Date(),
            messageType: 'response' as const,
            metadata: data.data.metadata || {}
          };
          
          // @ts-ignore
          setChatState(prev => ({
            ...prev,
            history: [...prev.history, completedMessage]
          }));
          
          // Clear streaming message
          setCurrentStreamingMessage('');
          
          // Call onMessage callback
          if (onMessage) {
            onMessage(completedMessage);
          }
          break;
        }
          
        case 'error': {
          // Handle streaming errors
          setIsStreaming(false);
          setCurrentStreamingMessage('');
          const error = {
            message: data.data.message || 'Streaming error occurred',
            type: data.data.type || 'STREAMING_ERROR',
            code: data.data.code || 'SSE_ERROR'
          };
          
          if (onError) {
            onError(error);
          }
          break;
        }
          
        default:
          reactory.debug('StreamingChatFactory: Unknown SSE event type', data.type);
      }
    } catch (error) {
      reactory.error('StreamingChatFactory: Error parsing SSE data', error);
      if (onError) {
        onError({ message: 'Failed to parse streaming data', type: 'PARSE_ERROR' });
      }
    }
  }, [reactory, currentStreamingMessage, onMessage, onError]);

  // Initialize chat session
  const initializeChat = useCallback(async (persona: IAIPersona): Promise<string> => {
    try {
      const response = await reactory.graphqlMutation<{
        ReactorStartChatSession: any
      }, {
        initSession: {
          personaId: string;
          context?: any;
          streamingMode?: string;
        }
      }>(INITIALIZE_CHAT_MUTATION, {
        initSession: {
          personaId: persona.id,
          context: {},
          streamingMode: protocol.toUpperCase()
        }
      });

      const result = response.data?.ReactorStartChatSession;
      
      if (result?.__typename === 'ReactorChatSession') {
        // Update chat state with session data
        setChatState(prev => ({
          ...prev,
          id: result.id,
          botId: result.botId,
          persona: result.persona,
          started: new Date(result.started),
          history: result.history || [],
          vars: result.vars || {},
          tools: result.tools || [],
          macros: result.macros || []
        }));
        
        setIsInitialized(true);
        streamingSessionRef.current = result.id;
        
        return result.id;
      } else if (result?.__typename === 'ReactorError') {
        throw new Error(result.message);
      } else {
        throw new Error('Failed to initialize chat session');
      }
    } catch (error) {
      reactory.error('StreamingChatFactory: Failed to initialize chat', error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [reactory, protocol, onError]);

  // Send message with streaming support
  const sendMessage = useCallback(async (message: string, options: any = {}) => {
    if (!chatState.id) {
      throw new Error('Chat session not initialized');
    }

    try {
      // Add user message to history immediately
      const userMessage = {
        id: `user_${Date.now()}`,
        message,
        sender: 'user',
        timestamp: new Date(),
        messageType: 'message' as const,
        metadata: {}
      };

      // @ts-ignore
      setChatState(prev => ({
        ...prev,
        history: [...prev.history, userMessage]
      }));

      // Send message via GraphQL mutation
      const response = await reactory.graphqlMutation<{
        ReactorSendMessage: any
      }, {
        message: {
          sessionId: string;
          message: string;
          messageType?: string;
          metadata?: any;
          streamingMode?: string;
        }
      }>(SEND_MESSAGE_MUTATION, {
        message: {
          sessionId: chatState.id,
          message,
          messageType: 'message',
          metadata: options.metadata || {},
          streamingMode: protocol.toUpperCase()
        }
      });

      const result = response.data?.ReactorSendMessage;
      
      if (result?.__typename === 'ReactorStreamingResponse') {
        // Start streaming
        setIsStreaming(true);
        setCurrentStreamingMessage('');
        
        if (protocol === 'sse' && result.streamingUrl) {
          // Prevent multiple simultaneous connections
          if (isConnecting) {
            reactory.log('StreamingChatFactory: Connection already in progress, skipping', 'warn');
            return;
          }
          
          setIsConnecting(true);
          connectionAttempts.current += 1;
          
          // Close existing connection
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
          }
          
          // Create new SSE connection with proper configuration
          // Add query params to prevent WebSocket upgrade
          const sseUrl = new URL(result.streamingUrl);
          sseUrl.searchParams.set('transport', 'sse');
          sseUrl.searchParams.set('no-upgrade', 'true');
          
          reactory.log(`StreamingChatFactory: Creating SSE connection to ${sseUrl.toString()}`, 'info');
          
          const eventSource = new EventSource(sseUrl.toString());
          
          eventSource.onopen = () => {
            reactory.log('StreamingChatFactory: SSE connection opened', 'info');
            setIsConnecting(false);
            connectionAttempts.current = 0;
          };
          
          eventSource.onmessage = handleSSEMessage;
          
          eventSource.onerror = (error) => {
            reactory.log(`StreamingChatFactory: SSE error - ${error.type}`, 'error');
            setIsStreaming(false);
            setIsConnecting(false);
            
            // Clean up the connection
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
            
            if (onError) {
              onError({ message: 'Streaming connection error', type: 'SSE_ERROR' });
            }
          };
          
          eventSourceRef.current = eventSource;
        }
      } else if (result?.__typename === 'ReactorChatMessage') {
        // Non-streaming response
        // @ts-ignore
        setChatState(prev => ({
          ...prev,
          history: [...prev.history, {
            id: result.id,
            message: result.message,
            sender: result.sender,
            timestamp: new Date(result.timestamp),
            messageType: result.messageType,
            metadata: result.metadata || {}
          }]
        }));
        
        if (onMessage) {
          onMessage(result);
        }
      } else if (result?.__typename === 'ReactorError') {
        throw new Error(result.message);
      }
    } catch (error) {
      reactory.error('StreamingChatFactory: Failed to send message', error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [chatState.id, reactory, protocol, handleSSEMessage, onMessage, onError]);

  const sendAudio = useCallback(async (audio: Blob, chatSessionId: string) => {
    try {
      // Initialize chat session on first audio message if not already initialized
      let sessionId = chatState.id || chatSessionId;
      
      if (!isInitialized && persona?.id) {
        reactory.log(`StreamingChatFactory: Initializing chat session on first audio message with persona ${persona.id}`, 'info');
        try {
          const newSessionId = await initializeChat(persona);
          setIsInitialized(true);
          sessionId = newSessionId; // Use the session ID from initialization
        } catch (error) {
          if (onError) {
            onError(error);
          }
          return;
        }
      }

      if (!sessionId) {
        throw new Error('No active chat session available');
      }

      const response = await reactory.graphqlMutation<any, { audio: Blob, chatSessionId: string }>(
        gql`
          mutation ReactorAskQuestionAudio($audio: Upload!, $chatSessionId: String!) {
            ReactorAskQuestionAudio(audio: $audio, chatSessionId: $chatSessionId) {
              ... on ReactorChatMessage {
                id
                content
                role
                timestamp
                sessionId
              }
              ... on ReactorErrorResponse {
                message
                type
                code
              }
            }
          }
        `,
        { audio, chatSessionId: sessionId }
      );

      const result = response?.data?.ReactorAskQuestionAudio;
      if (result) {
        if (result.__typename === 'ReactorErrorResponse') {
          throw new Error(result.message);
        } else if (onMessage) {
          onMessage(result);
        }
      }
    } catch (error) {
      reactory.log(`StreamingChatFactory: Error sending audio - ${error.message}`, 'error');
      if (onError) {
        onError(error);
      }
    }
  }, [chatState.id, isInitialized, persona, initializeChat, reactory, onMessage, onError]);

  const uploadFile = useCallback(async (file: File, chatSessionId: string) => {
    try {
      // Initialize chat session on first file upload if not already initialized
      let sessionId = chatState.id || chatSessionId;
      
      if (!isInitialized && persona?.id) {
        reactory.log(`StreamingChatFactory: Initializing chat session on first file upload with persona ${persona.id}`, 'info');
        try {
          const newSessionId = await initializeChat(persona);
          setIsInitialized(true);
          sessionId = newSessionId; // Use the session ID from initialization
        } catch (error) {
          if (onError) {
            onError(error);
          }
          return;
        }
      }

      if (!sessionId) {
        throw new Error('No active chat session available');
      }

      const response = await reactory.graphqlMutation<any, { file: File, chatSessionId: string }>(
        gql`
          mutation ReactorAttachFile($file: Upload!, $chatSessionId: String!) {
            ReactorAttachFile(file: $file, chatSessionId: $chatSessionId) {
              ... on ReactorAttachFileResponse {
                message
                fileId
                filename
                mimeType
                size
              }
              ... on ReactorErrorResponse {
                message
                type
                code
              }
            }
          }
        `,
        { file, chatSessionId: sessionId }
      );

      const result = response?.data?.ReactorAttachFile;
      if (result) {
        if (result.__typename === 'ReactorErrorResponse') {
          throw new Error(result.message);
        } else if (onMessage) {
          onMessage({
            id: reactory.utils.uuid(),
            timestamp: new Date(),
            role: "assistant",
            content: `File uploaded: ${result.filename} (${result.size} bytes)`,
            sessionId: sessionId,
          });
        }
      }
    } catch (error) {
      reactory.log(`StreamingChatFactory: Error uploading file - ${error.message}`, 'error');
      if (onError) {
        onError(error);
      }
    }
  }, [chatState.id, isInitialized, persona, initializeChat, reactory, onMessage, onError]);

  const loadChat = useCallback(async (chatId: string) => {
    // TODO: Implement chat loading
    console.log('loadChat', chatId);
  }, []);


  const setToolApprovalMode = useCallback(async (toolApprovalMode: ToolApprovalMode) => {
    try {
      // Initialize chat session on first tool approval mode change if not already initialized
      let sessionId = chatState.id;
      
      if (!isInitialized && persona?.id) {
        reactory.log(`StreamingChatFactory: Initializing chat session on tool approval mode change with persona ${persona.id}`, 'info');
        try {
          const newSessionId = await initializeChat(persona);
          setIsInitialized(true);
          sessionId = newSessionId; // Use the session ID from initialization
        } catch (error) {
          if (onError) {
            onError(error);
          }
          return;
        }
      }

      if (!sessionId) {
        throw new Error('No active chat session available');
      }

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
          { mode: toolApprovalMode, chatSessionId: sessionId }
        );

      if (response?.data?.ReactorSetChatToolApprovalMode) {
        setChatState((prevState) => ({
          ...prevState,
          toolApprovalMode: response.data.ReactorSetChatToolApprovalMode.toolApprovalMode,
        }));

        if (onMessage) {
          onMessage({
            id: reactory.utils.uuid(),
            timestamp: new Date(),
            role: "assistant",
            content: `Tool approval mode set to ${toolApprovalMode}`,
            sessionId: sessionId,
          });
        }
      } else {
        throw new Error('Failed to set tool approval mode');
      }
    } catch (error) {
      reactory.log(`StreamingChatFactory: Error setting tool approval mode - ${error.message}`, 'error');
      if (onError) {
        onError(error);
      }
    }
  }, [chatState.id, isInitialized, persona, initializeChat, reactory, onMessage, onError]);

  const listChats = useCallback(async () => {
    // TODO: Implement chat listing
    console.log('listChats');
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    // TODO: Implement chat deletion
    console.log('deleteChat', chatId);
  }, []);

  const setChats = useCallback(async (chats: ChatState[]) => {
    // TODO: Implement chat setting
    _setChats(chats);
    console.log('setChats', chats);
  }, []);

  // Create new chat session
  const newChat = useCallback(async () => {
    // Reset chat state for new conversation
    setChatState({
      id: undefined,
      botId: persona?.id || '',
      persona: persona || {} as IAIPersona,
      started: new Date(),
      history: [] as ReactorConversationHistory,
      vars: {},
      tools: [],
      macros: [],
      sendMessage: async () => {}
    });
    
    setIsInitialized(false);
    setCurrentStreamingMessage('');
    setIsStreaming(false);
    
    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, [persona]);

  // Close chat session
  const closeChat = useCallback(async () => {
    if (chatState.id) {
      try {
        await reactory.graphqlMutation(CLOSE_CHAT_MUTATION, {
          sessionId: chatState.id
        });
      } catch (error) {
        reactory.error('StreamingChatFactory: Failed to close chat', error);
      }
    }
    
    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Reset state
    setIsInitialized(false);
    setIsStreaming(false);
    setCurrentStreamingMessage('');
    streamingSessionRef.current = null;
  }, [chatState.id, reactory]);

  // Cleanup on unmount or persona change
  useEffect(() => {
    return () => {
      // Clean up SSE connection
      if (eventSourceRef.current) {
        reactory.log('StreamingChatFactory: Cleaning up SSE connection on unmount', 'info');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Reset connection state
      setIsConnecting(false);
      setIsStreaming(false);
      connectionAttempts.current = 0;
    };
  }, [reactory]);

  // Update sendMessage in chatState
  useEffect(() => {
    setChatState(prev => ({
      ...prev,
      sendMessage
    }));
  }, [sendMessage]);

  return {
    chatState,
    initializeChat,
    sendMessage,
    sendAudio,
    uploadFile,
    loadChat,
    listChats,
    setToolApprovalMode,
    deleteChat,
    setChats,
    newChat,
    closeChat,
    chats,
    isStreaming,
    currentStreamingMessage,
    isInitialized,
    busy: isStreaming || !isInitialized
  };
};

export default useStreamingChatFactory;
