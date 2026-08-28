/**
 * Routing rule for streaming events: does this event belong to the chat window
 * currently on screen?
 *
 * Extracted from useChatFactory so the rule can be tested on its own. It is an
 * isolation invariant, and the version it replaces got it wrong in a way that
 * only showed up once more than one session streamed at a time.
 */

/**
 * @param eventSessionId `conversationId` (preferred) or `sessionId` off the event
 * @param activeSessionId the chat currently displayed, or null before one exists
 */
export const isEventForSession = (
  eventSessionId: string | undefined | null,
  activeSessionId: string | null | undefined,
): boolean => {
  // No active session yet: a brand-new chat receives its first events before
  // `chatState.id` is set, and there is nothing to mis-route into.
  if (!activeSessionId) return true;

  // Fails closed. The previous rule was "no id, so it must be ours", and
  // StreamingEventFactory defaults `conversationId` to "" whenever an emit site
  // omits its ids — so an unlabelled completion was applied to whichever chat
  // happened to be active. StreamingTransportManager now stamps the
  // conversation onto every event it delivers, so an unlabelled event reaching
  // the client did not come from that path and must not be trusted.
  if (!eventSessionId) return false;

  return eventSessionId === activeSessionId;
};

export default isEventForSession;
