import { mergeServerHistory } from '../hooks/conversationResync';
import { UXChatMessage } from '../types';

const msg = (overrides: Partial<UXChatMessage> & { id: string }): UXChatMessage => ({
  id: overrides.id,
  role: (overrides.role as UXChatMessage['role']) ?? 'assistant',
  content: overrides.content ?? '',
  sessionId: 's1',
  timestamp: new Date('2026-10-24T10:00:00.000Z'),
  ...overrides,
} as UXChatMessage);

const ids = (history: UXChatMessage[]) => history.map((m) => m.id);

describe('mergeServerHistory', () => {
  it('returns the local history untouched when the server has nothing', () => {
    const local = [msg({ id: 'a', role: 'user', content: 'hello' })];
    const result = mergeServerHistory(local, []);
    expect(result.history).toEqual(local);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
  });

  it('appends messages produced while the stream was down', () => {
    const local = [msg({ id: 'a', role: 'user', content: 'run the long job' })];
    const server = [
      msg({ id: 'a', role: 'user', content: 'run the long job' }),
      msg({ id: 'b', role: 'assistant', content: 'working' }),
      msg({ id: 'c', role: 'assistant', content: 'done' }),
    ];

    const result = mergeServerHistory(local, server);

    expect(ids(result.history)).toEqual(['a', 'b', 'c']);
    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
  });

  it('is idempotent: a second merge of the same snapshot changes nothing', () => {
    const local = [msg({ id: 'a', role: 'user', content: 'go' })];
    const server = [
      msg({ id: 'a', role: 'user', content: 'go' }),
      msg({ id: 'b', role: 'assistant', content: 'result' }),
    ];

    const first = mergeServerHistory(local, server);
    const second = mergeServerHistory(first.history, server);

    expect(ids(second.history)).toEqual(ids(first.history));
    expect(second.added).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(2);
  });

  it('does not duplicate messages when the resync is repeated many times', () => {
    const server = [
      msg({ id: 'a', role: 'user', content: 'go' }),
      msg({ id: 'b', role: 'assistant', content: 'result' }),
    ];

    let history: UXChatMessage[] = [msg({ id: 'a', role: 'user', content: 'go' })];
    for (let i = 0; i < 5; i += 1) {
      history = mergeServerHistory(history, server).history;
    }

    expect(ids(history)).toEqual(['a', 'b']);
  });

  it('adopts the server copy of a known message (content that landed during the gap)', () => {
    const local = [msg({ id: 'b', content: 'Processing...' })];
    const server = [msg({ id: 'b', content: 'The job finished in 2h 31m.' })];

    const result = mergeServerHistory(local, server);

    expect(result.history).toHaveLength(1);
    expect(result.history[0].content).toBe('The job finished in 2h 31m.');
    expect(result.updated).toBe(1);
    expect(result.added).toBe(0);
  });

  it('adopts a locally rendered message the server persisted under a different id', () => {
    // The completion path creates an assistant bubble with a client-generated
    // uuid when the preceding message carried tool calls. The server persists
    // that text under its own id, so an id-only merge would show it twice.
    const local = [
      msg({ id: 'user-1', role: 'user', content: 'go' }),
      msg({ id: 'tool-call-1', content: '', tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'shell', arguments: '{}' }, status: 'success' }] } as any),
      msg({ id: 'local-uuid-1', content: 'Done — the report is written.' }),
    ];
    const server = [
      msg({ id: 'user-1', role: 'user', content: 'go' }),
      msg({ id: 'tool-call-1', content: '', tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'shell', arguments: '{}' }, status: 'success' }] } as any),
      msg({ id: 'server-9', content: 'Done — the report is written.' }),
    ];

    const result = mergeServerHistory(local, server);

    expect(result.history).toHaveLength(3);
    // The bubble keeps its position and adopts the server id, so the next merge
    // matches it by id.
    expect(ids(result.history)).toEqual(['user-1', 'tool-call-1', 'server-9']);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(1);
  });

  it('preserves an in-flight local message the server has not persisted yet', () => {
    const local = [
      msg({ id: 'user-1', role: 'user', content: 'go' }),
      msg({ id: 'streaming-1', content: 'Partial answer, still writ' }),
    ];
    const server = [msg({ id: 'user-1', role: 'user', content: 'go' })];

    const result = mergeServerHistory(local, server);

    expect(ids(result.history)).toEqual(['user-1', 'streaming-1']);
    expect(result.added).toBe(0);
  });

  it('heals duplicate ids already present in the local transcript', () => {
    const local = [
      msg({ id: 'a', role: 'user', content: 'go' }),
      msg({ id: 'b', content: 'done' }),
      msg({ id: 'b', content: 'done' }),
    ];
    const server = [
      msg({ id: 'a', role: 'user', content: 'go' }),
      msg({ id: 'b', content: 'done' }),
    ];

    const result = mergeServerHistory(local, server);

    expect(ids(result.history)).toEqual(['a', 'b']);
  });

  it('appends in server order and keeps the local tail last', () => {
    const local = [msg({ id: 'a', role: 'user', content: 'go' })];
    const server = [
      msg({ id: 'a', role: 'user', content: 'go' }),
      msg({ id: 'b', content: 'first' }),
      msg({ id: 'c', content: 'second' }),
    ];

    const result = mergeServerHistory(local, server);
    expect(ids(result.history)).toEqual(['a', 'b', 'c']);
  });

  it('reports no change when the server copy is render-identical', () => {
    const server = [
      msg({ id: 'a', role: 'user', content: 'go' }),
      msg({ id: 'b', content: 'done', thinking: 'reasoned' }),
    ];
    const local = server.map((m) => ({ ...m }));

    const result = mergeServerHistory(local, server);

    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(2);
  });
});
