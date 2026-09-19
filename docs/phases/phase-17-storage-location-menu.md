# Phase 17 — Storage location in an overflow menu

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 16](phase-16-topic-quick-keys.md) · next: [Phase 18](phase-18-window-content-fit.md)

**Depends on:** [Phase 0](phase-0-repo-setup.md), [Phase 6](phase-6-application-theme.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Decisions

### Decided by the owner, 12 September 2026

The accepted answers are:

| Area | Decision |
| --- | --- |
| Why a menu | The bar is crowded. A control that a user needs a few times a year must not take the same space as Analytics, Entries, and Topics. |
| What the menu is | One `…` button at the end of the bar's navigation. It opens a panel below the bar. |
| What it holds | Three items: the storage location, the appearance override, and About. |
| What browsing means | The storage location opens the data directory in the desktop's own file manager. The path is also shown in the application, with a control that copies it. The shown path is the fallback when no file manager answers. |
| Appearance | The appearance select moves out of the bar and into the menu. The saved choice and its `localStorage` key do not change. |
| About | The menu shows the product name, the version, and the licence note. |
| Relation to Phase 8 | Independent. The menu is built in the bar that exists, and [Phase 8](phase-8-window-frame.md) carries it into the application's own bar. No dependency is declared, so this work can start now. |

### Decided by the owner, 19 September 2026

The window-frame select moves into the menu with the appearance select. It is used as
rarely as the storage location, and the same argument applies to it. The bar therefore
holds Analytics, Entries, Topics, and the `…` button, and no select.

This closes question 3 of the investigation gate. The panel holds four items: the storage
location, the appearance override, the window frame, and About.

### Investigation results, 19 September 2026

#### 1. How the application opens a folder on the Linux/X11 target

**Mechanism: Konzendi starts the launcher itself, in `src-tauri/src/folder.rs`.** It tries
`xdg-open`, `gio open`, `gnome-open`, and `kde-open`, in that order, and reads the exit code
of the first one that starts. This is the list that the Tauri opener plugin uses, through
the `open` crate. No new dependency is added, and no permission entry is necessary, because
the command is a Rust command and does not go through the capability list.

**Why not the Tauri opener plugin.** `tauri-plugin-opener` 2.5.5 calls `open::that_detached`
(`src/open.rs`), which returns success as soon as the launcher process starts
(`open` 5.3.2, `lib.rs`). A desktop that has `xdg-open` but no file manager therefore looks
like a success. Acceptance check 4 says the user must be told when the folder did not open,
so the plugin cannot deliver it. The plugin stays the better choice for a product that only
needs a best effort; Konzendi needs the exit code.

**Measured on 19 September 2026**, on X11 with Cinnamon and `nemo` as the registered handler
for `inode/directory`:

| Case | Result |
| --- | --- |
| `xdg-open <dir>` with a file manager | Exit code 0 after 33 ms, in three runs. |
| The same, with no file manager and no association | Exit code 4 after 0.55 s, in two runs. |
| What the file manager shows | The directory, opened as a window of its own. It does not select the directory in its parent. |

**Does it select the directory or only open it?** It only opens it. This is the correct
behavior here: the item the user wants is the directory, not an entry in its parent. The
plugin's `reveal_item_in_dir` would select it instead, and is not used.

**What a desktop without a file manager does.** `xdg-open` reports code 4, so the
application says `Konzendi could not open the folder. Copy the path instead.` and keeps the
path on screen. Verified in the running application; see the verification record below.

**Why a bounded wait.** The exit code is worth nothing if the application hangs while it
waits for it. A launcher that runs the file manager in the foreground never returns while
the folder is open. The command therefore waits two seconds and treats a launcher that is
still running as a success: the folder is on screen. Both measured times are far below that
limit. The wait runs on a blocking task and not on the main thread, so the window keeps
drawing.

#### 2. What About may claim about licences

`THIRD_PARTY_NOTICES.md` now exists; [Phase 7](phase-7-releases-ci-cd.md) delivered it, and
`src-tauri/tauri.conf.json` installs it in the Debian package at
`/usr/share/doc/konzendi/THIRD_PARTY_NOTICES.md`. About therefore says three true things and
links nothing:

- Konzendi is released under the MIT license. This agrees with `package.json` and
  `src-tauri/Cargo.toml`.
- It includes the Fira Sans and Fira Mono fonts under the SIL Open Font License 1.1. This
  agrees with [Phase 6](phase-6-application-theme.md) and with the notices file.
- The Linux package installs the complete third-party notices with its documentation. This
  is a statement about the package and stays true when the application runs from a source
  build.

The version comes from `getVersion()`, which reports the value the build was made with.
`core:app:allow-version` is listed in `src-tauri/capabilities/default.json`, because a
permission the application uses must be visible in the capability and not inherited without
a record.

#### 3. Whether the window-frame select moves into the menu

Answered by the owner on 19 September 2026. See the decision above.

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

The README's [Local data](../../README.md#local-data-and-privacy) section already records the
directory, the three file kinds, and the backup instructions. The application itself says
nothing. [Phase 0](phase-0-repo-setup.md) chose `app_data_dir()` as the store root, so the
running path is known to Rust and to nothing else.

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

### The path comes from the store

Add a reader on `Store` and a `storage_location` command that returns the root as a string.
Do not call `appDataDir()` in the interface. Two independent answers can disagree — after a
changed environment variable, for example — and the value a user copies must be the
directory the store holds open. Rust keeps event kinds opaque, and this command adds no
domain knowledge to it.

### A disclosure, not an ARIA menu

The `…` button is a disclosure that opens a panel of ordinary buttons. It carries
`aria-expanded` and no `role="menu"`. A true menu widget needs arrow-key ownership and a
roving tabindex, which is more to build and test than four rarely used items justify.
Tab, Enter, and Space work without any of it.

### The panel hangs from the bar

The panel is positioned against the bar and not against the `…` button. The bar wraps its
navigation to a second row below 43rem, which moves the button; an anchor on the button
would take the panel past the window edge at the 480x320 window floor. An anchor on the bar
keeps the same edge as the window controls in every layout. The panel also limits its height
to the window below the bar and scrolls, so its last item is always reachable. This follows
[Phase 18](phase-18-window-content-fit.md) and uses the visible scrollbar of
[Phase 19](phase-19-visible-scrollbar.md).

The bar is a drag region, so the panel declares `data-tauri-drag-region="false"`. Without it
a press on the path would move the window instead of selecting text, and the path could not
be selected when the clipboard refuses the write.

### Nothing here is recorded

The menu appends no event. The appearance choice keeps the `localStorage` key that
[Phase 6](phase-6-application-theme.md) already decided appends nothing. Opening a folder is an action on
the desktop, not a fact about the user's work.

## Work packages

- [x] **Report the path.** Add a root reader to `src-tauri/src/storage.rs` and a
  `storage_location` command in `src-tauri/src/lib.rs`. Complete when a Rust test shows the
  command reports the directory the store opened, and the command is registered.
- [x] **Open the folder.** Add the mechanism chosen in question 1, its dependency, and its
  permission entries in `src-tauri/capabilities/default.json`. Wrap it in one function in
  `src/desktop.ts`. Complete when a failure returns an error the interface can show, rather
  than failing silently.
- [x] **The overflow menu.** Add `src/MoreMenu.tsx` and its styles in `src/App.css`, using
  the existing theme tokens and the `.panel` pattern. Move the appearance select into it
  from `src/TitleBar.tsx`. Complete when the panel opens and closes by pointer and keyboard,
  and the bar holds one `…` button in place of the select.
- [x] **Storage and About items.** Show the path in the monospace face with `Open folder`
  and `Copy path`, and name the three file kinds in one line. Show the product name, the
  version, and the licence note settled in question 2. Complete when both items match this
  plan and the failure wording below.
- [x] **Verification and guidance.** Run the checks below and record the results here. Point
  the README's Local data section at the menu, and keep the written path. State in
  [Phase 8](phase-8-window-frame.md) that the bar carries the `…` button, and that the
  appearance select is no longer placed in the bar directly.

## Acceptance and verification

Use a temporary data directory. Do not record personal logs in these checks. The
`desktop-testing` skill drives the window on a private X server.

1. The bar shows one `…` button. It opens a panel with the storage location, the appearance
   override, the window frame, and About. Closing it returns focus to the `…` button.
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
   WCAG 2.2 AA floor [Phase 6](phase-6-application-theme.md) set. Check it at the window's smallest
   size and with the desktop frame preference set to `Desktop frame`.
9. The quick switcher is unchanged. It has no `…` button, and the global shortcut, topic
   selection, Stop, and Undo behave as before.
10. No event reaches the log while the menu is used. Read the log before and after and
    compare. Tracking, the timeline, and the readings are unchanged.
11. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` at the root. In
    `src-tauri/`, run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`.

### Verification record — 19 September 2026

Done on a private X server (`Xvfb :99`, 1024x768) with `XDG_DATA_HOME` in a scratch
directory. Checks 1 to 3 and 5 to 10 used `npm run tauri dev`; check 4 and the restart part
of check 6 used the standalone build from `npm run tauri build -- --debug --no-bundle`.

| Check | Result |
| --- | --- |
| 1 | Passed. The bar shows Analytics, Entries, Topics, and one `…` button, and no select. The panel holds the storage location, the appearance override, the window frame, and About. Escape closed it and the focus ring returned to the `…` button. |
| 2 | Passed. Escape, a press outside the panel, and a second press of `…` each closed it. Five presses of Tab moved through the four panel controls and out to the window controls with the panel still open. |
| 3 | Passed. The application ran with `XDG_DATA_HOME` in the scratch directory, and the panel showed that directory's `com.konzendi.app`, not the developer's own. |
| 4 | Passed, both ways. With `nemo` registered, `Open folder` opened a file manager window on the data directory, showing `device.json`, `events/`, and `store.lock`. With a `PATH` that has `xdg-open` but no file manager and no association, the panel showed `Konzendi could not open the folder. Copy the path instead.`, kept the path, and stayed usable. |
| 5 | Passed. `Copy path` put the exact path on the clipboard, read back with `xclip -o -selection clipboard`, and the panel confirmed it. A drag across the path selected the complete path, so the failure fallback works. The refusal of the clipboard itself was not forced; see the note below. |
| 6 | Passed. Light and Dark applied at once from inside the menu. Dark, set in the standalone build, was still in force after the process was ended and started again. |
| 7 | Passed. About showed `Konzendi 0.2.0` in both the development run and the standalone build. It names the MIT license, the two fonts under OFL 1.1, and the notices in the Linux package, and links no file. |
| 8 | Passed. See the contrast table below. Focus was visible on the `…` button and on all four panel controls, in light and in dark. At the 480x320 floor the bar wraps, the panel stays inside the window, and it scrolls to About. With `Desktop frame` the window controls go away and the panel keeps the bar's edge. |
| 9 | Passed. `Ctrl+Alt+K` opened the quick switcher, which showed Stop, Undo, and `K Open Konzendi` and no `…` button. Escape dismissed it. |
| 10 | Passed. `device.json` and `store.lock` had the same checksums before and after, and `events/` stayed empty, after the menu was opened and closed many times and after `Open folder`, `Copy path`, and both selects were used. |
| 11 | Passed. `npm run typecheck`, `npm run lint`, `npm test` (138 tests), `npm run test:scripts`, and `npm run build` at the root. `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` (10 tests) in `src-tauri/`. |

Contrast, calculated from the Phase 6 tokens for the pairs the panel adds:

| Pair | Light | Dark | Floor |
| --- | --- | --- | --- |
| `ink` on `band` — heading and path | 14.75:1 | 12.69:1 | 4.5:1 |
| `ink-soft` on `band` — notes and labels | 6.30:1 | 6.56:1 | 4.5:1 |
| `alarm` on `ground` — the failure message | 6.04:1 | 7.53:1 | 4.5:1 |
| `edge` on `band` — the panel boundary | 3.85:1 | 3.53:1 | 3:1 |
| `ink` on `ground` — the focus ring | 12.31:1 | 14.40:1 | 3:1 |

The separators between the panel items use `rule`, which Phase 6 gives to structural
separators. They are 1.95:1 in light and 1.42:1 in dark. The 3:1 floor applies to the focus
ring and to control boundaries, and a separator is neither: every item states its own
heading or label. The panel's own boundary uses `edge` and is above the floor.

Not verified, accepted on 19 September 2026:

- A clipboard that refuses the write. `navigator.clipboard.writeText` cannot be made to fail
  in the running window from the outside. The catch path is in `src/MoreMenu.tsx`, and the
  part a user depends on — the path stays on screen and can be selected — was measured.
- Windows and macOS. `src-tauri/src/folder.rs` names `open` and `explorer` for them, and
  ignores the exit code on Windows, where Explorer reports a failure after a correct open.
  [Phase 11](phase-11-windows-macos.md) owns the measurement on those platforms.

Observations, accepted on 19 September 2026 with no follow-up work:

- The quick switcher reads the appearance setting only when it loads, so it stays in the
  mode it started in after the tracking window changes it. This behavior existed before this
  phase and is already recorded in
  [Phase 16](phase-16-topic-quick-keys.md#desktop-checks-by-the-user--19-september-2026).

## Rollout and rollback

Deliver locally after the checks pass. The data format, the stored events, and the storage
location do not change, so no migration exists and none is needed. Tell the user that the
appearance control and the window-frame control moved into the `…` menu, because they moved
from a place they know.

Rollback restores the previous build. It removes the menu and returns both selects to the
bar. No log record is deleted or rewritten, and the saved appearance and frame keys are read
by both builds. The folder command has no dependency and no permission entry, so a
rolled-back build grants nothing it does not use; remove `core:app:allow-version` with the
About item.
