# Phase 16 — Stable topic quick keys

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 15](phase-15-stable-topic-numbering.md) · next: none

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 3](phase-3-quick-access.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Outcome and scope

Assign a key from `1` to `9` to a topic in Topics. The tracking window and quick switcher
show and use the same saved key. Topics without a key remain available on both surfaces.
A user can assign only `1`, `3`, and `9`: these produce three adjacent rows labelled `1`,
`3`, and `9`, with no empty rows or reserved grid cells.

This phase changes topic selection and topic maintenance. It does not change tracking
intervals, the global shortcut, analytics, or the tray's pointer-based topic selection.
It does not add global single-digit shortcuts or require Phase 5's validation trial.

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

Workspace inspection on 12 September 2026 found that `TrackView.tsx` includes all active
topics and labels the first nine by position. `QuickView.tsx` takes the first nine active
topics and also uses position. Both currently include the running topic. `TopicsView.tsx`
offers rename, archive, and restore. The core topic has no key field. These are source
observations, not desktop verification for this phase.

### User decisions — 12 September 2026

- Assign an optional key from `1` to `9` in Topics.
- Use that exact key in the application and quick switcher. Switching, renaming, or adding
  another topic must not change it.
- Permit gaps. Do not fill them automatically or consume layout space for them.
- Provide access to topics without a key on both surfaces.

These decisions resolve Q16 and replace its trial dependency. Explicit assignments replace
position-based numbering so the user can rely on a learned key.

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

Assignment events do not create tracking entries or intervals and are not targets of the
tracking view's Undo last entry. Failed saves use the existing error and reread path; do not
show an assignment as saved before storage confirms it. Keep the editor available to retry.
Rust continues to store opaque event kinds and needs no new domain rule.

## Work packages

- [ ] **Core mapping.** Extend `src/core/tracking.ts` and `src/core/fold.ts`; add a pure
  selector in `src/core/` for ordered assigned topics, unassigned topics, and digit lookup.
  Complete when validation, collisions, archive/restore, revocation, and deterministic
  replay tests pass, with tracking output unchanged by assignment events.
- [ ] **Topic editor.** Extend `src/actions.ts`, `src/useTracking.ts`, and
  `src/TopicsView.tsx` with assignment drafts, save/error wording, occupied-key confirmation,
  and the archive explanation. Complete when assign, move, clear, and failure paths follow
  the contract and saved changes reach both windows.
- [ ] **Shared selection behavior.** Use the core selector in `src/TrackView.tsx` and
  `src/QuickView.tsx`. Replace position-based handlers and labels. Add Other topics and
  the keyboard guards. Update `src/App.css` and, if needed, `src/desktop.ts` sizing to keep
  the expanded quick switcher within the work area. Complete when sparse keys and unassigned
  selection work on both surfaces without empty slots.
- [ ] **Verification and guidance.** Run the checks below, record evidence here, and update
  README's Topics and Quick access guidance to describe the shipped behavior. Check that
  the tray still reaches all eligible topics and that any implemented Phase 9 command works.

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
8. Core tests cover invalid payloads, unknown topics, archived targets, clear and transfer,
   archive/restore, effective revocations, equal timestamps, conflicting device events,
   duplicate broadcasts, and permuted input logs. Old logs fold with null keys and unchanged
   tracking entries, intervals, and analytics. Clearing a winner does not revive a loser.
9. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` at the root.
   In `src-tauri/`, run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`.
   Perform the Linux/X11 desktop checks above and record results before marking the phase Done.

No implementation checks have been run for this phase. This change adds the plan only.

## Rollout and rollback

Deliver locally after checks. Explain that existing topics now need explicit assignments;
all remain reachable through Other topics. No automatic migration writes are made. Preserve
normal stored-event broadcasts and the existing append-failure recovery path.

Rollback restores the previous application build without deleting or rewriting log records.
The current reader ignores unknown event kinds, so old builds can read tracking history but
return to position-based keys. Warn about that key change before rollback. Archive events
written by an old build still clear assignments when this phase's fold is used again.
Reinstalling the new build restores assignments from the retained log, subject to those events.
