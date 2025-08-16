import { gql } from "@apollo/client";
import Reactory from "@reactory/reactory-core";
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
}

export interface UseGraphOptions {
  reactory: Reactory.Client.ReactorySDK;
}

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
    toolInput: any
  ): Promise<ReactorChatResponse> => {
    const response = await reactory.graphqlMutation<
      { ReactorExecuteTool: ReactorChatResponse },
      { toolInput: any }
    >(REACTOR_EXECUTE_TOOL as any, { toolInput });
    return response?.data?.ReactorExecuteTool as ReactorChatResponse;
  };

  return {
    startChatSession,
    sendMessage,
    setChatToolApprovalMode,
    attachFile,
    askQuestionAudio,
    deleteChatSession,
    getConversation,
    listConversations,
    executeMacro,
    executeTool,
  };
};

export default useGraph;
