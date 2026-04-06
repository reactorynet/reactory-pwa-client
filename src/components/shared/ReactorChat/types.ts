import React from "react";
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse";
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket';


export interface AIModel {
  id: string;
  name: string;
  description?: string;
} 

// Define interfaces for AI Persona
export interface IAIAppearance {
  voice?: string[];
  face?: string[];
  hair?: string[];
  body?: string[];
  clothes?: string[];
  accessories?: string[];
  metrics?: {
    height?: number;
    weight?: number;
    age?: number;
  };
  skin?: {
    color: string;
    tone: string;
  };
  background?: [
    {
      src: string;
      type: "image" | "video" | "audio";
      order: number;
      options?: {
        image?: {
          alpha?: number;
          brightness?: number;
          contrast?: number;
          blur?: number;
          grayscale?: number;
          hueRotate?: number;
          invert?: number;
          opacity?: number;
          saturate?: number;
          sepia?: number;
          chromaKey?: string;
        };
        time: {
          loop?: boolean;
          loopStart?: number;
          loopEnd?: number;
        };
        audio?: {
          volume?: number;
          mute?: boolean;
          autoplay?: boolean;
        };
        controls?: boolean;
      };
    }
  ];
}

export interface IAIPersonaPromptTemplate {
  content?: string;
  variables?: string[];
  role: "user" | "assistant" | "system";
}

export interface IAIPersona {
  id: string;
  modelId?: string;
  maxTokens?: number;
  name: string;
  description?: string;
  defaultGreeting?: string;
  persona: string;
  features: string;
  appearance?: IAIAppearance;
  prompts?: IAIPersonaPromptTemplate[]
  tools?: MacroToolDefinition[]
  avatar?: string;
  providerId?: string;
  macros?: MacroComponentDefinition<unknown>[]
}

export interface IProps {
  formData: any,
  uiSchema: Reactory.Schema.IUISchema,
  formContext: Reactory.Forms.ReactoryFormContext<any, any>,
}

export interface ChatCompletionResponseMessageStore extends OpenAI.Chat.ChatCompletionMessage {
  id: string
  rating?: number
  created: Date
  tool_results: ReactorToolResult[]
}

export type ReactorConversationHistory = UXChatMessage[]

/** Represents the current network connection status for the ReactorChat session. */
export type NetworkStatus = 'idle' | 'connected' | 'reconnecting' | 'error';

/**
 * High-level activity status of the chat session, derived from
 * busy, isStreaming, toolIterationLimitInfo, and pending tool call state.
 */
export type ChatActivityStatus =
  | 'idle'            // Awaiting user input
  | 'thinking'        // AI is processing (busy but not streaming yet)
  | 'streaming'       // AI response is being streamed
  | 'executing_tools' // Tools are being executed
  | 'paused'          // Paused at iteration limit, awaiting user decision
  | 'pending_resume'; // Loaded conversation with unfinished tool calls

// Tool approval modes
export enum ToolApprovalMode {
  AUTO = "auto",           // Execute all tools without asking
  SAFE_AUTO = "safe_auto", // Auto-approve safe tools, prompt for potentially dangerous ones
  PROMPT = "prompt",       // Ask for confirmation before executing any tool
  PLAN = "plan"            // Plan mode - agent plans before acting, tools require approval
}

export type Macro<TResult> = (params: any[], state: ChatState, reactory: Reactory.Client.ReactorySDK) => Promise<TResult>

export type MacroFunctions = {
  [macro: string]: Macro<unknown>
};

export type MacroToolDefinition = {
  type: "function",
  propsMap?: Record<string, string>,
  runat?: "server" | "client",
  roles?: string[],
  enabled?: boolean;
  /**
   * Which tool-approval modes this tool is available in.
   * Omit to make the tool available in every mode.
   */
  modes?: ToolApprovalMode[];
  /**
   * When true the tool is read-only / side-effect free and can be
   * auto-executed in safe_auto and plan modes without user approval.
   */
  safeForAutoExecution?: boolean;
  function: {
    name: string;
    description?: string;
    icon?: string;
    parameters: {
      type: "object";
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        items?: {
          type: string;
          properties?: Record<string, unknown>;
        };
      }>;
      required?: string[];
    };
  }
};

export type MacroComponentDefinition<TMacro> = Reactory.IReactoryComponentDefinition<TMacro> & {
  mcp?: any
  runat?: "server" | "client"
  tools?: MacroToolDefinition[]
  /**
   * An alias for a macro. The name of the macro and the alias won't always match.
   * We use this to provide a more human readable name for the macro.
   */
  alias?: string
  icon?: string
  enabled?: boolean
};

export type MacroComponentDefinitionRegistry = {
  [key: string]: MacroComponentDefinition<unknown>
}

export type KnownCannedMessages =
  "welcome" |
  "help" |
  "goodbye" |
  "error" |
  "givemeaccess"

export type CanedMessages = {
  [key in KnownCannedMessages]: string;
};

export type RatedChatCompletionResponseMessage = OpenAI.ChatCompletionMessage & { rating?: number };

export type ChatMessage = OpenAI.ChatCompletionMessage | 
  OpenAI.ChatCompletionDeveloperMessageParam |
  OpenAI.ChatCompletionMessageParam |
  OpenAI.ChatCompletionMessageToolCall;
  //RatedChatCompletionResponseMessage;

/**
 * Represents the execution status of a tool call.
 */
export type ReactorToolCallStatus = 'pending' | 'running' | 'success' | 'error';

/**
 * Represents the function details within a tool call.
 */
export interface ReactorToolCallFunction {
  name: string;
  arguments: string;
}

/**
 * Represents a single tool call requested by the AI assistant,
 * including its execution status.
 */
export interface ReactorToolCall {
  id: string;
  type: 'function';
  function: ReactorToolCallFunction;
  status: ReactorToolCallStatus;
  /** Legacy field - some tool calls may have name at top level */
  name?: string;
}

/**
 * Represents the result of a successfully executed tool call.
 */
export interface ReactorToolResult {
  id: string;
  name?: string;
  content?: any;
  timestamp?: Date;
}

/**
 * Represents an error from a failed tool call execution.
 */
export interface ReactorToolError {
  id: string;
  name?: string;
  error?: string;
  timestamp?: Date;
}

export type UXChatMessage = ChatMessage & {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "error";
  content?: string;
  sessionId: string;
  timestamp: Date;
  component?: string | React.FC | React.ComponentType<any> | React.ReactNode;
  tool_calls?: ReactorToolCall[];
  tool_results?: ReactorToolResult[];
  tool_errors?: ReactorToolError[];
  props?: any
  rating?: number | null;
  /** Reasoning/thinking content from models with extended thinking (OpenAI o1/o3, Anthropic, Gemini) */
  thinking?: string;
  /** When true, this message represents a user-initiated activity (e.g. changing tool approval mode)
   *  rather than a real chat message. It renders with a distinct activity-notification style. */
  isActivity?: boolean;
  /** Tracks how many times the same error has occurred (for deduplication in the UI). */
  errorCount?: number;
}

export interface MCPClient {
  id: string
  client: Client
  transports: {
    sse?: {
      url: URL
      requestInit?: RequestInit
      eventSourceInit?: {
        fetch: (url: string, init?: RequestInit) => Promise<Response>
      }
    }
    stdio?: StdioClientTransport
    websocket?: WebSocketClientTransport
  }
  name?: string
  description?: string
}

/**
 * Represents the state of a chat session.
 */
export type ChatState = {
  /**
   * The unique identifier for the chat session. This will be null
   * until the chat session is persisted to the database.
   */
  id?: string
  /**
   * The host that the chat session is running on. Default is server.
   * 
   * It is important that we know where the chat sessions is running so that we can 
   * determine what response format to use and what features we can include in the
   * chat responses.
   */
  host?: "server" | "cli" | "web" | "mobile"
  /**
   * The unique identifier for the bot that is being used for the chat session.
   * 
   * The id of the bot defines what configuration is used for the bot.
   * */
  botId: string
  /**
   * The persona that is associated with the chat session.
   */
  persona: IAIPersona,
  /**
   * The date and time the chat session was started.
   */
  started: Date
  /**
   * The OpenAI API key used for the chat session.
   */
  apiKey?: string
  /**
   * The OpenAI API organization used for the chat session.
   */
  apiOrg?: string
  /**
   * The OpenAI API model used for the chat session.
   */
  modelId?: string
  /**
   * The provider ID used for the chat session. When set, overrides the persona default.
   */
  providerId?: string
  /**
   * The history of the chat session.
   */
  history: ReactorConversationHistory
  /**
   * The OpenAI API instance used for the chat session.
   */
  ai?: OpenAI
  /**
   * The authentication token for the chat session, this is for authentication 
   * against the reactory server.
   */
  authToken?: string
  /**
   * The user that is associated with the chat session, this will be in the 
   * form of an API status object.
   */
  user?: Reactory.Models.IApiStatus
  /**
   * The context for the chat session.
   */
  context?: Reactory.Server.IReactoryContext
  /**
   * The date the chat session was persisted to the database.
   */
  created?: Date
  /**
   * The date the chat session was last updated.
   */
  updated?: Date
  /**
   * 
   * The macros that are available for the chat session.
   * */
  macros?: MacroComponentDefinition<unknown>[]

  /**
   * The tools that are available for the chat session.
   * */
  tools?: MacroToolDefinition[]
  
  /**
   * Variables that are available for the chat session.
   * */
  vars: {
    [key: string]: unknown
  }
  /**
   * The tool approval mode for the chat session.
   */
  toolApprovalMode?: ToolApprovalMode; // Added field for tool approval mode

  /**
   * The maximum number of auto tool call iterations before pausing for user confirmation.
   * When null/undefined, the server default (100) is used.
   */
  maxToolIterations?: number;

  /**
   * A list of MCP Clients
   */
  mcpClients?: MCPClient[],
  
  /**
   * Send message is attached to the chat state and can be used to send messages 
   * as part of an async operation.
   * @param message 
   * @param sessionId 
   * @returns 
   */
  sendMessage: (message: string, sessionId?: string) => Promise<void>
  /**
   * The number of tokens used in the chat session.
   */
  tokenCount?: number
  /**
   * The maximum number of tokens allowed for the chat session.
   */
  maxTokens?: number
  /**
   * The pressure on the token count.
   */
  tokenPressure?: number
  /**
   * A truncated version of the history of the chat session.
   */
  truncatedHistory?: ReactorConversationHistory
  /**
   * Files attached to the chat session
   */
  files?: Reactory.Models.IReactoryFile[]
  /**
   * Folders pinned to the chat session (server field: folders)
   */
  folders?: { name: string; path: string }[]
  /**
   * Side panel actions for client macros to mount components/forms
   * in the persistent side panel.
   */
  sidePanel?: SidePanelActions
}

export interface QuestionHandlerResponse {
  next: IQuestion | null,
  state: ChatState
}

export interface IQuestion {
  id?: number,
  when?: Date,
  askIf?: (state: ChatState) => boolean,
  question: string,
  response?: string,
  output?: unknown,
  valid?: boolean,
  next?: IQuestion,
  handler: (response: string, state: ChatState) => Promise<QuestionHandlerResponse>
}

export interface IQuestionGroup {
  [key: string | symbol]: IQuestion,
}

export interface IQuestionCollection {
  [key: string | symbol]: IQuestionGroup
}

export interface IToolCallRequest {
  id: string
  function: {
    name: string
    arguments: string
  }
  type: "function"
}

export interface IToolCallResponse {
  role: "tool"
  content: string
  tool_call_id: string
}

/**
 * The ToolsHook is used to manage the tools that are available for the chat session.
 */
export interface ToolsHookResults {
  tools: MacroToolDefinition[]
  addTool: (tool: MacroToolDefinition) => void
  removeTool: (tool: MacroToolDefinition) => void
  updateTool: (tool: MacroToolDefinition) => void
  getToolById: (id: string) => MacroToolDefinition | undefined
  getToolsByType: (type: string) => MacroToolDefinition[]
  executeTool: (tool: MacroToolDefinition, args: any) => Promise<any>
}

export interface ToolsHookProps {
  reactory: Reactory.Client.ReactorySDK
  chatState: ChatState
  setChatState: (state: ChatState) => void
  onToolCallResult: (tool: IToolCallResponse, state: ChatState) => void
  onToolCallError: (tool: IToolCallRequest, state: ChatState) => void
}

export type ToolsHook = (props: ToolsHookProps) => ToolsHookResults
export type ToolCallHandler = (tool: IToolCallRequest, state: ChatState) => Promise<IToolCallResponse>

export interface MacrosHookResults {
  /**
   * The macros that are available for the chat session.
   */ 
  macros: MacroComponentDefinition<unknown>[]
  addMacro: (macro: MacroComponentDefinition<unknown>) => void
  removeMacro: (macro: MacroComponentDefinition<unknown>) => void
  updateMacro: (macro: MacroComponentDefinition<unknown>) => void
  getMacroById: (id: string) => MacroComponentDefinition<unknown> | undefined
  findMacroByAlias: (alias: string) => MacroComponentDefinition<unknown> | undefined
  findMacroByName: (name: string) => MacroComponentDefinition<unknown> | undefined
  parseMacro: (text: string) => {
    macro: MacroComponentDefinition<unknown> | null
    args: any
  } | null
  /**
   * Responsible for processing and executing the macro.
   * @param macroText 
   * @returns 
   */
  executeMacro: (macro: MacroComponentDefinition<unknown>, args?: any, calledBy?: string, callId?: string) => Promise<UXChatMessage | null>
}

export interface MacrosHookProps {
  reactory: Reactory.Client.ReactorySDK
  chatState: ChatState
  onMacroCallResult: (result: any, state: ChatState) => void
  onMacroCallError: (error: Error, macro: MacroComponentDefinition<unknown>, state: ChatState) => void
  sessionLogger?: SessionLogger
}

export type MacrosHook = (props: MacrosHookProps) => MacrosHookResults

// ── Todo types (mirror server-side todoMacro types) ────────────────────

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type TodoExecutionMode = 'series' | 'parallel';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  assignee?: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoList {
  id: string;
  name: string;
  executionMode: TodoExecutionMode;
  items: TodoItem[];
  createdAt: string;
  updatedAt: string;
}

export const TODOS_VAR_KEY = 'reactor.todos';

// ── Side Panel types (agent-mounted components / forms) ────────────────

export type SidePanelAction = 'add' | 'update' | 'remove' | 'list' | 'search' | 'register';

export interface SidePanelItem {
  /** Unique reference ID the agent uses to update/remove this item. */
  id: string;
  /** Component FQN (e.g. 'core.ReactoryForm' for forms). */
  componentFqn: string;
  /** Props passed to the mounted component. */
  props: Record<string, any>;
  /** Display title shown in the tab / header. */
  title: string;
  /** When the item was added. */
  addedAt: Date;
  /** Tool-call ID that caused this item to be added. */
  addedBy?: string;
  /** Distinguishes whether this item originated from the component or form macro. */
  type: 'component' | 'form';
}

export interface SidePanelState {
  /** All items currently mounted in the side panel. */
  items: SidePanelItem[];
  /** The ID of the currently visible / focused item. */
  activeItemId?: string;
  /** Whether the side panel drawer is open. */
  isOpen: boolean;
}

export interface SidePanelActions {
  addItem: (item: SidePanelItem) => void;
  updateItem: (id: string, updates: Partial<Omit<SidePanelItem, 'id'>>) => void;
  removeItem: (id: string) => void;
  getState: () => SidePanelState;
  setActiveItem: (id: string) => void;
  togglePanel: () => void;
  clearAll: () => void;
}

// ── Session Logger types (client-to-server debug logging) ──────────────

export type SessionLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SessionLogEntry {
  level: SessionLogLevel;
  message: string;
  meta?: Record<string, unknown>;
  timestamp: Date;
  source?: string;
}

export interface SessionLoggerOptions {
  /** Flush interval in ms (default 3000) */
  flushInterval?: number;
  /** Max entries to buffer before auto-flush (default 50) */
  bufferSize?: number;
  /** Whether logging is enabled */
  enabled: boolean;
  /** Chat session ID to log against */
  chatSessionId?: string;
}

export interface SessionLogger {
  debug(message: string, meta?: Record<string, unknown>, source?: string): void;
  info(message: string, meta?: Record<string, unknown>, source?: string): void;
  warn(message: string, meta?: Record<string, unknown>, source?: string): void;
  error(message: string, meta?: Record<string, unknown>, source?: string): void;
  /** Force flush buffered entries now */
  flush(): Promise<void>;
  /** Number of entries currently buffered */
  bufferedCount: number;
  /** Total entries sent this session */
  totalSent: number;
  /** Whether the logger is actively enabled */
  enabled: boolean;
  /** Last flush error message, null if no error */
  lastFlushError: string | null;
}