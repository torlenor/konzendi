# Phase 26 — Fine-grained time correction

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 25](phase-25-brief-topic-selection-correction.md) · next: [Phase 27](phase-27-always-visible-tracking-reminder.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 18](phase-18-window-content-fit.md)  
**Effort:** L  
**Complexity:** L  
**Readiness:** Implementation-ready

## Outcome and scope

The adjustment panel offers five-minute and ten-minute quick actions before the existing
15-minute, 30-minute, and one-hour actions. A user who notices a typical late recording can
correct its start with one quick action instead of entering a date and time manually.

The scope includes the shared adjustment panel used for the current entry and for rows in
Entries, its narrow-window layout, accessible action names, verification, and a brief changelog
entry.

Out of scope:

- automatic detection of a late recording;
- a configurable list of adjustment intervals;
- forward adjustments, duration editing, or a different manual date-and-time control;
- changes to `entry.retimed`, the fold, persistence, Analytics, or synchronization;
- removal of the existing 15-minute, 30-minute, and one-hour actions; and
- deciding whether another correction interaction is necessary. The owner will first use the
  two new actions during normal work.

## Decisions and evidence

### Owner decision — 19 September 2026

During the Phase 5 owner trial, late recordings usually needed a correction of five or ten
minutes. The existing quick actions were too large, so the owner entered the start time manually.
The owner chose to try five-minute and ten-minute quick actions before deciding whether to change
the correction interaction further.

### Design decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Action set | Show `−5m`, `−10m`, `−15m`, `−30m`, and `−1h`, in that order. | The two observed corrections become one action. The existing larger corrections remain available. |
| Meaning | Each action moves the selected entry's effective start earlier by the stated interval. It uses the effective time shown when the panel opens, not the current clock time. | This preserves the existing adjustment rule and makes every action deterministic. |
| Surfaces | Change the shared `AdjustPanel`, so the current entry and every adjustable Entries row receive the same actions. | One component prevents the two correction surfaces from drifting. |
| Manual correction | Keep the `Set to` field, Save, Cancel, validation, and error text unchanged. | Quick actions do not cover every correction. |
| Event behavior | A successful action appends one existing `entry.retimed` event. It does not edit or remove an earlier log record. | Fine-grained correction is a new control for existing behavior, not a data-model change. |
| Failure behavior | Disable the quick actions while storage is busy. If storage fails, use the existing persistent storage warning and folded-state reconciliation. The panel can close after selection as it does now; the unchanged effective time and persistent warning show that the correction was not stored. | The new actions use the established retime failure path and must not claim success. |
| Labels | Keep the compact visible labels. Use `Move start 5 minutes earlier`, `Move start 10 minutes earlier`, `Move start 15 minutes earlier`, `Move start 30 minutes earlier`, and `Move start 1 hour earlier` as their accessible names. | The symbol and abbreviation are compact, but each action must be unambiguous to assistive technology. |
| Layout | Let the quick-action row wrap with the existing `.row` rule. At the supported minimum width, every action and the manual form must remain reachable without horizontal document scrolling. | Five actions must not regress Phase 18's window-fit result. |
| Evaluation | After delivery, the owner uses the new actions during normal work before requesting another correction design. | The trial supports these two intervals, not a larger redesign. |

Repository inspection on 19 September 2026 found:

- `src/AdjustPanel.tsx` contains one shared list with `−15m`, `−30m`, and `−1h`.
- `TrackView.tsx` and `EntriesView.tsx` both use `AdjustPanel` and pass the entry's effective
  start to it.
- A quick action calls the existing `shiftMinutes` helper and then the existing retime action.
- `trackingActions.retime` and `useTracking` already provide append-only storage, reconciliation,
  and the persistent storage-error path.
- `.row` already wraps its children, and Phase 18 established a supported minimum window size of
  480×320.

No event-schema, Rust, Tauri, or migration change is required.

## Work packages

- [ ] **Add the quick actions** (`src/AdjustPanel.tsx`). Add `−5m` and `−10m` before the existing
  actions. Keep one ordered action definition and use it for the visible labels, minute offsets,
  and accessible names. Complete when both adjustment surfaces expose all five actions and each
  action calls `onRetime` with the selected entry's effective time shifted by the exact interval.

- [ ] **Keep correction behavior safe** (`src/AdjustPanel.tsx`). Reuse the existing busy and
  failure paths. Do not add a second event type or update stored records in place. Complete when
  a successful action appends one `entry.retimed`, a failed append leaves the effective time
  unchanged and shows the persistent warning, and manual entry still works.

- [ ] **Verify layout and access** (`src/App.css` only if the existing wrap is insufficient).
  Check the current-entry panel and an Entries-row panel at the default size and at 480×320, in
  both appearance modes. Use the keyboard to reach and activate each action. Complete when the
  controls do not cause horizontal document scrolling, no control is cut off, and every action
  has the accepted accessible name.

- [ ] **Record the change** (`CHANGELOG.md`). Add one brief entry under `Unreleased`. Do not
  describe the full phase.

- [ ] **Run the checks.** Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  the desktop checks below, and `git diff --check`. Record actual results and any unverified
  checks in this document.

## Acceptance and verification

Use a separate `XDG_DATA_HOME` for desktop checks. Do not use the owner's tracking data.

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | The current entry offers five- and ten-minute corrections | Open its adjustment panel; activate `−5m`, then repeat with `−10m`; inspect the resulting effective starts and appended events | Not run |
| 2 | Entries offers the same actions | Open an Entries-row adjustment panel and repeat check 1 | Not run |
| 3 | Existing correction choices remain | Verify `−15m`, `−30m`, `−1h`, and manual `Set to` correction | Not run |
| 4 | Each quick action is exact and append-only | From a controlled timestamp, verify each offset and confirm that one `entry.retimed` line is appended without changing preceding bytes | Not run |
| 5 | Storage failure is explicit | Force a retime append failure; the persistent warning appears and the interface does not claim that the new time was stored | Not run |
| 6 | The expanded panel fits | Inspect both adjustment surfaces at the default size and 480×320, in light and dark appearance; confirm no horizontal document scroll and no unreachable control | Not run |
| 7 | The actions are keyboard and screen-reader identifiable | Tab to every quick action, activate one with the keyboard, and inspect the accessible names | Not run |
| 8 | Project checks pass | Run the commands in the final work package | Not run |

Do not mark this phase `Done` until the table contains actual results and all acceptance criteria
pass or record an explicit accepted exception.

## Rollout and rollback

Delivery uses the normal local application build. The change adds controls but does not change
the event schema or stored data. Existing and older builds read corrections made with the new
actions as ordinary `entry.retimed` events.

Rollback removes the two new quick actions and the changelog entry. Corrections already recorded
through them remain valid and require no data migration or cleanup.
