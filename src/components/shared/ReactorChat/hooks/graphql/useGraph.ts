import { gql } from "@apollo/client";
import Reactory from "@reactorynet/reactory-core";
import {
  ChatState,
  ToolApprovalMode,
  UXChatMessage,
} from "@reactory/client-core/components/shared/ReactorChat/types";

// Prefer colocated .graphql documents; keep fallbacks here in case loaders aren't configured
// Mutations
import REACTOR_START_CHAT_SESSION from "./mutations/ReactorStartChatSession.graphql";

// Queries
import REACTOR_CONVERSATION_QUERY from "./queries/ReactorConversation.graphql";
import REACTOR_CONVERSATIONS_QUERY from "./queries/ReactorConversations.graphql";
import REACTOR_SEND_MESSAGE from "./mutations/ReactorSendMessage.graphql";
import REACTOR_SET_TOOL_APPROVAL_MODE from "./mutations/ReactorSetChatToolApprovalMode.graphql";
import REACTOR_ATTACH_FILE from "./mutations/ReactorAttachFile.graphql";
import REACTOR_ASK_AUDIO from "./mutations/ReactorAskQuestionAudio.graphql";
import REACTOR_DELETE_CHAT from "./mutations/ReactorDeleteChatSession.graphql";
import REACTOR_EXECUTE_MACRO from "./mutations/ReactorExecuteMacro.graphql";
import REACTOR_EXECUTE_TOOL from "./mutations/ReactorExecuteTool.graphql";
import REACTOR_SET_MODEL_PROVIDER from "./mutations/ReactorSetChatModelProvider.graphql";
import REACTOR_START_VOICE_SESSION from "./mutations/ReactorStartVoiceSession.graphql";
import REACTOR_END_VOICE_SESSION from "./mutations/ReactorEndVoiceSession.graphql";
import REACTOR_SEND_VOICE_MESSAGE from "./mutations/ReactorSendVoiceMessage.graphql";
import REACTOR_SET_MAX_TOOL_ITERATIONS from "./mutations/ReactorSetChatMaxToolIterations.graphql";
import REACTOR_CONTINUE_TOOL_EXECUTION from "./mutations/ReactorContinueToolExecution.graphql";
import REACTOR_ATTACH_USER_FILE from "./mutations/ReactorAttachUserFileToSession.graphql";
import REACTOR_DETACH_USER_FILE from "./mutations/ReactorDetachUserFileFromSession.graphql";
import REACTOR_PIN_FOLDER from "./mutations/ReactorPinFolderToSession.graphql";
import REACTOR_UNPIN_FOLDER from "./mutations/ReactorUnpinFolderFromSession.graphql";
import REACTOR_SESSION_LOG from "./mutations/ReactorSessionLog.graphql";

export type StreamingMode = "NONE" | "SSE" | "WEBSOCKET";

export interface ReactorInitSessionInput {
  personaId: string;
  message?: string;
  systemPrompt?: string;
  streamingMode?: StreamingMode;
  promptMergeStrategy?: "append" | "prepend" | "replace";
  macros?: any[];
  tools?: any[];
  toolApprovalMode?: ToolApprovalMode;
  /** Optional session ID to load context from for cross-agent context sharing */
  contextFromSessionId?: string;
  modelId?: string;
  providerId?: string;
}

export type ReactorChatResponse =
  | ({ __typename: "ReactorChatMessage" } & UXChatMessage)
  | ({ __typename: "ReactorInitiateSSE" } & {
      sessionId: string;
      endpoint: string;
      token?: string;
      status?: string;
      expiry?: Date;
      headers?: any;
    })
  | ({ __typename: "ReactorErrorResponse" } & {
      code: string;
      message: string;
      details?: any;
      timestamp?: Date;
      recoverable?: boolean;
      suggestion?: string;
    });

export type ReactorInitChatResponse =
  | ({ __typename: "ReactorChatState" } & Partial<ChatState>)
  | ({ __typename: "ReactorInitiateSSE" } & {
      sessionId: string;
      endpoint: string;
      token?: string;
      status?: string;
      expiry?: Date;
      headers?: any;
    })
  | ({ __typename: "ReactorErrorResponse" } & {
      code: string;
      message: string;
      details?: any;
      timestamp?: Date;
      recoverable?: boolean;
      suggestion?: string;
    });

export interface ReactorSendMessageInput {
  personaId: string;
  chatSessionId?: string;
  message: string;
  streamingMode?: StreamingMode;
  role?: string;
  tool_call_id?: string;
  modelId?: string;
  providerId?: string;
  /** When true, skip persisting the message — tool results are already in history from executeMacro */
  continueAfterTools?: boolean;
  /** Optional base64 image data URLs for vision-capable models */
  images?: string[];
}

// --- Voice session types ---

export interface StartVoiceSessionInput {
  personaId: string;
  message?: string;
  ttsEnabled?: boolean;
  sttEnabled?: boolean;
  voice?: string;
  sttLanguage?: string;
  chatSessionId?: string;
}

export interface VoiceMessageInput {
  chatSessionId: string;
  personaId: string;
  synthesizeResponse?: boolean;
  voice?: string;
}

export type VoiceSessionResult =
  | ({ __typename: "ReactorVoiceSession" } & {
      chatSessionId: string;
      personaId: string;
      ttsEnabled: boolean;
      sttEnabled: boolean;
      voice?: string;
      sttLanguage?: string;
      ttsStreamUrl?: string;
      sttStreamUrl?: string;
      created?: Date;
    })
  | ({ __typename: "ReactorErrorResponse" } & {
      code: string;
      message: string;
      details?: any;
      timestamp?: Date;
      recoverable?: boolean;
      suggestion?: string;
    });

export type VoiceChatResult =
  | ({ __typename: "ReactorVoiceChatMessage" } & {
      sessionId: string;
      content?: string;
      role?: string;
      audioBase64?: string;
      audioFormat?: string;
      audioDuration?: number;
      timestamp?: Date;
    })
  | ({ __typename: "ReactorErrorResponse" } & {
      code: string;
      message: string;
      details?: any;
      timestamp?: Date;
      recoverable?: boolean;
      suggestion?: string;
    });

export interface UseGraphOptions {
  reactory: Reactory.Client.ReactorySDK;
}

import { useMemo } from 'react';

const useGraph = ({ reactory }: UseGraphOptions) => {
  const startChatSession = async (
    initSession: ReactorInitSessionInput
  ): Promise<ReactorInitChatResponse> => {
    const response = await reactory.graphqlMutation<
      { ReactorStartChatSession: ReactorInitChatResponse },
      { initSession: ReactorInitSessionInput }
    >(REACTOR_START_CHAT_SESSION as any, { initSession });

    return response?.data?.ReactorStartChatSession as ReactorInitChatResponse;
  };

  const sendMessage = async (
    message: ReactorSendMessageInput
  ): Promise<ReactorChatResponse> => {
    const response = await reactory.graphqlMutation<
      { ReactorSendMessage: ReactorChatResponse },
      { message: ReactorSendMessageInput }
    >(REACTOR_SEND_MESSAGE as any, { message });
    return response?.data?.ReactorSendMessage as ReactorChatResponse;
  };

  const setChatToolApprovalMode = async (
    chatSessionId: string,
    mode: ToolApprovalMode
  ): Promise<Pick<ChatState, "id" | "toolApprovalMode">> => {
    const response = await reactory.graphqlMutation<
      { ReactorSetChatToolApprovalMode: Pick<ChatState, "id" | "toolApprovalMode"> },
      { chatSessionId: string; mode: ToolApprovalMode }
    >(REACTOR_SET_TOOL_APPROVAL_MODE as any, { chatSessionId, mode });
    return response.data.ReactorSetChatToolApprovalMode;
  };

  const setChatMaxToolIterations = async (
    chatSessionId: string,
    maxToolIterations: number
  ): Promise<Pick<ChatState, "id" | "maxToolIterations">> => {
    const response = await reactory.graphqlMutation<
      { ReactorSetChatMaxToolIterations: Pick<ChatState, "id" | "maxToolIterations"> },
      { chatSessionId: string; maxToolIterations: number }
    >(REACTOR_SET_MAX_TOOL_ITERATIONS as any, { chatSessionId, maxToolIterations });
    return response.data.ReactorSetChatMaxToolIterations;
  };

  const continueToolExecution = async (
    chatSessionId: string,
    personaId: string,
    maxToolIterations?: number,
    streamingMode?: StreamingMode,
  ): Promise<ReactorChatResponse> => {
    const response = await reactory.graphqlMutation<
      { ReactorContinueToolExecution: ReactorChatResponse },
      { chatSessionId: string; personaId: string; maxToolIterations?: number; streamingMode?: StreamingMode }
    >(REACTOR_CONTINUE_TOOL_EXECUTION as any, { chatSessionId, personaId, maxToolIterations, streamingMode });
    return response?.data?.ReactorContinueToolExecution as ReactorChatResponse;
  };

  const attachFile = async (
    file: File,
    chatSessionId: string
  ): Promise<ReactorChatResponse> => {
    const response = await reactory.graphqlMutation<
      { ReactorAttachFile: ReactorChatResponse },
      { file: File; chatSessionId: string }
    >(REACTOR_ATTACH_FILE as any, { file, chatSessionId });
    return response?.data?.ReactorAttachFile as ReactorChatResponse;
  };

  const askQuestionAudio = async (
    audio: Blob,
    chatSessionId: string
  ): Promise<ReactorChatResponse> => {
    const response = await reactory.graphqlMutation<
      { ReactorAskQuestionAudio: ReactorChatResponse },
      { audio: Blob; chatSessionId: string }
    >(REACTOR_ASK_AUDIO as any, { audio, chatSessionId });
    return response?.data?.ReactorAskQuestionAudio as ReactorChatResponse;
  };

  const deleteChatSession = async (id: string | string[]): Promise<boolean> => {
    const response = await reactory.graphqlMutation<
      { ReactorDeleteChatSession: boolean },
      { id: string | string[] }
    >(REACTOR_DELETE_CHAT as any, { id });
    return response?.data?.ReactorDeleteChatSession ?? false;
  };

  const getConversation = async (
    id: string,
    loadOptions?: { showAllFiles?: boolean }
  ): Promise<ChatState | ReactorInitChatResponse> => {
    const response = await reactory.graphqlQuery<
      { ReactorConversation: any },
      { id: string; loadOptions?: { showAllFiles?: boolean } }
    >(REACTOR_CONVERSATION_QUERY as any, { id, loadOptions });
    return response?.data?.ReactorConversation;
  };

  const listConversations = async (
    filter: { personaId?: string; userId?: string; modelId?: string }
  ): Promise<ChatState[]> => {
    const response = await reactory.graphqlQuery<
      { ReactorConversations: ChatState[] },
      { filter: { personaId?: string; userId?: string; modelId?: string } }
    >(REACTOR_CONVERSATIONS_QUERY as any, { filter });
    return response?.data?.ReactorConversations ?? [];
  };

  const executeMacro = async (
    macroInput: {
      macro: string;
      personaId: string;
      chatSessionId: string;
      calledBy?: string;
      callId?: string;
      args?: any;
    }
  ): Promise<ReactorChatResponse> => {
    const response = await reactory.graphqlMutation<
      { ReactorExecuteMacro: ReactorChatResponse },
      { macroInput: typeof macroInput }
    >(REACTOR_EXECUTE_MACRO as any, { macroInput });
    return response?.data?.ReactorExecuteMacro as ReactorChatResponse;
  };

  const executeTool = async (
    toolInput: { tool: string; personaId: string; chatSessionId: string; callId?: string; args?: any }
  ): Promise<ReactorChatResponse> => {
    const response = await reactory.graphqlMutation<
      { ReactorExecuteTool: ReactorChatResponse },
      { tool: string; personaId: string; chatSessionId: string; callId?: string; args?: any }
    >(REACTOR_EXECUTE_TOOL as any, toolInput);
    return response?.data?.ReactorExecuteTool as ReactorChatResponse;
  };

  // --- Voice session operations ---

  const startVoiceSession = async (
    input: StartVoiceSessionInput
  ): Promise<VoiceSessionResult> => {
    const response = await reactory.graphqlMutation<
      { ReactorStartVoiceSession: VoiceSessionResult },
      { input: StartVoiceSessionInput }
    >(REACTOR_START_VOICE_SESSION as any, { input });
    return response?.data?.ReactorStartVoiceSession as VoiceSessionResult;
  };

  const endVoiceSession = async (
    chatSessionId: string
  ): Promise<boolean> => {
    const response = await reactory.graphqlMutation<
      { ReactorEndVoiceSession: boolean },
      { chatSessionId: string }
    >(REACTOR_END_VOICE_SESSION as any, { chatSessionId });
    return response?.data?.ReactorEndVoiceSession ?? false;
  };

  const sendVoiceMessage = async (
    audio: Blob,
    input: VoiceMessageInput
  ): Promise<VoiceChatResult> => {
    const response = await reactory.graphqlMutation<
      { ReactorSendVoiceMessage: VoiceChatResult },
      { audio: Blob; input: VoiceMessageInput }
    >(REACTOR_SEND_VOICE_MESSAGE as any, { audio, input });
    return response?.data?.ReactorSendVoiceMessage as VoiceChatResult;
  };

  const setChatModelProvider = async (
    chatSessionId: string,
    modelId?: string,
    providerId?: string
  ): Promise<any> => {
    const response = await reactory.graphqlMutation<
      { ReactorSetChatModelProvider: any },
      { chatSessionId: string; modelId?: string; providerId?: string }
    >(REACTOR_SET_MODEL_PROVIDER as any, { chatSessionId, modelId, providerId });
    return response?.data?.ReactorSetChatModelProvider;
  };

  const attachUserFileToSession = async (params: {
    sessionId: string;
    fileId: string;
    path: string;
    description?: string;
    referenceOnly?: boolean;
  }) => {
    const response = await reactory.graphqlMutation<
      { ReactorAttachUserFileToSession: any },
      { params: typeof params }
    >(REACTOR_ATTACH_USER_FILE as any, { params });
    return response?.data?.ReactorAttachUserFileToSession;
  };

  const detachUserFileFromSession = async (params: {
    sessionId: string;
    fileId: string;
    path: string;
    delete?: boolean;
  }) => {
    const response = await reactory.graphqlMutation<
      { ReactorDetachUserFileFromSession: any },
      { params: typeof params }
    >(REACTOR_DETACH_USER_FILE as any, { params });
    return response?.data?.ReactorDetachUserFileFromSession;
  };

  const pinFolderToSession = async (params: {
    sessionId: string;
    path: string;
    name: string;
  }) => {
    const response = await reactory.graphqlMutation<
      { ReactorPinFolderToSession: any },
      { params: typeof params }
    >(REACTOR_PIN_FOLDER as any, { params });
    return response?.data?.ReactorPinFolderToSession;
  };

  const unpinFolderFromSession = async (params: {
    sessionId: string;
    path: string;
    name: string;
  }) => {
    const response = await reactory.graphqlMutation<
      { ReactorUnpinFolderFromSession: any },
      { params: typeof params }
    >(REACTOR_UNPIN_FOLDER as any, { params });
    return response?.data?.ReactorUnpinFolderFromSession;
  };

  const sendSessionLog = async (
    chatSessionId: string,
    entries: Array<{
      level: string;
      message: string;
      meta?: Record<string, unknown>;
      timestamp: Date | string;
      source?: string;
    }>
  ): Promise<{ accepted: number; dropped: number }> => {
    const response = await reactory.graphqlMutation<
      { ReactorSessionLog: { accepted: number; dropped: number } },
      { input: { chatSessionId: string; entries: typeof entries } }
    >(REACTOR_SESSION_LOG as any, { input: { chatSessionId, entries } });
    return response?.data?.ReactorSessionLog ?? { accepted: 0, dropped: 0 };
  };

  return useMemo(() => ({
    startChatSession,
    sendMessage,
    setChatToolApprovalMode,
    setChatMaxToolIterations,
    continueToolExecution,
    setChatModelProvider,
    attachFile,
    askQuestionAudio,
    deleteChatSession,
    getConversation,
    listConversations,
    executeMacro,
    executeTool,
    startVoiceSession,
    endVoiceSession,
    sendVoiceMessage,
    attachUserFileToSession,
    detachUserFileFromSession,
    pinFolderToSession,
    unpinFolderFromSession,
    sendSessionLog,
  }), [reactory]);
};

export default useGraph;
