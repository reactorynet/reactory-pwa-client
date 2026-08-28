import { chatShellBus } from '../chatShellBus';
import { ShellEventData } from '../shellApi';

const ev = (shellSessionId: string, phase: ShellEventData['phase'] = 'stdout', extra: Partial<ShellEventData> = {}): ShellEventData => ({
  shellSessionId,
  phase,
  source: 'macro',
  ...extra,
} as ShellEventData);

const CHAT_A = 'chat-a';
const CHAT_B = 'chat-b';

describe('chatShellBus conversation scoping', () => {
  beforeEach(() => chatShellBus.__resetForTests());

  /**
   * The regression this exists for: the bus had no conversation dimension, so
   * `sessions()` returned every shell run seen since page load and the console
   * showed one agent's commands while you were reading another's chat.
   */
  it('only reports sessions for the active conversation', () => {
    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.push(CHAT_A, ev('shell-a1', 'start', { command: 'ls -la' }));
    chatShellBus.push(CHAT_B, ev('shell-b1', 'start', { command: 'rm -rf /tmp/x' }));

    expect(chatShellBus.sessions().map((s) => s.shellSessionId)).toEqual(['shell-a1']);

    chatShellBus.setActiveConversation(CHAT_B);
    expect(chatShellBus.sessions().map((s) => s.shellSessionId)).toEqual(['shell-b1']);
  });

  it('only delivers live events for the active conversation', () => {
    const seen: string[] = [];
    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.subscribe((e) => seen.push(e.shellSessionId));

    chatShellBus.push(CHAT_A, ev('shell-a1'));
    chatShellBus.push(CHAT_B, ev('shell-b1'));   // another agent, must not arrive
    chatShellBus.push(CHAT_A, ev('shell-a1'));

    expect(seen).toEqual(['shell-a1', 'shell-a1']);
  });

  it('scopes replay buffers to the active conversation', () => {
    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.push(CHAT_A, ev('shared-id', 'stdout', { chunk: 'from A' }));
    chatShellBus.push(CHAT_B, ev('shared-id', 'stdout', { chunk: 'from B' }));

    expect(chatShellBus.getBuffer('shared-id').map((e) => e.chunk)).toEqual(['from A']);
    chatShellBus.setActiveConversation(CHAT_B);
    expect(chatShellBus.getBuffer('shared-id').map((e) => e.chunk)).toEqual(['from B']);
  });

  it('buffers a backgrounded conversation so switching back still replays it', () => {
    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.push(CHAT_B, ev('shell-b1', 'stdout', { chunk: 'ran while away' }));

    expect(chatShellBus.sessions()).toEqual([]);           // not shown now
    chatShellBus.setActiveConversation(CHAT_B);
    expect(chatShellBus.getBuffer('shell-b1').map((e) => e.chunk)).toEqual(['ran while away']);
  });

  it('notifies subscribers when the active conversation changes', () => {
    const changes: (string | null)[] = [];
    chatShellBus.subscribeToConversationChange((id) => changes.push(id));

    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.setActiveConversation(CHAT_A); // no-op, same conversation
    chatShellBus.setActiveConversation(CHAT_B);
    chatShellBus.setActiveConversation(null);

    expect(changes).toEqual([CHAT_A, CHAT_B, null]);
  });

  it('reads a named conversation directly, for history replay during a load', () => {
    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.push(CHAT_B, ev('shell-b1', 'stdout', { chunk: 'history' }));

    // What loadChat needs: the bus still points at the chat being left.
    expect(chatShellBus.getConversationBuffer(CHAT_B, 'shell-b1').map((e) => e.chunk)).toEqual(['history']);
    expect(chatShellBus.getConversationBuffer(CHAT_A, 'shell-b1')).toEqual([]);
  });

  it('ignores a push with no conversation', () => {
    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.push('', ev('orphan'));
    expect(chatShellBus.sessions()).toEqual([]);
  });

  it('bounds retained conversations without dropping the active one', () => {
    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.push(CHAT_A, ev('shell-a1'));
    for (let i = 0; i < 8; i++) chatShellBus.push(`other-${i}`, ev(`shell-o${i}`));

    // Active conversation survives eviction.
    expect(chatShellBus.getBuffer('shell-a1')).toHaveLength(1);
    // Oldest others are gone.
    expect(chatShellBus.getConversationBuffer('other-0', 'shell-o0')).toEqual([]);
  });

  it('clears one conversation on request', () => {
    chatShellBus.setActiveConversation(CHAT_A);
    chatShellBus.push(CHAT_A, ev('shell-a1'));
    chatShellBus.clearConversation(CHAT_A);
    expect(chatShellBus.sessions()).toEqual([]);
  });
});
