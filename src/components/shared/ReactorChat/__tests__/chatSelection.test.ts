import { resolveChatSelectionTarget, isPersonaSwitch } from '../hooks/chatSelection';

describe('resolveChatSelectionTarget', () => {
  it("prefers the conversation's owning persona over the persona already in the URL", () => {
    // The regression: agent A is selected (and in the URL), the user opens one
    // of agent B's conversations. The target must be B, not A.
    const target = resolveChatSelectionTarget({
      chat: { id: 'session-b', personaId: 'agentB' },
      queryPersonaId: 'agentA',
      selectedPersonaId: 'agentA',
    });

    expect(target).toEqual({ sessionId: 'session-b', personaId: 'agentB' });
  });

  it('uses the conversation persona even when it matches the URL', () => {
    const target = resolveChatSelectionTarget({
      chat: { id: 'session-a', personaId: 'agentA' },
      queryPersonaId: 'agentA',
      selectedPersonaId: 'agentA',
    });

    expect(target.personaId).toBe('agentA');
  });

  it('falls back to botId when personaId is absent', () => {
    const target = resolveChatSelectionTarget({
      chat: { id: 'session-b', botId: 'agentB' },
      queryPersonaId: 'agentA',
    });

    expect(target.personaId).toBe('agentB');
  });

  it('honours an explicit persona above everything else', () => {
    const target = resolveChatSelectionTarget({
      sessionId: 'session-x',
      explicitPersonaId: 'agentC',
      chat: { id: 'session-b', personaId: 'agentB' },
      queryPersonaId: 'agentA',
    });

    expect(target).toEqual({ sessionId: 'session-b', personaId: 'agentC' });
  });

  it('falls back to the URL persona when only a session id is known', () => {
    const target = resolveChatSelectionTarget({
      sessionId: 'session-a',
      queryPersonaId: 'agentA',
      selectedPersonaId: 'agentB',
    });

    expect(target).toEqual({ sessionId: 'session-a', personaId: 'agentA' });
  });

  it('falls back to the selected persona last', () => {
    const target = resolveChatSelectionTarget({
      sessionId: 'session-a',
      selectedPersonaId: 'agentB',
    });

    expect(target).toEqual({ sessionId: 'session-a', personaId: 'agentB' });
  });

  it('returns nulls when nothing is known', () => {
    expect(resolveChatSelectionTarget({})).toEqual({ sessionId: null, personaId: null });
  });

  it('prefers an explicit sessionId when there is no chat object', () => {
    const target = resolveChatSelectionTarget({
      sessionId: 'session-1',
      explicitPersonaId: 'agentB',
    });

    expect(target).toEqual({ sessionId: 'session-1', personaId: 'agentB' });
  });
});

describe('isPersonaSwitch', () => {
  it('is true when the target agent differs from the current one', () => {
    expect(isPersonaSwitch({ sessionId: 's', personaId: 'agentB' }, 'agentA')).toBe(true);
  });

  it('is false when the target agent is already active', () => {
    expect(isPersonaSwitch({ sessionId: 's', personaId: 'agentA' }, 'agentA')).toBe(false);
  });

  it('is false when no target persona could be resolved', () => {
    expect(isPersonaSwitch({ sessionId: 's', personaId: null }, 'agentA')).toBe(false);
  });
});
