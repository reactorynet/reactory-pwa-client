import useGraph, { ReactorInitSessionInput, ReactorSendMessageInput } from '../useGraph';

// Minimal mock for Reactory SDK
const mockReactory = () => {
  const calls: any[] = [];
  const mkResp = (data: any) => Promise.resolve({ data });
  return {
    graphqlMutation: jest.fn((doc: any, vars: any) => {
      calls.push({ type: 'mutation', doc, vars });
      if (String(doc).includes('ReactorStartChatSession')) {
        return mkResp({ ReactorStartChatSession: { __typename: 'ReactorChatState', id: 'sess-1', macros: [], tools: [] } });
      }
      if (String(doc).includes('ReactorSendMessage')) {
        return mkResp({ ReactorSendMessage: { __typename: 'ReactorChatMessage', sessionId: 'sess-1', id: 'm1', role: 'assistant', content: 'ok', timestamp: new Date().toISOString() } });
      }
      if (String(doc).includes('ReactorSetChatToolApprovalMode')) {
        return mkResp({ ReactorSetChatToolApprovalMode: { id: 'sess-1', toolApprovalMode: 'auto' } });
      }
      if (String(doc).includes('ReactorAttachFile')) {
        return mkResp({ ReactorAttachFile: { __typename: 'ReactorChatMessage', sessionId: 'sess-1', id: 'm2', role: 'assistant', content: 'file', timestamp: new Date().toISOString() } });
      }
      if (String(doc).includes('ReactorAskQuestionAudio')) {
        return mkResp({ ReactorAskQuestionAudio: { __typename: 'ReactorChatMessage', sessionId: 'sess-1', id: 'm3', role: 'assistant', content: 'audio', timestamp: new Date().toISOString() } });
      }
      if (String(doc).includes('ReactorDeleteChatSession')) {
        return mkResp({ ReactorDeleteChatSession: true });
      }
      if (String(doc).includes('ReactorExecuteMacro')) {
        return mkResp({ ReactorExecuteMacro: { __typename: 'ReactorChatMessage', sessionId: 'sess-1', id: 'mx', role: 'assistant', content: 'macro', timestamp: new Date().toISOString() } });
      }
      if (String(doc).includes('ReactorExecuteTool')) {
        return mkResp({ ReactorExecuteTool: { __typename: 'ReactorChatMessage', sessionId: 'sess-1', id: 'tx', role: 'assistant', content: 'tool', timestamp: new Date().toISOString() } });
      }
      return mkResp({});
    }),
    graphqlQuery: jest.fn((doc: any, vars: any) => {
      calls.push({ type: 'query', doc, vars });
      if (String(doc).includes('ReactorConversation')) {
        return Promise.resolve({ data: { ReactorConversation: { __typename: 'ReactorChatState', id: 'sess-1', history: [], tools: [], macros: [], vars: {} } } });
      }
      if (String(doc).includes('ReactorConversations')) {
        return Promise.resolve({ data: { ReactorConversations: [{ id: 'sess-1', personaId: 'p1', created: new Date().toISOString(), history: [], vars: {} }] } });
      }
      return Promise.resolve({ data: {} });
    }),
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as any;
};

describe('useGraph', () => {
  it('starts a chat session', async () => {
    const reactory = mockReactory();
    const graph = useGraph({ reactory });
    const result = await graph.startChatSession({ personaId: 'p1' } as ReactorInitSessionInput);
    expect(result.__typename).toBe('ReactorChatState');
    // @ts-ignore
    expect(result.id).toBe('sess-1');
  });

  it('sends a message', async () => {
    const reactory = mockReactory();
    const graph = useGraph({ reactory });
    const resp = await graph.sendMessage({ personaId: 'p1', chatSessionId: 'sess-1', message: 'hi' } as ReactorSendMessageInput);
    expect(resp.__typename).toBe('ReactorChatMessage');
  });

  it('sets tool approval mode', async () => {
    const reactory = mockReactory();
    const graph = useGraph({ reactory });
    const resp = await graph.setChatToolApprovalMode('sess-1', 'auto' as any);
    expect(resp.toolApprovalMode).toBe('auto');
  });

  it('attaches file and sends audio', async () => {
    const reactory = mockReactory();
    const graph = useGraph({ reactory });
    const fileResp = await graph.attachFile(new File([], 'x.txt'), 'sess-1');
    expect(fileResp.__typename).toBe('ReactorChatMessage');
    const audioResp = await graph.askQuestionAudio(new Blob([]), 'sess-1');
    expect(audioResp.__typename).toBe('ReactorChatMessage');
  });

  it('lists and gets conversations', async () => {
    const reactory = mockReactory();
    const graph = useGraph({ reactory });
    const list = await graph.listConversations({});
    expect(Array.isArray(list)).toBe(true);
    const conv = await graph.getConversation('sess-1');
    // @ts-ignore
    expect(conv.__typename).toBe('ReactorChatState');
  });

  it('deletes a session', async () => {
    const reactory = mockReactory();
    const graph = useGraph({ reactory });
    const ok = await graph.deleteChatSession('sess-1');
    expect(ok).toBe(true);
  });
});

