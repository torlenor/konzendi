# Phase 3 — Quick access: global shortcut and tray

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 2](phase-2-tracking-implementation.md) · next: [Phase 4](phase-4-timeline-analytics.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Investigation gate

Resolved. The four questions were investigated on 10 September 2026 against the running
application on Linux/X11; the user decided the three that were theirs to decide the same day.
Evidence for each finding is in [Decisions and evidence](#decisions-and-evidence).

| # | Question | Answer |
| --- | --- | --- |
| 1 | Does a global shortcut register reliably on Linux/X11, and what happens under Wayland? | Yes on X11: the grab is an `XGrabKey` on the root window and fires with another application focused. There is no Wayland path at all, and a failed connection is reported to the caller as success, so the window system is checked and the window says when the shortcut cannot exist. See [The shortcut is an X11 key grab](#the-shortcut-is-an-x11-key-grab). |
| 2 | How does the surface appear and dismiss without holding the working window's focus longer than the interaction? | A second window, shown by the shortcut and dismissed on selection, on Escape, and on losing focus. Two X11 problems had to be solved to make that true: taking the keyboard, and giving it back. See [Taking the keyboard, and giving it back](#taking-the-keyboard-and-giving-it-back). |
| 3 | Which actions the surface offers | Fixed by [Phase 1](phase-1-tracking-design.md#surface-boundary), not reopened: switch, pause, undo the last entry. |
| 4 | Is the shortcut configurable, and what happens when the combination is taken? | Configurable, stored like the appearance preference. A combination another application holds is refused by the X server, and the window says so rather than showing a shortcut that does nothing. See [Accepted decisions](#accepted-decisions). |

No open question is resolved by this phase. It opens [Q16](../OPEN_QUESTIONS.md), which asks how
the surface's nine numbered slots are chosen once a user has more topics than slots.

## Outcome and scope

Logging a switch without leaving the current application: a global shortcut opening a quick
switcher, and a tray control as a second entry point. This is the remedy Phase 0 named for the
central product risk, so it exists before any trial that measures logging friction.

Concretely: a second window holding the surface Phase 1 drew, a configurable global shortcut
that shows and dismisses it, a tray icon whose menu offers the same three actions plus the two
only it can offer, and the plumbing that keeps two windows folding one log in agreement.

Out of scope: new tracking behavior beyond what Phase 2 implements, analytics, and packaging.

## Decisions and evidence

The design decisions this phase implements belong to
[Phase 1](phase-1-tracking-design.md#surface-boundary). Recorded below are the findings the
investigation produced and the choices they forced.

### Accepted decisions

| Area | Decision | Gate question |
| --- | --- | --- |
| Shortcut mechanism | `tauri-plugin-global-shortcut`, registered from the tracking window's webview. Its Linux implementation is an X11 root grab and nothing else. | 1 |
| Window system | Checked at startup. On anything but X11 the window reports that quick access needs an X11 session and no registration is attempted, because a failed registration reports success. | 1 |
| Default combination | `Ctrl+Alt+K`, verified free of every keybinding this Cinnamon session declares. | 4 |
| Configurable | Yes. The window states the live combination and records a new one by having the user press it. Stored in `localStorage` like the appearance, appending no event. | 4 |
| A taken combination | Reported on the band as not active, naming the reason, with the combination still changeable. Nothing pretends to be registered. | 4 |
| The surface | A second window (`quick`), created hidden at startup, undecorated, always on top, off the taskbar, centred, and sized to its own content. | 2 |
| Taking the keyboard | A Rust command asks the window manager directly with `CurrentTime`; `set_focus` alone leaves the surface without the keyboard. | 2 |
| Giving it back | The window that had the keyboard is remembered when the surface opens and asked to take it back when the surface hides. | 2 |
| Dismissal | Selection, Escape, losing focus, or the shortcut again. Losing focus is confirmed a moment later, because the key grab itself reports a lost focus as it fires. | 2 |
| Numbering | Every non-archived topic keeps its number, the running one included and marked with its elapsed reading, as Phase 1 drew it. The window's list still hides the running topic, so the two lists can number differently. | 3 |
| Window lifecycle | The close button hides the tracking window; the application keeps running and the tray's `Quit Konzendi` ends it. A shortcut only exists while the process does. | 2 |
| Tray contents | The current state as a disabled header, the topics that can be switched to, pause or resume, undo the last entry, `Open Konzendi`, and `Quit Konzendi`. | 3 |
| Two windows, one log | The store broadcasts every record it writes; each window merges it into its copy of the log and folds again. | 2 |

### The shortcut is an X11 key grab

`tauri-plugin-global-shortcut` 2.3.2 uses `global-hotkey` 0.8.0, whose Linux implementation
grabs the combination on the X11 root window through `x11rb` and polls for key events. Three
properties of that implementation shaped the decisions above, and all three were read in the
crate's source rather than assumed:

- **It is X11 or nothing.** The platform module maps every Unix target to the X11
  implementation; there is no Wayland protocol path. Under a Wayland session the grab either
  cannot be made at all or, through XWayland, sees only the keys XWayland receives.
- **A failure to connect is reported as success.** The connection is opened on a worker thread.
  If it fails, the thread ends, and `register` — which waits for a reply that never comes —
  returns `Ok`. An application that trusts the return value would show a shortcut that can never
  fire. This is why the window system is checked before registering.
- **A combination another client holds fails cleanly.** The grab returns an X11 `Access` error,
  which surfaces as `AlreadyRegistered`. This is a reportable failure, and it is reported.

Only `Ctrl`, `Alt`, `Shift` and `Super` are recognised as modifiers by that implementation, so
the accelerator reader accepts those four and rejects anything else rather than registering a
combination that could never match.

Measured on the target desktop (Linux/X11, Cinnamon 6.6.9): with another application focused
and the tracking window closed to the tray, the surface had the keyboard 53 ms after the key.

### Taking the keyboard, and giving it back

Showing the surface is not the same as being allowed to type into it, and this took two
separate mechanisms. Both were found by testing, not by reading documentation.

**Taking it.** `set_focus` reaches `gtk_window_present_with_time(GDK_CURRENT_TIME)`, and GTK
replaces `CurrentTime` with the time the user last touched *this* application. When the tracking
window has been sitting in the tray, that time is old, the window manager treats the request as
focus stealing, and the surface appears without the keyboard — precisely in the situation the
feature is for. Sending `_NET_ACTIVE_WINDOW` with `CurrentTime` is granted; it was the only one
of five strategies tested that was. `show_quick` therefore asks GDK to focus the surface with
timestamp zero, and the caller repeats the request until the window reports that it has the
keyboard, because the request is refused while the window is still being mapped.

**Giving it back.** Hiding the surface leaves the window manager with nothing focused, so the
user would have to click their way back into their work. GTK can only focus windows this
application owns, so the interrupted window — which belongs to somebody else — is read from
`_NET_ACTIVE_WINDOW` before the surface opens and asked to take the keyboard back when it
closes, through `x11rb` directly.

**The grab reports a lost focus.** A passive grab activating generates a focus-out for the
window that had the keyboard. Dismissing on focus loss therefore closed the surface the instant
the shortcut was pressed, and the same press then reopened it, so the combination never appeared
to toggle. Focus is now read again 200 ms later: a real dismissal is still unfocused, a grab is
not.

### Two windows folding one log

Phase 2 holds the merged log in memory and advances it with the record `append_event` returns,
and recorded that a second writer in the same process was not a case it created. This phase
creates one: the quick switcher is a separate webview with its own copy of the log.

`append_event` now emits the stored record to every window, and every window merges what it
receives. `mergeEvents` deduplicates by event id, so the writer receiving its own broadcast
changes nothing, and the fold stays the single source of truth. Nothing else in Phase 2's state
handling changes: no optimistic state, and a failed append still leaves the screen alone,
reports the failure, and re-reads the log — on whichever surface the action was taken.

### Interpretations of the design

| Point | Choice | Reason |
| --- | --- | --- |
| The running topic on the surface | Listed and marked, as Phase 1 drew it | Its number is muscle memory and must not move because a topic happens to be running. Selecting it is coalesced by the fold, so the row is harmless. Phase 2's aside that the two lists would carry the same numbers is superseded |
| The running topic in the tray | Not listed; the header names it | The tray has no numbers to keep stable, and an item that does nothing is worse than no item |
| `Quit` in the tray | An ordinary item calling a command that exits | Tauri's predefined `Quit` item is silently ignored on Linux; only `Separator`, the clipboard items and `About` are implemented there |
| The tray's state header | Names the subject and the start time, not the elapsed time | A menu holds no ticking clock, and the menu is rebuilt only when the folded state changes |
| Topics beyond the ninth | Listed in the tray, not on the surface | Every row on the surface is one keystroke, and there are nine. See [Q16](../OPEN_QUESTIONS.md) |

### Rejected alternatives

- **Showing the tracking window on the shortcut instead of a second window.** Phase 1 specified
  a compact keystroke-only surface, and the tracking window is neither.
- **Registering the shortcut in Rust.** The plugin's JavaScript API is the supported path and
  keeps the decision — which window, and whether this press opens or closes it — beside the
  interface that owns it. Only the X11 activation, which the plugin does not cover, is in Rust.
- **Re-reading the log when the surface opens.** Correct, but it pays a directory read on the
  hot path to cover what the broadcast covers for free.
- **Building the tray menu in Rust.** The menu is the event vocabulary in another shape, and
  that vocabulary lives in `src/core/`. Rust owns durability, not what a topic is.
- **Dismissing the surface only on selection.** Leaves a window on top of the user's work if
  they change their mind, which is a worse failure than closing one keystroke too eagerly.
- **Accepting a combination without a modifier.** It would take that key from every application
  on the desktop.

## Work packages

- [x] **Investigate the gate** (this document's [Decisions and evidence](#decisions-and-evidence)).
  Establish what the shortcut mechanism actually does on the target desktop and under Wayland,
  how the surface takes and returns focus, and how a taken combination behaves. Complete when
  each gate question has an answer backed by a test or by the mechanism's source, and the user
  has decided the three questions that are theirs.

- [x] **Broadcast stored records** (`src-tauri/src/lib.rs`, `src/store.ts`, `src/useTracking.ts`).
  `append_event` emits the record it wrote; every window merges it. Complete when a switch made
  on one surface is visible on the other without a re-read, and a window merging its own
  broadcast changes nothing.

- [x] **Add the quick switcher window** (`src-tauri/tauri.conf.json`, `src/main.tsx`,
  `src/QuickView.tsx`, `src/App.css`). A second window carrying Phase 1's surface: numbered
  topics with the running one marked, pause, and undo, no text entry, sized to its rows.
  Complete when every row is one keystroke, the surface closes on a recorded action, and a
  failed append leaves it open with the reason.

- [x] **Register and configure the shortcut** (`src/shortcut.ts`, `src/useQuickAccess.ts`,
  `src/QuickAccessBand.tsx`, `src/shortcut.test.ts`). The accelerator vocabulary and its
  reader, registration with the window system checked first, and the band that states what is
  live and what is not. Complete when the band reports registered, taken, and unsupported
  distinctly, and a new combination can be recorded by pressing it.

- [x] **Take and return the keyboard** (`src-tauri/src/lib.rs`, `src-tauri/src/x11.rs`,
  `src/desktop.ts`). `show_quick`, `hide_quick`, and the interrupted-window bookkeeping.
  Complete when the surface has the keyboard with the tracking window closed, and the window
  that was interrupted has it back afterwards.

- [x] **Add the tray and the window lifecycle** (`src/useTray.ts`, `src-tauri/src/lib.rs`).
  The icon, a menu rebuilt from the folded state, and a close button that hides rather than
  quits. Complete when every tray action appends the event it names, the menu follows the
  state, and `Quit Konzendi` ends the process.

- [x] **Run the checks and record the results.** The automated checks and the desktop
  walkthrough in [Acceptance and verification](#acceptance-and-verification). Complete when each
  row has an actual result recorded.

> **Since [Phase 13](phase-13-stop-replaces-pause.md).** The quick switcher and the tray offer
> `■ Stop` where the evidence below reads `❙❙ Pause`, and the keystroke is `s`, not `p`. The
> action and the event it appends are unchanged. The results below are left as the record of what
> was verified in this phase.

## Acceptance and verification

Phase 1 required that this phase's checks include one performed with another application
focused, since that is the situation the feature exists for. Checks 1 to 4 are that check.

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | The shortcut opens the surface with another application focused and the tracking window closed | Desktop walkthrough: focus another application, press the combination | Passed. With `xclock` focused and the tracking window closed to the tray, the surface had the keyboard 53 ms after the key. |
| 2 | Selecting a topic from the surface appends exactly one `focus.started` and nothing else | Compare the log before and after; hash the preceding lines | Passed. One line added; the SHA-256 of every earlier line unchanged. |
| 3 | The surface dismisses itself on a recorded action and the working window has the keyboard again | Same walkthrough, reading the active window afterwards | Passed. The surface was gone and `xclock` was active again. Repeated five times in a row, including the first press after startup: one line each, dismissed each, `xclock` active each. |
| 4 | Logging a switch costs two keystrokes | Counted in the walkthrough | Passed. The combination, then the topic's number. |
| 5 | Pause and undo work from the surface and record the right kinds | Press `p`, then `u`, from another application | Passed. One `focus.paused`, then one `entry.revoked`. |
| 6 | Escape dismisses without recording anything, and the shortcut toggles | Walkthrough | Passed. Escape left the line count unchanged; four consecutive presses alternated open, closed, open, closed, with focus returning to `xclock` each time it closed. |
| 7 | Clicking away dismisses the surface | Activate another window while the surface is open | Passed. The surface closed and the other window kept the keyboard. |
| 8 | A switch made on the surface reaches the tracking window without a re-read | Screenshot the tracking window before and after | Passed. The active card showed the newly started topic. |
| 9 | A failed append leaves the surface open, records nothing, and reports the failure | Make the log file read-only, then switch from the surface | Passed. No line was written, the surface stayed open and read `Could not record the switch: Permission denied (os error 13). The stored log was read again, so the screen shows what is recorded.` The next switch after restoring permissions succeeded. |
| 10 | The tray offers the state, the topics, pause or resume, undo, open, and quit | Read the exported menu over D-Bus | Passed. `▶ Email · started 20:12` (disabled), the two other topics, `❙❙ Pause`, `Undo last entry (Email)`, `Open Konzendi`, `Quit Konzendi`. |
| 11 | Every tray action appends the event it names, and the menu follows the state | Activate each item over D-Bus and read the log | Passed. Switch → `focus.started`; pause → `focus.paused`, after which the menu offered `▶ Resume Login flow`; resume → `focus.started`; undo → `entry.revoked`. |
| 12 | The tray icon is registered with the desktop's status-notifier host | Query the session bus | Passed. Registered with Cinnamon's `xapp-sn-watcher` as `.../tray_icon_tray_app_konzendi`. |
| 13 | Closing the tracking window leaves the application running, and the tray's Quit ends it | Close the window, then use the tray | Passed. The window closed with the process alive and the shortcut still working; `Quit Konzendi` ended the process, removed the tray item from the bus, and released the key grab. |
| 14 | A combination another application holds is reported, not shown as working | Hold `Ctrl+Alt+K` from another X client, then start the application | Passed. The band read `Quick switch Ctrl+Alt+K is not active: another application already holds it.` |
| 15 | The combination can be changed by pressing a new one, and it survives a restart | Use `change` in the window, then restart | Passed. `Ctrl+Alt+J` registered, opened and closed the surface, and was still in force after a restart. |
| 16 | A window system without a key grab is reported rather than trusted | Start with the session reported as Wayland | Passed. The band read `Quick switch needs an X11 session; this one is wayland. The tray still works.`, no registration was attempted, and the `change` control is not offered. This exercises the report, not a Wayland session; see [what was not verified](#what-was-not-verified). |
| 17 | No path removes or edits a log line | Line count across the whole session | Passed. 13 → 20 lines, never decreasing, and the first 13 lines byte-identical at the end. |
| 18 | The checks of earlier phases still pass and `src/core/` imports neither React nor Tauri | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, and an import check | Passed. 35 Vitest tests and 5 Rust storage tests; Biome reported no diagnostics; no file under `src/core/` names React or Tauri. |
| 19 | The standalone executable behaves as the development build does | `npm run tauri build -- --debug --no-bundle`, then run it | Passed. Checks 1 to 3 were repeated against the built executable with the same results. |

### Implementation details

- `src-tauri/src/lib.rs` gained the broadcast, `show_quick`, `hide_quick`, `show_main`, `quit`,
  the window-system report, and the close-to-tray window event. `src-tauri/src/x11.rs` holds the
  two X requests GTK cannot make for the application. The store is unchanged and still keeps
  event kinds opaque.
- New Linux-only Rust dependencies: `gtk` (the same version Tauri uses, to present a window) and
  `x11rb` (already in the tree through `global-hotkey`, to read and restore the active window).
- The frontend gained `desktop.ts` (window integration), `shortcut.ts` (the accelerator
  vocabulary, with tests), `useQuickAccess.ts` (registration and its reported state),
  `useTray.ts`, `QuickView.tsx`, and `QuickAccessBand.tsx`. `store.ts` gained the broadcast
  subscription and remains the only module that reads or writes the log.
- Both windows load one bundle; `main.tsx` renders the surface or the tracking window according
  to the window label.
- Registration is serialized through one queue and releases the combination before taking it.
  Without that, a re-render releasing one grab while another is being taken reports a conflict
  with itself, which is indistinguishable from a real one.
- The loop that asks for the keyboard stops as soon as the surface is no longer visible. A user
  can pick a row before the loop has given up, and a retry arriving after that would reopen the
  surface they just dismissed. Observed once before the guard was added.
- The window capability grants only what the interface still calls: resizing and centring the
  surface, the tray icon's image, and the three global-shortcut commands. Showing, hiding and
  focusing moved to Rust and no longer need permissions in the webview.

### Verification evidence — 10 September 2026

The walkthrough ran on Linux/X11 under an isolated Xvfb display with `metacity` as the window
manager and a temporary `XDG_DATA_HOME`, driven by `xdotool`, with `xclock` standing in for the
window the user is working in. A window manager is required: without one there is no focus to
take or return. Tray menus were read and activated over D-Bus, which is how a panel drives them.
Screenshots and the temporary event log were written under the session scratch directory and are
not repository data.

The measurements above are counted steps and single timings on one machine, not a study of
whether the feature changes how much gets logged. That question is
[Phase 5](phase-5-validation-trial.md)'s.

### What was not verified

- **Wayland.** Check 16 exercises the report by telling the application the session is Wayland;
  it does not run under a Wayland compositor. The behaviour of the grab there is read from
  `global-hotkey`'s source, not measured.
- **Cinnamon's own window manager.** The walkthrough used `metacity`, because driving the
  developer's session would steal their focus and type into their windows. Muffin's focus
  handling is close to metacity's but was not tested; the tray, which is the part most specific
  to Cinnamon, was confirmed against the session's real `xapp-sn-watcher`.
- **The packaged application**, other desktops, other platforms, and whether the shortcut
  survives a suspend or a display change.
- **Long-running behaviour.** The longest continuous run was minutes, so a grab lost hours later
  — to a keyboard-layout change, for example — would not have been seen.

## Rollout and rollback

Local delivery; nothing is published. Rollback is removing the shortcut and tray registration,
leaving the window from Phase 2 as the only surface. Reverting also restores the close button to
quitting, which is the one user-visible behaviour outside the feature itself that this phase
changes.

No data compatibility concern: this phase adds an entry point to existing events, not a new
record shape. Nothing it appends differs from what the tracking window appends, so a log written
with quick access is read unchanged by a build without it.
