# Phase 16 — Stable topic quick keys and topic colors

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 15](phase-15-stable-topic-numbering.md) · next: [Phase 17](phase-17-storage-location-menu.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 3](phase-3-quick-access.md)  
**Effort:** H  
**Complexity:** M  
**Readiness:** Implementation-ready

## Outcome and scope

Assign a key from `1` to `9` to a topic in Topics. The tracking window and quick switcher
show and use the same saved key. Topics without a key remain available on both surfaces.
A user can assign only `1`, `3`, and `9`: these produce three adjacent rows labeled `1`,
`3`, and `9`, with no empty rows or reserved grid cells.

Also give a topic an optional color, chosen freely with a color picker in Topics. Every
surface that shows a topic shows its color: the tracking window, the quick switcher, the
entry list, Topics, and the analytics. In the analytics, the topic color fills the lane
segments in place of the state color.

This phase changes topic selection, topic maintenance, and the color of the analytics
lanes. It does not change tracking intervals, the global shortcut, or the tray's
pointer-based topic selection. The analytics keep their layout, their readings, and their
numbers; only the color of the lane segments changes. This phase does not add global
single-digit shortcuts and does not require Phase 5's validation trial.

## Decisions and evidence

### Existing coverage

[Phase 3](phase-3-quick-access.md) deferred topic pinning until after the validation trial.
[Phase 2](phase-2-tracking-implementation.md#rationale) chose creation order instead of
recent-use order. [Phase 3](phase-3-quick-access.md#interpretations-of-the-design) limited
the quick switcher to nine topics. Neither phase designed user-assigned keys.
[Phase 15](phase-15-stable-topic-numbering.md) keeps the running topic in the list but
also leaves explicit key assignment out of scope.
[Phase 9](phase-9-quick-access-open-window.md) adds an open-window command and explicitly
excludes topic numbering.

[Phase 6](phase-6-application-theme.md#decisions-and-evidence) made color a signal of
tracking state and declared thirteen color roles. [Phase 4](phase-4-timeline-analytics.md#accepted-decisions)
applied that rule to the analytics: a lane carries identity by its position, not by a hue.

Workspace inspection on 12 September 2026 found that `TrackView.tsx` includes all active
topics and labels the first nine by position. `QuickView.tsx` takes the first nine active
topics and also uses position. Both currently include the running topic. `TopicsView.tsx`
offers rename, archive, and restore. The core topic has no key field and no color field.
`App.css` records that a lane is a row and not a hue, which is why no topic color exists.
These are source observations, not desktop verification for this phase.

### User decisions — 12 September 2026

- Assign an optional key from `1` to `9` in Topics.
- Use that exact key in the application and quick switcher. Switching, renaming, or adding
  another topic must not change it.
- Permit gaps. Do not fill them automatically or consume layout space for them.
- Provide access to topics without a key on both surfaces.
- Give each topic an optional color, so topics are easier to tell apart. Pick it freely
  with a color picker; a fixed palette of named colors was offered and declined.
- Show the color everywhere a topic is shown.
- Let the topic color fill the analytics lane segments in place of the state color. The
  running lane keeps its mark and its wording.

These decisions replace the trial dependency. Explicit assignments replace
position-based numbering so the user can rely on a learned key.

The color decisions change Phase 6's rule for
topic identity only: color may now say *which topic*, beside saying *which state*. The
state color keeps the window bar, the control outlines, and the marks. A free color
cannot be checked against the accessibility floor before it is picked, so the contract
below keeps every swatch visible, keeps text out of the topic color, and warns without
blocking the save. This changes the lanes defined in Phase 4; the readings and the lane layout
are unchanged.

### Implementation contract

The following choices complete the requested behavior:

| Area | Rule |
| --- | --- |
| Assignment | Each topic has zero or one key. Each key has at most one owner. Topics has a labeled `Quick key` select with `None` and all nine digits, plus Save. |
| Occupied key | Show its owner's name. Selecting it shows `Move key N from A to B` and Cancel before a write. Confirming moves ownership in one event; A becomes unassigned. Changing B's key frees its old key. |
| Clear | Saving `None` removes only that topic's assignment. Saving the current value writes nothing. |
| Initial state | Existing logs and new topics start without assignments. No automatic allocation or log migration. On first use, show `Set quick keys in Topics` when topics exist but none has a key. |
| Archive and restore | Archiving clears the topic's key as part of the archive fold rule. Restoring leaves it unassigned. State this beside the archive control. Other topics keep their keys. Archived topics cannot receive keys. |
| Numbered rows | Sort by assigned digit and render only assigned, non-archived topics. Include and mark the running topic without changing its key. Use explicit key labels, not automatic list numbering. |
| Other topics | Below the numbered rows, show an `Other topics (N)` disclosure when unassigned, non-archived topics exist. It opens an unnumbered list in creation order. Each row is selectable by pointer or Tab and Enter/Space. No key column or empty key badge is required. |
| Compact quick switcher | Start with Other topics collapsed on each opening. Cap the expanded list to the available work area and scroll it. Keep Stop, Undo, and any Phase 9 command reachable. Refit the window when the disclosure changes. |
| Keyboard | Only literal unmodified digits `1` through `9` select assigned topics. An unused digit does nothing. Ignore repeat events, composition, and keys from inputs, textareas, selects, or editable content. Disable selection while loading or saving. Tab and Enter/Space operate the disclosure and topic buttons. |
| Dismissal | Expanding Other topics keeps the switcher open. A successful topic selection closes it and returns focus as today. Escape, focus loss, and the global shortcut retain their existing dismissal behavior. |
| Empty state | Distinguish no active topics from no assigned keys. With no assignments, Other topics still exposes all active topics. Hide the disclosure when its count is zero. |

Assignments are topic metadata in the event log, not per-window preferences. Both windows
already consume stored-event broadcasts, so they can fold the same mapping after a save.

### Color contract

| Area | Rule |
| --- | --- |
| Assignment | Each topic has zero or one color. Colors are not exclusive: two topics can hold the same color. Topics has a labeled `Color` control with a color picker, a hexadecimal field, eight suggested swatches, `None`, and Save. |
| Stored value | A `#rrggbb` string, written in lower case. There is no shorthand form, color name, functional notation, or alpha. `null` means no color. |
| Clear | Saving `None` removes only that topic's color. Saving the current value writes nothing. |
| Initial state | Existing logs and new topics start without a color. No automatic allocation and no log migration. A topic without a color keeps today's appearance: no swatch, and the state color in its lane. (Changed on 19 September 2026 in [Phase 14](phase-14-further-statistics.md): a topic without a color now gets an empty ring in the place of the swatch, so that all topic names start at the same position. A row that shows no topic, such as a stop or a command, keeps the space without the ring.) |
| Archive and restore | Archiving keeps the color, because a color is not a limited resource. Restoring shows it again. The color control is offered for active topics only. |
| Where shown | A round swatch before the topic name in the tracking window switch list and running state, the quick switcher numbered rows and Other topics, Topics, the entry list rows, and the analytics lane labels. The analytics lane segments use the color as their fill. |
| Where not shown | The tray menu holds text items only, and the entry list's topic `select` holds plain options. Both show names without a swatch. Record these two limits in README. |
| Never color alone | Keys, marks, names, and wording keep their current job. A color adds a signal and replaces none. The running row of the tracking window keeps `▶` and the word "running". (The day view lanes lost their `▶` on 19 September 2026: a lane is always a topic, thus the mark was the same on each lane. The topic name tells the lanes apart.) |
| Visibility | Every swatch and every colored segment carries a 1px `--rule` outline, so a color close to the surface stays visible in light and dark. Never paint a topic name or any other text in the topic color, and never paint text on top of a topic color. |
| Weak contrast | The editor measures the chosen color against the light and the dark surface. Below 3:1 against either surface, it shows which mode is affected. This is a note, not a block: the user can save the color. |
| Forgotten stretch | The hatch that marks a stretch nothing ended stays above the topic color and keeps its meaning. Its contrast is checked against the chosen color, not against the state color. |

### Event and fold contract

Add `topic.quick-key-set` with payload `{ topicId: string, key: number | null }`.
Accept only integer keys from 1 to 9 or explicit null; reject missing keys, numeric strings,
fractions, and out-of-range values. Extend the core Topic with `quickKey: number | null`.

Create topics with null keys. Apply key events in the existing deterministic merge order,
in the topic-maintenance pass together with rename, archive, and restore. Honor the existing
event-effectiveness rules. An event for an unknown or currently archived topic has no effect.
On a valid non-null assignment, clear the key from its previous owner, clear the target's old
key, and assign the new key. Null clears the target only. Archive clears its key; restore does
not recover it. Each fold starts from the log, so a removed or revoked assignment cannot leave
stale in-memory state.

For competing assignments, the last effective event in merge order wins. A displaced topic
becomes unassigned; it does not reclaim an earlier key. This makes file order and broadcast
order irrelevant and prevents duplicate live keys. The UI must recheck the current owner at
confirmation; a changed owner requires an updated confirmation. A later concurrent event can
still win under the deterministic fold rule.

Add `topic.color-set` with payload `{ topicId: string, color: string | null }`.
Accept only a `#rrggbb` string, in either case, or explicit null; reject shorthand,
color names, functional notation, alpha, blank strings, and missing colors. Fold the
value to lower case, so a log written by hand shows one value. Extend the core Topic with
`color: string | null`.

Create topics with null colors. Apply color events in the same topic-maintenance pass.
An event for an unknown or currently archived topic has no effect. Archiving keeps the
color the topic already holds. Colors are not exclusive, so a color event changes its
own topic only, and the last effective event in merge order wins.

Assignment and color events do not create tracking entries or intervals and are not
targets of the tracking view's Undo last entry. Failed saves use the existing error and reread path; do not
show an assignment as saved before storage confirms it. Keep the editor available to retry.
Rust continues to store opaque event kinds and needs no new domain rule.

## Work packages

- [x] **Core mapping.** Extend `src/core/tracking.ts` and `src/core/fold.ts` with the key
  and the color; add a pure selector in `src/core/` for ordered assigned topics,
  unassigned topics, and digit lookup. Complete when validation, collisions,
  archive/restore, revocation, and deterministic replay tests pass, with tracking output
  unchanged by assignment and color events.
- [x] **Topic editor.** Extend `src/actions.ts`, `src/useTracking.ts`, and
  `src/TopicsView.tsx` with assignment drafts, save/error wording, occupied-key confirmation,
  and the archive explanation. Add the color control: picker, hexadecimal field,
  suggested swatches, `None`, and the weak-contrast note. Complete when assign, move,
  clear, color, and failure paths follow the contract and saved changes reach both
  windows.
- [x] **Shared selection behavior.** Use the core selector in `src/TrackView.tsx` and
  `src/QuickView.tsx`. Replace position-based handlers and labels. Add Other topics and
  the keyboard guards. Update `src/App.css` and, if needed, `src/desktop.ts` sizing to keep
  the expanded quick switcher within the work area. Complete when sparse keys and unassigned
  selection work on both surfaces without empty slots.
- [x] **Color rendering.** Add the swatch to `src/TrackView.tsx`, `src/QuickView.tsx`,
  `src/TopicsView.tsx`, and `src/EntriesView.tsx`, and color the lane segments in
  `src/AnalyticsView.tsx`. Pass the color as a custom property and keep the outline and
  the hatch in `src/App.css`; correct the comment that says no topic color exists.
  Complete when a topic with a color, a topic without one, and two topics with the same
  color all read correctly in light and dark.
- [x] **Verification and guidance.** Run the checks below, record evidence here, and update
  README's Topics and Quick access guidance to describe the shipped behavior, the color,
  and the two surfaces that show no color. Record the measured contrast for the colored
  surfaces. Check that the tray still reaches all eligible topics and that any implemented
  Phase 9 command works.

## Acceptance and verification

Use synthetic topics and a temporary data directory; do not record personal logs here.

1. Assign A to `1`, B to `3`, and C to `9` in Topics. Both surfaces show exactly three
   adjacent numbered rows. Each digit selects the same topic on both surfaces; `2` does
   nothing. No hidden slot consumes row height or grid space.
2. Switch, stop, resume, rename, and create another topic. A, B, and C keep their keys.
   Close and restart the application; the mapping remains the same.
3. Move `3` from B to D. Cancel leaves the mapping unchanged. Confirm changes both topics
   through one append, frees D's former key, and updates both windows. Clear D's key and
   verify that no other topic takes it automatically.
4. Archive A. Its row and key disappear without renumbering B or C. Restore A; it appears
   under Other topics without a key. Its recorded tracking history remains unchanged.
5. Test zero, one, nine, and more than nine active topics, including no assignments and
   only key `9`. Other topics exposes every unassigned topic by pointer and keyboard in
   both views. A long list scrolls within the desktop work area and commands remain reachable.
6. Verify focus indication and readable labels in light and dark themes. Check long names,
   duplicate names, and a running unassigned topic. The running topic is marked in its list.
7. Digits entered in the Topics select, rename input, or another editable control do not
   start tracking. Held keys, composition, modified keys, loading, and saving cause no
   duplicate or unintended writes. Successful quick selection returns focus; a failed write
   keeps the switcher open with an error and rereads the stored state.
8. Give A a color with the picker. Its swatch appears in Topics, the tracking window, the
   quick switcher, the entry list, and the analytics label, and the lane segments take the
   color. Restart the application; the color is the same. Clear it; A returns to the
   state color and shows an empty ring in the place of the swatch, and other topics keep
   theirs.
9. Give B the same color as A. Both keep it, and the keys and names still tell them apart.
   Archive B and restore it; its color survives. A forgotten stretch stays readable above
   a topic color.
10. Pick a color close to the light surface and one close to the dark surface. The outline
    keeps each swatch and segment visible in both themes, the editor shows the weak-contrast
    note for the affected mode, and saving still works. Measure the text pairs again and
    confirm that no text is painted in a topic color.
11. Core tests cover invalid payloads, unknown topics, archived targets, clear and transfer,
    archive/restore, effective revocations, equal timestamps, conflicting device events,
    duplicate broadcasts, and permuted input logs. Color tests cover rejected forms, case
    folding, clearing, archived targets, shared colors, and unknown topics. Old logs fold
    with null keys, null colors, and unchanged tracking entries, intervals, and readings.
    Clearing a winner does not revive a loser.
12. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` at the root.
    In `src-tauri/`, run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`.
    Perform the Linux/X11 desktop checks above and record results before marking the phase Done.

### Implementation notes — 14 September 2026

The implementation follows the contract above. These details were not stated in the
contract, so they are recorded here:

- The pure selector is `src/core/topics.ts` (`topicChoices`, `keyOwner`, `topicForKey`).
  The keyboard rule is `src/quickKeys.ts`. The color helpers and the suggested colors are
  `src/topicColor.ts`.
- The `Quick key` select shows an occupied key as `N — used by A`. The confirmation button
  text is `Move key N from A to B`. The editor records the owner that it showed when the
  user selected the key. If the owner is different when the user confirms, the editor
  writes nothing, shows the new owner, and asks for a new confirmation.
- WebKitGTK does not set `metaKey` or `getModifierState` for the Super key on the digit
  event. Both windows therefore follow the Super key through its own key events and ignore
  a digit while Super is held. A numeric keypad digit produces the literal key `1` to `9`,
  so it selects a topic.
- The weak-contrast note measures the color against `--ground` and `--band` of each theme
  and uses the lower value. The eight suggested colors are `#d03a2c`, `#a66023`,
  `#84701c`, `#1c832d`, `#1b7f76`, `#2c70ce`, `#934dd9`, and `#cd2b89`. Each has a contrast
  of 3.3:1 or more against these four surfaces (unit test in `src/topicColor.test.ts`).
- The forgotten-stretch hatch draws `--band` stripes. Its contrast against a topic color
  is therefore the same value as the note's `--band` measurement for that theme.
- X11 applies a new size to the quick switcher after `setSize` returns. It also keeps the
  old position of a hidden window when the window shows again. `center` therefore used the
  old height when Other topics opened or closed. `fitQuick` now calculates the centered
  position from the monitor and calls `setPosition`, so the capability
  `core:window:allow-set-position` is added. The switcher closes Other topics and resizes
  before it hides, and it places itself again when it gets focus.

### Verification evidence — 14 September 2026

Automated checks, all at the repository root unless stated:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, no warnings |
| `npm test` | Pass, 86 tests in 9 files |
| `npm run test:scripts` | Pass, 62 tests |
| `npm run build` | Pass |
| `cargo fmt --check` (`src-tauri/`) | Pass |
| `cargo clippy -- -D warnings` (`src-tauri/`) | Pass |
| `cargo test` (`src-tauri/`) | Pass, 5 tests |

Core tests (check 11) cover invalid key and color payloads, unknown and archived topics,
clear and transfer, archive and restore, keys kept through switches, stops, renames, and
new topics, a revoked winner, a cleared winner that does not
revive the loser, equal timestamps from two devices, duplicate broadcasts, permuted logs,
case folding, shared colors, and old logs with unchanged entries, intervals, and current
state.

Desktop checks used `npm run tauri dev` on a private Xvfb display (1024×768, no window
manager), driven with `xdotool`, with `XDG_DATA_HOME` set to a temporary directory. The log
held synthetic topics only: twelve topics at first, with two topics named `Bravo`, one long
name, and a stretch of 9 hours; then 25 more topics before the restart.

| Acceptance check | Result |
| --- | --- |
| 1. Keys 1, 3, 9 | Pass. Both surfaces showed three adjacent rows `1`, `3`, `9`. `3` selected the same topic in both windows. `2` and `5` wrote no event. |
| 2. Keys stay after other actions | Partly verified. On the desktop, switches by key and by pointer, key moves, and a restart kept the keys: after the restart, keys `2`, `4`, `9` and all colors were unchanged. Stop, resume, rename, and a new topic were not done on the desktop; a core test shows that these events do not change keys. |
| 3. Move, cancel, clear | Pass. Cancel wrote nothing. Confirm wrote one `topic.quick-key-set` event and left the old owner without a key. Changing the new owner to `7` freed `3`. Clearing `7` wrote `key: null`, and no topic took `7`. The quick switcher showed the new keys through the broadcast. |
| 4. Archive and restore | Pass. Archiving the topic with key `1` removed its row and key. The other keys did not change. Restore put the topic under Other topics without a key. Its analytics lane and total did not change. |
| 5. Many topics | Pass for no assignments (hint and `Other topics (12)`), sparse keys, and 34 other topics. The expanded switcher stopped at 718 px (work area less the margin), the list scrolled, Tab moved the focused row into view, and Stop, Undo, and Open Konzendi stayed visible. Other topics was closed at each opening. |
| 6. Focus, names, running topic | Pass in dark and light for the checked views. The focus outline showed inside the rows of the scrolled list. A long name was cut with an ellipsis in quick access. A running topic without a key had the mark and the elapsed time under Other topics. |
| 7. Keyboard guards and failures | Pass for digits in the select and in the hexadecimal field, Ctrl, Alt, Shift, and Super with a digit, and a held `9` (auto-repeat on: one event). With a read-only log file, a key save showed the error and kept the editor open, and a digit in quick access kept the switcher open with the error. The retry after the permission was restored saved one event. |
| 8. Color everywhere | Pass. The GTK color picker set `#3584e4`. The swatch showed in Topics, the tracking window (list and running state), quick access, the entry list, and the analytics label, and the lane segments took the color. Clearing the color wrote `color: null` and the lane went back to the state color. |
| 9. Shared color | Pass. Two topics held `#3584e4`, typed as `#3584E4` and stored in lower case. Archive and restore kept the color. The hatch stayed visible above the topic color. |
| 10. Weak colors | Pass. `#16222a` showed the note for the dark theme (1.0:1). `#3584e4` showed the note for the light theme (2.8:1). `#eef2f3` saved without a block. The swatches kept their outline in both themes. No CSS rule applies `--topic-color` to `color`, and no text is drawn on a swatch or a segment. The theme tokens did not change, so the Phase 6 text pairs did not change. |
| 12. Phase 9 `K` | Pass. With the tracking window closed to the tray, `k` in quick access showed it. |

Observations, accepted on 19 September 2026 with no follow-up work:

- A topic color that is almost the same as `--band` shows in the analytics only through
  its 1px `--rule` outline. That outline looks like the three-hour gridlines. The editor
  warns about this color before the save.
- The quick switcher window reads the appearance setting only when it loads, so it stayed
  dark after the tracking window changed to light. This behavior existed before this
  phase.

### Tray verification — 19 September 2026

The user tested the tray menu in a usual desktop session. The menu shows all topics,
including the topics that have no quick key. This agrees with the scope of this phase:
the tray keeps its pointer-based selection and shows text items only, without quick keys
and without color swatches. The behavior is accepted.

### Desktop checks by the user — 19 September 2026

The user did these checks in a usual desktop session with a window manager:

- Check 2, the remaining part. Stop, resume, rename, and a new topic keep the quick keys.
- The return of keyboard focus to the interrupted window after a selection in quick access.

Not verified, accepted on 19 September 2026:

- Input method composition with a real input method. The guard has a unit test only.
- The changed-owner confirmation in the running application. It needs a second writer
  between the selection and the confirmation. No second writer of key assignments exists
  yet, so this path is unreachable until sync is added
  ([Phase 10](phase-10-encrypted-sync.md)).

## Rollout and rollback

Deliver locally after checks. Explain that existing topics now need explicit assignments;
all remain reachable through Other topics. Colors are optional, and a topic without one
looks as it does today. No automatic migration writes are made. Preserve normal
stored-event broadcasts and the existing append-failure recovery path.

Rollback restores the previous application build without deleting or rewriting log records.
The current reader ignores unknown event kinds, so old builds can read tracking history but
return to position-based keys and to state-colored lanes. Warn about the key change and
the color loss before rollback. Archive events
written by an old build still clear assignments when this phase's fold is used again.
Reinstalling the new build restores assignments from the retained log, subject to those events.
