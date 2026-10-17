# Test plan — `activeSessionsAvatarStack.test.tsx`

## Defect

The active-session hover card (the card that appears when hovering one of the agent
avatar buttons on the right edge of ReactorChat) rendered its live activity detail
verbatim. For `executing_tools` that detail is `Running: ${lastToolName}`, and
`useSessionStreamHub` populates `lastToolName` from the **entire** shell command for
`StreamingEventType.SHELL`. A long-running command therefore rendered as one very wide
string.

The status row is a flex row whose `Typography` child had no `minWidth: 0`, no wrapping
rule and no overflow clipping, so the text could not shrink: it painted outside the
240px card. Because MUI's tooltip popper applies `pointer-events: auto`
(`MuiTooltip-popperInteractive`), that spilled text was hit-testable and covered the
avatar buttons to its right — the buttons could no longer be clicked.

## Behaviour under test

1. **Bounding** — an over-long activity detail is normalised to a bounded single-line
   preview, so the card cannot grow without limit.
2. **Containment contract** — the card opts out of pointer events and clips its own
   overflow, so no child can ever swallow a click aimed at an avatar button.
3. **Preserved behaviour** — the FAB remains an active click target while its hover card
   is open, and existing card content (title, status, summary, sub-agent marker) is
   unchanged.

## Test cases

### `utils.test.ts` — `summariseActivityDetail`

| Case | Expectation |
| --- | --- |
| Short detail | returned unchanged |
| Multi-line shell command | newlines collapsed to single spaces |
| Longer than the budget | truncated to `ACTIVITY_DETAIL_MAX_LENGTH` + `…` |
| Trailing space at the truncation point | `…` follows the last visible word, no dangling space |
| `undefined` / empty / whitespace-only | empty string |
| Non-positive `maxLength` | empty string |

### `activeSessionsAvatarStack.test.tsx`

| Case | Expectation |
| --- | --- |
| Long shell command | card text starts with `Running: sleep 560;` (proof the whole command is not rendered verbatim), does not contain the tail of the command, and is bounded in length |
| Hover card | reports `pointer-events: none` and `overflow: hidden` |
| Avatar clicked while its card is open | `onSelectSession` still fires with that session id |
| Sibling avatar clicked while another card is open | `onSelectSession` fires for the sibling session |

The pointer-event assertions are the real regression guard for this defect: jsdom does no
hit-testing, so `fireEvent.click` cannot reproduce the block on its own — asserting the
computed contract on the card is what proves the mechanism is closed.

## Out of scope

`lastToolName` is intentionally the raw command (it is what tells the user what the agent
is doing); the fix bounds the *presentation*, not the data.
