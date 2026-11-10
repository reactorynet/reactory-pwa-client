import { resolveAutoSessionTarget } from '../personaAutoSession';

/**
 * The auto-resume decision — REACTORY-302016408 R1.
 *
 * The regression this pins: once the search term became part of the shared
 * history-list state, `ReactorChat`'s persona-load effect was still resolving
 * the resume target from that list. In the default standalone configuration
 * (`autoResume = true`) a user who had searched, closed the panel and switched
 * agent would then either be dropped into an old *matching* thread instead of
 * their latest one, or — when nothing matched — have a brand new conversation
 * created for them because the filtered list came back empty.
 *
 * The decision now takes only the UNFILTERED probe result. These tests pin the
 * mapping from that probe to the action taken.
 */
describe('resolveAutoSessionTarget', () => {
  it('resumes the probe result when continuity is wanted', () => {
    expect(
      resolveAutoSessionTarget({ autoResume: true, recent: { id: 'latest-thread' } }),
    ).toEqual({ kind: 'resume', sessionId: 'latest-thread' });
  });

  it('creates a session only when the persona genuinely has no conversations', () => {
    // `null` is what the probe returns for "none" — a legitimate create.
    expect(resolveAutoSessionTarget({ autoResume: true, recent: null })).toEqual({
      kind: 'create',
    });
    expect(
      resolveAutoSessionTarget({ autoResume: true, recent: undefined }),
    ).toEqual({ kind: 'create' });
    // A row without an id is not resumable.
    expect(resolveAutoSessionTarget({ autoResume: true, recent: {} })).toEqual({
      kind: 'create',
    });
  });

  it('never resumes when the host opts out of continuity', () => {
    expect(
      resolveAutoSessionTarget({ autoResume: false, recent: { id: 'latest-thread' } }),
    ).toEqual({ kind: 'create' });
  });

  it('cannot be handed a search-filtered list: the input is a single conversation', () => {
    // Type-level guarantee, asserted at runtime for documentation: a list — the
    // shape a search result set has — carries no `id`, so it can never be
    // mistaken for a resume target. This is what makes the R1 class of bug
    // impossible rather than merely fixed.
    const filteredList = [{ id: 'search-match-1' }, { id: 'search-match-2' }] as any;
    expect(resolveAutoSessionTarget({ autoResume: true, recent: filteredList })).toEqual({
      kind: 'create',
    });
  });
});
