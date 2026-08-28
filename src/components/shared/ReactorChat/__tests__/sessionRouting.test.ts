import { isEventForSession } from '../hooks/sessionRouting';

describe('isEventForSession', () => {
  it('accepts an event for the chat on screen', () => {
    expect(isEventForSession('chat-a', 'chat-a')).toBe(true);
  });

  it('rejects an event for a different chat', () => {
    expect(isEventForSession('chat-b', 'chat-a')).toBe(false);
  });

  /**
   * The regression this exists for. StreamingEventFactory defaults
   * conversationId to "" whenever an emit site omits its ids, and the old rule
   * treated "no id" as "must be mine" — so a background session's completion
   * was appended to whichever chat the user happened to be reading.
   */
  it('rejects an unlabelled event rather than assuming it is ours', () => {
    expect(isEventForSession('', 'chat-a')).toBe(false);
    expect(isEventForSession(undefined, 'chat-a')).toBe(false);
    expect(isEventForSession(null, 'chat-a')).toBe(false);
  });

  /**
   * A brand-new chat receives its first events before chatState.id is set.
   * There is no window to mis-route into yet, so these must still apply.
   */
  it('accepts anything while no chat is active yet', () => {
    expect(isEventForSession('chat-a', null)).toBe(true);
    expect(isEventForSession(undefined, null)).toBe(true);
    expect(isEventForSession('chat-a', undefined)).toBe(true);
  });
});
