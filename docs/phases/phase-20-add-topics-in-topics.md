# Phase 20 — Add topics in Topics

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 19](phase-19-visible-scrollbar.md) · next: [Phase 21](phase-21-game-detection.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 16](phase-16-topic-quick-keys.md)  
**Effort:** L  
**Complexity:** L  
**Readiness:** Implementation-ready

## Outcome and scope

The owner requested on 14 September 2026: "It should be possible to add new topics on the
topics screen."

Today the user can create a topic only in the tracking view, and the application starts to
track the topic immediately. After this phase, the user can also add a topic in Topics. The
application does not start to track it. The user can prepare topics before work starts, and
give them a quick key and a colour before the first switch.

The scope includes:

- a form in `src/TopicsView.tsx` that adds one topic by name;
- an action in `src/actions.ts` that appends `topic.created` only;
- tests for the action and for the fold of a topic that has no tracking entry;
- a brief entry in `CHANGELOG.md`.

Out of scope:

- a quick key or a colour in the add form. The user sets them on the new row with the existing
  `quick key` and `colour` controls;
- a check or a warning for a name that another topic already has. The tracking view does not
  check names either;
- topic creation in the quick switcher. [Phase 1](phase-1-tracking-design.md) rejected text
  entry on that surface;
- a change to topic creation in the tracking view;
- a new event kind, or a change to an event payload;
- a delete action. Archive stays the only way to remove a topic from the switch lists.

## Decisions and evidence

### Decided by the owner, 14 September 2026

| Area | Decision | Rationale |
| --- | --- | --- |
| Entry point | Topics can add a new topic. | The owner's request. |

### Design decisions of this document

These choices follow from the request and the existing behaviour. The owner can change them
before implementation.

| Area | Decision | Rationale |
| --- | --- | --- |
| Tracking | Adding a topic in Topics does not start to track it. It appends `topic.created` only. | Topics is a maintenance screen. A topic that starts from there adds a tracking entry that the user did not ask for. The tracking view keeps its create-and-track path. |
| Relation to Phase 1 | This phase adds a second way to create a topic. It does not replace the Phase 1 rule. | [Phase 1](phase-1-tracking-design.md) decided that a topic is named at the moment of tracking, in the window, with no setup step before the first entry. That path stays. Topics is part of the window, and the first run still asks one question. |
| Form fields | A name only. | Keys and colours already have editors on each row. One field keeps the form as simple as the form in the tracking view. |
| Name rule | The same rule as the tracking view: the application trims the name, and the add button is disabled while the name is empty. Duplicate names are permitted. | The two paths must accept the same names. |
| Placement | Above the topic list, below the `Topics` heading. The button text is `Add topic`. | The user finds the form without a scroll when the list is long. The text does not say "start", because nothing starts. |
| After a successful add | The field clears and keeps the focus. | The user can add several topics in sequence. The new row shows at the end of the list, because the list is in creation order. |
| After a failed add | The field keeps the name. The existing error message of `useTracking` shows. | Nothing is shown as saved until the store confirms it, as in the key editor. |
| Empty state | The text `No topics yet.` stays, and the form shows above it. | The form is the next step for a user who has no topics. |

### Verified facts

These facts come from the tree on 14 September 2026, which contains uncommitted Phase 16 work
in `src/TopicsView.tsx`:

- `trackingActions` in `src/actions.ts` has `createAndTrack`, which appends `topic.created` and
  then `focus.started`. No action appends `topic.created` alone.
- `topicCreated(topicId, name)` in `src/core/tracking.ts` makes the event draft. The topic id
  comes from `crypto.randomUUID()`.
- The fold in `src/core/fold.ts` adds a topic to the registry for each effective
  `topic.created`. It does not need a `focus.started` for that topic. A new topic has no quick
  key and no colour.
- `record` in `src/useTracking.ts` returns `Promise<boolean>` and sets an error message when
  the store rejects an append.
- When no entry exists, the tracking view shows `Nothing tracked yet.` and the create-and-track
  form. It also shows the pick lists, so topics added in Topics are available there. A topic
  with no key shows under `Other topics`.
- The quick switcher shows `No topics yet. The window creates them.` when no topic exists. The
  text stays correct, because Topics is in the window.

## Work packages

- [ ] **Add the action.** Add `create(name)` to `trackingActions` in `src/actions.ts`. It
  appends one `topic.created` event with a new id. Complete when a Vitest test shows that the
  action records exactly one `topic.created` draft and no `focus.started` draft.
- [ ] **Confirm the fold.** Add a test to `src/core/fold.test.ts` for a log that contains a
  `topic.created` event and no tracking event. Complete when the test shows the topic in the
  registry, not archived, with no key and no colour, and shows no current entry. Add the test
  only if no existing test covers this case.
- [ ] **Add the form.** Add an add-topic form to `src/TopicsView.tsx` with a labelled name field
  and an `Add topic` button, placed as decided above. Disable the button while the name is empty
  or `busy` is true. Clear the field only when `record` returns `true`. Complete when the
  acceptance checks 1 to 5 pass.
- [ ] **Record the change.** Add a brief entry under `### Added` in `CHANGELOG.md`. Complete when
  the entry exists and `### Compatibility` still says that no event format changes.

## Acceptance and verification

Checks are done on Linux/X11 with the
[desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure. Use a separate
`XDG_DATA_HOME`. Do not open the owner's application-data directory.

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | A topic added in Topics shows at the end of the topic list | Open Topics, type a name, and press Enter. Take a screenshot | Not run |
| 2 | The add does not start to track | Compare the stored log before and after check 1. It has exactly one new `topic.created` line and no `focus.started` line. The tracking view shows the same current entry as before | Not run |
| 3 | An empty or blank name cannot be added | Type only spaces. Read the state of the `Add topic` button | Not run |
| 4 | The field clears and keeps the focus after an add | After check 1, type a second name without a click, and press Enter. Both topics show | Not run |
| 5 | A failed add keeps the name | Make the store reject the append, for example with a read-only data directory. Read the field and the error message | Not run |
| 6 | The new topic can be tracked and maintained | Give the new topic a quick key and a colour in Topics. Select it by its key in the tracking view and in the quick switcher | Not run |
| 7 | First run with prepared topics | Start with an empty log. Add two topics in Topics, then open the tracking view. Both topics can be selected, and no entry exists before the first selection | Not run |
| 8 | Topic creation in the tracking view is unchanged | Create a topic with `+ New topic`. The log has `topic.created` then `focus.started` | Not run |
| 9 | No event kind is added | Compare the event vocabulary in `src/core/tracking.ts` before and after | Not run |
| 10 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` | Not run |

Record the actual result of each row when you do the check, including failures. Record what was
not verified.

## Rollout and rollback

Local delivery. Nothing is published. The phase uses the existing `topic.created` event with
its existing payload, so an older build reads a log from this build without a change. To roll
back, remove the form and the action. Topics that the user added stay in the log and show in
every view, as topics created in the tracking view do. To remove one of them from the switch
lists, archive it.
