/**
 * The auto-resume / auto-init decision, extracted so it can be tested.
 *
 * Why this is its own module
 * -------------------------
 * ReactorChat decides, when the user lands on a persona with no `sessionId` in
 * the URL, whether to resume that persona's most recent conversation or to
 * create a new one. That decision has exactly ONE legitimate input: the
 * persona's most recent conversation, fetched UNFILTERED.
 *
 * It must never be derived from the history panel's list. That list is
 * filtered by the committed search term (that is the whole point of the search
 * fix), so using it here means a user who searched for "Email Templates" and
 * then switched agent would either be dropped into an old matching thread
 * instead of their latest one, or — when nothing matches — have a brand new
 * conversation silently created for them because the list came back empty.
 *
 * Keeping the decision here, taking only the probe result, makes that
 * impossible by construction: there is no parameter through which a filtered
 * list could enter, and the behaviour is unit-testable without mounting a
 * 3000-line component.
 */

/** What the caller should do for a persona that has no session in the URL. */
export type AutoSessionTarget =
  | { kind: 'resume'; sessionId: string }
  | { kind: 'create' };

export interface AutoSessionDecisionInput {
  /** Whether this host wants conversation continuity at all. */
  autoResume: boolean;
  /**
   * The persona's most recent conversation from the UNFILTERED probe
   * (`getMostRecentChatForPersona`), or `null` when it has none.
   *
   * Deliberately typed as "something with an optional id" rather than a list:
   * callers cannot pass `chats` / a search result set here by accident.
   */
  recent: { id?: string } | null | undefined;
}

/**
 * Resume the most recent conversation when continuity is wanted and one
 * exists; otherwise create a new session.
 */
export const resolveAutoSessionTarget = ({
  autoResume,
  recent,
}: AutoSessionDecisionInput): AutoSessionTarget => {
  const sessionId = autoResume ? recent?.id : undefined;
  return sessionId ? { kind: 'resume', sessionId } : { kind: 'create' };
};
