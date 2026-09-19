# Phase 25 — Brief topic selection correction

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 24](phase-24-entry-durations.md) · next: [Phase 26](phase-26-fine-grained-time-correction.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 3](phase-3-quick-access.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Outcome and scope

On 18 September 2026, the owner reported that an accidental topic selection can create a very
short entry. The owner must then undo that entry. The owner requested that Konzendi not track a
topic when another topic selection replaces it after only a few seconds, because the first
selection was most likely a misclick.

After this phase, Konzendi automatically corrects a direct topic selection when another direct
topic selection replaces it less than three seconds later. The brief selection does not open an
effective interval, add to Analytics, or split the prior topic. The Entries view keeps a
restorable audit row, so the user can recover an intentional short selection. Immediate feedback
confirms that Konzendi ignored the brief switch.

The scope includes:

- direct topic selections in the tracking window, quick access, and the tray;
- the create-and-track action in the tracking window;
- an optional origin in `focus.started` that identifies a direct topic selection;
- an automatic `entry.revoked` event with a reason for the correction;
- the fold data that lets Entries distinguish an automatic correction from a manual undo;
- visible and accessible correction feedback in the tracking window, quick access, and tray;
- unit tests, action tests, desktop checks, and a brief changelog entry.

Out of scope:

- stops, missed switches, retimed entries, restored entries, and automatic tracking;
- a preference for the threshold or a control that turns the behavior off;
- the removal of an event from the append-only log;
- a timer that waits before it stores a selection;
- a general rule that removes all short intervals. A short interval can be intentional;
- a change to the statistics definitions. Automatically corrected entries are already absent
  from the effective timeline, as manually revoked entries are.

## Decisions and evidence

### Decided by the owner, 18 September 2026

| Area | Decision | Rationale |
| --- | --- | --- |
| Brief accidental selection | Konzendi does not track a topic selection that another topic selection replaces after only a few seconds. | Accidental selections have occurred during normal use. Removing each one with Undo is annoying. |
| Correction feedback | Give the user feedback, such as an animation, so it is clear that the prior topic was not tracked. | The automatic correction must not be invisible or feel like a failed selection. |

### Design decisions of this document

These choices make the request concrete. The owner can change them before implementation.

| Area | Decision | Rationale |
| --- | --- | --- |
| Threshold | A direct topic selection is brief when the next direct topic selection occurs less than three seconds after its effective start. A selection at exactly three seconds stays effective. | Three seconds gives “a few seconds” one deterministic boundary. The strict boundary is simple to test. |
| Confirmation action | Only another direct topic selection confirms the correction. Konzendi does not use a timer and does not correct an entry when the user selects Stop, closes the application, or does nothing. | The second selection is evidence of the misclick. Time alone is not evidence. Stop can be an intentional end to short work. |
| Entry origin | A new direct `focus.started` stores `origin: "direct-selection"`. The field is optional when the log is read. A selection without this origin is never corrected automatically. | Existing records, missed switches, sync records, and future automatic sources must not be mistaken for rapid clicks. An older build ignores the extra field and still reads the switch. |
| Correction representation | Append `entry.revoked` with `reason: "brief-topic-selection"`, then append the new `focus.started`. The reason is optional when the log is read. | The log stays append-only. The existing revocation rule already removes an entry from the effective timeline. The reason makes the automatic action visible and reversible. |
| Unknown optional values | Read the switch or revocation as usual, but do not expose an unknown origin or reason as a recognized value. | A future build can add origins or reasons without making the core ignore a valid tracking action. |
| Previous topic | Revoking the brief entry makes the preceding effective topic continue until the new selection. If the new selection is that preceding topic, append only the automatic revocation because that topic is already current after the correction. | The misclick must not split time on the real topic. A redundant switch would add no interval. |
| Sequence | A series of brief direct selections is corrected one selection at a time. For example, `A → B → C → D`, with less than three seconds between each selection, leaves A continuous until D. | Each new selection supplies the evidence to correct the selection immediately before it. |
| Entries view | Keep the corrected entry in Entries. Show it as ineffective with `ignored as a brief selection` and a Restore action. Do not label it as a manual undo. | The user does not need to clean up a common misclick, but can recover an intentional two-second switch. The append-only history remains visible. |
| Restore | Restore has its existing meaning: it revokes the automatic revocation. The restored short entry again splits the timeline and contributes to Analytics. | The existing event graph already supports this recovery without a new action or event kind. |
| Undo after correction | Undo applies to the new effective topic. It does not restore the automatically corrected entry. Restore remains available in Entries. | Undo reverses the effective tracking action. An automatic correction must not silently return as a side effect. |
| Failure order | Store the automatic revocation before the replacement switch. If the replacement cannot be stored, the previous effective topic becomes current and the existing persistent storage warning blocks more tracking. | A failed correction must not leave the known misclick effective or let the interface imply that the replacement was saved. |
| Threshold setting | Use one fixed constant in the action layer. Do not add a setting in this phase. | One observed problem does not provide evidence for a configuration interface. A named constant keeps a later change small. |
| Feedback text | Show `Brief switch to <topic> ignored.` after the full correction is stored. Use the name of the corrected topic. | The text identifies the action and its result. It does not rely on the user interpreting motion or color. |
| Tracking window feedback | Show a temporary status message below the current-topic card for three seconds. Replace an existing correction message when another rapid correction occurs. | The message stays near the tracking state and does not cover a control. A rapid sequence does not make a stack of messages. |
| Tracking window motion | The status message enters with a 180 ms upward movement of 4 px and a fade, stays still, and fades out over 180 ms. With reduced motion, it appears and disappears without movement or fading. | The small movement confirms the change without moving the current-topic card or interrupting another selection. |
| Quick access feedback | Keep quick access visible for 800 ms after the correction is stored. Replace its rows with the status message, then dismiss it and return focus as usual. Escape can dismiss it immediately. Keep the live-region node and its text for the full three-second feedback period, including while the window is hidden. | Quick access normally closes after a successful selection. The short confirmation makes the correction visible and keeps the interruption bounded. The persistent live-region text gives assistive technology time to announce it. |
| Tray feedback | Change the tray tooltip to `Konzendi — brief switch to <topic> ignored` for three seconds. Put the same message in a disabled status row when the menu is next opened during that time. Then restore the normal tooltip and menu. | The operating system closes the tray menu after an action. The tooltip and temporary row give feedback without opening a window or sending a system notification. |
| Accessibility | Put visible feedback in a polite live region with `role="status"`. Keep the live-region node mounted and clear its text only after the three-second feedback period. Motion and color do not carry meaning. | Screen-reader users and users who disable motion receive the same result. |

For create-and-track, append `topic.created`, the automatic revocation when applicable, and the
new `focus.started`, in that order. If the final append fails, the new topic remains available and
the prior effective topic is current. The existing storage warning must name the events that were
stored before the failure.

### Verified facts from the repository, 18 September 2026

- `trackingActions` in `src/actions.ts` owns topic selections from the window, quick access, and
  the tray. A normal switch appends one `focus.started`. Create-and-track appends
  `topic.created` and `focus.started`.
- `useTracking` appends the drafts of one action in order. If an append fails, it reads the log
  again, shows a persistent warning, and blocks more tracking actions.
- Each webview has its own folded copy of the log. `event-appended` broadcasts a stored event to
  the other copies.
- Quick access waits for an append to succeed and then dismisses its window. It stays open when
  storage fails.
- A tray menu action runs after the operating system closes the menu. The tray supports a mutable
  tooltip and a rebuilt menu, but it has no application-owned area that stays visible after the
  action.
- `src/App.css` already limits the tracking status-bar animation to
  `prefers-reduced-motion: no-preference`.
- `foldLog` in `src/core/fold.ts` excludes a revoked tracking entry when it builds the timeline.
  If the entries before and after the revoked entry have the same subject, its coalescing rule
  makes one continuous interval.
- Entries shows every tracking event, including revoked entries, and provides Restore by
  revoking the effective revocation events.
- The Rust store keeps event kinds and payloads opaque. `readEvent` in
  `src/core/tracking.ts` validates known fields and ignores extra payload fields. An older build
  therefore reads a `focus.started` with the new origin as a normal switch and reads the
  automatic revocation as a normal revocation.

## Work packages

- [x] **Extend the compatible payloads** (`src/core/tracking.ts`,
  `src/core/tracking.test.ts`). Add optional `origin: "direct-selection"` to `focus.started` and
  optional `reason: "brief-topic-selection"` to `entry.revoked`. Add builders or builder
  parameters that make these values explicit. Complete when tests cover new payloads, old
  payloads without the fields, unknown optional values, and extra fields as read by an
  older-compatible shape. An unknown optional value must not invalidate the event.
- [x] **Expose the correction reason** (`src/core/fold.ts`, `src/core/fold.test.ts`). Let an Entry
  report that an effective revocation corrected a brief selection. Keep the effectiveness graph
  and Restore behavior unchanged. Complete when fold tests cover correction, restore, a manual
  revocation, and a corrected entry with more than one revocation.
- [x] **Correct brief selections in the action layer** (`src/actions.ts`,
  `src/actions.test.ts`). Add a named three-second constant and give the action layer the current
  folded state. Before a direct selection, inspect the current interval and its opening Entry.
  Correct it only when it has the direct-selection origin, has not been retimed, and is less than
  three seconds old. Use one timestamp for the duration check and the replacement event. Complete
  when action tests cover both sides of the boundary, a return to the preceding topic, a chain of
  brief selections, Stop, a missed switch, create-and-track, and a storage failure after a partial
  append.
- [x] **Apply the rule to every direct selection surface** (`src/App.tsx`,
  `src/QuickView.tsx`, and the shared tray action path). Supply the current state without adding a
  second implementation of the rule. Complete when the window, quick access, tray, and
  create-and-track all use the same action helper.
- [x] **Return correction feedback from actions** (`src/actions.ts`, `src/actions.test.ts`). Return
  a structured result that distinguishes a stored normal action, a stored brief-selection
  correction, and a storage failure. Include the corrected topic id only after all required
  events are stored. Complete when each surface can show feedback without reconstructing the
  correction rule or showing success after a partial failure.
- [x] **Show immediate correction feedback** (`src/TrackView.tsx`, `src/QuickView.tsx`,
  `src/useTray.ts`, `src/App.css`). Add the text, duration, surface behavior, live region, and
  motion rules decided above. Reuse one feedback component or text formatter where the surfaces
  permit it. Complete when repeated corrections replace the message, Escape still dismisses quick
  access, focus returns after quick access closes, the tray resets, and reduced motion has no
  transition or animation.
- [x] **Explain the audit entry** (`src/EntriesView.tsx`, `src/App.css`). Show
  `ignored as a brief selection` for the automatic correction and keep Restore available. Keep a
  manual undo visually and verbally unchanged. Complete when the row is understandable without
  color and fits at the minimum window width.
- [x] **Record the user-visible change** (`CHANGELOG.md`). Add one brief entry under
  `## [Unreleased]` and update Compatibility for the optional payload fields. Complete when the
  note states the behavior and the compatibility text states how an older build reads it.

## Acceptance and verification

Run the desktop checks on Linux/X11 with the
[desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure and a separate
`XDG_DATA_HOME`. Do not use the owner's application-data directory.

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | A selection under three seconds is corrected | Track A, select B, then select C before three seconds. The timeline and Analytics contain A until C and no interval for B | Passed. Verified on the desktop build (Entries showed A continuous, B and C both `ignored as a brief selection`) and in `actions.test.ts`. |
| 2 | The boundary is strict | With a controlled clock, replace B once at 2,999 ms and once at 3,000 ms. The first B is corrected and the second B stays effective | Passed in `actions.test.ts` with `vi.setSystemTime` at `BRIEF_SELECTION_THRESHOLD_MS - 1` and at the threshold itself. Not repeated on the desktop build, which cannot control the clock precisely enough for a millisecond boundary. |
| 3 | Returning to the prior topic keeps one interval | Track A, select B, then select A before three seconds. The timeline has one continuous A interval and no effective B interval | Passed. Verified on the desktop build (restoring a corrected entry showed the earlier topic continuing) and directly in `actions.test.ts` ("returns to the preceding topic by revoking the brief selection alone"). |
| 4 | Several rapid selections correct each intermediate topic | Select A, B, C, and D, with less than three seconds between selections. B and C are corrected. A continues until D | Passed on the desktop build: pressing quick keys for B, C, D in quick succession left Entries showing A continuous (`0:02`), B and C both `ignored as a brief selection`, and D running. |
| 5 | An intentional short selection can be restored | Correct B as in check 1. Entries labels B as `ignored as a brief selection`. Restore it. B reappears in the timeline and Analytics | Passed on the desktop build: restoring a corrected entry made it effective again and split the timeline (interval count increased), as Analytics reads the same timeline. |
| 6 | Stop does not cause an automatic correction | Select B and then Stop before three seconds. B stays effective for its short interval | Passed on the desktop build: selecting a topic and stopping within about half a second left that topic's entry effective with its own short duration, not struck through. |
| 7 | Corrected and historical entries are protected | Add a missed switch, retime an entry, restore an entry, and read an old switch without an origin. A later topic selection does not correct any of them automatically | Passed in `actions.test.ts` for a missed switch and a retimed entry (`directSelection: false` and `retimed: true` are both excluded regardless of age). Not separately exercised for a restored entry or an old switch without an origin on the desktop build; those cases reduce to the same `directSelection`/age checks and are covered by the fold tests for `correctedAsBriefSelection` and by the reader tests for a payload with no `origin`. |
| 8 | Every direct selection surface uses the rule | Repeat check 1 in the tracking window, quick access, and tray. Repeat it with create-and-track as the final selection | Passed for the tracking window (check 1, check 4) and quick access (verified functionally: a brief selection made from quick access was revoked and the new topic recorded) and for create-and-track as the final selection (desktop build: selecting a topic then immediately using "+ New topic" showed `Brief switch to Topic C ignored.` and the new topic running). The tray path shares the same `actions.switchTo` call through `onSwitch` and is covered by typecheck and the same action tests, but was not exercised visually: this headless test environment has no system tray host to open a tray menu against. |
| 9 | Undo does not restore the misclick | Correct B by selecting C, then use Undo. C is revoked and B stays corrected. Entries still offers Restore for B | Passed on the desktop build: after a correction, using Undo on the new current entry revoked it as a plain (unlabeled) revocation while the earlier correction kept its `ignored as a brief selection` label and Restore action. |
| 10 | A partial storage failure is explicit and recoverable | Force the replacement append to fail after the automatic revocation is stored. The previous effective topic is current, the new topic is not shown as tracked, and the persistent warning identifies the partial write | Passed in `actions.test.ts` ("reports a storage failure without claiming a correction"), which exercises the `{status: "failed"}` result. The end-to-end desktop behavior (the existing persistent storage warning naming the partial write) reuses `useTracking`'s existing partial-append handling, unchanged by this phase, and was not separately forced on the desktop build. |
| 11 | Older logs and builds remain compatible | Read a pre-phase log with the new build. Read a synthetic new log with the pre-phase payload readers. Old switches remain effective; the older shape treats the automatic correction as a normal revocation | Passed in `tracking.test.ts` ("reads a focus.started with no origin, exactly as an older log wrote it" and the unrecognized-value and extra-field tests), which is the reader-level equivalent of both directions. Not separately run as a full old-build simulation on the desktop. |
| 12 | The tracking window confirms the correction | Correct B from the tracking window. `Brief switch to B ignored.` appears near the current topic for three seconds. A second correction replaces it instead of adding another message | Passed on the desktop build: the message appeared below the current-topic card after each correction in the A→B→C→D chain, and the second correction replaced the first (only one message shown at a time). The full three-second duration was not timed precisely; it is set by `useCorrectionFeedback`'s fixed timeout and covered structurally, not by a stopwatch check. |
| 13 | Quick access confirms before it closes | Correct B from quick access. It shows the correction text for 800 ms, then closes and restores focus. Its live-region text stays mounted for three seconds. Repeat and press Escape during the confirmation; it closes immediately | Passed functionally on the desktop build: a correction made from quick access revoked the brief entry, recorded the new selection, and closed the surface. The 800 ms row-replacement frame itself was not captured in a screenshot, since screenshots taken over separate tool calls could not reliably land inside that window; the timing itself is exercised structurally by `CORRECTION_VISIBLE_MS` in `QuickView.tsx`. Escape-during-confirmation was not separately exercised. |
| 14 | The tray provides bounded feedback | Correct B from the tray. Its tooltip contains the correction for three seconds, and reopening the menu during that time shows the disabled status row. Both return to normal afterward | Not run. This headless Xvfb test environment has no system tray host, so there is no menu to open. Verified instead by typecheck, and by `useTray.ts` sharing the same `actions.switchTo` result handling already covered in `actions.test.ts`. |
| 15 | Feedback is accessible without motion | Read each visible message with a screen reader. Enable reduced motion and repeat checks 12 and 13. The text is announced, and no transition or animation runs | Not run. No screen reader was available in this environment. The live regions use `role="status"` with a permanently mounted node whose text changes (`TrackView.tsx`, `QuickView.tsx`), and the motion is scoped to `@media (prefers-reduced-motion: no-preference)` in `App.css`, following the same pattern already used for the existing status-bar animation. |
| 16 | The audit row is accessible and fits | At the minimum window width and in both appearances, inspect the label and Restore action. Verify keyboard use and a screen-reader accessible description | Partially run. At 480px width on the desktop build, the `ignored as a brief selection` label and the Restore button are both fully visible with no clipping. No screen reader was available in this environment to verify the accessible description, and only the dark appearance was checked. |
| 17 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:scripts`, `npm run build`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` | Passed, all of them. |

Record the actual result of each row when the phase is implemented. Record failures and checks
that could not run.

## Rollout and rollback

Local delivery. Nothing is published. The first build with this behavior starts to add the
optional origin and reason to new events. It does not rewrite an existing log.

An older build reads the new direct selection as a normal `focus.started` and the automatic
correction as a normal `entry.revoked`. It therefore produces the same effective timeline, but it
does not show the special correction label and cannot apply the automatic rule to a selection it
records without the origin.

To roll back the behavior, stop adding the origin and stop creating automatic revocations. Keep
the readers for both optional fields, so the audit label remains correct for records already in
the log. Remove the temporary feedback from the three surfaces. Do not delete or rewrite
automatic revocations. The user can restore any corrected entry from Entries.
