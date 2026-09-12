# Phase 17 — Storage location in an overflow menu

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 16](phase-16-topic-quick-keys.md) · next: none

**Depends on:** [Phase 0](phase-0-repo-setup.md), [Phase 6](phase-6-application-theme.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

## Investigation gate

The owner decided the shape of the menu on 12 September 2026. What remains is platform
evidence: the application has never asked the desktop to open a folder, and no dependency
for it exists. Do not write production code for the folder command until question 1 has an
answer. The rest of the plan can be read as the accepted target.

### Decided by the owner, 12 September 2026

These answers resolve [Q24](../OPEN_QUESTIONS.md).

| Area | Decision |
| --- | --- |
| Why a menu | The bar is crowded. A control that a user needs a few times a year must not take the same space as Analytics, Entries, and Topics. |
| What the menu is | One `…` button at the end of the bar's navigation. It opens a panel below the bar. |
| What it holds | Three items: the storage location, the appearance override, and About. |
| What browsing means | The storage location opens the data directory in the desktop's own file manager. The path is also shown in the application, with a control that copies it. The shown path is the fallback when no file manager answers. |
| Appearance | The appearance select moves out of the bar and into the menu. The saved choice and its `localStorage` key do not change. |
| About | The menu shows the product name, the version, and the licence note. |
| Relation to Phase 8 | Independent. The menu is built in the bar that exists, and [Phase 8](phase-8-window-frame.md) carries it into the application's own bar. No dependency is declared, so this work can start now. |

### Questions that must be answered

1. **How does the application open a folder on the Linux/X11 target?** No dependency for
   this exists today: `src-tauri/Cargo.toml` holds `tauri`, `uuid`, `chrono`, `serde`,
   `serde_json`, `tauri-plugin-global-shortcut`, `gtk`, and `x11rb`. Tauri v2 publishes an
   opener plugin, and a desktop usually supplies `xdg-open`. Which of the two Konzendi uses,
   whether it selects the directory in the file manager or only opens it, and what a
   desktop without a file manager does, are unmeasured. Measure all three before
   implementation, then record the mechanism and its permission entries here.
2. **What may About claim about licences?** `THIRD_PARTY_NOTICES.md` does not exist yet; it
   is a [Phase 7](phase-7-releases-ci-cd.md#rollout-and-rollback) deliverable. Decide what
   About says in the meantime. Say only what is true today: Fira Sans and Fira Mono are
   bundled under OFL-1.1, recorded in [Phase 6](phase-6-application-theme.md). About must
   not link a file that is not there.
3. **Does the window-frame select move into the menu as well?** Phase 8 added a second
   select to the bar while this plan was written. It is used as rarely as the storage
   location, so the same argument applies to it. This is a proposal, not a decision; the
   owner must accept or refuse it before the work starts. Keep it in the bar until then.

## Outcome and scope

A user can find where Konzendi keeps its data, and can open that directory in the file
manager, without reading the README. The control is in an overflow menu, because it is used
rarely and the bar has no room for it.

The path shown is the directory the running store actually opened, not a path the interface
computes a second time. A user who is told where the data is must be told the truth.

Out of scope: changing the storage location, choosing it, importing, exporting, backup, and
any file operation. The menu opens the folder and the desktop does the rest. Nothing here
appends an event, reads the log, or changes the data format. The quick switcher gains no
menu: [Phase 8](phase-8-window-frame.md#decided-by-the-owner-10-september-2026) decided that
the switcher carries no controls, and that holds.

## Decisions and evidence

### Existing coverage

The README's [Local data](../../README.md#local-data) section already records the directory,
the three file kinds, and the backup instructions. The application itself says nothing.
[Phase 0](phase-0-repo-setup.md) chose `app_data_dir()` as the store root, so the running
path is known to Rust and to nothing else.

Workspace inspection on 12 September 2026 found:

- `src-tauri/src/lib.rs` opens the store with `app.path().app_data_dir()?` and holds it as
  managed state. It exposes `append_event`, `read_events`, `window_system`, `show_quick`,
  `hide_quick`, `show_main`, and `quit`. None reports a path.
- `src-tauri/src/storage.rs` keeps `Store.root` private and offers no reader for it.
- `src/TitleBar.tsx` already carries the identity or `‹ Back` control, three navigation
  buttons, the appearance select, the frame select, and three window controls. This is the
  crowding the menu answers. The file is part of Phase 8 and was uncommitted at the time of
  inspection.
- `src/desktop.ts` is the only module that calls window and desktop commands, and
  `src/store.ts` is the only module that talks to the log. A folder command belongs in
  `desktop.ts`.
- `src-tauri/capabilities/default.json` lists `core:default` and six explicit permissions.
  The generated schema offers `core:app:allow-version`. Whether `core:default` already
  grants it was not confirmed, so add it explicitly if the version read fails.

These are source observations. No desktop verification has been done for this phase.

### The path comes from the store

Add a reader on `Store` and a `storage_location` command that returns the root as a string.
Do not call `appDataDir()` in the interface. Two independent answers can disagree — after a
changed environment variable, for example — and the value a user copies must be the
directory the store holds open. Rust keeps event kinds opaque, and this command adds no
domain knowledge to it.

### A disclosure, not an ARIA menu

The `…` button is a disclosure that opens a panel of ordinary buttons. It carries
`aria-expanded` and no `role="menu"`. A true menu widget needs arrow-key ownership and a
roving tabindex, which is more to build and test than three rarely used items justify.
Tab, Enter, and Space work without any of it.

### Nothing here is recorded

The menu appends no event. The appearance choice keeps the `localStorage` key it has, which
[Q12](../OPEN_QUESTIONS.md) already decided appends nothing. Opening a folder is an action on
the desktop, not a fact about the user's work.

## Work packages

- [ ] **Report the path.** Add a root reader to `src-tauri/src/storage.rs` and a
  `storage_location` command in `src-tauri/src/lib.rs`. Complete when a Rust test shows the
  command reports the directory the store opened, and the command is registered.
- [ ] **Open the folder.** Add the mechanism chosen in question 1, its dependency, and its
  permission entries in `src-tauri/capabilities/default.json`. Wrap it in one function in
  `src/desktop.ts`. Complete when a failure returns an error the interface can show, rather
  than failing silently.
- [ ] **The overflow menu.** Add `src/MoreMenu.tsx` and its styles in `src/App.css`, using
  the existing theme tokens and the `.panel` pattern. Move the appearance select into it
  from `src/TitleBar.tsx`. Complete when the panel opens and closes by pointer and keyboard,
  and the bar holds one `…` button in place of the select.
- [ ] **Storage and About items.** Show the path in the monospace face with `Open folder`
  and `Copy path`, and name the three file kinds in one line. Show the product name, the
  version, and the licence note settled in question 2. Complete when both items match this
  plan and the failure wording below.
- [ ] **Verification and guidance.** Run the checks below and record the results here. Point
  the README's Local data section at the menu, and keep the written path. State in
  [Phase 8](phase-8-window-frame.md) that the bar carries the `…` button, and that the
  appearance select is no longer placed in the bar directly.

## Acceptance and verification

Use a temporary data directory. Do not record personal logs in these checks. The
`desktop-testing` skill drives the window on a private X server.

1. The bar shows one `…` button. It opens a panel with the storage location, the appearance
   override, and About. Closing it returns focus to the `…` button.
2. The panel closes on Escape, on a click outside it, and on a second press of the `…`
   button. It does not close while the user is moving through it with Tab.
3. The path shown is the directory the running store opened. Start the application with a
   changed `XDG_DATA_HOME` and confirm that the shown path follows the store.
4. `Open folder` opens that directory in the desktop's file manager. With no file manager
   available, the application says `Konzendi could not open the folder. Copy the path
   instead.`, keeps the path on screen, and stays usable.
5. `Copy path` puts the exact path on the clipboard. A clipboard that refuses the write
   leaves the path selectable on screen and reports the failure.
6. The appearance override works from inside the menu. System, Light, and Dark still apply
   at once, and the choice survives a restart.
7. About shows the version of the running build. It claims no licence file that is absent
   from the repository.
8. Check the panel in light and dark, with focus visible on every control, against the
   WCAG 2.2 AA floor [Q12](../OPEN_QUESTIONS.md) set. Check it at the window's smallest
   size and with the desktop frame preference set to `Desktop frame`.
9. The quick switcher is unchanged. It has no `…` button, and the global shortcut, topic
   selection, Stop, and Undo behave as before.
10. No event reaches the log while the menu is used. Read the log before and after and
    compare. Tracking, the timeline, and the readings are unchanged.
11. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` at the root. In
    `src-tauri/`, run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`.

No checks have been run for this phase. This change adds the plan only.

## Rollout and rollback

Deliver locally after the checks pass. The data format, the stored events, and the storage
location do not change, so no migration exists and none is needed. Tell the user that the
appearance control moved into the `…` menu, because it moved from a place they know.

Rollback restores the previous build. It removes the menu and returns the appearance select
to the bar. No log record is deleted or rewritten, and the saved appearance key is read by
both builds. Remove the folder dependency and its permission entries together with the
command, so a rolled-back build grants nothing it does not use.
