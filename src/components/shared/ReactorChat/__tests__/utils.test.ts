import {
  toCamelCaseLabel,
  getSchemaFromArgs,
  getUiSchemaFromSchema,
  estimateTokens,
  summarizeToolCosts,
  summarizeContext,
  getSystemPromptInfo,
  formatCount,
  arePanelPropsEqual,
} from '../utils';

describe('toCamelCaseLabel', () => {
  it('converts camelCase to spaced label', () => {
    expect(toCamelCaseLabel('camelCase')).toBe('Camel Case');
  });

  it('converts PascalCase to spaced label', () => {
    expect(toCamelCaseLabel('PascalCase')).toBe('Pascal Case');
  });

  it('handles consecutive uppercase (acronym boundary)', () => {
    expect(toCamelCaseLabel('AIModel')).toBe('AI Model');
  });

  it('handles already-spaced or single-word input', () => {
    expect(toCamelCaseLabel('hello')).toBe('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(toCamelCaseLabel('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    expect(toCamelCaseLabel(null as any)).toBe('');
    expect(toCamelCaseLabel(undefined as any)).toBe('');
  });
});

describe('getSchemaFromArgs', () => {
  it('returns null for null input', () => {
    expect(getSchemaFromArgs(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(getSchemaFromArgs('string')).toBeNull();
    expect(getSchemaFromArgs(42)).toBeNull();
  });

  it('returns existing JSON schema unchanged when type+properties present', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    expect(getSchemaFromArgs(schema)).toBe(schema);
  });

  it('infers schema from a plain object with mixed types', () => {
    const args = {
      name: 'alice',
      age: 30,
      active: true,
      tags: ['a', 'b'],
      meta: { key: 'value' },
    };
    const result = getSchemaFromArgs(args);
    expect(result).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' },
        tags: { type: 'array' },
        meta: { type: 'object' },
      },
      required: ['name', 'age', 'active', 'tags', 'meta'],
    });
  });

  it('marks all inferred properties as required', () => {
    const result = getSchemaFromArgs({ x: 1, y: 2 });
    expect(result!.required).toEqual(expect.arrayContaining(['x', 'y']));
    expect(result!.required).toHaveLength(2);
  });
});

describe('getUiSchemaFromSchema', () => {
  it('returns empty object for null/non-object input', () => {
    expect(getUiSchemaFromSchema(null)).toEqual({});
    expect(getUiSchemaFromSchema('str')).toEqual({});
  });

  it('returns base uiSchema for empty object', () => {
    const result = getUiSchemaFromSchema({});
    expect(result['ui:form']).toBeDefined();
    expect(result['ui:form'].showSubmit).toBe(true);
  });

  it('maps array fields to select widget', () => {
    const result = getUiSchemaFromSchema({ tags: ['a'] });
    expect(result['tags']).toEqual({ 'ui:widget': 'select' });
  });

  it('maps number fields to updown widget', () => {
    const result = getUiSchemaFromSchema({ count: 5 });
    expect(result['count']).toEqual({ 'ui:widget': 'updown' });
  });

  it('maps boolean fields to checkbox widget', () => {
    const result = getUiSchemaFromSchema({ enabled: false });
    expect(result['enabled']).toEqual({ 'ui:widget': 'checkbox' });
  });

  it('maps object fields to object widget', () => {
    const result = getUiSchemaFromSchema({ nested: { a: 1 } });
    expect(result['nested']).toEqual({ 'ui:widget': 'object' });
  });

  it('leaves string fields without a specific widget override', () => {
    const result = getUiSchemaFromSchema({ name: 'Alice' });
    expect(result['name']).toBeUndefined();
  });
});

describe('estimateTokens', () => {
  it('uses the chars/4 heuristic and rounds up', () => {
    expect(estimateTokens('12345')).toBe(2);
    expect(estimateTokens('1234')).toBe(1);
  });

  it('returns zero for empty and nullish payloads', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  it('serializes object payloads before measuring', () => {
    const payload = { a: 1 };
    expect(estimateTokens(payload)).toBe(Math.ceil(JSON.stringify(payload).length / 4));
  });
});

describe('summarizeToolCosts', () => {
  const message = (overrides: any) => ({
    id: 'm1',
    role: 'assistant',
    sessionId: 's1',
    timestamp: new Date(0),
    ...overrides,
  });

  it('returns an empty report for empty history', () => {
    const report = summarizeToolCosts([] as any);
    expect(report.totalCalls).toBe(0);
    expect(report.byTool).toEqual([]);
  });

  it('costs args and results for a call resolved on the same message', () => {
    const report = summarizeToolCosts([
      message({
        tool_calls: [{ id: 'c1', type: 'function', function: { name: 'search', arguments: '12345678' } }],
        tool_results: [{ id: 'c1', name: 'search', content: 'x'.repeat(400) }],
      }),
    ] as any);

    expect(report.totalCalls).toBe(1);
    expect(report.calls[0].argsTokens).toBe(2);
    expect(report.calls[0].resultTokens).toBe(100);
    expect(report.calls[0].totalTokens).toBe(102);
    expect(report.totalToolTokens).toBe(102);
  });

  it('correlates results delivered on a separate tool-role message', () => {
    const report = summarizeToolCosts([
      message({ tool_calls: [{ id: 'c1', type: 'function', function: { name: 'shell', arguments: '{}' } }] }),
      message({ id: 'm2', role: 'tool', tool_call_id: 'c1', content: 'y'.repeat(80) }),
    ] as any);

    expect(report.calls[0].resultTokens).toBe(20);
    expect(report.pendingCalls).toBe(0);
  });

  it('rolls up per tool with avg and max result tokens, heaviest first', () => {
    const report = summarizeToolCosts([
      message({
        tool_calls: [
          { id: 'c1', type: 'function', function: { name: 'read', arguments: '' } },
          { id: 'c2', type: 'function', function: { name: 'read', arguments: '' } },
          { id: 'c3', type: 'function', function: { name: 'ping', arguments: '' } },
        ],
        tool_results: [
          { id: 'c1', name: 'read', content: 'a'.repeat(400) },
          { id: 'c2', name: 'read', content: 'a'.repeat(800) },
          { id: 'c3', name: 'ping', content: 'ok' },
        ],
      }),
    ] as any);

    expect(report.byTool[0].name).toBe('read');
    expect(report.byTool[0].calls).toBe(2);
    expect(report.byTool[0].avgResultTokens).toBe(150);
    expect(report.byTool[0].maxResultTokens).toBe(200);
    expect(report.byTool[1].name).toBe('ping');
  });

  it('counts errors and flags calls awaiting a result', () => {
    const report = summarizeToolCosts([
      message({
        tool_calls: [
          { id: 'c1', type: 'function', function: { name: 'fail', arguments: '' } },
          { id: 'c2', type: 'function', function: { name: 'slow', arguments: '' } },
        ],
        tool_errors: [{ id: 'c1', name: 'fail', error: 'boom' }],
      }),
    ] as any);

    expect(report.totalErrors).toBe(1);
    expect(report.pendingCalls).toBe(1);
    expect(report.calls.find((c) => c.id === 'c1')?.hasError).toBe(true);
  });

  it('reports results whose originating call is no longer in history', () => {
    const report = summarizeToolCosts([
      message({ tool_results: [{ id: 'orphan', name: 'archived', content: 'z'.repeat(40) }] }),
    ] as any);

    expect(report.totalCalls).toBe(1);
    expect(report.calls[0].orphanResult).toBe(true);
    expect(report.calls[0].resultTokens).toBe(10);
  });
});

describe('summarizeContext', () => {
  it('splits tokens by role and tool payload', () => {
    const breakdown = summarizeContext([
      { id: 's', role: 'system', content: 'a'.repeat(40) },
      { id: 'u', role: 'user', content: 'b'.repeat(20) },
      {
        id: 'a',
        role: 'assistant',
        content: 'c'.repeat(8),
        thinking: 'd'.repeat(16),
        tool_calls: [{ id: 'c1', type: 'function', function: { name: 'ab', arguments: 'e'.repeat(12) } }],
        tool_results: [{ id: 'c1', content: 'f'.repeat(80) }],
      },
    ] as any);

    expect(breakdown.system).toBe(10);
    expect(breakdown.user).toBe(5);
    expect(breakdown.assistant).toBe(2);
    expect(breakdown.thinking).toBe(4);
    expect(breakdown.toolArgs).toBe(4); // name (2 chars) + arguments (12 chars)
    expect(breakdown.toolResults).toBe(20);
    expect(breakdown.total).toBe(45);
  });

  it('counts a tool payload once when the server mirrors it onto the assistant message', () => {
    const breakdown = summarizeContext([
      {
        id: 'a',
        role: 'assistant',
        tool_calls: [{ id: 'c1', type: 'function', function: { name: '', arguments: '' } }],
        tool_results: [{ id: 'c1', content: 'g'.repeat(40) }],
      },
      { id: 't', role: 'tool', tool_call_id: 'c1', content: 'g'.repeat(40) },
    ] as any);

    expect(breakdown.toolResults).toBe(10);
  });

  it('still counts tool messages that have no correlated result', () => {
    const breakdown = summarizeContext([
      { id: 't', role: 'tool', tool_call_id: 'c9', content: 'h'.repeat(40) },
    ] as any);

    expect(breakdown.toolResults).toBe(10);
  });

  it('returns zeros for missing history', () => {
    expect(summarizeContext(undefined).total).toBe(0);
  });
});

describe('getSystemPromptInfo', () => {
  it('prefers the system messages on the session history', () => {
    const info = getSystemPromptInfo({
      history: [
        { id: 's1', role: 'system', content: 'You are Reactor.' },
        { id: 'u1', role: 'user', content: 'hi' },
      ],
      persona: { persona: 'persona fallback' },
    } as any);

    expect(info.source).toBe('session');
    expect(info.text).toBe('You are Reactor.');
    expect(info.parts).toHaveLength(1);
    expect(info.chars).toBe('You are Reactor.'.length);
  });

  it('joins multiple system messages in history order', () => {
    const info = getSystemPromptInfo({
      history: [
        { id: 's1', role: 'system', content: 'base' },
        { id: 's2', role: 'system', content: 'context summary' },
      ],
    } as any);

    expect(info.parts).toHaveLength(2);
    expect(info.text).toBe('base\n\n---\n\ncontext summary');
  });

  it('falls back to the server-resolved prompt then the persona prompt', () => {
    expect(getSystemPromptInfo({ history: [], systemPrompt: 'from server' } as any).text).toBe('from server');

    const personaInfo = getSystemPromptInfo({ history: [], persona: { persona: 'from persona' } } as any);
    expect(personaInfo.source).toBe('persona');
    expect(personaInfo.text).toBe('from persona');
  });

  it('reports no source when nothing is available', () => {
    const info = getSystemPromptInfo({ history: [] } as any);
    expect(info.source).toBe('none');
    expect(info.tokens).toBe(0);
  });
});

describe('formatCount', () => {
  it('formats small, thousand and million scale values', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(12400)).toBe('12.4k');
    expect(formatCount(2_500_000)).toBe('2.50M');
  });
});

// ──────────────────────────────────────────────
// arePanelPropsEqual — the React.memo comparator for the sliding panels. The
// panels stay mounted and are hidden with a CSS transform, so this is what
// keeps them from re-rendering on every streamed token while off screen.
// ──────────────────────────────────────────────
describe('arePanelPropsEqual', () => {
  it('skips the render when the panel is closed before and after', () => {
    expect(arePanelPropsEqual(
      { open: false, chats: [1], chatState: { id: 'a' } } as any,
      { open: false, chats: [2], chatState: { id: 'b' } } as any,
    )).toBe(true);
  });

  it('renders on open', () => {
    expect(arePanelPropsEqual({ open: false } as any, { open: true } as any)).toBe(false);
  });

  it('renders on close, so the exit animation runs', () => {
    expect(arePanelPropsEqual({ open: true } as any, { open: false } as any)).toBe(false);
  });

  it('compares shallowly while open', () => {
    const chats = [{ id: 'a' }];
    expect(arePanelPropsEqual({ open: true, chats } as any, { open: true, chats } as any)).toBe(true);
    expect(arePanelPropsEqual(
      { open: true, chats } as any,
      { open: true, chats: [{ id: 'a' }] } as any,
    )).toBe(false);
  });

  it('renders when a prop is added or removed while open', () => {
    expect(arePanelPropsEqual(
      { open: true, a: 1 } as any,
      { open: true, a: 1, b: 2 } as any,
    )).toBe(false);
  });

  it('treats an absent open prop as closed', () => {
    expect(arePanelPropsEqual({ chats: [1] } as any, { chats: [2] } as any)).toBe(true);
  });
});
