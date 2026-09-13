/**
 * Routing rule for opening a conversation.
 *
 * Extracted from ReactorChat so the rule can be tested on its own. It encodes
 * one invariant that used to be broken: **a conversation belongs to the persona
 * that owns it**, so opening one of agent B's conversations while agent A is
 * selected must switch the view to agent B. The version this replaces preferred
 * the `personaId` already in the URL, which meant the router only ever changed
 * `sessionId` — leaving agent A on screen with agent B's history.
 */

export interface ChatSelectionSource {
  /** The conversation being opened. */
  id?: string | null;
  /** The persona that owns the conversation. */
  personaId?: string | null;
  /** Legacy field some payloads use for the owning persona. */
  botId?: string | null;
}

export interface ResolveChatSelectionInput {
  /** A conversation-shaped object (has `id` and `personaId`). */
  chat?: ChatSelectionSource | null;
  /**
   * An explicit session id. Used when the caller only has an id (e.g. a
   * background-session switch) and no conversation object.
   */
  sessionId?: string | null;
  /**
   * An explicit persona id supplied by the caller. Highest precedence: it
   * expresses deliberate intent (e.g. "open this session as persona B").
   */
  explicitPersonaId?: string | null;
  /** The persona currently named in the URL, if any. */
  queryPersonaId?: string | null;
  /** The persona currently selected in the UI. */
  selectedPersonaId?: string | null;
}

export interface ChatSelectionTarget {
  sessionId: string | null;
  personaId: string | null;
}

/**
 * Resolve the session + persona a selection should navigate to.
 *
 * Persona precedence:
 *   1. explicit caller intent
 *   2. the conversation's owning persona
 *   3. the persona in the URL
 *   4. the currently selected persona
 *
 * Rule 2 before rule 3 is the fix: without it, a cross-agent row click kept the
 * outgoing agent in the URL.
 */
export const resolveChatSelectionTarget = (
  input: ResolveChatSelectionInput,
): ChatSelectionTarget => {
  const { chat, sessionId, explicitPersonaId, queryPersonaId, selectedPersonaId } = input;

  const resolvedSessionId = chat?.id || sessionId || null;

  const personaId =
    explicitPersonaId ||
    chat?.personaId ||
    chat?.botId ||
    queryPersonaId ||
    selectedPersonaId ||
    null;

  return { sessionId: resolvedSessionId, personaId };
};

/**
 * True when opening this selection requires switching the active agent.
 * Used to decide whether the per-persona chat list has to be reloaded.
 */
export const isPersonaSwitch = (
  target: ChatSelectionTarget,
  selectedPersonaId?: string | null,
): boolean => Boolean(target.personaId && target.personaId !== selectedPersonaId);

export default resolveChatSelectionTarget;
