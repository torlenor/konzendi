# Phase 16 — Stable topic quick keys and topic colours

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 15](phase-15-stable-topic-numbering.md) · next: [Phase 17](phase-17-storage-location-menu.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 3](phase-3-quick-access.md)  
**Effort:** H  
**Complexity:** M  
**Readiness:** Implementation-ready

## Outcome and scope

Assign a key from `1` to `9` to a topic in Topics. The tracking window and quick switcher
show and use the same saved key. Topics without a key remain available on both surfaces.
A user can assign only `1`, `3`, and `9`: these produce three adjacent rows labelled `1`,
`3`, and `9`, with no empty rows or reserved grid cells.

Also give a topic an optional colour, chosen freely with a colour picker in Topics. Every
surface that shows a topic shows its colour: the tracking window, the quick switcher, the
entry list, Topics, and the analytics. In the analytics, the topic colour fills the lane
segments in place of the state colour.

This phase changes topic selection, topic maintenance, and the colour of the analytics
lanes. It does not change tracking intervals, the global shortcut, or the tray's
pointer-based topic selection. The analytics keep their layout, their readings, and their
numbers; only the colour of the lane segments changes. This phase does not add global
single-digit shortcuts and does not require Phase 5's validation trial.

## Decisions and evidence

### Existing coverage

[Q16](../OPEN_QUESTIONS.md) deferred topic pinning until after the validation trial.
[Phase 2](phase-2-tracking-implementation.md#rationale) chose creation order instead of
recent-use order. [Phase 3](phase-3-quick-access.md#interpretations-of-the-design) limited
the quick switcher to nine topics. Neither phase designed user-assigned keys.
[Phase 15](phase-15-stable-topic-numbering.md) keeps the running topic in the list but
also leaves explicit key assignment out of scope.
[Phase 9](phase-9-quick-access-open-window.md) adds an open-window command and explicitly
excludes topic numbering.

[Phase 6](phase-6-application-theme.md#decisions-and-evidence) made colour a signal of
tracking state and declared thirteen colour roles. [Phase 4](phase-4-timeline-analytics.md#accepted-decisions)
applied that rule to the analytics: a lane carries identity by its position, not by a hue.

Workspace inspection on 12 September 2026 found that `TrackView.tsx` includes all active
topics and labels the first nine by position. `QuickView.tsx` takes the first nine active
topics and also uses position. Both currently include the running topic. `TopicsView.tsx`
offers rename, archive, and restore. The core topic has no key field and no colour field.
`App.css` records that a lane is a row and not a hue, which is why no topic colour exists.
These are source observations, not desktop verification for this phase.

### User decisions — 12 September 2026

- Assign an optional key from `1` to `9` in Topics.
- Use that exact key in the application and quick switcher. Switching, renaming, or adding
  another topic must not change it.
- Permit gaps. Do not fill them automatically or consume layout space for them.
- Provide access to topics without a key on both surfaces.
- Give each topic an optional colour, so topics are easier to tell apart. Pick it freely
  with a colour picker; a fixed palette of named colours was offered and declined.
- Show the colour everywhere a topic is shown.
- Let the topic colour fill the analytics lane segments in place of the state colour. The
  running lane keeps its mark and its wording.

These decisions resolve Q16 and replace its trial dependency. Explicit assignments replace
position-based numbering so the user can rely on a learned key.

The colour decisions resolve [Q25](../OPEN_QUESTIONS.md) and change Phase 6's rule for
topic identity only: colour may now say *which topic*, beside saying *which state*. The
state colour keeps the window bar, the control outlines, and the marks. A free colour
cannot be checked against the accessibility floor before it is picked, so the contract
below keeps every swatch visible, keeps text out of the topic colour, and warns without
blocking the save. This changes the lanes recorded under Q08; the readings and the lane
layout are unchanged.

### Implementation contract

The following choices complete the requested behavior:

| Area | Rule |
| --- | --- |
| Assignment | Each topic has zero or one key. Each key has at most one owner. Topics has a labelled `Quick key` select with `None` and all nine digits, plus Save. |
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

### Colour contract

| Area | Rule |
| --- | --- |
| Assignment | Each topic has zero or one colour. Colours are not exclusive: two topics can hold the same colour. Topics has a labelled `Colour` control with a colour picker, a hexadecimal field, eight suggested swatches, `None`, and Save. |
| Stored value | A `#rrggbb` string, written in lower case. There is no shorthand form, colour name, functional notation, or alpha. `null` means no colour. |
| Clear | Saving `None` removes only that topic's colour. Saving the current value writes nothing. |
| Initial state | Existing logs and new topics start without a colour. No automatic allocation and no log migration. A topic without a colour keeps today's appearance: no swatch, and the state colour in its lane. |
| Archive and restore | Archiving keeps the colour, because a colour is not a limited resource. Restoring shows it again. The colour control is offered for active topics only. |
| Where shown | A round swatch before the topic name in the tracking window switch list and running state, the quick switcher numbered rows and Other topics, Topics, the entry list rows, and the analytics lane labels. The analytics lane segments use the colour as their fill. |
| Where not shown | The tray menu holds text items only, and the entry list's topic `select` holds plain options. Both show names without a swatch. Record these two limits in README. |
| Never colour alone | Keys, marks, names, and wording keep their current job. A colour adds a signal and replaces none. The running lane keeps `▶` and the word "running". |
| Visibility | Every swatch and every coloured segment carries a 1px `--rule` outline, so a colour close to the surface stays visible in light and dark. Never paint a topic name or any other text in the topic colour, and never paint text on top of a topic colour. |
| Weak contrast | The editor measures the chosen colour against the light and the dark surface. Below 3:1 against either surface, it shows which mode is affected. This is a note, not a block: the user can save the colour. |
| Forgotten stretch | The hatch that marks a stretch nothing ended stays above the topic colour and keeps its meaning. Its contrast is checked against the chosen colour, not against the state colour. |

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
colour names, functional notation, alpha, blank strings, and missing colours. Fold the
value to lower case, so a log written by hand shows one value. Extend the core Topic with
`color: string | null`.

Create topics with null colours. Apply colour events in the same topic-maintenance pass.
An event for an unknown or currently archived topic has no effect. Archiving keeps the
colour the topic already holds. Colours are not exclusive, so a colour event changes its
own topic only, and the last effective event in merge order wins.

Assignment and colour events do not create tracking entries or intervals and are not
targets of the tracking view's Undo last entry. Failed saves use the existing error and reread path; do not
show an assignment as saved before storage confirms it. Keep the editor available to retry.
Rust continues to store opaque event kinds and needs no new domain rule.

## Work packages

- [ ] **Core mapping.** Extend `src/core/tracking.ts` and `src/core/fold.ts` with the key
  and the colour; add a pure selector in `src/core/` for ordered assigned topics,
  unassigned topics, and digit lookup. Complete when validation, collisions,
  archive/restore, revocation, and deterministic replay tests pass, with tracking output
  unchanged by assignment and colour events.
- [ ] **Topic editor.** Extend `src/actions.ts`, `src/useTracking.ts`, and
  `src/TopicsView.tsx` with assignment drafts, save/error wording, occupied-key confirmation,
  and the archive explanation. Add the colour control: picker, hexadecimal field,
  suggested swatches, `None`, and the weak-contrast note. Complete when assign, move,
  clear, colour, and failure paths follow the contract and saved changes reach both
  windows.
- [ ] **Shared selection behavior.** Use the core selector in `src/TrackView.tsx` and
  `src/QuickView.tsx`. Replace position-based handlers and labels. Add Other topics and
  the keyboard guards. Update `src/App.css` and, if needed, `src/desktop.ts` sizing to keep
  the expanded quick switcher within the work area. Complete when sparse keys and unassigned
  selection work on both surfaces without empty slots.
- [ ] **Colour rendering.** Add the swatch to `src/TrackView.tsx`, `src/QuickView.tsx`,
  `src/TopicsView.tsx`, and `src/EntriesView.tsx`, and colour the lane segments in
  `src/AnalyticsView.tsx`. Pass the colour as a custom property and keep the outline and
  the hatch in `src/App.css`; correct the comment that says no topic colour exists.
  Complete when a topic with a colour, a topic without one, and two topics with the same
  colour all read correctly in light and dark.
- [ ] **Verification and guidance.** Run the checks below, record evidence here, and update
  README's Topics and Quick access guidance to describe the shipped behavior, the colour,
  and the two surfaces that show no colour. Record the measured contrast for the coloured
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
8. Give A a colour with the picker. Its swatch appears in Topics, the tracking window, the
   quick switcher, the entry list, and the analytics label, and the lane segments take the
   colour. Restart the application; the colour is the same. Clear it; A returns to the
   state colour and shows no swatch, and other topics keep theirs.
9. Give B the same colour as A. Both keep it, and the keys and names still tell them apart.
   Archive B and restore it; its colour survives. A forgotten stretch stays readable above
   a topic colour.
10. Pick a colour close to the light surface and one close to the dark surface. The outline
    keeps each swatch and segment visible in both themes, the editor shows the weak-contrast
    note for the affected mode, and saving still works. Measure the text pairs again and
    confirm that no text is painted in a topic colour.
11. Core tests cover invalid payloads, unknown topics, archived targets, clear and transfer,
    archive/restore, effective revocations, equal timestamps, conflicting device events,
    duplicate broadcasts, and permuted input logs. Colour tests cover rejected forms, case
    folding, clearing, archived targets, shared colours, and unknown topics. Old logs fold
    with null keys, null colours, and unchanged tracking entries, intervals, and readings.
    Clearing a winner does not revive a loser.
12. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` at the root.
    In `src-tauri/`, run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`.
    Perform the Linux/X11 desktop checks above and record results before marking the phase Done.

No implementation checks have been run for this phase. This change adds the plan only.

## Rollout and rollback

Deliver locally after checks. Explain that existing topics now need explicit assignments;
all remain reachable through Other topics. Colours are optional, and a topic without one
looks as it does today. No automatic migration writes are made. Preserve normal
stored-event broadcasts and the existing append-failure recovery path.

Rollback restores the previous application build without deleting or rewriting log records.
The current reader ignores unknown event kinds, so old builds can read tracking history but
return to position-based keys and to state-coloured lanes. Warn about the key change and
the colour loss before rollback. Archive events
written by an old build still clear assignments when this phase's fold is used again.
Reinstalling the new build restores assignments from the retained log, subject to those events.
