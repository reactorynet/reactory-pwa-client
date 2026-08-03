import type { ChatState, UXChatMessage } from './types';

// Helper to convert camelCase or PascalCase to 'Camel Case'
export const toCamelCaseLabel = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase());
};

/**
 * Shared "glass overlay" style for components that sit on top of the
 * NeuralBrainBackground. Keeps ChatInput, banners, status pill, and the
 * sub-agent breadcrumb visually consistent with the message bubbles:
 * semi-transparent surface + backdrop blur + hairline border.
 *
 * Matches the chat-list container tint (rgba(5,5,15,0.55) / rgba(238,238,255,0.55))
 * and the message-bubble blur (10px).
 */
export const glassOverlayStyle = (mode: 'dark' | 'light' | string): Record<string, any> => ({
  backgroundColor: mode === 'dark' ? 'rgba(5,5,15,0.55)' : 'rgba(238,238,255,0.55)',
  backdropFilter: 'blur(10px) saturate(120%)',
  WebkitBackdropFilter: 'blur(10px) saturate(120%)',
  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
});

/**
 * Shared "glass panel" style for larger containers (ChatInput, banners).
 * Slightly higher opacity than glassOverlayStyle for legibility, plus
 * rounded corners and a subtle shadow so the panel reads as a distinct
 * surface while still letting the neural background show through.
 */
export const glassPanelSx = (mode: 'dark' | 'light' | string) => ({
  backgroundColor: mode === 'dark' ? 'rgba(5,5,15,0.55)' : 'rgba(238,238,255,0.55)',
  backdropFilter: 'blur(10px) saturate(120%)',
  WebkitBackdropFilter: 'blur(10px) saturate(120%)',
  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
  boxShadow: mode === 'dark'
    ? '0 2px 12px rgba(0,0,0,0.35)'
    : '0 2px 12px rgba(0,0,0,0.08)',
  borderRadius: 1,
});

// Helper to generate a JSON schema from argument shape
export const getSchemaFromArgs = (argsShape: any) => {
  if (!argsShape || typeof argsShape !== 'object') return null;
  // If already a JSON schema, return as is
  if (argsShape.type && argsShape.properties) return argsShape;
  // Otherwise, try to infer a simple schema
  const properties: any = {};
  Object.entries(argsShape).forEach(([key, value]) => {
    let schemaType = 'string';
    if (Array.isArray(value)) schemaType = 'array';
    else if (typeof value === 'number') schemaType = 'number';
    else if (typeof value === 'boolean') schemaType = 'boolean';
    else if (typeof value === 'object' && value !== null) schemaType = 'object';
    properties[key] = { type: schemaType };
  });
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
  };
};

// Helper to generate a UI schema from argument shape
export const getUiSchemaFromSchema = (argsShape: any) => {
  if (!argsShape || typeof argsShape !== 'object') return {};
  const uiSchema: Reactory.Schema.IFormUISchema = {      
    "ui:form": {
      showRefresh: false,
      showSubmit: true,
      submitIcon: 'run_circle',
      submitIconProps: {
        fontSize: 'small',        
        color: 'primary',
      }
    }
  };
  Object.entries(argsShape).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      uiSchema[key] = { 'ui:widget': 'select' }; // Example for arrays
    } else if (typeof value === 'number') {
      uiSchema[key] = { 'ui:widget': 'updown' }; // Example for numbers
    } else if (typeof value === 'boolean') {
      uiSchema[key] = { 'ui:widget': 'checkbox' }; // Example for booleans
    } else if (typeof value === 'object' && value !== null) {
      uiSchema[key] = { 'ui:widget': 'object' }; // Example for objects
    }
  });
  return uiSchema;
}; 
/**
 * Minimal, dependency-free JSON → YAML serializer for read-only display
 * purposes (not intended to round-trip through a YAML parser). Multiline
 * strings render as block literals (`|`) so embedded scripts/log output stay
 * readable instead of escaped `\n` soup.
 */
function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function needsQuoting(value: string): boolean {
  if (value === '') return true;
  if (/^\s|\s$/.test(value)) return true;
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(value)) return true;
  if (/^-?\d+(\.\d+)?$/.test(value)) return true;
  if (/[:#[\]{}&*!|>'"%@`,]/.test(value)) return true;
  return false;
}

function scalarToYaml(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    return needsQuoting(value) ? JSON.stringify(value) : value;
  }
  return JSON.stringify(value);
}

function blockLiteral(value: string, indent: number): string {
  const pad = '  '.repeat(indent);
  const lines = value.split('\n').map((line) => (line ? `${pad}${line}` : ''));
  return `|\n${lines.join('\n')}`;
}

function toYaml(value: any, indent: number): string {
  const pad = '  '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        if ((isPlainObject(item) && Object.keys(item).length > 0) || (Array.isArray(item) && item.length > 0)) {
          const nested = toYaml(item, indent + 1);
          return `${pad}- ${nested.slice(pad.length + 2)}`;
        }
        if (typeof item === 'string' && item.includes('\n')) {
          return `${pad}- ${blockLiteral(item, indent + 1)}`;
        }
        return `${pad}- ${scalarToYaml(item)}`;
      })
      .join('\n');
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return keys
      .map((key) => {
        const v = value[key];
        const keyStr = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key);
        if (isPlainObject(v) && Object.keys(v).length > 0) {
          return `${pad}${keyStr}:\n${toYaml(v, indent + 1)}`;
        }
        if (Array.isArray(v) && v.length > 0) {
          return `${pad}${keyStr}:\n${toYaml(v, indent + 1)}`;
        }
        if (typeof v === 'string' && v.includes('\n')) {
          return `${pad}${keyStr}: ${blockLiteral(v, indent + 1)}`;
        }
        return `${pad}${keyStr}: ${scalarToYaml(v)}`;
      })
      .join('\n');
  }

  return scalarToYaml(value);
}

/** Serialize arbitrary JSON-like data to a readable YAML string. */
export function jsonToYaml(data: any): string {
  if (data === undefined) return '';
  if (data === null) return 'null';
  if (typeof data !== 'object') return scalarToYaml(data);
  return toYaml(data, 0);
}

// ── Token / context accounting ─────────────────────────────────────────
//
// The server estimates conversation tokens with a chars / 4 heuristic
// (TOKEN_LIMITS.CHARS_PER_TOKEN_ESTIMATE in ReactorConversationService).
// The helpers below deliberately use the same heuristic so the numbers the
// debug inspector shows reconcile with chatState.tokenCount rather than
// telling a second, contradictory story.

/** Chars-per-token heuristic — mirrors the server's CHARS_PER_TOKEN_ESTIMATE. */
export const CHARS_PER_TOKEN_ESTIMATE = 4;

/** Render any tool payload (string, object, array) as the text the model sees. */
export const payloadToText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/** Estimated token count for a payload, using the server's chars/4 heuristic. */
export const estimateTokens = (value: unknown): number => {
  const text = payloadToText(value);
  if (text.length === 0) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
};

/** Compact byte/char formatter for the inspector (e.g. 12.4k). */
export const formatCount = (value: number): string => {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1000) return `${Math.round(value)}`;
  if (Math.abs(value) < 1_000_000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 1_000_000).toFixed(2)}M`;
};

/** A single tool invocation with its request/response weight. */
export interface ToolCallCost {
  /** The tool call id (correlates the call with its result). */
  id: string;
  /** Tool / macro name. */
  name: string;
  /** Id of the message the call was issued from. */
  messageId?: string;
  timestamp?: Date;
  status?: string;
  argsChars: number;
  argsTokens: number;
  resultChars: number;
  resultTokens: number;
  errorTokens: number;
  /** args + result + error — the total context this call consumes. */
  totalTokens: number;
  hasError: boolean;
  /** True when a result was recorded but no matching tool call was found. */
  orphanResult: boolean;
}

/** Per-tool rollup across every invocation in the conversation. */
export interface ToolCostAggregate {
  name: string;
  calls: number;
  errors: number;
  argsTokens: number;
  resultTokens: number;
  totalTokens: number;
  /** Mean result tokens per call — the "how heavy is this tool" number. */
  avgResultTokens: number;
  /** Worst single result — surfaces tools with unbounded output. */
  maxResultTokens: number;
}

export interface ToolCostReport {
  /** Every call, heaviest first. */
  calls: ToolCallCost[];
  /** Rollup by tool name, heaviest first. */
  byTool: ToolCostAggregate[];
  totalCalls: number;
  totalErrors: number;
  totalArgsTokens: number;
  totalResultTokens: number;
  totalToolTokens: number;
  /** Calls still awaiting a result (no result and no error recorded). */
  pendingCalls: number;
}

const emptyToolCostReport = (): ToolCostReport => ({
  calls: [],
  byTool: [],
  totalCalls: 0,
  totalErrors: 0,
  totalArgsTokens: 0,
  totalResultTokens: 0,
  totalToolTokens: 0,
  pendingCalls: 0,
});

/**
 * Walk the conversation history and cost every tool call.
 *
 * Results are correlated to calls by tool call id. Results arrive on either the
 * originating assistant message (`tool_results`, as enriched by the server's
 * history resolver) or on a separate `role: 'tool'` message carrying a
 * `tool_call_id` — both shapes are handled.
 */
export const summarizeToolCosts = (
  history: UXChatMessage[] | undefined
): ToolCostReport => {
  if (!Array.isArray(history) || history.length === 0) return emptyToolCostReport();

  const resultsByCallId = new Map<string, { name?: string; content: unknown }>();
  const errorsByCallId = new Map<string, { name?: string; error: unknown }>();

  history.forEach((message: any) => {
    (message?.tool_results || []).forEach((result: any) => {
      if (!result?.id) return;
      resultsByCallId.set(result.id, { name: result.name, content: result.content });
    });
    (message?.tool_errors || []).forEach((error: any) => {
      if (!error?.id) return;
      errorsByCallId.set(error.id, { name: error.name, error: error.error });
    });
    // Tool-role messages carry the raw result payload for a single call.
    if (message?.role === 'tool' && message?.tool_call_id && !resultsByCallId.has(message.tool_call_id)) {
      resultsByCallId.set(message.tool_call_id, { name: message.name, content: message.content });
    }
  });

  const calls: ToolCallCost[] = [];
  const seenCallIds = new Set<string>();

  history.forEach((message: any) => {
    (message?.tool_calls || []).forEach((toolCall: any) => {
      const id = toolCall?.id;
      if (!id || seenCallIds.has(id)) return;
      seenCallIds.add(id);

      const name = toolCall?.function?.name || toolCall?.name || 'unknown';
      const argsText = payloadToText(toolCall?.function?.arguments);
      const result = resultsByCallId.get(id);
      const error = errorsByCallId.get(id);
      const resultText = result ? payloadToText(result.content) : '';
      const errorTokens = error ? estimateTokens(error.error) : 0;
      const argsTokens = estimateTokens(argsText);
      const resultTokens = estimateTokens(resultText);

      calls.push({
        id,
        name,
        messageId: message?.id,
        timestamp: message?.timestamp,
        status: toolCall?.status,
        argsChars: argsText.length,
        argsTokens,
        resultChars: resultText.length,
        resultTokens,
        errorTokens,
        totalTokens: argsTokens + resultTokens + errorTokens,
        hasError: !!error,
        orphanResult: false,
      });
    });
  });

  // Results without a matching call (e.g. history trimmed by compaction) still
  // occupy context, so they are reported rather than silently dropped.
  resultsByCallId.forEach((result, id) => {
    if (seenCallIds.has(id)) return;
    const resultText = payloadToText(result.content);
    const resultTokens = estimateTokens(resultText);
    calls.push({
      id,
      name: result.name || 'unknown',
      argsChars: 0,
      argsTokens: 0,
      resultChars: resultText.length,
      resultTokens,
      errorTokens: 0,
      totalTokens: resultTokens,
      hasError: false,
      orphanResult: true,
    });
  });

  const aggregates = new Map<string, ToolCostAggregate>();
  let totalArgsTokens = 0;
  let totalResultTokens = 0;
  let totalErrors = 0;
  let pendingCalls = 0;

  calls.forEach((call) => {
    totalArgsTokens += call.argsTokens;
    totalResultTokens += call.resultTokens + call.errorTokens;
    if (call.hasError) totalErrors += 1;
    if (!call.orphanResult && call.resultChars === 0 && !call.hasError) pendingCalls += 1;

    const aggregate = aggregates.get(call.name) || {
      name: call.name,
      calls: 0,
      errors: 0,
      argsTokens: 0,
      resultTokens: 0,
      totalTokens: 0,
      avgResultTokens: 0,
      maxResultTokens: 0,
    };
    aggregate.calls += 1;
    if (call.hasError) aggregate.errors += 1;
    aggregate.argsTokens += call.argsTokens;
    aggregate.resultTokens += call.resultTokens + call.errorTokens;
    aggregate.totalTokens += call.totalTokens;
    aggregate.maxResultTokens = Math.max(aggregate.maxResultTokens, call.resultTokens + call.errorTokens);
    aggregates.set(call.name, aggregate);
  });

  const byTool = Array.from(aggregates.values()).map((aggregate) => ({
    ...aggregate,
    avgResultTokens: aggregate.calls > 0 ? Math.round(aggregate.resultTokens / aggregate.calls) : 0,
  }));

  byTool.sort((a, b) => b.totalTokens - a.totalTokens);
  calls.sort((a, b) => b.totalTokens - a.totalTokens);

  return {
    calls,
    byTool,
    totalCalls: calls.length,
    totalErrors,
    totalArgsTokens,
    totalResultTokens,
    totalToolTokens: totalArgsTokens + totalResultTokens,
    pendingCalls,
  };
};

/** Estimated token split of everything currently held in the context window. */
export interface ContextBreakdown {
  system: number;
  user: number;
  assistant: number;
  thinking: number;
  toolArgs: number;
  toolResults: number;
  total: number;
}

/**
 * Estimate how the context window is spent, mirroring the server's
 * estimateHistoryItemTokens so the total tracks chatState.tokenCount.
 *
 * The server's history resolver copies each tool-role message's payload onto
 * the originating assistant message's `tool_results`, so a loaded conversation
 * carries the same result twice. Results already surfaced on an assistant
 * message are counted once; the duplicate tool-role message is skipped.
 */
export const summarizeContext = (
  history: UXChatMessage[] | undefined
): ContextBreakdown => {
  const breakdown: ContextBreakdown = {
    system: 0,
    user: 0,
    assistant: 0,
    thinking: 0,
    toolArgs: 0,
    toolResults: 0,
    total: 0,
  };

  if (!Array.isArray(history)) return breakdown;

  const correlatedResultIds = new Set<string>();
  history.forEach((message: any) => {
    (message?.tool_results || []).forEach((result: any) => {
      if (result?.id) correlatedResultIds.add(result.id);
    });
    (message?.tool_errors || []).forEach((error: any) => {
      if (error?.id) correlatedResultIds.add(error.id);
    });
  });

  history.forEach((message: any) => {
    const contentTokens = estimateTokens(message?.content);
    switch (message?.role) {
      case 'system':
        breakdown.system += contentTokens;
        break;
      case 'user':
        breakdown.user += contentTokens;
        break;
      case 'tool':
        // Skip payloads already counted on the assistant message they answer.
        if (!message?.tool_call_id || !correlatedResultIds.has(message.tool_call_id)) {
          breakdown.toolResults += contentTokens;
        }
        break;
      default:
        breakdown.assistant += contentTokens;
        break;
    }

    breakdown.thinking += estimateTokens(message?.thinking);

    (message?.tool_calls || []).forEach((toolCall: any) => {
      breakdown.toolArgs += estimateTokens(toolCall?.function?.name);
      breakdown.toolArgs += estimateTokens(toolCall?.function?.arguments);
    });
    (message?.tool_results || []).forEach((result: any) => {
      breakdown.toolResults += estimateTokens(result?.content);
    });
    (message?.tool_errors || []).forEach((error: any) => {
      breakdown.toolResults += estimateTokens(error?.error);
    });
  });

  breakdown.total =
    breakdown.system +
    breakdown.user +
    breakdown.assistant +
    breakdown.thinking +
    breakdown.toolArgs +
    breakdown.toolResults;

  return breakdown;
};

/** Where the system prompt shown in the inspector came from. */
export type SystemPromptSource = 'session' | 'persona' | 'none';

export interface SystemPromptInfo {
  source: SystemPromptSource;
  /** Full prompt text — every system message joined, in history order. */
  text: string;
  /** One entry per system message, so multi-part prompts stay legible. */
  parts: { id?: string; content: string; chars: number; tokens: number }[];
  chars: number;
  tokens: number;
}

/**
 * Resolve the system prompt the model actually receives.
 *
 * Preference order: the systemPrompt resolved by the server, then the system
 * messages present in the loaded history (a session can accumulate more than
 * one — e.g. cross-session context summaries), then the persona prompt.
 */
export const getSystemPromptInfo = (
  chatState: Partial<ChatState> | undefined
): SystemPromptInfo => {
  const empty: SystemPromptInfo = { source: 'none', text: '', parts: [], chars: 0, tokens: 0 };
  if (!chatState) return empty;

  const systemMessages = (chatState.history || []).filter(
    (message: any) => message?.role === 'system' && message?.content
  );

  let parts: SystemPromptInfo['parts'] = [];
  let source: SystemPromptSource = 'none';

  if (systemMessages.length > 0) {
    source = 'session';
    parts = systemMessages.map((message: any) => {
      const content = payloadToText(message.content);
      return { id: message.id, content, chars: content.length, tokens: estimateTokens(content) };
    });
  } else if ((chatState as any).systemPrompt) {
    source = 'session';
    const content = payloadToText((chatState as any).systemPrompt);
    parts = [{ content, chars: content.length, tokens: estimateTokens(content) }];
  } else if (chatState.persona?.persona) {
    source = 'persona';
    const content = payloadToText(chatState.persona.persona);
    parts = [{ content, chars: content.length, tokens: estimateTokens(content) }];
  }

  if (parts.length === 0) return empty;

  const text = parts.map((part) => part.content).join('\n\n---\n\n');
  return {
    source,
    text,
    parts,
    chars: parts.reduce((total, part) => total + part.chars, 0),
    tokens: parts.reduce((total, part) => total + part.tokens, 0),
  };
};
